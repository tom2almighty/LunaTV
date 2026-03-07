'use client';

import { ChevronDown, Menu } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useRef, useState } from 'react';

import { useSite } from '@/context/SiteContext';

import { ThemeToggle } from './ThemeToggle';
import { UserMenu } from './UserMenu';

const Logo = () => {
  const { siteName } = useSite();
  return (
    <Link
      href='/'
      aria-label={siteName}
      className='flex min-w-0 select-none items-center gap-3 rounded-full px-1 py-1 transition-opacity duration-200 hover:opacity-85'
    >
      <span className='bg-white/6 flex h-9 w-9 items-center justify-center rounded-full border border-white/10 text-[0.65rem] font-semibold uppercase tracking-[0.24em] text-[var(--accent)] shadow-[0_10px_30px_rgba(0,0,0,0.22)]'>
        LT
      </span>
      <span className='min-w-0'>
        <span className='text-foreground block truncate text-[1.05rem] font-semibold tracking-[0.12em]'>
          {siteName}
        </span>
        <span className='text-muted-foreground hidden text-[0.65rem] uppercase tracking-[0.22em] md:block'>
          Moonlit Premium
        </span>
      </span>
    </Link>
  );
};

const NavLinks = ({
  items,
  isActive,
}: {
  items: { label: string; href: string }[];
  isActive: (href: string) => boolean;
}) => (
  <div className='hidden items-center gap-1 xl:flex'>
    {items.map((item) => {
      const active = isActive(item.href);
      return (
        <Link
          key={item.href}
          href={item.href}
          className={`rounded-full px-3.5 py-2 text-sm font-medium tracking-wide transition-all duration-200 ${
            active
              ? 'border-white/12 text-foreground border bg-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]'
              : 'text-muted-foreground hover:bg-white/6 hover:text-foreground'
          }`}
        >
          {item.label}
        </Link>
      );
    })}
  </div>
);

const MobileNavDropdown = ({
  items,
  isActive,
}: {
  items: { label: string; href: string }[];
  isActive: (href: string) => boolean;
}) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const activeItem = items.find((item) => isActive(item.href));

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    if (open) {
      document.addEventListener('mousedown', handlePointerDown);
    }

    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, [open]);

  return (
    <div ref={ref} className='relative xl:hidden'>
      <button
        type='button'
        onClick={() => setOpen((value) => !value)}
        className='bg-white/6 text-foreground flex h-10 items-center gap-2 rounded-full border border-white/10 px-3 text-sm shadow-[0_10px_30px_rgba(0,0,0,0.2)] transition-all duration-200 hover:bg-white/10'
        aria-label='导航菜单'
      >
        <Menu className='h-4 w-4' />
        <span className='text-muted-foreground max-w-20 truncate text-xs uppercase tracking-[0.14em]'>
          {activeItem?.label ?? '导航'}
        </span>
        <ChevronDown
          className={`text-muted-foreground h-3.5 w-3.5 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div className='absolute left-0 top-[calc(100%+0.75rem)] z-50 min-w-40 overflow-hidden rounded-[1.25rem] border border-white/10 bg-black/80 p-1.5 shadow-[0_24px_60px_rgba(0,0,0,0.45)] backdrop-blur-2xl'>
          {items.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={`block rounded-[0.9rem] px-3 py-2.5 text-sm transition-colors ${
                  active
                    ? 'text-foreground bg-white/10'
                    : 'text-muted-foreground hover:bg-white/6 hover:text-foreground'
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
};

const NavbarInner = () => {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const menuItems = [
    { label: '首页', href: '/' },
    { label: '搜索', href: '/search' },
    { label: '电影', href: '/douban?type=movie' },
    { label: '剧集', href: '/douban?type=tv' },
    { label: '综艺', href: '/douban?type=show' },
  ];

  const isActive = (href: string) => {
    if (href === '/' && pathname === '/') return true;
    if (href === '/search' && pathname.startsWith('/search')) return true;
    if (href !== '/' && pathname.startsWith('/douban')) {
      const typeMatch = href.match(/type=([^&]+)/)?.[1];
      const currentType = searchParams.get('type');
      if (typeMatch && currentType === typeMatch) return true;
    }
    return false;
  };

  return (
    <nav className='fixed inset-x-0 top-0 z-50 pt-[max(env(safe-area-inset-top),0.75rem)] backdrop-blur-xl'>
      <div className='app-shell'>
        <div className='flex h-16 items-center justify-between gap-3 rounded-[1.4rem] border border-white/10 bg-black/45 px-3 shadow-[0_24px_80px_rgba(0,0,0,0.4)] ring-1 ring-white/5 backdrop-blur-2xl md:px-4'>
          <div className='flex min-w-0 flex-1 items-center gap-2 md:gap-3'>
            <Logo />
            <MobileNavDropdown items={menuItems} isActive={isActive} />
            <NavLinks items={menuItems} isActive={isActive} />
          </div>

          <div className='flex shrink-0 items-center gap-2'>
            <ThemeToggle />
            <UserMenu />
          </div>
        </div>
      </div>
    </nav>
  );
};

export const Navbar = () => (
  <Suspense fallback={null}>
    <NavbarInner />
  </Suspense>
);
