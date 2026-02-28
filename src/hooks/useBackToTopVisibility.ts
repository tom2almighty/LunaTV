'use client';

import { RefObject, useEffect, useState } from 'react';

export function useBackToTopVisibility(
  scrollContainerRef: RefObject<HTMLElement | null>,
  threshold = 300,
): boolean {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const getBodyScrollTop = () => document.body.scrollTop || 0;
    const getContainerScrollTop = () => scrollContainerRef.current?.scrollTop || 0;

    let running = true;
    const checkScrollPosition = () => {
      if (!running) return;

      const shouldShow =
        getBodyScrollTop() > threshold || getContainerScrollTop() > threshold;
      setVisible(shouldShow);

      window.requestAnimationFrame(checkScrollPosition);
    };

    checkScrollPosition();

    const handleScroll = () => {
      const shouldShow =
        getBodyScrollTop() > threshold || getContainerScrollTop() > threshold;
      setVisible(shouldShow);
    };

    document.body.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      running = false;
      document.body.removeEventListener('scroll', handleScroll);
    };
  }, [scrollContainerRef, threshold]);

  return visible;
}
