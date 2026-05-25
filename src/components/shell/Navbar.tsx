import { Clock, Compass, Home as HomeIcon, LogOut, Search } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import { BrandMark } from './BrandMark';
import { useAuth } from '@/features/auth/AuthContext';
import { cn } from '@/lib/utils';

interface NavLink {
  label: string;
  href: string;
  icon: LucideIcon;
  match: (pathname: string) => boolean;
}

const LINKS: NavLink[] = [
  { label: '首页', href: '/', icon: HomeIcon, match: (p) => p === '/' },
  { label: '搜索', href: '/search', icon: Search, match: (p) => p === '/search' },
  { label: '分类', href: '/douban', icon: Compass, match: (p) => p === '/douban' },
  { label: '历史', href: '/history', icon: Clock, match: (p) => p === '/history' },
];

/**
 * Segmented pill nav, modeled after the shadcn Tabs trigger style. Labels
 * collapse to icons on small screens to keep things tidy on phones.
 */
function NavLinks({ pathname }: { pathname: string }) {
  return (
    <div className="inline-flex h-9 items-center rounded-md bg-muted p-1 text-muted-foreground">
      {LINKS.map((l) => {
        const Icon = l.icon;
        const active = l.match(pathname);
        return (
          <Link
            key={l.href}
            to={l.href}
            data-active={active}
            aria-label={l.label}
            className={cn(
              'inline-flex h-7 items-center justify-center gap-1.5 whitespace-nowrap rounded-sm px-3 text-sm font-medium transition-all sm:px-5',
              'hover:text-foreground',
              'data-[active=true]:bg-background data-[active=true]:text-foreground data-[active=true]:shadow-sm',
            )}
          >
            <Icon className="h-3.5 w-3.5" strokeWidth={2} />
            <span className="hidden sm:inline">{l.label}</span>
          </Link>
        );
      })}
    </div>
  );
}

function LogoutButton() {
  const { logout } = useAuth();
  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label="退出登录"
      title="退出登录"
      onClick={logout}
    >
      <LogOut className="h-4 w-4" />
    </Button>
  );
}

export function Navbar() {
  const location = useLocation();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <nav
      data-scrolled={scrolled}
      className={cn(
        'fixed inset-x-0 top-0 z-40 transition-colors duration-300',
        'data-[scrolled=true]:border-b data-[scrolled=true]:border-border',
        'data-[scrolled=true]:bg-background/85 data-[scrolled=true]:backdrop-blur-xl',
        'data-[scrolled=false]:bg-background/40 data-[scrolled=false]:backdrop-blur-sm',
      )}
    >
      <div className="mx-auto flex h-14 w-full max-w-[88rem] items-center gap-3 px-4 md:px-10 lg:px-14">
        <div className="flex min-w-0 flex-1 items-center gap-5">
          <BrandMark />
          <NavLinks pathname={location.pathname} />
        </div>
        <div className="flex items-center gap-1">
          <ThemeToggle />
          <LogoutButton />
        </div>
      </div>
    </nav>
  );
}
