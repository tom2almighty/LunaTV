'use client';

import { Moon, Sun, SunMoon } from 'lucide-react';
import { useEffect, useState } from 'react';

import { useTheme } from '@/context/ThemeContext';

export function ThemeToggle() {
  const [mounted, setMounted] = useState(false);
  const { mode, setMode } = useTheme();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className='h-10 w-24' />;
  }

  const modes = [
    { id: 'light', label: '亮色', icon: Sun },
    { id: 'dark', label: '暗色', icon: Moon },
    { id: 'system', label: '自动', icon: SunMoon },
  ] as const;

  return (
    <div className='bg-secondary/50 border-border/50 flex items-center rounded-full border p-1'>
      {modes.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          onClick={() => setMode(id)}
          title={label}
          aria-label={label}
          className={`flex h-8 items-center justify-center gap-1 rounded-full px-2.5 text-xs transition-colors ${
            mode === id
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground'
          }`}
        >
          <Icon className='h-3.5 w-3.5 shrink-0' />
          <span className='hidden sm:inline'>{label}</span>
        </button>
      ))}
    </div>
  );
}
