import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

/**
 * Troca o `code` do OAuth do Mercado Pago pelo access_token/refresh_token
 * do vendedor e salva no perfil dele. Usa o cliente admin (service_role)
 * porque essa gravação precisa acontecer independente de qual sessão de
 * cookie está ativa no navegador nesse momento.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const vendedorId = searchParams.get('state'); // setado em /conectar

  if (!code || !vendedorId) {
    return NextResponse.redirect(`${origin}/vendedor/mercadopago?erro=parametros_invalidos`);
  }

  const resposta = await fetch('https://api.mercadopago.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: process.env.MERCADO_PAGO_CLIENT_ID,
      client_secret: process.env.MERCADO_PAGO_CLIENT_SECRET,
      grant_type: 'authorization_code',
      code,
      redirect_uri: `${process.env.NEXT_PUBLIC_SITE_URL}/vendedor/mercadopago/callback`,
    }),
  });

  if (!resposta.ok) {
    console.error('Falha ao trocar code do Mercado Pago:', await resposta.text());
    return NextResponse.redirect(`${origin}/vendedor/mercadopago?erro=troca_token_falhou`);
  }

  const dados = await resposta.json();
  const supabaseAdmin = createAdminClient();

  const { error } = await supabaseAdmin
    .from('profiles')
    .update({
      mercado_pago_user_id: String(dados.user_id),
      mercado_pago_access_token: dados.access_token,
      mercado_pago_refresh_token: dados.refresh_token,
      mercado_pago_conectado_em: new Date().toISOString(),
    })
    .eq('id', vendedorId);

  if (error) {
    console.error('Erro ao salvar credenciais do Mercado Pago:', error.message);
    return NextResponse.redirect(`${origin}/vendedor/mercadopago?erro=salvar_falhou`);
  }

  return NextResponse.redirect(`${origin}/vendedor/mercadopago?conectado=1`);
}
