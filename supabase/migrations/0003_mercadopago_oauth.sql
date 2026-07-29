-- =====================================================================
-- Migration 0003: Conexão OAuth do vendedor com o Mercado Pago
-- =====================================================================
-- Para o split de pagamento funcionar (Mercado Pago Marketplace), cada
-- vendedor precisa autorizar a plataforma via OAuth. Isso gera um
-- access_token/refresh_token PRÓPRIOS do vendedor, usados para criar a
-- preferência de pagamento com application_fee (a comissão da plataforma).
-- =====================================================================

alter table public.profiles
  add column mercado_pago_user_id text,
  add column mercado_pago_access_token text,
  add column mercado_pago_refresh_token text,
  add column mercado_pago_conectado_em timestamptz;

comment on column public.profiles.mercado_pago_access_token is
  'Token OAuth do vendedor no Mercado Pago. Sensível — nunca expor via SELECT direto no client; acessar apenas via service_role em Route Handlers server-side.';

-- Garante que ninguém além do próprio dono ou do admin veja essas colunas
-- sensíveis através de uma view segura (a tabela profiles já tem RLS,
-- mas esta view evita que o client-side acidentalmente selecione os tokens).
create view public.perfis_publicos as
select
  id, role, nome, foto_url, logo_url, descricao, redes_sociais,
  verificado, loja_oficial, fabricante_oficial, reputacao_media,
  total_avaliacoes, total_vendas, criado_em
from public.profiles;
