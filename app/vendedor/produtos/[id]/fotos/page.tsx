'use client';

import { useState } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { useRouter } from 'next/navigation';
import { enviarFotosProduto, finalizarAnuncio, type EstadoFotos } from './actions';

const estadoInicial: EstadoFotos = { sucesso: false };

function BotaoEnviar() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg bg-brand-500 px-5 py-2.5 font-semibold text-white disabled:opacity-60"
    >
      {pending ? 'Enviando…' : 'Enviar fotos'}
    </button>
  );
}

export default function PaginaFotosProduto({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [preview, setPreview] = useState<string[]>([]);
  const enviarComId = enviarFotosProduto.bind(null, params.id);
  const [estado, formAction] = useFormState(enviarComId, estadoInicial);

  function aoSelecionarArquivos(e: React.ChangeEvent<HTMLInputElement>) {
    const arquivos = Array.from(e.target.files ?? []);
    setPreview(arquivos.map((a) => URL.createObjectURL(a)));
  }

  async function aoFinalizarClique() {
    const resultado = await finalizarAnuncio(params.id);
    if (resultado.sucesso) {
      router.push('/vendedor/produtos?publicado=1');
    } else {
      alert(resultado.erro);
    }
  }

  return (
    <main className="mx-auto max-w-xl px-4 py-8">
      <h1 className="mb-2 font-display text-2xl font-bold">Fotos do anúncio</h1>
      <p className="mb-6 text-sm text-graphite-600">
        Adicione até 20 fotos. A primeira foto é a capa do anúncio.
      </p>

      <form action={formAction} className="flex flex-col gap-4">
        <input
          type="file"
          name="fotos"
          accept="image/jpeg,image/png,image/webp"
          multiple
          required
          onChange={aoSelecionarArquivos}
          className="rounded-lg border border-dashed border-graphite-600/30 p-4 text-sm"
        />

        {preview.length > 0 && (
          <div className="grid grid-cols-4 gap-2">
            {preview.map((src, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={i} src={src} alt="" className="aspect-square rounded-md object-cover" />
            ))}
          </div>
        )}

        {estado.erro && <p role="alert" className="text-sm text-red-600">{estado.erro}</p>}
        {estado.sucesso && (
          <p className="text-sm text-green-600">Fotos enviadas! Adicione mais ou finalize o anúncio.</p>
        )}

        <BotaoEnviar />
      </form>

      <button
        onClick={aoFinalizarClique}
        className="mt-6 w-full rounded-lg border border-brand-500 py-2.5 font-semibold text-brand-600"
      >
        Finalizar e enviar para aprovação
      </button>
    </main>
  );
}
