import { createClient } from '@/lib/supabase/server';
import type { Produto } from '@/lib/types/database';
import Link from 'next/link';

interface FiltrosBusca {
  q?: string;
  categoria?: string;
  marca?: string;
  cidade?: string;
  estado?: string;
  preco_min?: string;
  preco_max?: string;
  condicao?: 'novo' | 'usado';
}

export const metadata = { title: 'Buscar produtos' };

async function buscarProdutos(filtros: FiltrosBusca) {
  const supabase = createClient();
  let query = supabase
    .from('produtos')
    .select('id, titulo, slug, valor, desconto_percentual, cidade, estado, condicao, criado_em')
    .eq('status', 'ativo')
    .order('criado_em', { ascending: false })
    .limit(24);

  if (filtros.q) query = query.textSearch('busca_texto', filtros.q, { type: 'websearch' });
  if (filtros.categoria) query = query.eq('categoria_id', filtros.categoria);
  if (filtros.marca) query = query.ilike('marca', `%${filtros.marca}%`);
  if (filtros.cidade) query = query.ilike('cidade', filtros.cidade);
  if (filtros.estado) query = query.eq('estado', filtros.estado.toUpperCase());
  if (filtros.condicao) query = query.eq('condicao', filtros.condicao);
  if (filtros.preco_min) query = query.gte('valor', Number(filtros.preco_min));
  if (filtros.preco_max) query = query.lte('valor', Number(filtros.preco_max));

  const { data, error } = await query;
  if (error) {
    console.error('Erro ao buscar produtos:', error.message);
    return [];
  }
  return data as Pick<Produto, 'id' | 'titulo' | 'slug' | 'valor' | 'desconto_percentual' | 'cidade' | 'estado' | 'condicao' | 'criado_em'>[];
}

function formatarPreco(valor: number, descontoPercentual: number): { final: string; original?: string } {
  const final = valor * (1 - descontoPercentual / 100);
  const formatar = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  return descontoPercentual > 0
    ? { final: formatar(final), original: formatar(valor) }
    : { final: formatar(final) };
}

export default async function PaginaBusca({ searchParams }: { searchParams: FiltrosBusca }) {
  const produtos = await buscarProdutos(searchParams);

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="mb-6 font-display text-2xl font-bold">
        {searchParams.q ? `Resultados para "${searchParams.q}"` : 'Todos os produtos'}
      </h1>

      {produtos.length === 0 ? (
        <p className="text-graphite-600">
          Nenhum produto encontrado com esses filtros. Tente ampliar a busca.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {produtos.map((produto) => {
            const preco = formatarPreco(produto.valor, produto.desconto_percentual);
            return (
              <Link
                key={produto.id}
                href={`/produtos/${produto.slug}`}
                className="group rounded-xl border border-graphite-600/10 p-3 transition hover:shadow-md"
              >
                <div className="mb-2 aspect-square overflow-hidden rounded-lg bg-graphite-900/5">
                  {/* Placeholder — substituído pela primeira foto de produto_fotos */}
                </div>
                <p className="line-clamp-2 text-sm font-medium">{produto.titulo}</p>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="font-semibold text-brand-600">{preco.final}</span>
                  {preco.original && (
                    <span className="text-xs text-graphite-600 line-through">{preco.original}</span>
                  )}
                </div>
                <p className="mt-1 text-xs text-graphite-600">
                  {produto.cidade}/{produto.estado} · {produto.condicao === 'novo' ? 'Novo' : 'Usado'}
                </p>
              </Link>
            );
          })}
        </div>
      )}
    </main>
  );
}
