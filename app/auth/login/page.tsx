'use client';

import { useFormState, useFormStatus } from 'react-dom';
import Link from 'next/link';
import { entrar, entrarComGoogle, type EstadoLogin } from './actions';

const estadoInicial: EstadoLogin = { sucesso: false };

function BotaoEntrar() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-lg bg-brand-500 py-3 font-semibold text-white transition hover:bg-brand-600 disabled:opacity-60"
    >
      {pending ? 'Entrando…' : 'Entrar'}
    </button>
  );
}

export default function PaginaLogin() {
  const [estado, formAction] = useFormState(entrar, estadoInicial);

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-6">
      <h1 className="mb-1 font-display text-2xl font-bold text-graphite-900">Entrar</h1>
      <p className="mb-6 text-sm text-graphite-600">
        Acesse sua conta para comprar, vender ou anunciar.
      </p>

      <form action={formAction} className="flex flex-col gap-4">
        <div>
          <label htmlFor="email" className="mb-1 block text-sm font-medium">E-mail</label>
          <input
            id="email"
            name="email"
            type="email"
            required
            className="w-full rounded-lg border border-graphite-600/20 px-3 py-2.5"
          />
        </div>
        <div>
          <label htmlFor="senha" className="mb-1 block text-sm font-medium">Senha</label>
          <input
            id="senha"
            name="senha"
            type="password"
            required
            className="w-full rounded-lg border border-graphite-600/20 px-3 py-2.5"
          />
        </div>

        {estado.erro && (
          <p role="alert" className="text-sm text-red-600">{estado.erro}</p>
        )}

        <BotaoEntrar />
      </form>

      <form action={entrarComGoogle} className="mt-3">
        <button
          type="submit"
          className="w-full rounded-lg border border-graphite-600/20 py-3 font-medium text-graphite-900 transition hover:bg-graphite-900/5"
        >
          Entrar com Google
        </button>
      </form>

      <div className="mt-6 flex justify-between text-sm">
        <Link href="/auth/recuperar-senha" className="text-brand-600 hover:underline">
          Esqueci minha senha
        </Link>
        <Link href="/auth/cadastro" className="text-brand-600 hover:underline">
          Criar conta
        </Link>
      </div>
    </main>
  );
}
