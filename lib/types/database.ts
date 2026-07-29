/**
 * Tipos do domínio — espelham o schema em supabase/migrations/0001_schema_inicial.sql
 * Em produção, prefira gerar isso automaticamente com:
 *   npx supabase gen types typescript --project-id <id> > lib/types/database.ts
 * Este arquivo serve como ponto de partida tipado à mão para o restante do app.
 */

export type UserRole = 'admin' | 'fabricante' | 'loja' | 'vendedor_particular' | 'comprador';
export type VerificationStatus = 'pendente' | 'verificado' | 'rejeitado';
export type ProductStatus = 'rascunho' | 'em_analise' | 'ativo' | 'pausado' | 'vendido' | 'removido';
export type ProductCondition = 'novo' | 'usado';
export type DeliveryMode = 'retirada' | 'envio' | 'ambos';
export type ShippingMethod = 'correios' | 'transportadora' | 'frete_proprio' | 'a_combinar';
export type OrderStatus =
  | 'aguardando_pagamento' | 'pago' | 'em_preparacao' | 'enviado'
  | 'pronto_retirada' | 'entregue' | 'retirado' | 'cancelado' | 'reembolsado' | 'em_disputa';
export type PaymentStatus = 'pendente' | 'aprovado' | 'recusado' | 'estornado' | 'em_mediacao';
export type PaymentMethod = 'pix' | 'cartao' | 'boleto';

export interface Endereco {
  logradouro: string;
  numero: string;
  complemento?: string;
  bairro: string;
  cidade: string;
  estado: string;
  cep: string;
}

export interface Profile {
  id: string;
  role: UserRole;
  nome: string;
  documento: string | null;
  tipo_documento: 'cpf' | 'cnpj' | null;
  whatsapp: string | null;
  telefone_verificado: boolean;
  email_verificado: boolean;
  foto_url: string | null;
  logo_url: string | null;
  descricao: string | null;
  redes_sociais: Record<string, string>;
  endereco: Endereco | null;
  verificado: VerificationStatus;
  loja_oficial: boolean;
  fabricante_oficial: boolean;
  suspenso: boolean;
  reputacao_media: number;
  total_avaliacoes: number;
  total_vendas: number;
  criado_em: string;
}

export interface Categoria {
  id: string;
  nome: string;
  slug: string;
  categoria_pai_id: string | null;
  icone_url: string | null;
  ordem: number;
  ativa: boolean;
}

export interface Produto {
  id: string;
  vendedor_id: string;
  categoria_id: string;
  titulo: string;
  slug: string;
  descricao: string;
  marca: string | null;
  modelo: string | null;
  ano_veiculo: number | null;
  compatibilidade: string[] | null;
  cor: string | null;
  peso_kg: number | null;
  dimensoes: { altura: number; largura: number; comprimento: number } | null;
  condicao: ProductCondition;
  estoque: number;
  garantia_meses: number;
  valor: number;
  desconto_percentual: number;
  modo_entrega: DeliveryMode;
  metodos_envio: ShippingMethod[];
  cep_origem: string;
  cidade: string;
  estado: string;
  status: ProductStatus;
  visualizacoes: number;
  favoritos_count: number;
  video_url: string | null;
  criado_em: string;
}

export interface ProdutoFoto {
  id: string;
  produto_id: string;
  url: string;
  ordem: number;
}

export interface Pedido {
  id: string;
  comprador_id: string;
  vendedor_id: string;
  produto_id: string;
  quantidade: number;
  valor_unitario: number;
  valor_frete: number;
  valor_total: number;
  comissao_percentual: number;
  valor_comissao: number;
  valor_repasse_vendedor: number;
  modo_entrega: DeliveryMode;
  endereco_entrega: Endereco | null;
  codigo_retirada: string | null;
  qr_code_retirada: string | null;
  status: OrderStatus;
  codigo_rastreio: string | null;
  criado_em: string;
}

export interface Conversa {
  id: string;
  produto_id: string | null;
  comprador_id: string;
  vendedor_id: string;
  ultima_mensagem_em: string;
}

export interface Mensagem {
  id: string;
  conversa_id: string;
  remetente_id: string;
  texto: string | null;
  foto_url: string | null;
  localizacao: { lat: number; lng: number } | null;
  lida: boolean;
  criado_em: string;
}

export interface Avaliacao {
  id: string;
  pedido_id: string;
  avaliador_id: string;
  avaliado_id: string;
  nota: number;
  comentario: string | null;
  criado_em: string;
}
