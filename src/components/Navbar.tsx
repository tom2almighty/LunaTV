import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { ChevronDown, Clock, LogOut, Menu, Search, User } from 'lucide-react';
import { Suspense, useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSite } from '../context/SiteContext';
import { createPortal } from 'react-dom';

const LINKS = [
  { label: '首页', href: '/' },
  { label: '搜索', href: '/search' },
  { label: '电影', href: '/douban?type=movie' },
  { label: '剧集', href: '/douban?type=tv' },
  { label: '综艺', href: '/douban?type=show' },
];

function isLinkActive(href: string, pathname: string, typeParam: string | null) {
  if (href === '/') return pathname === '/';
  if (href === '/search') return pathname === '/search';
  if (href.startsWith('/douban')) {
    if (pathname !== '/douban') return false;
    const hType = new URLSearchParams(href.split('?')[1]).get('type');
    return typeParam === hType;
  }
  return false;
}

function Logo() {
  const { siteName } = useSite();
  return (
    <Link to="/" className="flex items-center gap-2">
      <span className="text-xl font-bold uppercase tracking-tight text-[--color-accent-soft] drop-shadow-[0_0_18px_rgba(229,9,20,0.22)]">
        {siteName}
      </span>
    </Link>
  );
}

function MobileMenu({ pathname, typeParam }: { pathname: string; typeParam: string | null }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const active = LINKS.find((l) => isLinkActive(l.href, pathname, typeParam));

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    if (open) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div ref={ref} className="relative xl:hidden">
      <button
        onClick={() => setOpen(!open)}
        className="flex h-9 cursor-pointer items-center gap-2 rounded-lg px-3 text-sm font-medium text-[--color-foreground] transition-[background-color,color] hover:bg-[--overlay-1]"
      >
        <Menu className="h-4 w-4" strokeWidth={1.75} />
        <span>{active?.label ?? '菜单'}</span>
        <ChevronDown
          className={`h-3.5 w-3.5 transition-transform ${open ? 'rotate-180' : ''}`}
          strokeWidth={1.75}
        />
      </button>
      {open && (
        <div className="absolute left-0 top-[calc(100%+0.5rem)] z-50 w-44 overflow-hidden rounded-xl surface-floating p-1 animate-scale-in">
          {LINKS.map((l) => {
            const a = isLinkActive(l.href, pathname, typeParam);
            return (
              <Link
                key={l.href}
                to={l.href}
                onClick={() => setOpen(false)}
                className={`block rounded-lg px-3 py-2 text-sm transition-colors ${
                  a
                    ? 'bg-[--color-accent-tint] text-[--color-foreground]'
                    : 'text-[--color-foreground] hover:bg-[--overlay-1]'
                }`}
              >
                {l.label}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

function DesktopLinks({ pathname, typeParam }: { pathname: string; typeParam: string | null }) {
  return (
    <div className="hidden items-center gap-1 xl:flex">
      {LINKS.map((l) => {
        const a = isLinkActive(l.href, pathname, typeParam);
        return (
          <Link
            key={l.href}
            to={l.href}
            className={`relative rounded-lg px-3.5 py-1.5 text-sm font-medium transition-[background-color,color] ${
              a
                ? 'bg-[--color-accent-tint] text-[--color-foreground]'
                : 'text-[--color-muted-foreground] hover:bg-[--overlay-1] hover:text-[--color-foreground]'
            }`}
          >
            {l.label}
            {a && (
              <span className="absolute inset-x-3 -bottom-0.5 h-0.5 rounded-full bg-[--color-accent] shadow-[0_0_10px_rgba(229,9,20,0.42)]" />
            )}
          </Link>
        );
      })}
    </div>
  );
}

function UserBtn() {
  const [open, setOpen] = useState(false);
  const { logout } = useAuth();
  return (
    <>
      <button
        onClick={() => setOpen(!open)}
        className="btn-icon text-[--color-muted-foreground] hover:text-[--color-foreground]"
        aria-label="账户"
      >
        <User className="h-4 w-4" strokeWidth={1.75} />
      </button>
      {open &&
        createPortal(
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <div className="fixed right-4 top-16 z-50 w-44 overflow-hidden rounded-xl surface-floating animate-scale-in">
              <Link
                to="/?tab=history"
                onClick={() => setOpen(false)}
                className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-[--color-foreground] transition-colors hover:bg-[--overlay-1]"
              >
                <Clock className="h-4 w-4" strokeWidth={1.75} /> 历史记录
              </Link>
              <div className="divider" />
              <button
                onClick={logout}
                className="flex w-full cursor-pointer items-center gap-2.5 px-4 py-2.5 text-left text-sm text-[--color-accent-soft] transition-colors hover:bg-[--overlay-1]"
              >
                <LogOut className="h-4 w-4" strokeWidth={1.75} /> 退出登录
              </button>
            </div>
          </>,
          document.body,
        )}
    </>
  );
}

function NavbarInner() {
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
      className={`fixed inset-x-0 top-0 z-40 transition-colors duration-300 ${
        scrolled
          ? 'border-b border-[--color-border] bg-[--color-background]/92 shadow-[0_10px_32px_-24px_rgba(0,0,0,0.85)] backdrop-blur-xl'
          : 'bg-gradient-to-b from-black/75 via-[rgba(8,9,11,0.48)] to-transparent'
      }`}
    >
      <div className="mx-auto flex h-14 w-[min(100%,88rem)] items-center justify-between gap-4 px-4 md:px-10 lg:px-14">
        <div className="flex min-w-0 flex-1 items-center gap-6">
          <Logo />
          <MobileMenu pathname={location.pathname} typeParam={typeParam} />
          <DesktopLinks pathname={location.pathname} typeParam={typeParam} />
        </div>
        <div className="flex items-center gap-1">
          <Link
            to="/search"
            className={`hidden h-9 w-9 cursor-pointer items-center justify-center rounded-lg text-[--color-muted-foreground] transition-[background-color,color] hover:bg-[--overlay-1] hover:text-[--color-foreground] active:bg-[--overlay-2] sm:flex ${
              location.pathname === '/search' ? 'bg-[--color-accent-tint] text-[--color-foreground]' : ''
            }`}
            aria-label="搜索"
          >
            <Search className="h-4 w-4" strokeWidth={1.75} />
          </Link>
          <UserBtn />
        </div>
      </div>
    </nav>
  );
}

export function Navbar() {
  return (
    <Suspense fallback={null}>
      <NavbarInner />
    </Suspense>
  );
}
