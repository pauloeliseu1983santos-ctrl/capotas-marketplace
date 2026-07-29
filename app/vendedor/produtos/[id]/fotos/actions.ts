'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export type EstadoFotos = { sucesso: boolean; erro?: string };

/**
 * Faz upload de até 20 fotos para o Supabase Storage e registra os
 * caminhos na tabela produto_fotos. Espera um FormData com múltiplos
 * campos "fotos" (arquivos) — a ordem de envio define a ordem de exibição.
 */
export async function enviarFotosProduto(
  produtoId: string,
  _estadoAnterior: EstadoFotos,
  formData: FormData
): Promise<EstadoFotos> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { sucesso: false, erro: 'Sessão expirada. Faça login novamente.' };
  }

  // Confirma que o produto existe e pertence ao usuário antes de qualquer upload
  const { data: produto, error: erroProduto } = await supabase
    .from('produtos')
    .select('id, vendedor_id')
    .eq('id', produtoId)
    .single();

  if (erroProduto || !produto || produto.vendedor_id !== user.id) {
    return { sucesso: false, erro: 'Produto não encontrado ou sem permissão.' };
  }

  const arquivos = formData.getAll('fotos') as File[];
  if (arquivos.length === 0) {
    return { sucesso: false, erro: 'Selecione ao menos uma foto.' };
  }
  if (arquivos.length > 20) {
    return { sucesso: false, erro: 'Máximo de 20 fotos por anúncio.' };
  }

  // Descobre a próxima posição de ordem (caso já existam fotos)
  const { count } = await supabase
    .from('produto_fotos')
    .select('id', { count: 'exact', head: true })
    .eq('produto_id', produtoId);

  let ordem = count ?? 0;
  const registros: { produto_id: string; url: string; ordem: number }[] = [];

  for (const arquivo of arquivos) {
    const extensao = arquivo.name.split('.').pop();
    const nomeArquivo = `${produtoId}/${crypto.randomUUID()}.${extensao}`;

    const { error: erroUpload } = await supabase.storage
      .from('produtos')
      .upload(nomeArquivo, arquivo, {
        contentType: arquivo.type,
        upsert: false,
      });

    if (erroUpload) {
      // Continua tentando as demais fotos, mas registra a falha
      console.error('Erro ao enviar foto:', erroUpload.message);
      continue;
    }

    const { data: urlPublica } = supabase.storage.from('produtos').getPublicUrl(nomeArquivo);
    registros.push({ produto_id: produtoId, url: urlPublica.publicUrl, ordem: ordem++ });
  }

  if (registros.length === 0) {
    return { sucesso: false, erro: 'Não foi possível enviar as fotos. Tente novamente.' };
  }

  const { error: erroInsercao } = await supabase.from('produto_fotos').insert(registros);
  if (erroInsercao) {
    return { sucesso: false, erro: 'Fotos enviadas, mas houve erro ao salvar. Tente recarregar a página.' };
  }

  revalidatePath(`/vendedor/produtos/${produtoId}/fotos`);
  return { sucesso: true };
}

/**
 * Envia o anúncio para a fila de aprovação do admin (o produto já nasce
 * como 'em_analise' — esta action existe para o vendedor confirmar que
 * terminou de adicionar fotos e está pronto para revisão).
 */
export async function finalizarAnuncio(produtoId: string) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { sucesso: false, erro: 'Sessão expirada.' };

  const { count } = await supabase
    .from('produto_fotos')
    .select('id', { count: 'exact', head: true })
    .eq('produto_id', produtoId);

  if (!count || count === 0) {
    return { sucesso: false, erro: 'Adicione ao menos uma foto antes de publicar.' };
  }

  return { sucesso: true };
}
