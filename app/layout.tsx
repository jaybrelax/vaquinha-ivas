import type { Metadata } from 'next';
import './globals.css'; // Global styles

export const metadata: Metadata = {
  title: 'Vaquinha Microfone Hollyland Lark A1',
  description: 'Vamos melhorar a qualidade do áudio dos nossos vídeos',
  openGraph: {
    images: ['/lark-microphone.jpg'],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
