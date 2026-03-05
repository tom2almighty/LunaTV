'use client';

import { RefObject, useEffect, useState } from 'react';

export function useBackToTopVisibility(
  scrollContainerRef: RefObject<HTMLElement | null>,
  threshold = 300,
): boolean {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const getBodyScrollTop = () => document.body.scrollTop || 0;
    const getContainerScrollTop = () =>
      scrollContainerRef.current?.scrollTop || 0;
    const isVisible = () =>
      getBodyScrollTop() > threshold || getContainerScrollTop() > threshold;

    let rafId: number | null = null;

    const updateVisibility = () => {
      rafId = null;
      setVisible(isVisible());
    };

    const scheduleVisibilityUpdate = () => {
      if (rafId !== null) {
        return;
      }
      rafId = window.requestAnimationFrame(updateVisibility);
    };

    scheduleVisibilityUpdate();

    const container = scrollContainerRef.current;
    container?.addEventListener('scroll', scheduleVisibilityUpdate, {
      passive: true,
    });
    document.body.addEventListener('scroll', scheduleVisibilityUpdate, {
      passive: true,
    });

    return () => {
      container?.removeEventListener('scroll', scheduleVisibilityUpdate);
      document.body.removeEventListener('scroll', scheduleVisibilityUpdate);
      if (rafId !== null) {
        window.cancelAnimationFrame(rafId);
      }
    };
  }, [scrollContainerRef, threshold]);

  return visible;
}
