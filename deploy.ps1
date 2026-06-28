# deploy.ps1
# Automatiza o deploy completo do projeto "The Mom's Secret Stash"
# Executar com: .\deploy.ps1 (no PowerShell)

Write-Host "[INFO] Iniciando deploy completo do projeto..." -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Yellow

# 1. Executar build local para testar a aplicação
Write-Host "[BUILD] Verificando compilação da aplicação..." -ForegroundColor Yellow
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Error "[ERROR] Falha no build da aplicação! Corrija os erros antes de fazer o deploy."
    exit 1
}
Write-Host "[BUILD] Build concluído com sucesso!" -ForegroundColor Green

# 2. Executar migrações do banco de dados (Supabase)
Write-Host "[DATABASE] Iniciando migrações do banco de dados..." -ForegroundColor Yellow
Write-Host "Deseja rodar as migrações usando a CLI do Supabase (npx supabase)? (S/N): " -NoNewline
$runDb = Read-Host
if ($runDb -eq "S" -or $runDb -eq "s" -or $runDb -eq "Sim" -or $runDb -eq "sim") {
    # Inicializa o Supabase se necessário
    if (-not (Test-Path "supabase/config.toml")) {
        Write-Host "[DATABASE] Inicializando configurações da CLI do Supabase..." -ForegroundColor Yellow
        npx supabase init
    }

    # Prepara o arquivo de migração combinando schema e seed se não houver migrações
    if (-not (Test-Path "supabase/migrations") -or (Get-ChildItem "supabase/migrations/*.sql" -ErrorAction SilentlyContinue).Count -eq 0) {
        Write-Host "[DATABASE] Convertendo schema.sql e seed.sql em uma migração local..." -ForegroundColor Yellow
        New-Item -ItemType Directory -Force -Path "supabase/migrations" > $null
        $timestamp = Get-Date -Format "yyyyMMddHHmmss"
        $migrationFile = "supabase/migrations/${timestamp}_init.sql"
        $schemaContent = Get-Content "supabase/schema.sql" -Raw
        $seedContent = ""
        if (Test-Path "supabase/seed.sql") {
            $seedContent = Get-Content "supabase/seed.sql" -Raw
        }
        Set-Content -Path $migrationFile -Value ($schemaContent + "`n" + $seedContent)
        Write-Host "[DATABASE] Migração inicial criada com sucesso em $migrationFile" -ForegroundColor Green
    }

    # Executa login e link
    Write-Host "[DATABASE] Vinculando projeto local ao projeto Supabase remoto..." -ForegroundColor Yellow
    Write-Host "Faremos login via navegador na sua conta Supabase." -ForegroundColor Cyan
    npx supabase login
    npx supabase link --project-ref jebumofptyqbgtgvgywv

    # Envia migrações
    Write-Host "[DATABASE] Enviando migrações ao banco de dados remoto..." -ForegroundColor Yellow
    npx supabase db push
    if ($LASTEXITCODE -ne 0) {
        Write-Warning "⚠️ Falha ao aplicar as migrações via CLI."
        Write-Warning "Caso precise, você também pode colar o schema.sql no SQL Editor do painel do Supabase."
        Write-Host "Pressione qualquer tecla para continuar..." -ForegroundColor Yellow
        $null = [System.Console]::ReadKey($true)
    } else {
        Write-Host "[DATABASE] Banco de dados atualizado com sucesso via CLI!" -ForegroundColor Green
    }
} else {
    Write-Host "[DATABASE] Etapa de banco de dados pulada pelo usuário." -ForegroundColor DarkYellow
}

# 3. Sincronizar com o GitHub
Write-Host "[GITHUB] Enviando código para o GitHub..." -ForegroundColor Yellow
git add .
git commit -m "Auto deploy commit" > $null 2>&1

# Verificar se tem origin configurado
$hasRemote = git remote -v
if ($hasRemote -like "*origin*") {
    git branch -M main
    git push -u origin main
    if ($LASTEXITCODE -eq 0) {
        Write-Host "[GITHUB] Código enviado ao GitHub com sucesso!" -ForegroundColor Green
    } else {
        Write-Warning "⚠️ Falha ao fazer push para o GitHub. Verifique suas credenciais de SSH/HTTPS."
    }
} else {
    Write-Warning "⚠️ Nenhum repositório remoto 'origin' configurado. Pulando o push do GitHub."
}

# 4. Deploy no Vercel
Write-Host "[VERCEL] Iniciando deploy no Vercel..." -ForegroundColor Yellow
# Carrega variáveis do .env para configurar no Vercel
$supabaseUrl = ""
$supabaseAnon = ""
if (Test-Path ".env") {
    $envContent = Get-Content ".env"
    foreach ($line in $envContent) {
        if ($line -match "VITE_SUPABASE_URL=(.*)") {
            $supabaseUrl = $Matches[1].Trim()
        }
        if ($line -match "VITE_SUPABASE_ANON_KEY=(.*)") {
            $supabaseAnon = $Matches[1].Trim()
        }
    }
}

# Verifica se o vercel está instalado
$vercelCmd = Get-Command vercel -ErrorAction SilentlyContinue
if (-not $vercelCmd) {
    Write-Host "[VERCEL] Vercel CLI não encontrada. Tentando instalar globalmente..." -ForegroundColor Yellow
    npm install -g vercel
    $vercelCmd = Get-Command vercel -ErrorAction SilentlyContinue
}

# Vínculo com o Vercel
if ($vercelCmd) {
    vercel link --yes
    if ($LASTEXITCODE -eq 0) {
    # Adicionar envs se existirem
    if ($supabaseUrl -ne "" -and $supabaseAnon -ne "") {
        Write-Host "[VERCEL] Configurando variáveis de ambiente no Vercel..." -ForegroundColor Yellow
        # Remove antigas se existirem para evitar conflito
        vercel env rm VITE_SUPABASE_URL production --yes 2>$null
        vercel env rm VITE_SUPABASE_ANON_KEY production --yes 2>$null
        vercel env rm VITE_SUPABASE_URL preview --yes 2>$null
        vercel env rm VITE_SUPABASE_ANON_KEY preview --yes 2>$null
        vercel env rm VITE_SUPABASE_URL development --yes 2>$null
        vercel env rm VITE_SUPABASE_ANON_KEY development --yes 2>$null
        
        # Adiciona novas
        echo $supabaseUrl | vercel env add VITE_SUPABASE_URL production
        echo $supabaseAnon | vercel env add VITE_SUPABASE_ANON_KEY production
        echo $supabaseUrl | vercel env add VITE_SUPABASE_URL preview
        echo $supabaseAnon | vercel env add VITE_SUPABASE_ANON_KEY preview
        echo $supabaseUrl | vercel env add VITE_SUPABASE_URL development
        echo $supabaseAnon | vercel env add VITE_SUPABASE_ANON_KEY development
    }
    
    # Deploy de produção
    vercel --prod --yes
    if ($LASTEXITCODE -eq 0) {
        Write-Host "[VERCEL] Deploy concluído com sucesso!" -ForegroundColor Green
    } else {
        Write-Error "[ERROR] Falha ao executar deploy no Vercel!"
        exit 1
    }
    } else {
        Write-Warning "⚠️ Falha ao vincular projeto com o Vercel (certifique-se de que a Vercel CLI está instalada com 'npm install -g vercel' e logada com 'vercel login')."
    }
} else {
    Write-Warning "⚠️ Vercel CLI não está disponível no sistema. Deploy no Vercel pulado."
}

# 5. Abrir site e gerenciador do banco no navegador
Write-Host "[OPEN] Abrindo painéis no navegador..." -ForegroundColor Green
Start-Process "https://vercel.com/dashboard"
Start-Process "https://supabase.com/dashboard/project/jebumofptyqbgtgvgywv/editor"

# 6. Mensagem final
Write-Host "============================================" -ForegroundColor Yellow
Write-Host "[SUCCESS] PROCESSO DE DEPLOY CONCLUÍDO!" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Yellow
