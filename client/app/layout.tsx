import type { Metadata } from 'next';
import { Inter, Geist_Mono, Archivo } from 'next/font/google';
import './globals.css';
import { cn } from '@/lib/utils';
import { Providers } from './providers';

const inter = Inter({ subsets: ['latin'], variable: '--font-sans', display: 'swap' });
const geistMono = Geist_Mono({ subsets: ['latin'], variable: '--font-geist-mono', display: 'swap' });
const archivo = Archivo({
  subsets: ['latin'],
  variable: '--font-heading',
  weight: ['500', '600', '700'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'SaniChain — Sanitation Service Coordination',
  description:
    'Desludging coordination for Northern Ghana. Sensors and flood forecasts detect full pits; the right vetted provider is dispatched, notified, and paid.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn(
        'h-full antialiased font-sans',
        inter.variable,
        geistMono.variable,
        archivo.variable,
      )}
    >
      <body className="min-h-full bg-background text-foreground">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
