import type { Metadata } from 'next';
import Script from 'next/script';
import { Inter } from 'next/font/google';
import { QueryProvider } from '@/providers/query-provider';
import { Toaster } from '@/components/ui/sonner';
import './globals.css';

const inter = Inter({ subsets: ['latin'], display: 'swap' });

export const metadata: Metadata = {
  title: 'AI Agency OS',
  description: 'La plataforma autónoma para escalar tu agencia de IA',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className={`${inter.className} dark`}>
      <body>
        <QueryProvider>
          {children}
          <Toaster />
        </QueryProvider>
        <Script defer src="https://analytics-umami.hjbrvj.easypanel.host/script.js" data-website-id="36878cfd-86e1-4c4b-9e19-b18a739d9b00" strategy="afterInteractive" />
      </body>
    </html>
  );
}
