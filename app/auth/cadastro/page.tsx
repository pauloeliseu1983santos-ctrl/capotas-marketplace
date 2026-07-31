import Link from 'next/link';
import { cadastrar } from '../actions';

export default function PaginaCadastro({
  searchParams,
}: {
  searchParams: { erro?: string };
}) {
  return (
    <main className="mx-auto max-w-sm px-4 py-16">
      <h1 className="mb-6 font-display text-2xl font-bold">Criar conta</h1>

      {searchParams.erro && (
        <p className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">
          {searchParams.erro}
        </p>
      )}

      <form action={cadastrar} className="flex flex-col gap-4">
        <input
          type="text"
          name="nome"
          placeholder="Nome completo"
          required
          className="rounded-lg border border-graphite-600/30 p-3"
        />
        <input
          type="email"
          name="email"
          placeholder="E-mail"
          required
          className="rounded-lg border border-graphite-600/30 p-3"
        />
        <input
          type="password"
          name="senha"
          placeholder="Senha"
          required
          minLength={6}
          className="rounded-lg border border-graphite-600/30 p-3"
        />
        <button
          type="submit"
          className="rounded-lg bg-brand-500 py-3 font-semibold text-white"
        >

