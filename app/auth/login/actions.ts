'use server';

import { z } from 'zod';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export type EstadoLogin = { sucesso: boolean; erro?: string };

const schemaLogin = z.object({
  email: z.string().email('E-mail inválido'),
  senha: z.string().min(1, 'Informe sua senha'),
});

export async function entrar(_estado: EstadoLogin, formData: FormData): Promise<EstadoLogin> {
  const parsed = schemaLogin.safeParse({
    email: formData.get('email'),
    senha: formData.get('senha'),
  });

  if (!parsed.success) {
    return { sucesso: false, erro: 'Preencha e-mail e senha corretamente.' };
  }

  const supabase = createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.senha,
  });

  if (error) {
    // Mensagem genérica de propósito — não revela se o e-mail existe ou não.
    return { sucesso: false, erro: 'E-mail ou senha incorretos.' };
  }

  revalidatePath('/', 'layout');
  redirect('/');
}

export async function entrarComGoogle() {
  const supabase = createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
    },
  });

  if (error || !data.url) {
    redirect('/auth/login?erro=google_falhou');
  }

  redirect(data.url);
}

export async function sair() {
  const supabase = createClient();
  await supabase.auth.signOut();
  revalidatePath('/', 'layout');
  redirect('/');
}

const schemaRecuperarSenha = z.object({ email: z.string().email() });

export async function solicitarRecuperacaoSenha(
  _estado: EstadoLogin,
  formData: FormData
): Promise<EstadoLogin> {
  const parsed = schemaRecuperarSenha.safeParse({ email: formData.get('email') });
  if (!parsed.success) {
    return { sucesso: false, erro: 'Informe um e-mail válido.' };
  }

  const supabase = createClient();
  await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/redefinir-senha`,
  });

  // Sempre retorna sucesso, mesmo se o e-mail não existir — evita enumeração de contas.
  return { sucesso: true };
}
