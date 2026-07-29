import { NextResponse } from 'next/server';
import { MercadoPagoConfig, Payment } from 'mercadopago';
import { createAdminClient } from '@/lib/supabase/server';
import QRCode from 'qrcode';

/**
 * Recebe notificações do Mercado Pago sobre mudanças de status de
 * pagamento. Usa o cliente admin (service_role) porque roda sem sessão
 * de usuário — é uma chamada servidor-a-servidor do Mercado Pago.
 *
 * Fluxo:
 * 1. MP notifica com { type: 'payment', data: { id } }
 * 2. Buscamos o pagamento na API do MP para confirmar o status real
 *    (nunca confiar apenas no payload da notificação)
 * 3. Atualizamos pedidos/pagamentos e, se aprovado e for retirada,
 *    geramos o PIN + QR Code
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);

  if (!body || body.type !== 'payment') {
    return NextResponse.json({ recebido: true });
  }

  const paymentId = body.data?.id;
  if (!paymentId) {
    return NextResponse.json({ recebido: true });
  }

  const client = new MercadoPagoConfig({ accessToken: process.env.MERCADO_PAGO_ACCESS_TOKEN! });
  const paymentApi = new Payment(client);

  let pagamentoMP;
  try {
    pagamentoMP = await paymentApi.get({ id: paymentId });
  } catch (erro) {
    console.error('Erro ao buscar pagamento no Mercado Pago:', erro);
    return NextResponse.json({ erro: 'falha_ao_buscar_pagamento' }, { status: 500 });
  }

  const pedidoId = pagamentoMP.external_reference;
  if (!pedidoId) {
    return NextResponse.json({ recebido: true });
  }

  const supabaseAdmin = createAdminClient();

  const mapaStatus: Record<string, string> = {
    approved: 'aprovado',
    pending: 'pendente',
    in_process: 'pendente',
    rejected: 'recusado',
    refunded: 'estornado',
    cancelled: 'recusado',
  };
  const statusPagamento = mapaStatus[pagamentoMP.status ?? ''] ?? 'pendente';

  // Upsert do registro de pagamento
  await supabaseAdmin.from('pagamentos').upsert(
    {
      pedido_id: pedidoId,
      mercado_pago_payment_id: String(paymentId),
      metodo: mapearMetodoPagamento(pagamentoMP.payment_type_id),
      status: statusPagamento,
      valor: pagamentoMP.transaction_amount ?? 0,
    },
    { onConflict: 'mercado_pago_payment_id' }
  );

  if (statusPagamento === 'aprovado') {
    const { data: pedido } = await supabaseAdmin
      .from('pedidos')
      .select('id, modo_entrega, status')
      .eq('id', pedidoId)
      .single();

    if (pedido && pedido.status === 'aguardando_pagamento') {
      const atualizacoes: Record<string, unknown> = { status: 'pago' };

      if (pedido.modo_entrega === 'retirada') {
        const pin = gerarPin();
        const qrCodeDataUrl = await QRCode.toDataURL(`retirada:${pedido.id}:${pin}`);
        atualizacoes.status = 'pronto_retirada';
        atualizacoes.codigo_retirada = pin;
        atualizacoes.qr_code_retirada = qrCodeDataUrl;
      }

      await supabaseAdmin.from('pedidos').update(atualizacoes).eq('id', pedidoId);
    }
  } else if (statusPagamento === 'recusado') {
    await supabaseAdmin
      .from('pedidos')
      .update({ status: 'cancelado' })
      .eq('id', pedidoId)
      .eq('status', 'aguardando_pagamento');
  }

  return NextResponse.json({ recebido: true });
}

function gerarPin(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function mapearMetodoPagamento(tipo?: string): 'pix' | 'cartao' | 'boleto' {
  if (tipo === 'bank_transfer') return 'pix';
  if (tipo === 'ticket') return 'boleto';
  return 'cartao';
}
