-- =============================================================
-- ObraLog — Schema Supabase
-- Execute este SQL no Supabase SQL Editor
-- =============================================================

-- Tabela de perfis de usuário
create table profiles (
  id uuid references auth.users on delete cascade primary key,
  nome text not null,
  role text not null check (role in ('engenheiro', 'empreiteiro', 'trabalhador')),
  especialidade text,
  avatar_url text,
  created_at timestamptz default now()
);

-- Tabela de obras
create table obras (
  id uuid default gen_random_uuid() primary key,
  nome text not null,
  endereco text,
  descricao text,
  data_inicio date,
  data_fim_prevista date,
  progresso integer default 0 check (progresso between 0 and 100),
  status text default 'em_andamento' check (status in ('em_andamento', 'pausada', 'concluida')),
  criado_por uuid references profiles(id),
  created_at timestamptz default now()
);

-- Tabela de membros da obra
create table obra_membros (
  id uuid default gen_random_uuid() primary key,
  obra_id uuid references obras(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  created_at timestamptz default now(),
  unique(obra_id, user_id)
);

-- Tabela de relatórios
create table relatorios (
  id uuid default gen_random_uuid() primary key,
  obra_id uuid references obras(id) on delete cascade,
  autor_id uuid references profiles(id),
  titulo text not null,
  setor text not null,
  descricao text not null,
  materiais text,
  observacoes text,
  status text default 'novo' check (status in ('novo', 'em_andamento', 'concluido', 'em_revisao')),
  data_relatorio date default current_date,
  created_at timestamptz default now()
);

-- Tabela de fotos dos relatórios
create table relatorio_fotos (
  id uuid default gen_random_uuid() primary key,
  relatorio_id uuid references relatorios(id) on delete cascade,
  url text not null,
  nome_arquivo text,
  created_at timestamptz default now()
);

-- Tabela de tarefas
create table tarefas (
  id uuid default gen_random_uuid() primary key,
  obra_id uuid references obras(id) on delete cascade,
  titulo text not null,
  descricao text,
  responsavel_id uuid references profiles(id),
  prioridade text default 'media' check (prioridade in ('alta', 'media', 'baixa')),
  status text default 'pendente' check (status in ('pendente', 'em_andamento', 'concluida')),
  prazo date,
  created_at timestamptz default now()
);

-- Tabela de plantas / documentos
create table plantas (
  id uuid default gen_random_uuid() primary key,
  obra_id uuid references obras(id) on delete cascade,
  nome text not null,
  tipo text default 'planta' check (tipo in ('planta', 'documento', 'projeto')),
  categoria text,
  url text not null,
  tamanho_bytes bigint,
  enviado_por uuid references profiles(id),
  created_at timestamptz default now()
);

-- =====================
-- Storage buckets
-- =====================
insert into storage.buckets (id, name, public) values ('fotos-relatorios', 'fotos-relatorios', true);
insert into storage.buckets (id, name, public) values ('plantas', 'plantas', true);

-- =====================
-- Row Level Security
-- =====================
alter table profiles enable row level security;
alter table obras enable row level security;
alter table obra_membros enable row level security;
alter table relatorios enable row level security;
alter table relatorio_fotos enable row level security;
alter table tarefas enable row level security;
alter table plantas enable row level security;

-- Profiles: usuário vê apenas o seu
create policy "Usuário vê seu perfil" on profiles for select using (auth.uid() = id);
create policy "Usuário atualiza seu perfil" on profiles for update using (auth.uid() = id);
create policy "Usuário cria seu perfil" on profiles for insert with check (auth.uid() = id);

-- Obras: membros veem obras que pertencem
create policy "Membros veem obras" on obras for select
  using (id in (select obra_id from obra_membros where user_id = auth.uid()));
create policy "Engenheiros criam obras" on obras for insert with check (auth.uid() = criado_por);
create policy "Engenheiros atualizam obras" on obras for update
  using (id in (select obra_id from obra_membros where user_id = auth.uid()));

-- Membros de obra
create policy "Membros veem membros" on obra_membros for select
  using (obra_id in (select obra_id from obra_membros where user_id = auth.uid()));
create policy "Engenheiros gerenciam membros" on obra_membros for all
  using (obra_id in (select obra_id from obra_membros where user_id = auth.uid()));

-- Relatórios: membros da obra
create policy "Membros veem relatórios" on relatorios for select
  using (obra_id in (select obra_id from obra_membros where user_id = auth.uid()));
create policy "Membros criam relatórios" on relatorios for insert
  with check (obra_id in (select obra_id from obra_membros where user_id = auth.uid()));
create policy "Autor atualiza relatório" on relatorios for update using (autor_id = auth.uid());

-- Fotos
create policy "Membros veem fotos" on relatorio_fotos for select using (true);
create policy "Membros inserem fotos" on relatorio_fotos for insert with check (true);

-- Tarefas
create policy "Membros veem tarefas" on tarefas for select
  using (obra_id in (select obra_id from obra_membros where user_id = auth.uid()));
create policy "Membros gerenciam tarefas" on tarefas for all
  using (obra_id in (select obra_id from obra_membros where user_id = auth.uid()));

-- Plantas
create policy "Membros veem plantas" on plantas for select
  using (obra_id in (select obra_id from obra_membros where user_id = auth.uid()));
create policy "Membros inserem plantas" on plantas for insert
  with check (obra_id in (select obra_id from obra_membros where user_id = auth.uid()));

-- Storage policies
create policy "Fotos públicas" on storage.objects for select using (bucket_id = 'fotos-relatorios');
create policy "Upload fotos" on storage.objects for insert with check (bucket_id = 'fotos-relatorios' and auth.role() = 'authenticated');
create policy "Plantas públicas" on storage.objects for select using (bucket_id = 'plantas');
create policy "Upload plantas" on storage.objects for insert with check (bucket_id = 'plantas' and auth.role() = 'authenticated');

-- Trigger: criar perfil automaticamente ao registrar
create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into profiles (id, nome, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'nome', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'role', 'trabalhador')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();
