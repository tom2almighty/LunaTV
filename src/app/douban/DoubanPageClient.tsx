/* eslint-disable no-console */

'use client';

import { useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';

import { getDoubanCategories } from '@/lib/douban.client';
import { DEFAULT_DOUBAN_PAGE_LIMIT } from '@/lib/douban.constants';
import type { DoubanPageType } from '@/lib/douban-categories';
import {
  buildRecentHotParams,
  getDefaultSelection,
  normalizeDoubanPageType,
} from '@/lib/douban-categories';
import type { DoubanItem } from '@/lib/types';

import DoubanCardSkeleton from '@/components/DoubanCardSkeleton';
import DoubanSelector from '@/components/DoubanSelector';
import VideoCard from '@/components/VideoCard';

const PAGE_LIMIT = DEFAULT_DOUBAN_PAGE_LIMIT;

function DoubanPageClient() {
  const searchParams = useSearchParams();
  const currentType = normalizeDoubanPageType(searchParams.get('type'));

  const [primarySelection, setPrimarySelection] = useState<string>(
    () => getDefaultSelection(currentType).primary,
  );
  const [secondarySelection, setSecondarySelection] = useState<string>(
    () => getDefaultSelection(currentType).secondary,
  );

  const [doubanData, setDoubanData] = useState<DoubanItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadingRef = useRef<HTMLDivElement>(null);
  const requestSignatureRef = useRef('');

  const skeletonData = Array.from({ length: PAGE_LIMIT }, (_, index) => index);

  useEffect(() => {
    const nextDefault = getDefaultSelection(currentType);
    setPrimarySelection(nextDefault.primary);
    setSecondarySelection(nextDefault.secondary);
  }, [currentType]);

  const fetchPage = useCallback(
    async (page: number, append: boolean) => {
      const pageStart = page * PAGE_LIMIT;
      const params = buildRecentHotParams({
        type: currentType,
        primarySelection,
        secondarySelection,
        pageLimit: PAGE_LIMIT,
        pageStart,
      });

      const signature = [
        currentType,
        primarySelection,
        secondarySelection,
        pageStart,
      ].join('|');
      requestSignatureRef.current = signature;

      if (append) {
        setIsLoadingMore(true);
      } else {
        setLoading(true);
      }

      try {
        const data = await getDoubanCategories(params);
        if (requestSignatureRef.current !== signature) {
          return;
        }

        if (data.code !== 200) {
          throw new Error(data.message || '获取豆瓣数据失败');
        }

        setDoubanData((prev) => (append ? [...prev, ...data.list] : data.list));
        setHasMore(data.list.length === PAGE_LIMIT);
      } catch (error) {
        if (requestSignatureRef.current !== signature) {
          return;
        }
        console.error(error);
        if (!append) {
          setDoubanData([]);
        }
        setHasMore(false);
      } finally {
        if (requestSignatureRef.current === signature) {
          setLoading(false);
          setIsLoadingMore(false);
        }
      }
    },
    [currentType, primarySelection, secondarySelection],
  );

  useEffect(() => {
    setCurrentPage(0);
    setHasMore(true);
    setDoubanData([]);
    void fetchPage(0, false);
  }, [fetchPage]);

  useEffect(() => {
    if (currentPage === 0) {
      return;
    }
    void fetchPage(currentPage, true);
  }, [currentPage, fetchPage]);

  useEffect(() => {
    if (!loadingRef.current || loading || isLoadingMore || !hasMore) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (
          entries[0].isIntersecting &&
          !loading &&
          !isLoadingMore &&
          hasMore
        ) {
          setCurrentPage((prev) => prev + 1);
        }
      },
      { threshold: 0.1 },
    );

    observer.observe(loadingRef.current);
    observerRef.current = observer;

    return () => {
      observer.disconnect();
      observerRef.current = null;
    };
  }, [loading, isLoadingMore, hasMore]);

  const handlePrimaryChange = useCallback(
    (value: string) => {
      if (value === primarySelection) {
        return;
      }
      setPrimarySelection(value);
    },
    [primarySelection],
  );

  const handleSecondaryChange = useCallback(
    (value: string) => {
      if (value === secondarySelection) {
        return;
      }
      setSecondarySelection(value);
    },
    [secondarySelection],
  );

  const getPageTitle = (type: DoubanPageType) => {
    if (type === 'tv') {
      return '电视剧';
    }
    if (type === 'show') {
      return '综艺';
    }
    return '电影';
  };

  return (
    <div className='app-page overflow-visible'>
      <div className='mb-6 space-y-4 sm:mb-8 sm:space-y-6'>
        <div>
          <h1 className='app-section-title text-foreground mb-1 text-2xl font-semibold tracking-[0.08em] sm:mb-2 sm:text-3xl'>
            {getPageTitle(currentType)}
          </h1>
          <p className='text-muted-foreground text-sm sm:text-base'>
            来自豆瓣的精选内容
          </p>
        </div>

        <div className='app-panel rounded-[1.75rem] p-4 sm:p-6'>
          <DoubanSelector
            type={currentType}
            primarySelection={primarySelection}
            secondarySelection={secondarySelection}
            onPrimaryChange={handlePrimaryChange}
            onSecondaryChange={handleSecondaryChange}
          />
        </div>
      </div>

      <div className='mt-6 overflow-visible'>
        <div className='grid grid-cols-3 justify-start gap-x-2 gap-y-12 px-0 sm:grid-cols-[repeat(auto-fill,minmax(160px,1fr))] sm:gap-x-8 sm:gap-y-20 sm:px-2'>
          {loading
            ? skeletonData.map((index) => <DoubanCardSkeleton key={index} />)
            : doubanData.map((item, index) => (
                <div key={`${item.id}-${index}`} className='w-full'>
                  <VideoCard
                    from='douban'
                    title={item.title}
                    poster={item.poster}
                    douban_id={Number(item.id)}
                    rate={item.rate}
                    year={item.year}
                    type={currentType === 'movie' ? 'movie' : ''}
                  />
                </div>
              ))}
        </div>

        {hasMore && !loading && (
          <div ref={loadingRef} className='mt-12 flex justify-center py-8'>
            {isLoadingMore && (
              <div className='flex items-center gap-2'>
                <div className='border-primary h-6 w-6 animate-spin rounded-full border-b-2'></div>
                <span className='text-muted-foreground'>加载中...</span>
              </div>
            )}
          </div>
        )}

        {!hasMore && doubanData.length > 0 && (
          <div className='text-muted-foreground py-8 text-center'>
            已加载全部内容
          </div>
        )}

        {!loading && doubanData.length === 0 && (
          <div className='text-muted-foreground py-8 text-center'>
            暂无相关内容
          </div>
        )}
      </div>
    </div>
  );
}

export default DoubanPageClient;
