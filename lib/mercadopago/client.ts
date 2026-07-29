import { MercadoPagoConfig } from 'mercadopago';

/**
 * Cliente único do Mercado Pago, usando o Access Token de produção/teste
 * configurado nas variáveis de ambiente. Importar apenas em código
 * server-side (Server Actions, Route Handlers) — nunca no browser.
 */
export const mercadoPagoClient = new MercadoPagoConfig({
  accessToken: process.env.MERCADO_PAGO_ACCESS_TOKEN!,
});
