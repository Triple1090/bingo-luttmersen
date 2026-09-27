import type { Metadata } from 'next';
import '@/styles/globals.css';

export const metadata: Metadata = {
  title: 'Bingo',
  description: 'Bingo-Veranstaltungen für unseren Verein – barrierefrei, übersichtlich, große Anzeigen.',
};

// Runs before paint on every page (not just the game room) so a saved dark-mode
// preference applies everywhere and there is no flash of the wrong theme.
const THEME_INIT_SCRIPT = `
(function () {
  try {
    var theme = window.localStorage.getItem('bingo-theme');
    if (theme === 'dark' || theme === 'light') {
      document.documentElement.dataset.theme = theme;
      var meta = document.querySelector('meta[name="theme-color"]');
      if (meta) meta.setAttribute('content', theme === 'dark' ? '#15302a' : '#fbf7ec');
    }
  } catch {}
})();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de" data-theme="light">
      <head>
        <meta name="theme-color" content="#fbf7ec" />
        {/* eslint-disable-next-line react/no-danger */}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="bg-bingo-bg text-bingo-text antialiased">
        {children}
      </body>
    </html>
  );
}
