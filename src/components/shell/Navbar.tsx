import { Clock, LogOut, Search, User } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
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
  match: (pathname: string) => boolean;
}

const LINKS: NavLink[] = [
  { label: '首页', href: '/', match: (p) => p === '/' },
  { label: '搜索', href: '/search', match: (p) => p === '/search' },
  { label: '分类', href: '/douban', match: (p) => p === '/douban' },
];

function NavLinks({ pathname }: { pathname: string }) {
  return (
    <div className="flex items-center gap-1">
      {LINKS.map((l) => {
        const active = l.match(pathname);
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
