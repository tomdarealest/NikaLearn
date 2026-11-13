'use client';

import { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const STORAGE_KEY = 'theme';

function applyTheme(theme: 'light' | 'dark') {
  const root = document.documentElement;
  if (theme === 'dark') {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
}

export default function ThemeToggle() {
  const [mounted, setMounted] = useState(false);
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    const dark = stored === 'dark';
    setIsDark(dark);
    applyTheme(dark ? 'dark' : 'light');
    setMounted(true);
  }, []);

  const toggle = () => {
    const next = !isDark;
    const theme = next ? 'dark' : 'light';
    setIsDark(next);
    localStorage.setItem(STORAGE_KEY, theme);
    applyTheme(theme);
  };

  return (
    <button
      type="button"
      onClick={toggle}
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-[#121212] bg-[#FFF8EE] dark:bg-[#1B261A] text-[#121212] dark:text-[#F5F9F1] shadow-[2px_2px_0_#121212] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[3.5px_3.5px_0_#121212] active:translate-y-0 active:shadow-[1px_1px_0_#121212] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:opacity-70"
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={mounted ? (isDark ? 'sun' : 'moon') : 'placeholder'}
          initial={{ rotate: -90, opacity: 0, scale: 0.5 }}
          animate={{ rotate: 0, opacity: 1, scale: 1 }}
          exit={{ rotate: 90, opacity: 0, scale: 0.5 }}
          transition={{ duration: 0.25, ease: 'easeInOut' }}
          className="flex items-center justify-center"
        >
          {mounted && isDark ? (
            <Sun className="h-5 w-5" aria-hidden />
          ) : (
            <Moon className="h-5 w-5" aria-hidden />
          )}
        </motion.span>
      </AnimatePresence>
    </button>
  );
}
