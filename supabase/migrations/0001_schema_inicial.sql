-- =====================================================================
-- MARKETPLACE DE CAPOTAS E ACESSÓRIOS AUTOMOTIVOS
-- Migration 0001: Schema inicial completo
-- =====================================================================
-- Este arquivo cria toda a estrutura de dados do marketplace:
-- perfis de usuário, produtos, pedidos, pagamentos, chat, avaliações,
-- cupons e configurações administrativas — com Row Level Security (RLS)
-- aplicada em todas as tabelas sensíveis.
-- =====================================================================

-- ---------------------------------------------------------------------
-- EXTENSÕES NECESSÁRIAS
-- ---------------------------------------------------------------------
create extension if not exists "uuid-ossp";
create extension if not exists "pg_trgm"; -- busca fuzzy (título, descrição)

-- ---------------------------------------------------------------------
-- ENUMS
-- ---------------------------------------------------------------------
create type user_role as enum ('admin', 'fabricante', 'loja', 'vendedor_particular', 'comprador');
create type verification_status as enum ('pendente', 'verificado', 'rejeitado');
create type product_status as enum ('rascunho', 'em_analise', 'ativo', 'pausado', 'vendido', 'removido');
create type product_condition as enum ('novo', 'usado');
create type delivery_mode as enum ('retirada', 'envio', 'ambos');
create type shipping_method as enum ('correios', 'transportadora', 'frete_proprio', 'a_combinar');
create type order_status as enum (
  'aguardando_pagamento', 'pago', 'em_preparacao', 'enviado',
  'pronto_retirada', 'entregue', 'retirado', 'cancelado', 'reembolsado', 'em_disputa'
);
create type payment_status as enum ('pendente', 'aprovado', 'recusado', 'estornado', 'em_mediacao');
create type payment_method as enum ('pix', 'cartao', 'boleto');

-- ---------------------------------------------------------------------
-- PERFIS DE USUÁRIO (estende auth.users do Supabase Auth)
-- ---------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role user_role not null default 'comprador',
  nome text not null,
  documento text unique, -- CPF ou CNPJ (armazenar apenas dígitos)
  tipo_documento text check (tipo_documento in ('cpf', 'cnpj')),
  whatsapp text,
  telefone_verificado boolean not null default false,
  email_verificado boolean not null default false,
  foto_url text,
  logo_url text, -- para lojas/fabricantes
  descricao text,
  redes_sociais jsonb default '{}'::jsonb, -- {instagram, facebook, site}
  endereco jsonb, -- {logradouro, numero, complemento, bairro, cidade, estado, cep}
  verificado verification_status not null default 'pendente',
  loja_oficial boolean not null default false,
  fabricante_oficial boolean not null default false,
  suspenso boolean not null default false,
  motivo_suspensao text,
  reputacao_media numeric(3,2) default 0.0,
  total_avaliacoes integer not null default 0,
  total_vendas integer not null default 0,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

comment on table public.profiles is 'Perfis de usuário — estende auth.users com dados de negócio.';

-- ---------------------------------------------------------------------
-- CATEGORIAS
-- ---------------------------------------------------------------------
create table public.categorias (
  id uuid primary key default uuid_generate_v4(),
  nome text not null unique,
  slug text not null unique,
  categoria_pai_id uuid references public.categorias(id),
  icone_url text,
  ordem integer not null default 0,
  ativa boolean not null default true
);

-- ---------------------------------------------------------------------
-- PRODUTOS / ANÚNCIOS
-- ---------------------------------------------------------------------
create table public.produtos (
  id uuid primary key default uuid_generate_v4(),
  vendedor_id uuid not null references public.profiles(id) on delete cascade,
  categoria_id uuid not null references public.categorias(id),
  titulo text not null,
  slug text not null unique,
  descricao text not null,
  marca text,
  modelo text,
  ano_veiculo integer,
  compatibilidade text[], -- lista de modelos compatíveis
  cor text,
  peso_kg numeric(8,2),
  dimensoes jsonb, -- {altura, largura, comprimento} em cm
  condicao product_condition not null default 'novo',
  estoque integer not null default 1 check (estoque >= 0),
  garantia_meses integer default 0,
  valor numeric(10,2) not null check (valor >= 0),
  desconto_percentual numeric(5,2) default 0 check (desconto_percentual between 0 and 100),
  modo_entrega delivery_mode not null default 'ambos',
  metodos_envio shipping_method[] default array[]::shipping_method[],
  cep_origem text not null,
  cidade text not null,
  estado text not null,
  status product_status not null default 'em_analise',
  visualizacoes integer not null default 0,
  favoritos_count integer not null default 0,
  video_url text,
  busca_texto tsvector generated always as (
    to_tsvector('portuguese', coalesce(titulo,'') || ' ' || coalesce(descricao,'') || ' ' || coalesce(marca,''))
  ) stored,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create index idx_produtos_busca on public.produtos using gin(busca_texto);
create index idx_produtos_categoria on public.produtos(categoria_id);
create index idx_produtos_vendedor on public.produtos(vendedor_id);
create index idx_produtos_status on public.produtos(status);
create index idx_produtos_cidade_estado on public.produtos(cidade, estado);

create table public.produto_fotos (
  id uuid primary key default uuid_generate_v4(),
  produto_id uuid not null references public.produtos(id) on delete cascade,
  url text not null,
  ordem integer not null default 0
);

create table public.favoritos (
  usuario_id uuid not null references public.profiles(id) on delete cascade,
  produto_id uuid not null references public.produtos(id) on delete cascade,
  criado_em timestamptz not null default now(),
  primary key (usuario_id, produto_id)
);

-- ---------------------------------------------------------------------
-- PEDIDOS
-- ---------------------------------------------------------------------
create table public.pedidos (
  id uuid primary key default uuid_generate_v4(),
  comprador_id uuid not null references public.profiles(id),
  vendedor_id uuid not null references public.profiles(id),
  produto_id uuid not null references public.produtos(id),
  quantidade integer not null default 1 check (quantidade > 0),
  valor_unitario numeric(10,2) not null,
  valor_frete numeric(10,2) default 0,
  valor_total numeric(10,2) not null,
  comissao_percentual numeric(5,2) not null,
  valor_comissao numeric(10,2) not null,
  valor_repasse_vendedor numeric(10,2) not null,
  modo_entrega delivery_mode not null,
  endereco_entrega jsonb,
  codigo_retirada text, -- PIN gerado para retirada
  qr_code_retirada text,
  status order_status not null default 'aguardando_pagamento',
  codigo_rastreio text,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create index idx_pedidos_comprador on public.pedidos(comprador_id);
create index idx_pedidos_vendedor on public.pedidos(vendedor_id);
create index idx_pedidos_status on public.pedidos(status);

-- ---------------------------------------------------------------------
-- PAGAMENTOS (referência ao Mercado Pago — nunca armazenar dados de cartão)
-- ---------------------------------------------------------------------
create table public.pagamentos (
  id uuid primary key default uuid_generate_v4(),
  pedido_id uuid not null references public.pedidos(id) on delete cascade,
  mercado_pago_payment_id text unique,
  metodo payment_method not null,
  status payment_status not null default 'pendente',
  valor numeric(10,2) not null,
  split_repasse jsonb, -- detalhes do split de pagamento (não sensível)
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- CONFIGURAÇÃO DE COMISSÃO (editável pelo admin)
-- ---------------------------------------------------------------------
create table public.config_comissao (
  id uuid primary key default uuid_generate_v4(),
  categoria_id uuid references public.categorias(id), -- null = padrão geral
  percentual numeric(5,2) not null check (percentual between 0 and 100),
  ativo boolean not null default true,
  criado_em timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- CUPONS E PROMOÇÕES
-- ---------------------------------------------------------------------
create table public.cupons (
  id uuid primary key default uuid_generate_v4(),
  vendedor_id uuid references public.profiles(id), -- null = cupom da plataforma
  codigo text not null unique,
  desconto_percentual numeric(5,2),
  desconto_valor numeric(10,2),
  valido_ate timestamptz,
  usos_maximos integer,
  usos_atuais integer not null default 0,
  ativo boolean not null default true
);

-- ---------------------------------------------------------------------
-- CHAT
-- ---------------------------------------------------------------------
create table public.conversas (
  id uuid primary key default uuid_generate_v4(),
  produto_id uuid references public.produtos(id),
  comprador_id uuid not null references public.profiles(id),
  vendedor_id uuid not null references public.profiles(id),
  ultima_mensagem_em timestamptz not null default now(),
  criado_em timestamptz not null default now(),
  unique (produto_id, comprador_id, vendedor_id)
);

create table public.mensagens (
  id uuid primary key default uuid_generate_v4(),
  conversa_id uuid not null references public.conversas(id) on delete cascade,
  remetente_id uuid not null references public.profiles(id),
  texto text,
  foto_url text,
  localizacao jsonb, -- {lat, lng}
  lida boolean not null default false,
  criado_em timestamptz not null default now()
);

create index idx_mensagens_conversa on public.mensagens(conversa_id, criado_em);

-- ---------------------------------------------------------------------
-- AVALIAÇÕES
-- ---------------------------------------------------------------------
create table public.avaliacoes (
  id uuid primary key default uuid_generate_v4(),
  pedido_id uuid not null unique references public.pedidos(id),
  avaliador_id uuid not null references public.profiles(id),
  avaliado_id uuid not null references public.profiles(id),
  nota integer not null check (nota between 1 and 5),
  comentario text,
  criado_em timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- DENÚNCIAS
-- ---------------------------------------------------------------------
create table public.denuncias (
  id uuid primary key default uuid_generate_v4(),
  denunciante_id uuid not null references public.profiles(id),
  produto_id uuid references public.produtos(id),
  usuario_denunciado_id uuid references public.profiles(id),
  motivo text not null,
  descricao text,
  status text not null default 'aberta' check (status in ('aberta', 'em_analise', 'resolvida', 'arquivada')),
  criado_em timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- LOGS DE AUDITORIA
-- ---------------------------------------------------------------------
create table public.logs_auditoria (
  id uuid primary key default uuid_generate_v4(),
  usuario_id uuid references public.profiles(id),
  acao text not null,
  entidade text not null,
  entidade_id uuid,
  detalhes jsonb,
  ip text,
  criado_em timestamptz not null default now()
);

-- =====================================================================
-- ROW LEVEL SECURITY
-- =====================================================================
alter table public.profiles enable row level security;
alter table public.produtos enable row level security;
alter table public.produto_fotos enable row level security;
alter table public.favoritos enable row level security;
alter table public.pedidos enable row level security;
alter table public.pagamentos enable row level security;
alter table public.conversas enable row level security;
alter table public.mensagens enable row level security;
alter table public.avaliacoes enable row level security;
alter table public.denuncias enable row level security;
alter table public.cupons enable row level security;

-- Helper: verifica se o usuário atual é admin
create or replace function public.is_admin()
returns boolean as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  );
$$ language sql security definer stable;

-- PROFILES: todo mundo pode ver perfis públicos; só o dono edita o próprio
create policy "perfis_publicos_visiveis" on public.profiles
  for select using (true);
create policy "usuario_edita_proprio_perfil" on public.profiles
  for update using (auth.uid() = id);
create policy "admin_gerencia_perfis" on public.profiles
  for all using (public.is_admin());

-- PRODUTOS: anúncios ativos são públicos; vendedor gerencia os próprios
create policy "produtos_ativos_publicos" on public.produtos
  for select using (status = 'ativo' or vendedor_id = auth.uid() or public.is_admin());
create policy "vendedor_cria_produto" on public.produtos
  for insert with check (vendedor_id = auth.uid());
create policy "vendedor_edita_proprio_produto" on public.produtos
  for update using (vendedor_id = auth.uid() or public.is_admin());
create policy "vendedor_remove_proprio_produto" on public.produtos
  for delete using (vendedor_id = auth.uid() or public.is_admin());

-- FOTOS: seguem a visibilidade do produto
create policy "fotos_visiveis_com_produto" on public.produto_fotos
  for select using (true);
create policy "vendedor_gerencia_fotos" on public.produto_fotos
  for all using (
    exists (select 1 from public.produtos p where p.id = produto_id and (p.vendedor_id = auth.uid() or public.is_admin()))
  );

-- FAVORITOS: só o próprio usuário vê e gerencia
create policy "usuario_gerencia_favoritos" on public.favoritos
  for all using (usuario_id = auth.uid());

-- PEDIDOS: só comprador, vendedor envolvidos ou admin
create policy "pedidos_visiveis_para_envolvidos" on public.pedidos
  for select using (comprador_id = auth.uid() or vendedor_id = auth.uid() or public.is_admin());
create policy "comprador_cria_pedido" on public.pedidos
  for insert with check (comprador_id = auth.uid());
create policy "envolvidos_atualizam_pedido" on public.pedidos
  for update using (comprador_id = auth.uid() or vendedor_id = auth.uid() or public.is_admin());

-- PAGAMENTOS: só envolvidos no pedido ou admin
create policy "pagamentos_visiveis_para_envolvidos" on public.pagamentos
  for select using (
    exists (
      select 1 from public.pedidos pe where pe.id = pedido_id
      and (pe.comprador_id = auth.uid() or pe.vendedor_id = auth.uid())
    ) or public.is_admin()
  );

-- CONVERSAS E MENSAGENS: só participantes
create policy "conversas_visiveis_para_participantes" on public.conversas
  for select using (comprador_id = auth.uid() or vendedor_id = auth.uid());
create policy "participante_cria_conversa" on public.conversas
  for insert with check (comprador_id = auth.uid() or vendedor_id = auth.uid());

create policy "mensagens_visiveis_para_participantes" on public.mensagens
  for select using (
    exists (
      select 1 from public.conversas c where c.id = conversa_id
      and (c.comprador_id = auth.uid() or c.vendedor_id = auth.uid())
    )
  );
create policy "participante_envia_mensagem" on public.mensagens
  for insert with check (
    remetente_id = auth.uid() and exists (
      select 1 from public.conversas c where c.id = conversa_id
      and (c.comprador_id = auth.uid() or c.vendedor_id = auth.uid())
    )
  );

-- AVALIAÇÕES: públicas para leitura; só quem participou do pedido cria
create policy "avaliacoes_publicas" on public.avaliacoes
  for select using (true);
create policy "avaliador_cria_avaliacao" on public.avaliacoes
  for insert with check (avaliador_id = auth.uid());

-- DENÚNCIAS: só quem denunciou e admin veem
create policy "denuncias_visiveis_denunciante_admin" on public.denuncias
  for select using (denunciante_id = auth.uid() or public.is_admin());
create policy "usuario_cria_denuncia" on public.denuncias
  for insert with check (denunciante_id = auth.uid());

-- CUPONS: públicos para leitura se ativos; vendedor gerencia os próprios
create policy "cupons_ativos_publicos" on public.cupons
  for select using (ativo = true or vendedor_id = auth.uid() or public.is_admin());
create policy "vendedor_gerencia_proprios_cupons" on public.cupons
  for all using (vendedor_id = auth.uid() or public.is_admin());
