'use server';

import { Preference } from 'mercadopago';
import { MercadoPagoConfig } from 'mercadopago';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

const COMISSAO_PADRAO_PERCENTUAL = 10; // usado se não houver config_comissao específica

export type EstadoCheckout = { sucesso: boolean; erro?: string };

export async function iniciarCheckout(
  produtoId: string,
  quantidade: number
): Promise<EstadoCheckout | never> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/auth/login?redirect=/produtos`);
  }

  const { data: produto } = await supabase
    .from('produtos')
    .select('id, titulo, valor, desconto_percentual, estoque, vendedor_id, modo_entrega, status')
    .eq('id', produtoId)
    .single();

  if (!produto || produto.status !== 'ativo') {
    return { sucesso: false, erro: 'Produto indisponível.' };
  }
  if (produto.estoque < quantidade) {
    return { sucesso: false, erro: 'Estoque insuficiente.' };
  }
  if (produto.vendedor_id === user.id) {
    return { sucesso: false, erro: 'Você não pode comprar seu próprio anúncio.' };
  }

  // Busca o access_token do VENDEDOR — é a credencial dele que cria a
  // cobrança, permitindo o split via application_fee.
  const supabaseAdmin = createAdminClient();
  const { data: vendedor } = await supabaseAdmin
    .from('profiles')
    .select('mercado_pago_access_token, mercado_pago_user_id')
    .eq('id', produto.vendedor_id)
    .single();

  if (!vendedor?.mercado_pago_access_token) {
    return {
      sucesso: false,
      erro: 'Este vendedor ainda não configurou o recebimento de pagamentos.',
    };
  }

  const valorUnitario = produto.valor * (1 - produto.desconto_percentual / 100);
  const valorTotal = valorUnitario * quantidade;

  const { data: configComissao } = await supabase
    .from('config_comissao')
    .select('percentual')
    .eq('ativo', true)
    .is('categoria_id', null)
    .maybeSingle();

  const comissaoPercentual = configComissao?.percentual ?? COMISSAO_PADRAO_PERCENTUAL;
  const valorComissao = Number((valorTotal * (comissaoPercentual / 100)).toFixed(2));
  const valorRepasse = Number((valorTotal - valorComissao).toFixed(2));

  // Cria o pedido em estado "aguardando_pagamento" antes de gerar a cobrança
  const { data: pedido, error: erroPedido } = await supabase
    .from('pedidos')
    .insert({
      comprador_id: user.id,
      vendedor_id: produto.vendedor_id,
      produto_id: produto.id,
      quantidade,
      valor_unitario: valorUnitario,
      valor_total: valorTotal,
      comissao_percentual: comissaoPercentual,
      valor_comissao: valorComissao,
      valor_repasse_vendedor: valorRepasse,
      modo_entrega: produto.modo_entrega === 'ambos' ? 'retirada' : produto.modo_entrega,
      status: 'aguardando_pagamento',
    })
    .select('id')
    .single();

  if (erroPedido || !pedido) {
    return { sucesso: false, erro: 'Não foi possível criar o pedido. Tente novamente.' };
  }

  // Cria a preferência de pagamento USANDO O TOKEN DO VENDEDOR,
  // com application_fee = comissão da plataforma (split automático).
  const clienteVendedor = new MercadoPagoConfig({
    accessToken: vendedor.mercado_pago_access_token,
  });

  const preferencia = new Preference(clienteVendedor);

  try {
    const resultado = await preferencia.create({
      body: {
        items: [
          {
            id: produto.id,
            title: produto.titulo,
            quantity: quantidade,
            unit_price: valorUnitario,
            currency_id: 'BRL',
          },
        ],
        marketplace_fee: valorComissao,
        external_reference: pedido.id,
        back_urls: {
          success: `${process.env.NEXT_PUBLIC_SITE_URL}/pedidos/${pedido.id}?status=sucesso`,
          failure: `${process.env.NEXT_PUBLIC_SITE_URL}/pedidos/${pedido.id}?status=falha`,
          pending: `${process.env.NEXT_PUBLIC_SITE_URL}/pedidos/${pedido.id}?status=pendente`,
        },
        auto_return: 'approved',
        notification_url: `${process.env.NEXT_PUBLIC_SITE_URL}/api/webhooks/mercadopago`,
      },
    });

    redirect(resultado.init_point!);
  } catch (erro) {
    console.error('Erro ao criar preferência Mercado Pago:', erro);
    // Reverte o pedido para não deixar registro órfão
    await supabase.from('pedidos').update({ status: 'cancelado' }).eq('id', pedido.id);
    return { sucesso: false, erro: 'Erro ao iniciar pagamento. Tente novamente.' };
  }
}
