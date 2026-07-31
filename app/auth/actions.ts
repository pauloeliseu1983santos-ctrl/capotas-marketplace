'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export async function login(formData: FormData) {
  const supabase = createClient();

  const email = formData.get('email') as string;
  const senha = formData.get('senha') as string;

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password: senha,
  });

  if (error) {
    redirect(`/auth/login?erro=${encodeURIComponent(error.message)}`);
  }

  redirect('/');
}

export async function cadastrar(formData: FormData) {
  const supabase = createClient();

  const email = formData.get('email') as string;
  const senha = formData.get('senha') as string;
  const nome = formData.get('nome') as string;

  const { error } = await supabase.auth.signUp({
    email,
    password: senha,
    options: {
      data: { nome },
    },
  });

  if (error) {
    redirect(`/auth/cadastro?erro=${encodeURIComponent(error.message)}`);
  }

  redirect('/auth/confirme-email');
}
