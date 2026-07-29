-- =====================================================================
-- Migration 0002: Storage — bucket de fotos de produtos
-- =====================================================================
-- Cria o bucket público "produtos" (fotos ficam acessíveis via URL direta,
-- já que são anúncios públicos) e restringe quem pode enviar/apagar.
-- =====================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('produtos', 'produtos', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

-- Qualquer pessoa pode VER as fotos (anúncios são públicos)
create policy "fotos_produtos_publicas"
on storage.objects for select
using (bucket_id = 'produtos');

-- Só o dono do produto pode enviar fotos — a pasta do arquivo deve
-- começar com o ID do produto, e esse produto deve pertencer ao usuário.
-- Convenção de path: {produto_id}/{nome_do_arquivo}
create policy "vendedor_envia_fotos_do_proprio_produto"
on storage.objects for insert
with check (
  bucket_id = 'produtos'
  and exists (
    select 1 from public.produtos p
    where p.id::text = (storage.foldername(name))[1]
    and p.vendedor_id = auth.uid()
  )
);

create policy "vendedor_apaga_fotos_do_proprio_produto"
on storage.objects for delete
using (
  bucket_id = 'produtos'
  and exists (
    select 1 from public.produtos p
    where p.id::text = (storage.foldername(name))[1]
    and p.vendedor_id = auth.uid()
  )
);
