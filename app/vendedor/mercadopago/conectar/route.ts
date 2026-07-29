import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * Redireciona o vendedor para a tela de autorização do Mercado Pago.
 * Ao aceitar, o MP redireciona de volta para /vendedor/mercadopago/callback
 * com um `code` que trocamos por um access_token próprio do vendedor —
 * necessário para o split de pagamento (marketplace).
 */
export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_SITE_URL}/auth/login?redirect=/vendedor/mercadopago/conectar`
    );
  }

  const authUrl = new URL('https://auth.mercadopago.com.br/authorization');
  authUrl.searchParams.set('client_id', process.env.MERCADO_PAGO_CLIENT_ID!);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('platform_id', 'mp');
  authUrl.searchParams.set(
    'redirect_uri',
    `${process.env.NEXT_PUBLIC_SITE_URL}/vendedor/mercadopago/callback`
  );
  // Usamos o state para reidentificar o usuário no callback
  authUrl.searchParams.set('state', user.id);

  return NextResponse.redirect(authUrl.toString());
}
