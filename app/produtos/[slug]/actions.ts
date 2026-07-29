'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function alternarFavorito(produtoId: string, slug: string) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { sucesso: false, erro: 'Entre na sua conta para favoritar produtos.', favoritado: false };
  }

  const { data: existente } = await supabase
    .from('favoritos')
    .select('produto_id')
    .eq('usuario_id', user.id)
    .eq('produto_id', produtoId)
    .maybeSingle();

  if (existente) {
    await supabase.from('favoritos').delete().eq('usuario_id', user.id).eq('produto_id', produtoId);
    revalidatePath(`/produtos/${slug}`);
    return { sucesso: true, favoritado: false };
  }

  await supabase.from('favoritos').insert({ usuario_id: user.id, produto_id: produtoId });
  revalidatePath(`/produtos/${slug}`);
  return { sucesso: true, favoritado: true };
}
