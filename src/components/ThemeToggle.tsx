'use client';

import { Check, Moon, Palette, Sun, SunMoon } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { useTheme } from '@/context/ThemeContext';

export function ThemeToggle() {
  const [mounted, setMounted] = useState(false);
  const { mode, setMode, colorScheme, setColorScheme, resolvedMode } =
    useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);

    // Click outside to close
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!mounted) {
    return <div className='h-10 w-10' />;
  }

  const toggleMode = () => {
    const newMode = resolvedMode === 'dark' ? 'light' : 'dark';
    setMode(newMode);
  };

  const schemes = [
    { id: 'red', name: '红色', color: '#E50914' },
    { id: 'blue', name: '蓝色', color: '#2563eb' },
    { id: 'cyan', name: '青色', color: '#0891b2' },
    { id: 'green', name: '绿色', color: '#16a34a' },
  ] as const;

  return (
    <div className='relative' ref={menuRef}>
      <div className='bg-secondary/50 border-border/50 flex items-center gap-2 rounded-full border p-1'>
        {/* Mode Toggle */}
        <button
          onClick={toggleMode}
          className='text-muted-foreground hover:bg-muted hover:text-foreground flex h-8 w-8 items-center justify-center rounded-full transition-colors'
          aria-label='Toggle theme mode'
          title={resolvedMode === 'dark' ? '切换到亮色模式' : '切换到暗色模式'}
        >
          {resolvedMode === 'dark' ? (
            <Sun className='h-4 w-4' />
          ) : (
            <Moon className='h-4 w-4' />
          )}
        </button>

        <div className='bg-border/50 h-4 w-px'></div>

        {/* Scheme Selector Trigger */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`flex h-8 w-8 items-center justify-center rounded-full transition-colors ${isOpen ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}
          aria-label='Select color scheme'
          title='切换配色'
        >
          <Palette className='h-4 w-4' />
        </button>
      </div>

      {/* Scheme Dropdown */}
      {isOpen && (
        <div className='bg-popover border-border z-99 animate-in fade-in zoom-in-95 absolute right-0 top-full mt-2 min-w-52 origin-top-right rounded-lg border py-2 shadow-xl duration-200'>
          <div className='text-muted-foreground px-3 py-1.5 text-xs font-semibold uppercase tracking-wider'>
            配色
          </div>
          {schemes.map((scheme) => (
            <button
              key={scheme.id}
              onClick={() => {
                setColorScheme(scheme.id);
                setIsOpen(false);
              }}
              className={`hover:bg-muted/50 flex w-full items-center gap-3 px-3 py-2 text-left text-sm transition-colors ${colorScheme === scheme.id ? 'text-foreground font-medium' : 'text-muted-foreground'}`}
            >
              <span
                className='h-3 w-3 rounded-full shadow-sm ring-1 ring-inset ring-black/10 dark:ring-white/10'
                style={{ backgroundColor: scheme.color }}
              ></span>
              <span className='flex-1'>{scheme.name}</span>
              {colorScheme === scheme.id && (
                <Check className='text-primary h-3 w-3' />
              )}
            </button>
          ))}

          <div className='border-border/50 my-1 border-t'></div>

          <div className='text-muted-foreground px-3 py-1.5 text-xs font-semibold uppercase tracking-wider'>
            模式
          </div>
          <div className='flex gap-1 px-2 pb-1'>
            <button
              onClick={() => setMode('light')}
              className={`flex flex-1 flex-row items-center justify-center gap-1 rounded px-1.5 py-1.5 text-xs transition-colors ${mode === 'light' ? 'bg-muted text-foreground font-medium' : 'text-muted-foreground hover:bg-muted/50'}`}
            >
              <Sun className='h-3.5 w-3.5 shrink-0' />
              <span className='whitespace-nowrap'>亮色</span>
            </button>
            <button
              onClick={() => setMode('dark')}
              className={`flex flex-1 flex-row items-center justify-center gap-1 rounded px-1.5 py-1.5 text-xs transition-colors ${mode === 'dark' ? 'bg-muted text-foreground font-medium' : 'text-muted-foreground hover:bg-muted/50'}`}
            >
              <Moon className='h-3.5 w-3.5 shrink-0' />
              <span className='whitespace-nowrap'>暗色</span>
            </button>
            <button
              onClick={() => setMode('system')}
              className={`flex flex-1 flex-row items-center justify-center gap-1 rounded px-1.5 py-1.5 text-xs transition-colors ${mode === 'system' ? 'bg-muted text-foreground font-medium' : 'text-muted-foreground hover:bg-muted/50'}`}
            >
              <SunMoon className='h-3.5 w-3.5 shrink-0' />
              <span className='whitespace-nowrap'>自动</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
