'use client';

import { Search } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { Fragment, useEffect, useState } from 'react';

import { SearchModal } from './SearchModal';
import { useSite } from '@/context/SiteContext';
import { ThemeToggle } from './ThemeToggle';
import { UserMenu } from './UserMenu';

const Logo = () => {
  const { siteName } = useSite();
  return (
    <Link
      href='/'
      className='mr-8 flex select-none items-center justify-center transition-opacity duration-200 hover:opacity-80'
    >
      <span className='text-primary text-2xl font-bold tracking-tight'>
        {siteName}
      </span>
    </Link>
  );
};

export const Navbar = () => {
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

  // Load custom categories
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const runtimeConfig = (window as any).RUNTIME_CONFIG;
    if (runtimeConfig?.CUSTOM_CATEGORIES?.length > 0) {
      setMenuItems((prev) => {
        // Check if already added to avoid duplicates if strict mode mounts twice
        if (prev.some((item) => item.label === '自定义')) return prev;
        return [
          ...prev,
          {
            label: '自定义',
            href: '/douban?type=custom',
          },
        ];
      });
    }
  }, []);

  const isActive = (href: string) => {
    if (href === '/' && pathname === '/') return true;
    if (href !== '/' && pathname.startsWith('/douban')) {
      const typeMatch = href.match(/type=([^&]+)/)?.[1];
      const currentType = searchParams.get('type');
      if (typeMatch && currentType === typeMatch) return true;
      if (href === '/douban?type=custom' && currentType === 'custom')
        return true;
    }
    return false;
  };

  return (
    <>
      <nav className='bg-background/95 border-border/50 fixed top-0 z-40 w-full border-b backdrop-blur-sm'>
        <div className='flex h-16 items-center justify-between px-4 md:px-12'>
          <div className='flex items-center'>
            <Logo />
            <div className='hidden gap-6 md:flex'>
              {menuItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`text-sm font-medium transition-colors duration-200 ${
                    isActive(item.href)
                      ? 'text-primary font-bold'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>

          <div className='flex items-center gap-3'>
            <button
              onClick={() => setIsSearchOpen(true)}
              className='text-muted-foreground hover:bg-muted hover:text-foreground flex h-10 w-10 items-center justify-center rounded-full transition-colors'
              aria-label='Search'
            >
              <Search className='h-5 w-5' />
            </button>

            {/* Notification bell - Placeholder for future */}
            {/* <button className='text-muted-foreground hover:text-foreground transition-colors'>
              <Bell className='w-5 h-5' />
            </button> */}

            <ThemeToggle />
            <UserMenu />
          </div>
        </div>
      </nav>
      <SearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
      />
    </>
  );
};
