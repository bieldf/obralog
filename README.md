# ObraLog — Guia de instalação e deploy

## O que é este projeto?
App web de gestão de obras com:
- Login por usuário (engenheiro, empreiteiro, trabalhador)
- Relatórios diários com upload de fotos
- Tarefas com kanban (pendente / em andamento / concluída)
- Plantas e documentos do projeto
- Gerenciamento de equipe

Stack: **React** (frontend) + **Supabase** (banco de dados, auth, storage)

---

## Passo 1 — Criar conta no Supabase (gratuito)

1. Acesse https://supabase.com e clique em **Start for free**
2. Crie um novo projeto (anote a senha do banco)
3. Espere o projeto inicializar (~2 minutos)

---

## Passo 2 — Configurar o banco de dados

1. No painel do Supabase, vá em **SQL Editor**
2. Clique em **New query**
3. Cole todo o conteúdo do arquivo `SUPABASE_SCHEMA.sql`
4. Clique em **Run** (▶)
5. Deve aparecer "Success" sem erros

---

## Passo 3 — Pegar as chaves da API

1. No Supabase, vá em **Settings → API**
2. Copie:
   - **Project URL** (ex: `https://xyzabc.supabase.co`)
   - **anon public** key (a chave longa)

---

## Passo 4 — Configurar o projeto local

```bash
# Entre na pasta do projeto
cd obralog

# Copie o arquivo de variáveis de ambiente
cp .env.example .env

# Edite o .env com suas chaves:
# REACT_APP_SUPABASE_URL=https://SEU_PROJETO.supabase.co
# REACT_APP_SUPABASE_ANON_KEY=sua_anon_key_aqui

# Instale as dependências
npm install

# Rode localmente
npm start
```

O app abre em http://localhost:3000

---

## Passo 5 — Fazer o deploy (publicar online)

### Opção A: Vercel (recomendado — gratuito)

```bash
# Instale o CLI da Vercel
npm install -g vercel

# Faça o deploy
vercel

# Siga as instruções. Quando perguntar sobre variáveis de ambiente,
# adicione REACT_APP_SUPABASE_URL e REACT_APP_SUPABASE_ANON_KEY
```

### Opção B: Netlify

```bash
npm run build
# Arraste a pasta `build` para https://netlify.com/drop
# Configure as variáveis de ambiente no painel do Netlify
```

---

## Como usar o app

### Primeiro acesso (engenheiro):
1. Acesse o app → clique em **Cadastre-se**
2. Preencha nome, função = **Engenheiro** e senha
3. Uma obra de exemplo é criada automaticamente
4. Vá em **Projeto** para renomear e configurar a obra

### Adicionar trabalhadores:
1. Trabalhador se cadastra no app com função **Trabalhador** ou **Empreiteiro**
2. Engenheiro vai em **Equipe → Adicionar membro** e busca pelo nome
3. Trabalhador passa a ter acesso à obra

### Criar relatório (trabalhador/empreiteiro):
1. Clique em **Novo Relatório** (sidebar ou topo)
2. Preencha data, setor, o que foi feito, materiais
3. Adicione fotos (obrigatório para registrar progresso visual)
4. Salve — engenheiro vê imediatamente

---

## Estrutura de arquivos

```
obralog/
├── public/
│   └── index.html
├── src/
│   ├── components/
│   │   └── Sidebar.jsx       # Navegação lateral
│   ├── hooks/
│   │   └── useAuth.js        # Contexto de autenticação
│   ├── lib/
│   │   └── supabase.js       # Cliente Supabase + upload
│   ├── pages/
│   │   ├── Login.jsx         # Tela de login/cadastro
│   │   ├── Dashboard.jsx     # Painel principal
│   │   ├── Relatorios.jsx    # Lista, detalhe e novo relatório
│   │   ├── Tarefas.jsx       # Kanban de tarefas
│   │   ├── Projeto.jsx       # Info da obra + plantas
│   │   └── Equipe.jsx        # Membros da equipe
│   ├── App.js                # Roteamento principal
│   ├── index.js              # Entry point
│   └── index.css             # Estilos globais
├── SUPABASE_SCHEMA.sql       # Schema do banco
├── .env.example              # Template de variáveis
└── package.json
```

---

## Suporte
Dúvidas sobre Supabase: https://supabase.com/docs
Dúvidas sobre deploy Vercel: https://vercel.com/docs
