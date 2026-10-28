import type { Metadata, Viewport } from 'next';
import { Press_Start_2P, VT323 } from 'next/font/google';
import { SessionProvider, ToastProvider } from '@/lib/session';
import './globals.css';
import './rooms.css';

const pixel = Press_Start_2P({ weight: '400', subsets: ['latin'], variable: '--font-pixel', display: 'swap' });
const vt = VT323({ weight: '400', subsets: ['latin'], variable: '--font-vt', display: 'swap' });

export const metadata: Metadata = {
  title: 'LIFE.EXE — tu vida como un videojuego retro',
  description: 'Organiza tu vida como un personaje de videojuego: notas, PDFs privados, pomodoros, metas, horario, outfits, mapa mental de ideas y un arcade pixel art.',
  icons: {
    icon: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Crect width='16' height='16' fill='%230d0221'/%3E%3Crect x='3' y='3' width='3' height='3' fill='%2300f0ff'/%3E%3Crect x='10' y='3' width='3' height='3' fill='%23ff2bd6'/%3E%3Crect x='3' y='10' width='10' height='3' fill='%23ffe66d'/%3E%3C/svg%3E",
  },
};

export const viewport: Viewport = { themeColor: '#09011a' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${pixel.variable} ${vt.variable}`}>
      <body>
        <SessionProvider>
          <ToastProvider>{children}</ToastProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
