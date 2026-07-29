import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * Endpoint de callback para o fluxo OAuth (login com Google) e para o link
 * de confirmação de e-mail enviado pelo Supabase Auth. Troca o `code` pela
 * sessão e redireciona o usuário de volta ao app já autenticado.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const redirectTo = searchParams.get('redirect') ?? '/';

  if (code) {
    const supabase = createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return NextResponse.redirect(`${origin}${redirectTo}`);
    }
  }

  return NextResponse.redirect(`${origin}/auth/login?erro=callback_falhou`);
}
