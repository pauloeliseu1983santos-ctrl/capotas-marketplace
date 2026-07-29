import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'),
  title: {
    default: 'Capotas & Acessórios — o marketplace de capotas do Brasil',
    template: '%s | Capotas & Acessórios',
  },
  description:
    'Compre e venda capotas, acessórios e peças automotivas com fabricantes, lojas e vendedores particulares de todo o Brasil.',
  manifest: '/manifest.json',
  openGraph: {
    type: 'website',
    locale: 'pt_BR',
    siteName: 'Capotas & Acessórios',
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: '#EA580C',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="font-body bg-white text-graphite-900 antialiased">
        {children}
      </body>
    </html>
  );
}
