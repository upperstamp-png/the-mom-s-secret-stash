# =============================================================================
# deploy.ps1  --  Deploy oficial de producao do projeto "Ofertas Mamis".
# =============================================================================
#
# Forma unica e oficial de subir o sistema:
#
#     ./deploy.ps1
#
# Etapas (cada uma e uma "stage" rastreada; uma falha aborta o processo):
#
#   01. Pre-flight       -- checa Node, npm, npx, supabase CLI, vercel CLI
#   02. Env loader       -- carrega .env.local (preferencial) ou .env
#   03. Install          -- npm install (idempotente)
#   04. Type-check       -- npx tsc --noEmit (FAIL on any error)
#   05. Build            -- npm run build  (FAIL on any error)
#   06. Supabase link    -- npx supabase link  (idempotente)
#   07. Migrations       -- npx supabase db push  (RLS, indices, triggers)
#   08. Edge Functions   -- npx supabase functions deploy <cada uma>
#   09. Supabase secrets -- WEB_URL + CRON_SECRET para as Edge Functions
#   10. Vercel link      -- vercel link  (idempotente)
#   11. Vercel env vars  -- sincroniza envs com o que esta em .env.local
#   12. Vercel deploy    -- vercel --prod
#   13. Validacoes       -- health-check do site, /api/cron/shopee-sync,
#                            Edge Function shopee-cron, Supabase reachable
#   14. Relatorio final  -- tabela com status de cada stage
#
# Idempotente: pode rodar varias vezes sem efeitos colaterais.
# Falha-rapido: qualquer erro interrompe o processo com mensagem clara.
# =============================================================================

[CmdletBinding()]
param(
  [string]$SupabaseProjectRef = "jebumofptyqbgtgvgywv",
  [string]$ProductionDomain   = "ofertasmamis.online",
  [switch]$SkipInstall,
  [switch]$SkipBuild,
  [switch]$SkipMigrations,
  [switch]$SkipFunctions,
  [switch]$SkipVercel,
  [switch]$SkipValidation
)

# --- Setup -----------------------------------------------------------------
$ErrorActionPreference = "Stop"
# Garante UTF-8 em pipes (vercel CLI fica bagunçada com UTF-16).
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding           = [System.Text.Encoding]::UTF8
$PSDefaultParameterValues['Out-File:Encoding'] = 'utf8'

$script:Stages = New-Object System.Collections.Generic.List[object]
$script:StartedAt = Get-Date

function Write-Section($title) {
  $bar = "=" * 70
  Write-Host ""
  Write-Host $bar -ForegroundColor DarkCyan
  Write-Host "  $title" -ForegroundColor Cyan
  Write-Host $bar -ForegroundColor DarkCyan
}

function Invoke-Stage {
  param(
    [Parameter(Mandatory)] [string]      $Name,
    [Parameter(Mandatory)] [scriptblock] $Action,
    [switch] $Optional
  )
  Write-Section $Name
  $stageStart = Get-Date
  $entry = [pscustomobject]@{
    Name      = $Name
    Status    = "RUNNING"
    DurationS = 0
    Detail    = ""
  }
  $script:Stages.Add($entry) | Out-Null
  $previousEAP = $ErrorActionPreference
  try {
    # Comandos nativos (npm/vite/supabase/vercel) frequentemente escrevem
    # warnings em stderr. Com $ErrorActionPreference=Stop o PowerShell
    # encerraria o stage como erro mesmo com exit code 0. Usamos Continue
    # aqui dentro: a verificacao real eh via $LASTEXITCODE + throw explicito.
    $ErrorActionPreference = "Continue"
    & $Action
    $ErrorActionPreference = $previousEAP
    $entry.Status = "OK"
    $secs = [math]::Round((New-TimeSpan -Start $stageStart -End (Get-Date)).TotalSeconds, 1)
    $entry.DurationS = $secs
    Write-Host ("[OK] {0} ({1}s)" -f $Name, $secs) -ForegroundColor Green
  } catch {
    $ErrorActionPreference = $previousEAP
    $secs = [math]::Round((New-TimeSpan -Start $stageStart -End (Get-Date)).TotalSeconds, 1)
    $entry.DurationS = $secs
    $entry.Detail = $_.Exception.Message
    if ($Optional) {
      $entry.Status = "SKIP"
      Write-Host ("[SKIP] {0}: {1}" -f $Name, $_.Exception.Message) -ForegroundColor DarkYellow
    } else {
      $entry.Status = "FAIL"
      Write-Host ("[FAIL] {0}: {1}" -f $Name, $_.Exception.Message) -ForegroundColor Red
      Show-Report
      exit 1
    }
  }
}

function Show-Report {
  Write-Section "RELATORIO FINAL"
  $script:Stages | Format-Table Status, Name, @{Name="Tempo(s)";Expression={$_.DurationS}}, Detail -AutoSize
  $total = [math]::Round((New-TimeSpan -Start $script:StartedAt -End (Get-Date)).TotalSeconds, 1)
  $hasFail = $script:Stages | Where-Object { $_.Status -eq "FAIL" }
  if ($hasFail) {
    Write-Host ("DEPLOY FALHOU em {0} s" -f $total) -ForegroundColor Red
  } else {
    Write-Host ("DEPLOY CONCLUIDO com sucesso em {0} s" -f $total) -ForegroundColor Green
  }
}

function Test-CommandAvailable($name) {
  return [bool](Get-Command $name -ErrorAction SilentlyContinue)
}

# Existencia de arquivo robusta: PowerShell tem bug com colchetes (`]`) no
# diretorio de trabalho, entao usamos a API .NET diretamente.
function Test-FileExistsRaw($path) {
  $abs = if ([System.IO.Path]::IsPathRooted($path)) { $path }
         else { Join-Path -Path (Get-Location).Path -ChildPath $path }
  return [System.IO.File]::Exists($abs)
}

function Read-DotEnv($path) {
  $map = @{}
  if (-not (Test-FileExistsRaw $path)) { return $map }
  $abs = if ([System.IO.Path]::IsPathRooted($path)) { $path }
         else { Join-Path -Path (Get-Location).Path -ChildPath $path }
  $lines = [System.IO.File]::ReadAllLines($abs)
  foreach ($line in $lines) {
    if ($line -match '^\s*#') { continue }
    if ($line -match '^\s*$') { continue }
    if ($line -match '^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$') {
      $k = $Matches[1]
      $v = $Matches[2].Trim()
      if ($v.Length -ge 2 -and (($v.StartsWith('"') -and $v.EndsWith('"')) -or ($v.StartsWith("'") -and $v.EndsWith("'")))) {
        $v = $v.Substring(1, $v.Length - 2)
      }
      # Remove BOM (U+FEFF) acidental no inicio do valor — quebra fetch()
      # com mensagens "non ISO-8859-1 code point" no Supabase.
      $v = $v -replace "^\uFEFF", ""
      $map[$k] = $v
    }
  }
  return $map
}

function Require-Env($map, $key) {
  if (-not $map.ContainsKey($key) -or [string]::IsNullOrWhiteSpace($map[$key])) {
    $hint = switch ($key) {
      "VITE_SUPABASE_URL"         { "Supabase Dashboard > Project Settings > API > Project URL" }
      "VITE_SUPABASE_ANON_KEY"    { "Supabase Dashboard > Project Settings > API > Project API keys > anon public" }
      "SUPABASE_SERVICE_ROLE_KEY" { "Supabase Dashboard > Project Settings > API > Project API keys > service_role (SECRETO)" }
      "CRON_SECRET"               { "Gerar localmente:  openssl rand -hex 32  (ou qualquer string longa aleatoria)" }
      default                     { "(verifique a documentacao)" }
    }
    throw ("Variavel obrigatoria ausente em .env.local: {0}`n           Como obter: {1}" -f $key, $hint)
  }
}

# --- 01. Pre-flight --------------------------------------------------------
Invoke-Stage "01 Pre-flight (verificando ferramentas)" {
  foreach ($cmd in @("node", "npm", "npx")) {
    if (-not (Test-CommandAvailable $cmd)) { throw "$cmd nao esta disponivel no PATH." }
  }
  Write-Host ("  node: {0}" -f (node --version).Trim())  -ForegroundColor DarkGray
  Write-Host ("  npm:  {0}" -f (npm --version).Trim())   -ForegroundColor DarkGray
  Write-Host "  supabase CLI: usado via npx (sem instalacao global obrigatoria)" -ForegroundColor DarkGray
  if (-not (Test-CommandAvailable "vercel")) {
    Write-Host "  vercel CLI nao encontrada - instalando globalmente..." -ForegroundColor Yellow
    npm install -g vercel 2>&1 | Out-Null
    if ($LASTEXITCODE -ne 0) { throw "Falha ao instalar vercel CLI." }
  }
  $vercelVer = "?"
  try {
    $raw = & cmd /c "vercel --version 2>&1"
    if ($LASTEXITCODE -eq 0 -and $raw) {
      $verLine = $raw | Where-Object { $_ -match '\d+\.\d+\.\d+' } | Select-Object -First 1
      if ($verLine) { $vercelVer = ($verLine.ToString()).Trim() }
    }
  } catch { $vercelVer = "?" }
  Write-Host ("  vercel: {0}" -f $vercelVer) -ForegroundColor DarkGray
}

# --- 02. Env loader --------------------------------------------------------
# Mescla, em ordem de prioridade crescente (cada um sobrepoe o anterior):
#   .env  ->  .env.production  ->  .env.local
# Padrao dotenv: .env eh a base; .env.local contem overrides do dev.
$script:Env = $null
Invoke-Stage "02 Carregando variaveis de ambiente" {
  $merged = @{}
  $found = @()
  foreach ($candidate in @(".env", ".env.production", ".env.local")) {
    if (Test-FileExistsRaw $candidate) {
      $found += $candidate
      $partial = Read-DotEnv $candidate
      foreach ($k in $partial.Keys) { $merged[$k] = $partial[$k] }
    }
  }
  if ($found.Count -eq 0) { throw "Nenhum arquivo .env / .env.production / .env.local encontrado." }
  Write-Host ("  Origem: {0}" -f ($found -join " + ")) -ForegroundColor DarkGray
  $script:Env = $merged

  # Gera CRON_SECRET automaticamente se faltar (e persiste em .env.local).
  if (-not $merged.ContainsKey("CRON_SECRET") -or [string]::IsNullOrWhiteSpace($merged["CRON_SECRET"])) {
    $bytes = New-Object byte[] 32
    [System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
    $generated = -join ($bytes | ForEach-Object { "{0:x2}" -f $_ })
    $merged["CRON_SECRET"] = $generated
    $localPath = [System.IO.Path]::GetFullPath(".env.local")
    $append = if ([System.IO.File]::Exists($localPath)) { "`r`nCRON_SECRET=$generated`r`n" } else { "CRON_SECRET=$generated`r`n" }
    [System.IO.File]::AppendAllText($localPath, $append, [System.Text.UTF8Encoding]::new($false))
    Write-Host "  CRON_SECRET gerado automaticamente e salvo em .env.local" -ForegroundColor Yellow
  }

  Require-Env $merged "VITE_SUPABASE_URL"
  Require-Env $merged "VITE_SUPABASE_ANON_KEY"
  Require-Env $merged "SUPABASE_SERVICE_ROLE_KEY"
  Require-Env $merged "CRON_SECRET"

  foreach ($k in @("SHOPEE_APP_ID", "SHOPEE_APP_SECRET")) {
    if (-not $merged.ContainsKey($k) -or [string]::IsNullOrWhiteSpace($merged[$k])) {
      Write-Host ("  AVISO: {0} vazio - a sincronizacao Shopee falhara ate preencher." -f $k) -ForegroundColor Yellow
    }
  }
  Write-Host ("  Variaveis carregadas: {0}" -f $merged.Count) -ForegroundColor DarkGray
}

# --- 03. Install -----------------------------------------------------------
if (-not $SkipInstall) {
  Invoke-Stage "03 npm install" {
    $out = & npm install --no-audit --no-fund 2>&1
    if ($LASTEXITCODE -ne 0) {
      $out | ForEach-Object { Write-Host ($_ | Out-String).TrimEnd() -ForegroundColor Red }
      throw "npm install falhou."
    }
  }
} else { Write-Host "(03 Install pulado por flag)" -ForegroundColor DarkYellow }

# --- 04. Type-check --------------------------------------------------------
Invoke-Stage "04 Type-check (tsc --noEmit)" {
  $out = & npx tsc --noEmit 2>&1
  if ($LASTEXITCODE -ne 0) {
    $out | ForEach-Object { Write-Host ("    {0}" -f $_) -ForegroundColor Red }
    throw "TypeScript reportou erros. Corrija antes de fazer deploy."
  }
  Write-Host "  Zero erros." -ForegroundColor DarkGray
}

# --- 05. Build -------------------------------------------------------------
if (-not $SkipBuild) {
  Invoke-Stage "05 Build de producao (npm run build)" {
    $out = & npm run build 2>&1
    if ($LASTEXITCODE -ne 0) {
      $out | ForEach-Object { Write-Host ($_ | Out-String).TrimEnd() -ForegroundColor Red }
      throw "Falha no build."
    }
    # Mostra apenas a linha de "built in" como confirmacao discreta.
    $built = ($out | Out-String) -split "`r?`n" | Where-Object { $_ -match 'built in|Generated|ready' } | Select-Object -First 4
    $built | ForEach-Object { Write-Host ("  {0}" -f $_) -ForegroundColor DarkGray }
  }
} else { Write-Host "(05 Build pulado por flag)" -ForegroundColor DarkYellow }

# --- 06. Supabase link -----------------------------------------------------
if ((-not $SkipMigrations) -or (-not $SkipFunctions)) {
  Invoke-Stage "06 Supabase link" {
    $linkOut = & npx --yes supabase link --project-ref $SupabaseProjectRef 2>&1
    if ($LASTEXITCODE -ne 0) {
      $linkOut | ForEach-Object { Write-Host ("    {0}" -f $_) -ForegroundColor DarkGray }
      throw "Falha no supabase link. Rode 'npx supabase login' primeiro."
    }
    Write-Host "  Linked OK." -ForegroundColor DarkGray
  }
}

# --- 07. Migrations --------------------------------------------------------
if (-not $SkipMigrations) {
  Invoke-Stage "07 Migrations (db push)" {
    $out = & npx --yes supabase db push --include-all 2>&1
    $out | ForEach-Object { Write-Host ("    {0}" -f $_) -ForegroundColor DarkGray }
    if ($LASTEXITCODE -ne 0) { throw "supabase db push falhou." }
  }
}

# --- 08. Edge Functions ----------------------------------------------------
if (-not $SkipFunctions) {
  Invoke-Stage "08 Deploy Edge Functions" {
    $fnDir = "supabase/functions"
    if (-not (Test-FileExistsRaw (Join-Path $fnDir 'shopee-cron/index.ts'))) {
      Write-Host "  Sem pasta supabase/functions - nada a deployar." -ForegroundColor DarkGray
      return
    }
    $functions = Get-ChildItem -LiteralPath $fnDir -Directory | Where-Object {
      Test-FileExistsRaw ($_.FullName + "/index.ts")
    }
    if ($functions.Count -eq 0) {
      Write-Host "  Nenhuma function encontrada." -ForegroundColor DarkGray
      return
    }
    foreach ($fn in $functions) {
      Write-Host ("  -> {0}" -f $fn.Name) -ForegroundColor DarkGray
      $out = & npx --yes supabase functions deploy $fn.Name --project-ref $SupabaseProjectRef 2>&1
      if ($LASTEXITCODE -ne 0) {
        $out | ForEach-Object { Write-Host ("      {0}" -f $_) -ForegroundColor Red }
        throw ("Deploy da Edge Function '{0}' falhou." -f $fn.Name)
      }
    }
  }
}

# --- 09. Supabase secrets --------------------------------------------------
if (-not $SkipFunctions) {
  Invoke-Stage "09 Sincronizando secrets do Supabase (Edge Functions)" {
    $webUrl = $script:Env["WEB_URL"]
    if ([string]::IsNullOrWhiteSpace($webUrl)) {
      $webUrl = "https://$ProductionDomain"
      Write-Host ("  WEB_URL nao estava em .env - usando {0}" -f $webUrl) -ForegroundColor DarkGray
    }
    $secrets = [ordered]@{
      "WEB_URL"                   = $webUrl
      "CRON_SECRET"               = $script:Env["CRON_SECRET"]
      "SHOPEE_APP_ID"             = $script:Env["SHOPEE_APP_ID"]
      "SHOPEE_APP_SECRET"         = $script:Env["SHOPEE_APP_SECRET"]
      "SUPABASE_SERVICE_ROLE_KEY" = $script:Env["SUPABASE_SERVICE_ROLE_KEY"]
    }
    $kvArgs = New-Object System.Collections.Generic.List[string]
    foreach ($k in $secrets.Keys) {
      $v = $secrets[$k]
      if ([string]::IsNullOrWhiteSpace($v)) { continue }
      $kvArgs.Add("$k=$v")
    }
    if ($kvArgs.Count -eq 0) {
      Write-Host "  Nenhum secret a definir." -ForegroundColor DarkGray
      return
    }
    $allArgs = @("--yes","supabase","secrets","set","--project-ref",$SupabaseProjectRef) + $kvArgs
    $out = & npx @allArgs 2>&1
    if ($LASTEXITCODE -ne 0) {
      $out | ForEach-Object { Write-Host ("    {0}" -f $_) -ForegroundColor Red }
      throw "Falha ao definir secrets na Supabase."
    }
    Write-Host ("  Secrets aplicados: {0}" -f ($secrets.Keys -join ", ")) -ForegroundColor DarkGray
  }
}

# --- 10. Vercel link -------------------------------------------------------
if (-not $SkipVercel) {
  Invoke-Stage "10 Vercel link" {
    $out = & vercel link --yes 2>&1
    if ($LASTEXITCODE -ne 0) {
      $out | ForEach-Object { Write-Host ("    {0}" -f $_) -ForegroundColor DarkGray }
      throw "vercel link falhou (rode 'vercel login' primeiro)."
    }
  }
}

# --- 11. Vercel env vars ---------------------------------------------------
# Sincroniza envs (production+preview+development) chamando o vc.js (CLI real)
# direto via node, com stdin redirecionado a partir de arquivo UTF-8 SEM BOM.
# A .ps1 shim do npm reembala stdin via `$input | & node` no PS 5.1 e isso
# prepende BOM no primeiro caractere — gerando o erro:
#   "String contains non ISO-8859-1 code point" no fetch() do Supabase.
if (-not $SkipVercel) {
  Invoke-Stage "11 Sincronizando variaveis no Vercel" {
    $vercelCmd = Get-Command vercel -ErrorAction Stop
    $vercelDir = Split-Path $vercelCmd.Source -Parent
    $vcJs      = Join-Path $vercelDir 'node_modules\vercel\dist\vc.js'
    if (-not [System.IO.File]::Exists($vcJs)) {
      throw "Nao foi possivel localizar vc.js em $vcJs"
    }
    $nodeCmd = Get-Command node -ErrorAction Stop
    $nodeExe = $nodeCmd.Source

    $keysToSync = @(
      "VITE_SUPABASE_URL",
      "VITE_SUPABASE_ANON_KEY",
      "SUPABASE_SERVICE_ROLE_KEY",
      "SHOPEE_APP_ID",
      "SHOPEE_APP_SECRET",
      "CRON_SECRET",
      "STRIPE_SECRET_KEY",
      "MERCADOPAGO_ACCESS_TOKEN",
      "VITE_VAPID_PUBLIC_KEY"
    )
    foreach ($key in $keysToSync) {
      if (-not $script:Env.ContainsKey($key)) { continue }
      $val = $script:Env[$key]
      if ([string]::IsNullOrWhiteSpace($val)) { continue }
      # Limpa BOM e whitespace nas pontas.
      $clean = ($val -replace "^\uFEFF", "").Trim()
      if ($clean.Length -lt $val.Length) {
        Write-Host ("  [WARN] {0}: removidos {1} chars de lixo (BOM/espacos)" -f $key, ($val.Length - $clean.Length)) -ForegroundColor Yellow
      }

      $tmp       = New-TemporaryFile
      $stdoutLog = [System.IO.Path]::GetTempFileName()
      $stderrLog = [System.IO.Path]::GetTempFileName()
      try {
        # UTF-8 SEM BOM, SEM newline final.
        [System.IO.File]::WriteAllText($tmp.FullName, $clean, [System.Text.UTF8Encoding]::new($false))
        foreach ($envTarget in @("production","preview","development")) {
          # Remove valor anterior (idempotente).
          Start-Process -FilePath $nodeExe `
            -ArgumentList @($vcJs,"env","rm",$key,$envTarget,"--yes") `
            -NoNewWindow -Wait `
            -RedirectStandardOutput $stdoutLog -RedirectStandardError $stderrLog | Out-Null
          # Adiciona novo valor — stdin vem do arquivo UTF-8 puro.
          $procAdd = Start-Process -FilePath $nodeExe `
            -ArgumentList @($vcJs,"env","add",$key,$envTarget) `
            -NoNewWindow -Wait -PassThru `
            -RedirectStandardInput $tmp.FullName `
            -RedirectStandardOutput $stdoutLog -RedirectStandardError $stderrLog
          if ($procAdd.ExitCode -ne 0) {
            $err = ""
            try { $err = [System.IO.File]::ReadAllText($stderrLog) } catch {}
            throw ("vercel env add {0} {1} retornou exit {2}: {3}" -f $key, $envTarget, $procAdd.ExitCode, $err)
          }
        }
      } finally {
        Remove-Item -LiteralPath $tmp.FullName -Force -ErrorAction SilentlyContinue
        Remove-Item -LiteralPath $stdoutLog -Force -ErrorAction SilentlyContinue
        Remove-Item -LiteralPath $stderrLog -Force -ErrorAction SilentlyContinue
      }
      Write-Host ("  [OK] {0}" -f $key) -ForegroundColor DarkGray
    }
  }
}

# --- 12. Vercel deploy -----------------------------------------------------
$script:DeployUrl = $null
if (-not $SkipVercel) {
  Invoke-Stage "12 Vercel deploy --prod" {
    $out = & vercel --prod --yes 2>&1
    $out | ForEach-Object { Write-Host ("    {0}" -f $_) -ForegroundColor DarkGray }
    if ($LASTEXITCODE -ne 0) { throw "vercel deploy falhou." }
    $urlLine = ($out | Where-Object { $_ -match "https://[A-Za-z0-9.-]+\.vercel\.app" } | Select-Object -Last 1)
    if ($urlLine) {
      $null = $urlLine -match "(https://[A-Za-z0-9.-]+\.vercel\.app)"
      $script:DeployUrl = $Matches[1]
      Write-Host ("  Deploy URL: {0}" -f $script:DeployUrl) -ForegroundColor DarkGray
    }
  }
}

# --- 13. Validacoes pos-deploy --------------------------------------------
if (-not $SkipValidation) {
  Invoke-Stage "13a Validacao -- Supabase reachable" {
    $u = $script:Env["VITE_SUPABASE_URL"].TrimEnd("/") + "/auth/v1/health"
    $apikey = $script:Env["VITE_SUPABASE_ANON_KEY"]
    $res = Invoke-WebRequest -Uri $u -Method GET -TimeoutSec 15 -UseBasicParsing `
      -Headers @{ apikey = $apikey }
    if ($res.StatusCode -ne 200) { throw "Supabase auth health retornou $($res.StatusCode)" }
    Write-Host ("  Supabase OK ({0})" -f $res.StatusCode) -ForegroundColor DarkGray
  }

  Invoke-Stage "13b Validacao -- Site em producao" {
    $base = "https://www.$ProductionDomain"
    try {
      $res = Invoke-WebRequest -Uri $base -Method GET -TimeoutSec 30 -UseBasicParsing -MaximumRedirection 5
      $status = $res.StatusCode
    } catch [System.Net.WebException] {
      # PS 5.1 nao segue 308 nativamente. Aceitamos qualquer 2xx/3xx como vivo.
      if ($_.Exception.Response) {
        $status = [int]$_.Exception.Response.StatusCode
      } else { throw }
    }
    if ($status -lt 200 -or $status -ge 400) { throw "GET $base retornou $status" }
    Write-Host ("  {0} OK ({1})" -f $base, $status) -ForegroundColor DarkGray
    if ($script:DeployUrl) {
      Write-Host ("  (deploy preview: {0})" -f $script:DeployUrl) -ForegroundColor DarkGray
    }
  }

  Invoke-Stage "13c Validacao -- /api/cron/shopee-sync (cleanup)" {
    $base = "https://www.$ProductionDomain"
    $secret = $script:Env["CRON_SECRET"]
    $u = "$base/api/cron/shopee-sync?secret=$([uri]::EscapeDataString($secret))&job=cleanup"
    try {
      $res = Invoke-WebRequest -Uri $u -Method GET -TimeoutSec 60 -UseBasicParsing -MaximumRedirection 5
      $status = $res.StatusCode
      $content = $res.Content
    } catch [System.Net.WebException] {
      if ($_.Exception.Response) {
        $status = [int]$_.Exception.Response.StatusCode
        $stream = $_.Exception.Response.GetResponseStream()
        $reader = New-Object System.IO.StreamReader($stream)
        $content = $reader.ReadToEnd()
      } else { throw }
    }
    if ($status -ne 200) { throw "cron sync retornou $status (body: $content)" }
    $preview = $content.Substring(0, [Math]::Min(200, $content.Length))
    Write-Host ("  cleanup OK -- {0}" -f $preview) -ForegroundColor DarkGray
  }

  Invoke-Stage "13d Validacao -- Edge Function shopee-cron" {
    $url  = "$($script:Env["VITE_SUPABASE_URL"].TrimEnd('/'))/functions/v1/shopee-cron"
    $svc  = $script:Env["SUPABASE_SERVICE_ROLE_KEY"]
    $bodyJson = '{"jobs":["cleanup"]}'
    $res = Invoke-WebRequest -Uri $url -Method POST -TimeoutSec 60 -UseBasicParsing `
      -Headers @{ Authorization = "Bearer $svc"; "Content-Type" = "application/json" } `
      -Body $bodyJson
    if ($res.StatusCode -ne 200) { throw "Edge Function retornou $($res.StatusCode)" }
    Write-Host ("  shopee-cron OK ({0})" -f $res.StatusCode) -ForegroundColor DarkGray
  } -Optional
}

# --- 14. Relatorio final ---------------------------------------------------
Show-Report

Start-Process "https://vercel.com/dashboard" -ErrorAction SilentlyContinue
Start-Process ("https://supabase.com/dashboard/project/{0}" -f $SupabaseProjectRef) -ErrorAction SilentlyContinue
