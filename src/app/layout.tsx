import type { Metadata } from 'next';
import '@/styles/globals.css';

export const metadata: Metadata = {
  title: 'Bingo',
  description: 'Bingo-Veranstaltungen für unseren Verein – barrierefrei, übersichtlich, große Anzeigen.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de" data-theme="light">
      <body className="bg-bingo-bg text-bingo-text antialiased">
        {children}
      </body>
    </html>
  );
}
