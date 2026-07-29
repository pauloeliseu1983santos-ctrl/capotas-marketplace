'use server';

import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

const schemaProduto = z.object({
  categoria_id: z.string().uuid(),
  titulo: z.string().min(5, 'O título deve ter no mínimo 5 caracteres').max(120),
  descricao: z.string().min(20, 'Descreva o produto com mais detalhes'),
  marca: z.string().optional(),
  modelo: z.string().optional(),
  ano_veiculo: z.coerce.number().int().optional(),
  cor: z.string().optional(),
  condicao: z.enum(['novo', 'usado']),
  estoque: z.coerce.number().int().min(0),
  garantia_meses: z.coerce.number().int().min(0).default(0),
  valor: z.coerce.number().positive('Informe um valor válido'),
  desconto_percentual: z.coerce.number().min(0).max(100).default(0),
  modo_entrega: z.enum(['retirada', 'envio', 'ambos']),
  cep_origem: z.string().length(8),
  cidade: z.string().min(2),
  estado: z.string().length(2),
});

export type EstadoProduto = {
  sucesso: boolean;
  erro?: string;
  erros_campo?: Record<string, string[]>;
};

function gerarSlugBase(titulo: string): string {
  return titulo
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove acentos
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export async function criarProduto(
  _estadoAnterior: EstadoProduto,
  formData: FormData
): Promise<EstadoProduto> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { sucesso: false, erro: 'Você precisa estar logado para anunciar.' };
  }

  const parsed = schemaProduto.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { sucesso: false, erros_campo: parsed.error.flatten().fieldErrors };
  }

  // Garante slug único anexando um sufixo curto caso já exista
  const slugBase = gerarSlugBase(parsed.data.titulo);
  const sufixo = Math.random().toString(36).slice(2, 7);
  const slug = `${slugBase}-${sufixo}`;

  const { data: produto, error } = await supabase
    .from('produtos')
    .insert({
      ...parsed.data,
      vendedor_id: user.id,
      slug,
      status: 'em_analise', // todo anúncio novo entra em fila de aprovação
    })
    .select('id')
    .single();

  if (error || !produto) {
    return { sucesso: false, erro: 'Não foi possível publicar o anúncio. Tente novamente.' };
  }

  redirect(`/vendedor/produtos/${produto.id}/fotos`);
}
