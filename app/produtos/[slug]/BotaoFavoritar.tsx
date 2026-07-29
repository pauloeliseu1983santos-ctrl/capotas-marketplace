'use client';

import { useState, useTransition } from 'react';
import { Heart } from 'lucide-react';
import { alternarFavorito } from './actions';

export function BotaoFavoritar({
  produtoId,
  slug,
  favoritadoInicial,
}: {
  produtoId: string;
  slug: string;
  favoritadoInicial: boolean;
}) {
  const [favoritado, setFavoritado] = useState(favoritadoInicial);
  const [pending, startTransition] = useTransition();

  function aoClicar() {
    startTransition(async () => {
      const resultado = await alternarFavorito(produtoId, slug);
      if (resultado.sucesso) {
        setFavoritado(resultado.favoritado);
      } else if (resultado.erro) {
        alert(resultado.erro);
      }
    });
  }

  return (
    <button
      onClick={aoClicar}
      disabled={pending}
      aria-pressed={favoritado}
      aria-label={favoritado ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
      className="flex items-center gap-2 rounded-lg border border-graphite-600/20 px-4 py-2.5 text-sm font-medium transition hover:bg-graphite-900/5 disabled:opacity-60"
    >
      <Heart className={favoritado ? 'fill-brand-500 text-brand-500' : 'text-graphite-600'} size={18} />
      {favoritado ? 'Favoritado' : 'Favoritar'}
    </button>
  );
}
