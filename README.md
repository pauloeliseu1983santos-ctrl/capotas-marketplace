# Marketplace de Capotas e Acessórios Automotivos

Marketplace completo (estilo Enjoei, especializado em capotas e acessórios
automotivos) — Next.js + Supabase + Mercado Pago Marketplace.

## Status: Fase 1 concluída (Fundação)

- [x] Schema completo do banco (`supabase/migrations/0001_schema_inicial.sql`)
      — profiles, produtos, pedidos, pagamentos, chat, avaliações, cupons,
      denúncias, logs de auditoria — com RLS em todas as tabelas.
- [x] Estrutura do projeto Next.js (App Router) + dependências (`package.json`)
- [x] Clientes Supabase (browser, server, admin/service_role)
- [x] Middleware de sessão + proteção de rotas `/admin` e `/vendedor`
- [x] Configuração PWA (manifest.json + next-pwa) e headers de segurança
- [x] Validação de CPF/CNPJ (dígitos verificadores)
- [x] Server Action de cadastro (Auth + perfil + validação de documento)

## Status: Fase 2 em andamento (Auth + Produtos)

- [x] Login (e-mail/senha + Google OAuth), callback de sessão
- [x] Recuperação de senha (sem enumeração de contas)
- [x] Criação de anúncio (Server Action, com slug único e fila de aprovação)
- [x] Busca de produtos com filtros (texto, categoria, cidade/estado, preço, condição)
- [ ] Upload de fotos/vídeo (Supabase Storage) — próximo
- [ ] Página do anúncio individual, favoritos, produtos relacionados

## Próximas fases (em construção, nesta ordem)

3. **Checkout e pagamentos**: integração Mercado Pago Marketplace (split),
   webhook de confirmação, geração de PIN/QR Code para retirada
4. **Dashboards**: área do comprador (pedidos, favoritos, endereços) e
   dashboard do vendedor (produtos, estoque, faturamento, cupons)
5. **Painel admin**: gestão de usuários/vendedores, aprovação de anúncios,
   comissão configurável, banners, estatísticas
6. **Chat em tempo real**: Supabase Realtime, envio de foto/localização
7. **SEO técnico**: sitemap.xml, robots.txt, JSON-LD/Schema.org, Open Graph
8. **Páginas jurídicas**: Termos, Privacidade (LGPD), políticas diversas, FAQ
9. **Testes automatizados** e ajustes finais de performance/Lighthouse

## Variáveis de ambiente necessárias

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_SITE_URL=
MERCADO_PAGO_ACCESS_TOKEN=
MERCADO_PAGO_PUBLIC_KEY=
```

## Rodando localmente

```bash
npm install
npx supabase db push   # aplica a migration no seu projeto Supabase
npm run dev
```

## Deploy na Vercel

1. Suba esta pasta para um repositório no GitHub (a Vercel importa direto de lá).
2. Em vercel.com → **Add New Project** → selecione o repositório.
3. A Vercel detecta o Next.js automaticamente (`vercel.json` já define
   `framework: nextjs` e a região `gru1`, São Paulo — menor latência pro Brasil).
4. Antes do primeiro deploy, cadastre as variáveis de `.env.example` em
   **Settings → Environment Variables** (Production e Preview).
5. No Supabase, adicione a URL da Vercel (ex. `https://seu-projeto.vercel.app`)
   em **Authentication → URL Configuration → Redirect URLs**, senão o login
   com Google e a confirmação de e-mail não voltam para o app corretamente.
6. Clique em **Deploy**. Cada push subsequente no branch principal gera um
   novo deploy de produção automaticamente; PRs geram preview deployments.
