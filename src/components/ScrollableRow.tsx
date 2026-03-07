import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

interface ScrollableRowProps {
  children: React.ReactNode;
  scrollDistance?: number;
}

export function computeScrollableRowState({
  scrollWidth,
  clientWidth,
  scrollLeft,
  threshold = 1,
}: {
  scrollWidth: number;
  clientWidth: number;
  scrollLeft: number;
  threshold?: number;
}) {
  const canScrollRight = scrollWidth - (scrollLeft + clientWidth) > threshold;
  const canScrollLeft = scrollLeft > threshold;
  return { canScrollLeft, canScrollRight };
}

export default function ScrollableRow({
  children,
  scrollDistance = 1000,
}: ScrollableRowProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const checkRafRef = useRef<number | null>(null);
  const [showLeftScroll, setShowLeftScroll] = useState(false);
  const [showRightScroll, setShowRightScroll] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const checkScroll = useCallback(() => {
    if (containerRef.current) {
      const { scrollWidth, clientWidth, scrollLeft } = containerRef.current;
      const { canScrollLeft, canScrollRight } = computeScrollableRowState({
        scrollWidth,
        clientWidth,
        scrollLeft,
      });
      setShowRightScroll(canScrollRight);
      setShowLeftScroll(canScrollLeft);
    }
  }, []);

  const scheduleCheckScroll = useCallback(() => {
    if (checkRafRef.current !== null) return;
    checkRafRef.current = window.requestAnimationFrame(() => {
      checkRafRef.current = null;
      checkScroll();
    });
  }, [checkScroll]);

  useEffect(() => {
    scheduleCheckScroll();

    window.addEventListener('resize', scheduleCheckScroll);

    const resizeObserver = new ResizeObserver(() => {
      scheduleCheckScroll();
    });

    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => {
      window.removeEventListener('resize', scheduleCheckScroll);
      resizeObserver.disconnect();
      if (checkRafRef.current !== null) {
        window.cancelAnimationFrame(checkRafRef.current);
        checkRafRef.current = null;
      }
    };
  }, [children, scheduleCheckScroll]);

  const handleScrollRightClick = () => {
    if (containerRef.current) {
      containerRef.current.scrollBy({
        left: scrollDistance,
        behavior: 'smooth',
      });
    }
  };

  const handleScrollLeftClick = () => {
    if (containerRef.current) {
      containerRef.current.scrollBy({
        left: -scrollDistance,
        behavior: 'smooth',
      });
    }
  };

  return (
    <div
      className='relative'
      onMouseEnter={() => {
        setIsHovered(true);
        scheduleCheckScroll();
      }}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className='bg-linear-to-r pointer-events-none absolute inset-y-0 left-0 z-10 hidden w-16 from-black/30 to-transparent sm:block' />
      <div className='bg-linear-to-l pointer-events-none absolute inset-y-0 right-0 z-10 hidden w-16 from-black/30 to-transparent sm:block' />
      <div
        ref={containerRef}
        className='scrollbar-hide flex space-x-6 overflow-x-auto px-4 py-1 pb-12 sm:px-6 sm:py-2 sm:pb-14'
        onScroll={scheduleCheckScroll}
      >
        {children}
      </div>
      {showLeftScroll && (
        <div
          className={`z-600 absolute bottom-0 left-0 top-0 hidden w-16 items-center justify-center transition-opacity duration-200 sm:flex ${
            isHovered ? 'opacity-100' : 'opacity-0'
          }`}
          style={{
            background: 'transparent',
            pointerEvents: 'none',
          }}
        >
          <div
            className='absolute inset-0 flex items-center justify-center'
            style={{
              top: '40%',
              bottom: '60%',
              left: '-4.5rem',
              pointerEvents: 'auto',
            }}
          >
            <button
              onClick={handleScrollLeftClick}
              className='text-foreground flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-black/70 shadow-[0_20px_40px_rgba(0,0,0,0.35)] backdrop-blur-xl transition-all hover:scale-105 hover:bg-black/80'
            >
              <ChevronLeft className='text-(--accent) h-5 w-5' />
            </button>
          </div>
        </div>
      )}

      {showRightScroll && (
        <div
          className={`z-600 absolute bottom-0 right-0 top-0 hidden w-16 items-center justify-center transition-opacity duration-200 sm:flex ${
            isHovered ? 'opacity-100' : 'opacity-0'
          }`}
          style={{
            background: 'transparent',
            pointerEvents: 'none',
          }}
        >
          <div
            className='absolute inset-0 flex items-center justify-center'
            style={{
              top: '40%',
              bottom: '60%',
              right: '-4.5rem',
              pointerEvents: 'auto',
            }}
          >
            <button
              onClick={handleScrollRightClick}
              className='text-foreground flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-black/70 shadow-[0_20px_40px_rgba(0,0,0,0.35)] backdrop-blur-xl transition-all hover:scale-105 hover:bg-black/80'
            >
              <ChevronRight className='text-(--accent) h-5 w-5' />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
