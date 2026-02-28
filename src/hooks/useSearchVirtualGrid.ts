/* eslint-disable react-hooks/incompatible-library */
'use client';

import { useVirtualizer } from '@tanstack/react-virtual';
import { useCallback, useEffect, useRef, useState } from 'react';

type ViewMode = 'agg' | 'all';

type UseSearchVirtualGridParams = {
  showResults: boolean;
  currentResultCount: number;
  viewMode: ViewMode;
};

export function useSearchVirtualGrid({
  showResults,
  currentResultCount,
  viewMode,
}: UseSearchVirtualGridParams) {
  const virtualGridRef = useRef<HTMLDivElement | null>(null);
  const [virtualGridColumns, setVirtualGridColumns] = useState(3);
  const virtualRowCount = Math.ceil(currentResultCount / virtualGridColumns);

  const estimateRowHeight = useCallback(() => {
    const container = virtualGridRef.current;
    if (!container) return 320;

    const width = container.clientWidth;
    const isMobile = width < 640;
    const gapX = isMobile ? 8 : 32;
    const paddingX = isMobile ? 0 : 16;
    const rowGap = isMobile ? 56 : 80;
    const columns = Math.max(1, virtualGridColumns);
    const cardWidth = Math.max(
      96,
      (width - paddingX - gapX * (columns - 1)) / columns,
    );

    // 海报(2:3) + 标题/来源文案 + 行间距
    return Math.ceil(cardWidth * 1.5 + 56 + rowGap);
  }, [virtualGridColumns]);

  const resultsVirtualizer = useVirtualizer({
    count: showResults ? virtualRowCount : 0,
    getScrollElement: () => virtualGridRef.current,
    estimateSize: estimateRowHeight,
    overscan: 4,
  });

  useEffect(() => {
    if (!showResults || !virtualGridRef.current) return;

    const container = virtualGridRef.current;
    const updateColumns = () => {
      const width = container.clientWidth;
      if (width < 640) {
        setVirtualGridColumns(3);
        return;
      }
      const minCardWidth = 176;
      const gap = 32;
      const columns = Math.max(
        1,
        Math.floor((width + gap) / (minCardWidth + gap)),
      );
      setVirtualGridColumns(columns);
    };

    updateColumns();
    const rafId = window.requestAnimationFrame(updateColumns);
    const observer = new ResizeObserver(updateColumns);
    observer.observe(container);

    return () => {
      window.cancelAnimationFrame(rafId);
      observer.disconnect();
    };
  }, [showResults, viewMode, currentResultCount]);

  useEffect(() => {
    if (!showResults || currentResultCount === 0) return;
    resultsVirtualizer.measure();
  }, [showResults, currentResultCount, virtualGridColumns, resultsVirtualizer]);

  return {
    virtualGridRef,
    virtualGridColumns,
    resultsVirtualizer,
  };
}
