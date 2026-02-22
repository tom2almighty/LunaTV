'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

type ThemeMode = 'light' | 'dark' | 'system';
type ColorScheme = 'red' | 'slate' | 'zinc' | 'gray';

interface ThemeContextType {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  colorScheme: ColorScheme;
  setColorScheme: (scheme: ColorScheme) => void;
  resolvedMode: 'light' | 'dark';
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<ThemeMode>('system');
  const [colorScheme, setColorScheme] = useState<ColorScheme>('red');
  const [resolvedMode, setResolvedMode] = useState<'light' | 'dark'>('dark');
  const [mounted, setMounted] = useState(false);

  // Initialize from localStorage
  useEffect(() => {
    const savedMode = localStorage.getItem('theme-mode') as ThemeMode;
    const savedScheme = localStorage.getItem('color-scheme') as ColorScheme;

    if (savedMode) setMode(savedMode);
    if (savedScheme) setColorScheme(savedScheme);
    setMounted(true);
  }, []);

  // Handle system preference and mode resolution
  useEffect(() => {
    if (!mounted) return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const updateResolvedMode = () => {
      if (mode === 'system') {
        setResolvedMode(mediaQuery.matches ? 'dark' : 'light');
      } else {
        setResolvedMode(mode);
      }
    };

    updateResolvedMode();
    mediaQuery.addEventListener('change', updateResolvedMode);

    return () => mediaQuery.removeEventListener('change', updateResolvedMode);
  }, [mode, mounted]);

  // Apply attributes to document
  useEffect(() => {
    if (!mounted) return;

    const root = document.documentElement;

    // Save to localStorage
    localStorage.setItem('theme-mode', mode);
    localStorage.setItem('color-scheme', colorScheme);

    // Apply class for Tailwind dark mode
    if (resolvedMode === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light');
    } else {
      root.classList.remove('dark');
      root.classList.add('light');
    }

    // Apply data attributes for CSS variables
    root.setAttribute('data-mode', resolvedMode);
    root.setAttribute('data-theme', colorScheme);

    // Set color-scheme property for system UI
    root.style.colorScheme = resolvedMode;
  }, [mode, colorScheme, resolvedMode, mounted]);

  // Avoid hydration mismatch
  if (!mounted) {
    return (
      <ThemeContext.Provider
        value={{
          mode: 'system',
          // eslint-disable-next-line @typescript-eslint/no-empty-function
          setMode: () => {},
          colorScheme: 'red',
          // eslint-disable-next-line @typescript-eslint/no-empty-function
          setColorScheme: () => {},
          resolvedMode: 'dark',
        }}
      >
        <div style={{ visibility: 'hidden' }}>{children}</div>
      </ThemeContext.Provider>
    );
  }

  return (
    <ThemeContext.Provider
      value={{ mode, setMode, colorScheme, setColorScheme, resolvedMode }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
