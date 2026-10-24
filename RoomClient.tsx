import type { Metadata } from 'next';
import '@livekit/components-styles';
import './globals.css';

export const metadata: Metadata = {
  title: 'Screenly — общение по-новому',
  description: 'Общение голосом и экраном, приватные комнаты, профили и друзья. Закрытый тест Screenly 1.0.',
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ru"><body>{children}</body></html>;
}
