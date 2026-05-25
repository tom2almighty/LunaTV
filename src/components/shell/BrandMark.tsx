import { Link } from 'react-router-dom';
import { useSite } from '@/lib/hooks/useSite';

export function BrandMark({ className = '' }: { className?: string }) {
  const { siteName } = useSite();
  return (
    <Link
      to="/"
      className={`group flex items-center gap-2 font-semibold tracking-tight ${className}`}
    >
      <span className="text-lg uppercase">{siteName}</span>
    </Link>
  );
}
