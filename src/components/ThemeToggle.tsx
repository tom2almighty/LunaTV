'use client';

import { Moon, Sun, Palette, Check, SunMoon } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import { useEffect, useState, useRef } from 'react';

export function ThemeToggle() {
  const [mounted, setMounted] = useState(false);
  const { mode, setMode, colorScheme, setColorScheme, resolvedMode } = useTheme();
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
    return <div className='w-10 h-10' />;
  }

  const toggleMode = () => {
    const newMode = resolvedMode === 'dark' ? 'light' : 'dark';
    setMode(newMode);
  };

  const schemes = [
    { id: 'netflix', name: '红色', color: '#E50914' },
    { id: 'classic', name: '天空', color: '#2563eb' },
    { id: 'ocean', name: '海洋', color: '#0891b2' },
    { id: 'forest', name: '森林', color: '#16a34a' },
  ] as const;

  return (
    <div className="relative" ref={menuRef}>
      <div className="flex items-center gap-2 bg-secondary/50 rounded-full p-1 border border-border/50">
        {/* Mode Toggle */}
        <button
          onClick={toggleMode}
          className='w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors'
          aria-label='Toggle theme mode'
          title={resolvedMode === 'dark' ? '切换到亮色模式' : '切换到暗色模式'}
        >
          {resolvedMode === 'dark' ? (
            <Sun className='w-4 h-4' />
          ) : (
            <Moon className='w-4 h-4' />
          )}
        </button>

        <div className="w-px h-4 bg-border/50"></div>

        {/* Scheme Selector Trigger */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${isOpen ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}
          aria-label='Select color scheme'
          title="切换配色"
        >
          <Palette className='w-4 h-4' />
        </button>
      </div>

      {/* Scheme Dropdown */}
      {isOpen && (
        <div className="absolute top-full right-0 mt-2 w-48 py-2 bg-popover border border-border rounded-lg shadow-xl z-99 animate-in fade-in zoom-in-95 duration-200 origin-top-right">
          <div className="px-3 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            配色
          </div>
          {schemes.map((scheme) => (
            <button
              key={scheme.id}
              onClick={() => {
                setColorScheme(scheme.id);
                setIsOpen(false);
              }}
              className={`w-full text-left px-3 py-2 text-sm flex items-center gap-3 hover:bg-muted/50 transition-colors ${colorScheme === scheme.id ? 'text-foreground font-medium' : 'text-muted-foreground'}`}
            >
              <span
                className="w-3 h-3 rounded-full shadow-sm ring-1 ring-inset ring-black/10 dark:ring-white/10"
                style={{ backgroundColor: scheme.color }}
              ></span>
              <span className="flex-1">{scheme.name}</span>
              {colorScheme === scheme.id && <Check className="w-3 h-3 text-primary" />}
            </button>
          ))}

          <div className="my-1 border-t border-border/50"></div>

          <div className="px-3 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            模式
          </div>
          <div className="px-2 pb-1 flex gap-1">
            <button
              onClick={() => setMode('light')}
              className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded text-xs transition-colors ${mode === 'light' ? 'bg-muted text-foreground font-medium' : 'text-muted-foreground hover:bg-muted/50'}`}
            >
              <Sun className="w-3 h-3" /> 亮色
            </button>
            <button
              onClick={() => setMode('dark')}
              className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded text-xs transition-colors ${mode === 'dark' ? 'bg-muted text-foreground font-medium' : 'text-muted-foreground hover:bg-muted/50'}`}
            >
              <Moon className="w-3 h-3" /> 暗色
            </button>
            <button
              onClick={() => setMode('system')}
              className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded text-xs transition-colors ${mode === 'system' ? 'bg-muted text-foreground font-medium' : 'text-muted-foreground hover:bg-muted/50'}`}
            >
              <SunMoon className="w-3 h-3" /> 自动
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
