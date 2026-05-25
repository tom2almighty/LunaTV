import { ChevronDown, Clock, LogOut, Menu, Search, User } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import { BrandMark } from './BrandMark';
import { useAuth } from '@/features/auth/AuthContext';
import { cn } from '@/lib/utils';

interface NavLink {
  label: string;
  href: string;
}

const LINKS: NavLink[] = [
  { label: '首页', href: '/' },
  { label: '搜索', href: '/search' },
  { label: '电影', href: '/douban?type=movie' },
  { label: '剧集', href: '/douban?type=tv' },
  { label: '综艺', href: '/douban?type=show' },
];

function isLinkActive(href: string, pathname: string, typeParam: string | null): boolean {
  if (href === '/') return pathname === '/';
  if (href === '/search') return pathname === '/search';
  if (href.startsWith('/douban')) {
    if (pathname !== '/douban') return false;
    const hType = new URLSearchParams(href.split('?')[1]).get('type');
    return typeParam === hType;
  }
  return false;
}

function DesktopLinks({
  pathname,
  typeParam,
}: {
  pathname: string;
  typeParam: string | null;
}) {
  return (
    <div className="hidden items-center gap-1 xl:flex">
      {LINKS.map((l) => {
        const active = isLinkActive(l.href, pathname, typeParam);
        return (
          <Link
            key={l.href}
            to={l.href}
            data-active={active}
            className={cn(
              'relative rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
              'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
              'data-[active=true]:bg-secondary data-[active=true]:text-secondary-foreground',
            )}
          >
            {l.label}
          </Link>
        );
      })}
    </div>
  );
}

function MobileMenu({
  pathname,
  typeParam,
}: {
  pathname: string;
  typeParam: string | null;
}) {
  const active = LINKS.find((l) => isLinkActive(l.href, pathname, typeParam));
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="xl:hidden gap-2 px-3" size="sm">
          <Menu className="h-4 w-4" />
          <span className="text-sm font-medium">{active?.label ?? '菜单'}</span>
          <ChevronDown className="h-3.5 w-3.5 opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-[10rem]">
        {LINKS.map((l) => {
          const isActive = isLinkActive(l.href, pathname, typeParam);
          return (
            <DropdownMenuItem key={l.href} asChild>
              <Link to={l.href} data-active={isActive}>
                {l.label}
              </Link>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function UserMenu() {
  const { logout } = useAuth();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="账户">
          <User className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[10rem]">
        <DropdownMenuItem asChild>
          <Link to="/?tab=history">
            <Clock className="mr-2 h-4 w-4" />
            历史记录
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={logout} className="text-destructive focus:text-destructive">
          <LogOut className="mr-2 h-4 w-4" />
          退出登录
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function Navbar() {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const typeParam = searchParams.get('type');
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
          <MobileMenu pathname={location.pathname} typeParam={typeParam} />
          <DesktopLinks pathname={location.pathname} typeParam={typeParam} />
        </div>
        <div className="flex items-center gap-1">
          <Button
            asChild
            variant="ghost"
            size="icon"
            aria-label="搜索"
            data-active={location.pathname === '/search'}
            className="data-[active=true]:bg-secondary"
          >
            <Link to="/search">
              <Search className="h-4 w-4" />
            </Link>
          </Button>
          <ThemeToggle />
          <UserMenu />
        </div>
      </div>
    </nav>
  );
}
