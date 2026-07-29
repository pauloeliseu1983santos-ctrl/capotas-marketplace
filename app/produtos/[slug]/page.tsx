import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import type { Metadata } from 'next';
import { BotaoFavoritar } from './BotaoFavoritar';

interface Props {
  params: { slug: string };
}

async function buscarProduto(slug: string) {
  const supabase = createClient();
  const { data: produto } = await supabase
    .from('produtos')
    .select(`
      id, titulo, slug, descricao, marca, modelo, ano_veiculo, condicao,
      valor, desconto_percentual, cidade, estado, categoria_id, vendedor_id,
      garantia_meses, status,
      produto_fotos(url, ordem),
      profiles!produtos_vendedor_id_fkey(nome, loja_oficial, fabricante_oficial, reputacao_media, total_avaliacoes)
    `)
    .eq('slug', slug)
    .single();

  return produto;
}

async function buscarRelacionados(categoriaId: string, produtoIdAtual: string) {
  const supabase = createClient();
  const { data } = await supabase
    .from('produtos')
    .select('id, titulo, slug, valor, cidade, estado')
    .eq('categoria_id', categoriaId)
    .eq('status', 'ativo')
    .neq('id', produtoIdAtual)
    .limit(4);
  return data ?? [];
}

async function verificarFavorito(produtoId: string) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { data } = await supabase
    .from('favoritos')
    .select('produto_id')
    .eq('usuario_id', user.id)
    .eq('produto_id', produtoId)
    .maybeSingle();
  return !!data;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const produto = await buscarProduto(params.slug);
  if (!produto) return {};

  return {
    title: produto.titulo,
    description: produto.descricao.slice(0, 155),
    openGraph: {
      title: produto.titulo,
      description: produto.descricao.slice(0, 155),
      images: produto.produto_fotos?.[0]?.url ? [produto.produto_fotos[0].url] : [],
    },
  };
}

export default async function PaginaProduto({ params }: Props) {
  const produto = await buscarProduto(params.slug);
  if (!produto || produto.status !== 'ativo') notFound();

  const [relacionados, favoritado] = await Promise.all([
    buscarRelacionados(produto.categoria_id, produto.id),
    verificarFavorito(produto.id),
  ]);

  const fotos = (produto.produto_fotos ?? []).sort((a, b) => a.ordem - b.ordem);
  const precoFinal = produto.valor * (1 - produto.desconto_percentual / 100);
  const vendedor = Array.isArray(produto.profiles) ? produto.profiles[0] : produto.profiles;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: produto.titulo,
    description: produto.descricao,
    image: fotos.map((f) => f.url),
    brand: produto.marca ? { '@type': 'Brand', name: produto.marca } : undefined,
    offers: {
      '@type': 'Offer',
      priceCurrency: 'BRL',
      price: precoFinal.toFixed(2),
      availability: 'https://schema.org/InStock',
      itemCondition:
        produto.condicao === 'novo'
          ? 'https://schema.org/NewCondition'
          : 'https://schema.org/UsedCondition',
    },
  };

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      {/* eslint-disable-next-line react/no-danger */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <div className="grid gap-8 sm:grid-cols-2">
        <div>
          {fotos.length > 0 ? (
            <div className="aspect-square overflow-hidden rounded-xl bg-graphite-900/5">
              <Image
                src={fotos[0].url}
                alt={produto.titulo}
                width={600}
                height={600}
                className="h-full w-full object-cover"
                priority
              />
            </div>
          ) : (
            <div className="aspect-square rounded-xl bg-graphite-900/5" />
          )}
          {fotos.length > 1 && (
            <div className="mt-2 grid grid-cols-5 gap-2">
              {fotos.slice(1, 6).map((foto) => (
                <div key={foto.url} className="aspect-square overflow-hidden rounded-md bg-graphite-900/5">
                  <Image src={foto.url} alt="" width={100} height={100} className="h-full w-full object-cover" />
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <h1 className="font-display text-2xl font-bold">{produto.titulo}</h1>
          <p className="mt-1 text-sm text-graphite-600">
            {produto.cidade}/{produto.estado} · {produto.condicao === 'novo' ? 'Novo' : 'Usado'}
          </p>

          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-brand-600">
              {precoFinal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </span>
            {produto.desconto_percentual > 0 && (
              <span className="text-graphite-600 line-through">
                {produto.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </span>
            )}
          </div>

          {vendedor && (
            <div className="mt-4 flex items-center gap-2 rounded-lg border border-graphite-600/10 p-3 text-sm">
              <span className="font-medium">{vendedor.nome}</span>
              {vendedor.loja_oficial && (
                <span className="rounded bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-600">
                  Loja Oficial
                </span>
              )}
              {vendedor.total_avaliacoes > 0 && (
                <span className="text-graphite-600">
                  ★ {vendedor.reputacao_media.toFixed(1)} ({vendedor.total_avaliacoes})
                </span>
              )}
            </div>
          )}

          <div className="mt-6 flex gap-3">
            <button className="flex-1 rounded-lg bg-brand-500 py-3 font-semibold text-white hover:bg-brand-600">
              Comprar
            </button>
            <BotaoFavoritar produtoId={produto.id} slug={produto.slug} favoritadoInicial={favoritado} />
          </div>

          <p className="mt-6 whitespace-pre-line text-sm text-graphite-800">{produto.descricao}</p>

          {produto.garantia_meses > 0 && (
            <p className="mt-3 text-sm text-graphite-600">Garantia: {produto.garantia_meses} meses</p>
          )}
        </div>
      </div>

      {relacionados.length > 0 && (
        <section className="mt-12">
          <h2 className="mb-4 font-display text-lg font-bold">Produtos relacionados</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {relacionados.map((r) => (
              <Link
                key={r.id}
                href={`/produtos/${r.slug}`}
                className="rounded-xl border border-graphite-600/10 p-3 hover:shadow-md"
              >
                <div className="mb-2 aspect-square rounded-lg bg-graphite-900/5" />
                <p className="line-clamp-2 text-sm font-medium">{r.titulo}</p>
                <p className="mt-1 text-sm font-semibold text-brand-600">
                  {r.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </p>
              </Link>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
