const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { execSync } = require('child_process');
const postgres = require('postgres');

// Function to prompt the user
function askQuestion(query) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  return new Promise(resolve => rl.question(query, ans => {
    rl.close();
    resolve(ans);
  }));
}

// Helper to URL-encode password in connection string
function formatConnectionString(uri) {
  const regex = /^(postgresql?:\/\/)([^:]+):(.*)@([^:/]+)(:\d+)?(\/.*)?$/;
  const match = uri.match(regex);
  if (!match) return uri;

  const protocol = match[1];
  const username = match[2];
  const password = match[3];
  const host = match[4];
  const port = match[5] || ':5432';
  const rest = match[6] || '/postgres';

  // Decode first in case it is already partially encoded, then encode
  const encodedPassword = encodeURIComponent(decodeURIComponent(password));
  
  return `${protocol}${username}:${encodedPassword}@${host}${port}${rest}`;
}

// Function to parse .env file
function loadEnv() {
  const envPath = path.join(__dirname, '../.env');
  if (!fs.existsSync(envPath)) return {};
  const content = fs.readFileSync(envPath, 'utf-8');
  const env = {};
  content.split(/\r?\n/).forEach(line => {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match) {
      let value = match[2] || '';
      if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
      if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
      env[match[1]] = value.trim();
    }
  });
  return env;
}

async function main() {
  console.log('====================================================');
  console.log('         Script de Deploy Automatizado (CLI)        ');
  console.log('====================================================');

  const env = loadEnv();
  const supabaseUrl = env.VITE_SUPABASE_URL;
  const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl) {
    console.error('ERRO: VITE_SUPABASE_URL não encontrada no arquivo .env.');
    process.exit(1);
  }

  // Extract project ref from supabase URL
  let projectRef = '';
  try {
    const url = new URL(supabaseUrl);
    projectRef = url.hostname.split('.')[0];
  } catch (e) {
    const match = supabaseUrl.match(/https?:\/\/([^.]+)\.supabase/);
    if (match) projectRef = match[1];
  }

  if (!projectRef) {
    console.error('ERRO: Não foi possível extrair o Project Ref do Supabase a partir de VITE_SUPABASE_URL.');
    process.exit(1);
  }

  console.log(`Ref. do Projeto Supabase Detectado: ${projectRef}`);

  // --- Step 1: Database Migrations ---
  console.log('\n--- Passo 1: Executar Migrações no Supabase ---');
  console.log('Precisamos da URI de conexão (Connection String) do seu banco de dados.');
  console.log('Você pode encontrá-la no painel do Supabase:');
  console.log('-> Settings (Engrenagem) > Database > Connection string > URI');
  console.log('Exemplo: postgresql://postgres:[SUA-SENHA]@aws-0-sa-east-1.pooler.supabase.com:6543/postgres?sslmode=require');
  console.log('*(Se você não lembra da senha, clique em "Reset database password" na mesma página)');
  console.log('====================================================');
  
  const connectionStringInput = await askQuestion('Cole a URI de conexão (Connection String) do Supabase: ');
  if (!connectionStringInput) {
    console.error('ERRO: A string de conexão é necessária para aplicar as migrações.');
    process.exit(1);
  }

  const connectionString = formatConnectionString(connectionStringInput.trim());
  const sql = postgres(connectionString, {
    ssl: { rejectUnauthorized: false },
    max: 1
  });

  try {
    console.log('Conectando ao banco de dados Supabase e aplicando o schema (schema.sql)...');
    const schemaPath = path.join(__dirname, '../supabase/schema.sql');
    if (!fs.existsSync(schemaPath)) {
      throw new Error(`Arquivo schema.sql não encontrado em ${schemaPath}`);
    }
    const schemaSql = fs.readFileSync(schemaPath, 'utf-8');
    
    // We execute the raw SQL schema
    await sql.unsafe(schemaSql);
    console.log('✓ Schema do banco de dados e functions criados com sucesso!');

    console.log('Aplicando os dados iniciais (seed.sql)...');
    const seedPath = path.join(__dirname, '../supabase/seed.sql');
    if (fs.existsSync(seedPath)) {
      const seedSql = fs.readFileSync(seedPath, 'utf-8');
      await sql.unsafe(seedSql);
      console.log('✓ Dados iniciais (seed.sql) inseridos com sucesso!');
    } else {
      console.log('Aviso: Arquivo seed.sql não encontrado. Pulando etapa de semente.');
    }
  } catch (err) {
    console.error('❌ Erro durante a execução das migrações do banco de dados:');
    console.error(err.message);
    await sql.end();
    process.exit(1);
  } finally {
    await sql.end();
  }

  // --- Step 2: GitHub Upload ---
  console.log('\n--- Passo 2: Sincronizar Código com o GitHub ---');
  try {
    // Check if git is initialized
    try {
      execSync('git rev-parse --is-inside-work-tree', { stdio: 'ignore' });
      console.log('Git já está inicializado.');
    } catch (e) {
      console.log('Inicializando repositório Git...');
      execSync('git init', { stdio: 'inherit' });
    }

    // Add everything
    console.log('Adicionando arquivos para o Git...');
    execSync('git add .', { stdio: 'inherit' });

    // Commit
    try {
      execSync('git commit -m "Configure database schema, migrations and env variables"', { stdio: 'inherit' });
      console.log('✓ Commit criado com sucesso.');
    } catch (e) {
      console.log('Nenhuma alteração pendente para commitar.');
    }

    // Check remote origin
    let hasRemote = false;
    try {
      const remotes = execSync('git remote -v', { encoding: 'utf-8' });
      if (remotes.includes('origin')) {
        hasRemote = true;
      }
    } catch (e) {}

    if (!hasRemote) {
      console.log('\nNenhum repositório remoto ("origin") configurado.');
      const repoUrl = await askQuestion('Digite a URL do seu repositório GitHub (ex: https://github.com/user/repo.git) ou pressione ENTER para pular: ');
      if (repoUrl.trim()) {
        execSync(`git remote add origin ${repoUrl.trim()}`, { stdio: 'inherit' });
        console.log(`✓ Remoto origin configurado para: ${repoUrl.trim()}`);
        hasRemote = true;
      }
    }

    if (hasRemote) {
      console.log('Enviando código para o branch principal...');
      execSync('git branch -M main', { stdio: 'inherit' });
      try {
        execSync('git push -u origin main', { stdio: 'inherit' });
        console.log('✓ Código enviado com sucesso para o GitHub.');
      } catch (e) {
        console.warn('⚠️ Não foi possível realizar o push (verifique permissões/existência do repositório remoto).');
      }
    } else {
      console.log('Etapa de envio para o GitHub pulada.');
    }
  } catch (err) {
    console.error('❌ Erro durante o processo do GitHub:', err.message);
  }

  // --- Step 3: Vercel Deployment ---
  console.log('\n--- Passo 3: Publicação no Vercel ---');
  try {
    try {
      execSync('vercel --version', { stdio: 'ignore' });
      console.log('Vercel CLI detectado.');
    } catch (e) {
      console.log('Instalando a Vercel CLI globalmente...');
      execSync('npm install -g vercel', { stdio: 'inherit' });
    }

    console.log('Vinculando projeto com o Vercel...');
    execSync('vercel link --yes', { stdio: 'inherit' });

    console.log('Adicionando variáveis de ambiente ao projeto no Vercel...');
    const addVercelEnv = (key, value) => {
      try {
        // Suppress error if the variable does not exist yet when deleting
        try {
          execSync(`vercel env rm ${key} production --yes`, { stdio: 'ignore' });
        } catch (e) {}
        try {
          execSync(`vercel env rm ${key} preview --yes`, { stdio: 'ignore' });
        } catch (e) {}
        try {
          execSync(`vercel env rm ${key} development --yes`, { stdio: 'ignore' });
        } catch (e) {}

        // Add to production
        execSync(`vercel env add ${key} production`, {
          input: value,
          stdio: ['pipe', 'inherit', 'inherit']
        });
        
        // Add to preview
        execSync(`vercel env add ${key} preview`, {
          input: value,
          stdio: ['pipe', 'inherit', 'inherit']
        });
        
        // Add to development
        execSync(`vercel env add ${key} development`, {
          input: value,
          stdio: ['pipe', 'inherit', 'inherit']
        });
        
        console.log(`✓ Variável ${key} configurada no Vercel.`);
      } catch (err) {
        console.error(`Erro ao adicionar variável ${key} no Vercel:`, err.message);
      }
    };

    if (supabaseUrl && supabaseAnonKey) {
      addVercelEnv('VITE_SUPABASE_URL', supabaseUrl);
      addVercelEnv('VITE_SUPABASE_ANON_KEY', supabaseAnonKey);
    }

    console.log('Executando deploy final de produção no Vercel...');
    execSync('vercel --prod --yes', { stdio: 'inherit' });
    console.log('✓ Deploy finalizado com sucesso no Vercel!');
  } catch (err) {
    console.error('❌ Erro durante o deploy no Vercel:', err.message);
  }

  console.log('\n====================================================');
  console.log('     Processo de Deploy Concluído com Sucesso!     ');
  console.log('====================================================\n');
}

main().catch(err => {
  console.error('Erro geral no script de deploy:', err);
  process.exit(1);
});
