'use client';

import React, { createContext, useContext, useEffect } from 'react';

type ThemeMode = 'dark';

interface ThemeContextType {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  resolvedMode: 'dark';
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const noopSetMode = () => {};

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const root = document.documentElement;

    root.classList.add('dark');
    root.classList.remove('light');
    root.setAttribute('data-mode', 'dark');
    root.style.colorScheme = 'dark';
  }, []);

  return (
    <ThemeContext.Provider
      value={{ mode: 'dark', setMode: noopSetMode, resolvedMode: 'dark' }}
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
