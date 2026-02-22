'use client';

import { Moon, Sun, SunMoon } from 'lucide-react';
import { useEffect, useState } from 'react';

import { useTheme } from '@/context/ThemeContext';

const modes = [
  { id: 'light', label: '亮色', icon: Sun },
  { id: 'dark', label: '暗色', icon: Moon },
  { id: 'system', label: '自动', icon: SunMoon },
] as const;

export function ThemeToggle() {
  const [mounted, setMounted] = useState(false);
  const { mode, setMode } = useTheme();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className='h-9 w-9 shrink-0' />;
  }

  const currentIndex = modes.findIndex((m) => m.id === mode);
  const next = modes[(currentIndex + 1) % modes.length];
  const CurrentIcon = modes[currentIndex]?.icon ?? Sun;

  return (
    <>
      {/* 移动端：单图标循环切换 */}
      <button
        onClick={() => setMode(next.id)}
        title={`切换到${next.label}`}
        aria-label={`切换到${next.label}`}
        className='text-muted-foreground hover:bg-muted hover:text-foreground flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors md:hidden'
      >
        <CurrentIcon className='h-4 w-4' />
      </button>

      {/* 桌面端：三段 pill */}
      <div className='bg-muted/60 border-border hidden shrink-0 items-center rounded-full border p-0.5 md:flex'>
        {modes.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setMode(id)}
            title={label}
            aria-label={label}
            className={`flex h-7 items-center justify-center gap-1 rounded-full px-2.5 text-xs font-medium transition-all duration-200 ${
              mode === id
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Icon className='h-3.5 w-3.5 shrink-0' />
            <span>{label}</span>
          </button>
        ))}
      </div>
    </>
  );
}
