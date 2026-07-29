/**
 * Cliente Supabase para Client Components ("use client").
 * Usa a chave pública (anon key) — a segurança real vem das políticas RLS
 * definidas em supabase/migrations, não desta chave.
 */
import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
