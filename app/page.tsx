import Link from 'next/link';

export default function PaginaInicial() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-16 text-center">
      <h1 className="mb-4 font-display text-4xl font-bold">
        Capotas e Acessórios
      </h1>
      <p className="mb-8 text-lg text-graphite-600">
        O marketplace especializado em capotas e acessórios automotivos.
        Compre e venda com quem entende do assunto.
      </p>
      <div className="flex justify-center gap-4">
        <Link
          href="/produtos"
          className="rounded-lg bg-brand-500 px-6 py-3 font-semibold text-white"
        >
          Ver todos os produtos
        </Link>
      </div>
    </main>
  );
}
