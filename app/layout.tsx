import type { Metadata } from 'next';
import { headers } from 'next/headers';
import '@livekit/components-styles';
import './globals.css';
import DesktopGate from '@/components/DesktopGate';

export const metadata: Metadata = {
  title: 'Screenly — общение по-новому',
  description: 'Совместная работа, творчество и обучение с демонстрацией экрана. Закрытая бета Screenly 2.0.',
  robots: { index: false, follow: false },
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const agent=(await headers()).get('user-agent')||'';
  const mobileUserAgent=/Android|iPhone|iPad|iPod|Mobile|Tablet/i.test(agent);
  return <html lang="ru"><body><DesktopGate mobileUserAgent={mobileUserAgent}>{children}</DesktopGate></body></html>;
}
