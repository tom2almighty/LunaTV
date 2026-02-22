'use client';

import { ChevronDown, Menu, Search, X } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useRef, useState } from 'react';

import { useSite } from '@/context/SiteContext';

import { SearchModal } from './SearchModal';
import { ThemeToggle } from './ThemeToggle';
import { UserMenu } from './UserMenu';

/* ── Logo ── */
const Logo = () => {
  const { siteName } = useSite();
  return (
    <Link
      href='/'
      className='flex select-none items-center transition-opacity duration-200 hover:opacity-75'
    >
      <span className='text-primary text-xl font-bold tracking-tight'>
        {siteName}
      </span>
    </Link>
  );
};

/* ── Desktop Nav Links ── */
const NavLinks = ({
  items,
  isActive,
}: {
  items: { label: string; href: string }[];
  isActive: (href: string) => boolean;
}) => (
  <div className='flex items-center gap-0.5'>
    {items.map((item) => (
      <Link
        key={item.href}
        href={item.href}
        className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors duration-150 ${
          isActive(item.href)
            ? 'bg-primary/10 text-primary'
            : 'text-muted-foreground hover:bg-muted hover:text-foreground'
        }`}
      >
        {item.label}
      </Link>
    ))}
  </div>
);

/* ── Mobile Nav Dropdown ── */
const MobileNavDropdown = ({
  items,
  isActive,
}: {
  items: { label: string; href: string }[];
  isActive: (href: string) => boolean;
}) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const activeItem = items.find((i) => isActive(i.href));

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    };
    if (open) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div ref={ref} className='relative'>
      <button
        onClick={() => setOpen((v) => !v)}
        className='text-foreground flex items-center gap-1 rounded-md px-2 py-1.5 text-sm font-medium transition-colors'
        aria-label='导航菜单'
      >
        <Menu className='h-4 w-4' />
        <span className='max-w-[5rem] truncate text-xs'>
          {activeItem?.label ?? '导航'}
        </span>
        <ChevronDown
          className={`h-3.5 w-3.5 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div className='bg-popover border-border absolute left-0 top-full z-50 mt-1 w-36 overflow-hidden rounded-lg border shadow-lg'>
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className={`block px-3 py-2 text-sm transition-colors ${
                isActive(item.href)
                  ? 'bg-primary/10 text-primary font-medium'
                  : 'text-foreground hover:bg-muted'
              }`}
            >
              {item.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

/* ── Search Bar (inline, desktop) ── */
const SearchBar = () => {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState('');

  const handleSubmit = () => {
    const q = value.trim();
    if (q) {
      router.push(`/search?q=${encodeURIComponent(q)}`);
      setValue('');
      inputRef.current?.blur();
    }
  };

  return (
    <div className='relative flex w-48 items-center lg:w-64'>
      <Search className='text-muted-foreground pointer-events-none absolute left-3 h-4 w-4' />
      <input
        ref={inputRef}
        type='text'
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder='搜索...'
        className='bg-muted/60 text-foreground placeholder:text-muted-foreground focus:bg-background focus:border-border focus:ring-border w-full rounded-full border border-transparent py-1.5 pl-9 pr-8 text-sm outline-none transition-all focus:ring-1'
        onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
      />
      {value && (
        <button
          onClick={() => setValue('')}
          className='text-muted-foreground hover:text-foreground absolute right-2.5'
        >
          <X className='h-3.5 w-3.5' />
        </button>
      )}
    </div>
  );
};

/* ── Inner (needs useSearchParams) ── */
const NavbarInner = () => {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [menuItems, setMenuItems] = useState([
    { label: '首页', href: '/' },
    { label: '电影', href: '/douban?type=movie' },
    { label: '剧集', href: '/douban?type=tv' },
    { label: '动漫', href: '/douban?type=anime' },
    { label: '综艺', href: '/douban?type=show' },
  ]);

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rc = (window as any).RUNTIME_CONFIG;
    if (rc?.CUSTOM_CATEGORIES?.length > 0) {
      setMenuItems((prev) => {
        if (prev.some((i) => i.label === '自定义')) return prev;
        return [...prev, { label: '自定义', href: '/douban?type=custom' }];
      });
    }
  }, []);

  const isActive = (href: string) => {
    if (href === '/' && pathname === '/') return true;
    if (href !== '/' && pathname.startsWith('/douban')) {
      const typeMatch = href.match(/type=([^&]+)/)?.[1];
      const currentType = searchParams.get('type');
      if (typeMatch && currentType === typeMatch) return true;
    }
    return false;
  };

  return (
    <>
      <nav className='bg-background/95 border-border/60 fixed top-0 z-40 w-full border-b backdrop-blur-md'>
        <div className='flex h-14 items-center px-4 md:px-8 lg:px-12'>
          {/* 左：Logo + 移动端下拉 / 桌面端路由链接 */}
          <div className='flex min-w-0 flex-1 items-center gap-2'>
            <Logo />
            {/* 移动端：下拉菜单 */}
            <div className='md:hidden'>
              <MobileNavDropdown items={menuItems} isActive={isActive} />
            </div>
            {/* 桌面端：横排链接 */}
            <div className='ml-2 hidden md:flex'>
              <NavLinks items={menuItems} isActive={isActive} />
            </div>
          </div>

          {/* 中：搜索框（仅桌面） */}
          <div className='mx-4 hidden md:flex'>
            <SearchBar />
          </div>

          {/* 右：固定宽度，防止被挤压 */}
          <div className='flex shrink-0 items-center gap-1'>
            <button
              onClick={() => setIsSearchOpen(true)}
              className='text-muted-foreground hover:bg-muted hover:text-foreground flex h-9 w-9 items-center justify-center rounded-full transition-colors md:hidden'
              aria-label='搜索'
            >
              <Search className='h-4 w-4' />
            </button>
            <ThemeToggle />
            <UserMenu />
          </div>
        </div>
      </nav>

      <SearchModal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
    </>
  );
};

/* ── Export ── */
export const Navbar = () => (
  <Suspense fallback={null}>
    <NavbarInner />
  </Suspense>
);
