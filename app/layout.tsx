import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import './globals.css';

export const metadata: Metadata = {
  title: 'bolsillo — tu dinero en perspectiva',
  description: 'Una forma más visual de entender tus finanzas conectada a Wallet.',
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return <html lang="es"><body>{children}</body></html>;
}

