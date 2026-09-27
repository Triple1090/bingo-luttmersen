'use client';

import { Moon, Sun } from 'lucide-react';
import { useEffect, useState } from 'react';

type Theme = 'light' | 'dark';

const THEME_STORAGE_KEY = 'bingo-theme';
const THEME_COLOR: Record<Theme, string> = { light: '#fbf7ec', dark: '#15302a' };

function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEME_COLOR[theme]);
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>('light');

  useEffect(() => {
    // The inline script in the root layout already applied the saved theme
    // before paint; just sync this component's state to match it.
    const current = document.documentElement.dataset.theme;
    if (current === 'dark' || current === 'light') {
      setTheme(current);
    }
  }, []);

  const toggleTheme = () => {
    const nextTheme: Theme = theme === 'light' ? 'dark' : 'light';
    setTheme(nextTheme);
    applyTheme(nextTheme);
    window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
  };

  const label = theme === 'light' ? 'Zum dunklen Modus wechseln' : 'Zum hellen Modus wechseln';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="theme-toggle"
      title={label}
      aria-label={label}
    >
      {theme === 'light' ? <Moon aria-hidden="true" /> : <Sun aria-hidden="true" />}
    </button>
  );
}