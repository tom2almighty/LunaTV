import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

export default function ScrollableRow({ children, scrollDistance = 720 }: { children: React.ReactNode; scrollDistance?: number }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [showLeft, setShowLeft] = useState(false);
  const [showRight, setShowRight] = useState(false);
  const [hovered, setHovered] = useState(false);

  const check = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    setShowRight(el.scrollWidth - (el.scrollLeft + el.clientWidth) > 1);
    setShowLeft(el.scrollLeft > 1);
  }, []);

  useEffect(() => {
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, [children, check]);

  return (
    <div className="relative" onMouseEnter={() => { setHovered(true); check(); }} onMouseLeave={() => setHovered(false)}>
      <div ref={containerRef} className="scrollbar-hide flex gap-4 overflow-x-auto pb-4" onScroll={check}>
        {children}
      </div>
      {showLeft && (
        <div className={`absolute -left-4 top-0 bottom-4 z-20 hidden items-center transition-opacity sm:flex ${hovered ? 'opacity-100' : 'opacity-0'}`}>
          <button
            onClick={() => containerRef.current?.scrollBy({ left: -scrollDistance, behavior: 'smooth' })}
            className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border border-[--color-border] bg-[--color-surface-floating] text-[--color-foreground] shadow-[var(--shadow-floating)] transition-[background-color,border-color,color] hover:border-[--color-border-strong] hover:bg-[--color-surface-floating-hover]"
            aria-label="向左滚动"
          >
            <ChevronLeft className="h-4 w-4" strokeWidth={2} />
          </button>
        </div>
      )}
      {showRight && (
        <div className={`absolute -right-4 top-0 bottom-4 z-20 hidden items-center transition-opacity sm:flex ${hovered ? 'opacity-100' : 'opacity-0'}`}>
          <button
            onClick={() => containerRef.current?.scrollBy({ left: scrollDistance, behavior: 'smooth' })}
            className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border border-[--color-border] bg-[--color-surface-floating] text-[--color-foreground] shadow-[var(--shadow-floating)] transition-[background-color,border-color,color] hover:border-[--color-border-strong] hover:bg-[--color-surface-floating-hover]"
            aria-label="向右滚动"
          >
            <ChevronRight className="h-4 w-4" strokeWidth={2} />
          </button>
        </div>
      )}
    </div>
  );
}
