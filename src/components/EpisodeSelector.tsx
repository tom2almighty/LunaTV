/* eslint-disable @next/next/no-img-element */

import { useRouter } from 'next/navigation';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { SearchResult } from '@/lib/types';

interface EpisodeSelectorProps {
  /** 总集数 */
  totalEpisodes: number;
  /** 剧集标题 */
  episodes_titles: string[];
  /** 每页显示多少集，默认 50 */
  episodesPerPage?: number;
  /** 当前选中的集数（1 开始） */
  value?: number;
  /** 用户点击选集后的回调 */
  onChange?: (episodeNumber: number) => void;
  /** 换源相关 */
  onSourceChange?: (source: string, id: string, title: string) => void;
  currentSource?: string;
  currentId?: string;
  videoTitle?: string;
  videoYear?: string;
  availableSources?: SearchResult[];
  sourceSearchLoading?: boolean;
  sourceSearchError?: string | null;
}

export function toHorizontalScrollDelta(deltaY: number) {
  const scaled = deltaY * 2;
  const maxAbs = 240;
  if (scaled > maxAbs) return maxAbs;
  if (scaled < -maxAbs) return -maxAbs;
  return scaled;
}

export function sortSourcesWithCurrentFirst<
  T extends Pick<SearchResult, 'source' | 'id'>,
>(sources: T[], currentSource?: string, currentId?: string) {
  return sources.slice().sort((a, b) => {
    const aIsCurrent =
      a.source?.toString() === currentSource?.toString() &&
      a.id?.toString() === currentId?.toString();
    const bIsCurrent =
      b.source?.toString() === currentSource?.toString() &&
      b.id?.toString() === currentId?.toString();
    if (aIsCurrent && !bIsCurrent) return -1;
    if (!aIsCurrent && bIsCurrent) return 1;
    return 0;
  });
}

/**
 * 选集组件，支持分页、自动滚动聚焦当前分页标签，以及换源功能。
 */
const EpisodeSelector: React.FC<EpisodeSelectorProps> = ({
  totalEpisodes,
  episodes_titles,
  episodesPerPage = 50,
  value = 1,
  onChange,
  onSourceChange,
  currentSource,
  currentId,
  videoTitle,
  availableSources = [],
  sourceSearchLoading = false,
  sourceSearchError = null,
}) => {
  const router = useRouter();
  const pageCount = Math.ceil(totalEpisodes / episodesPerPage);

  // 主要的 tab 状态：'episodes' 或 'sources'
  // 当只有一集时默认展示 "换源"，并隐藏 "选集" 标签
  const [activeTab, setActiveTab] = useState<'episodes' | 'sources'>(
    totalEpisodes > 1 ? 'episodes' : 'sources',
  );

  // 当前分页索引（0 开始）
  const initialPage = Math.floor((value - 1) / episodesPerPage);
  const [currentPage, setCurrentPage] = useState<number>(initialPage);

  // 是否倒序显示
  const [descending, setDescending] = useState<boolean>(false);

  // 根据 descending 状态计算实际显示的分页索引
  const displayPage = useMemo(() => {
    if (descending) {
      return pageCount - 1 - currentPage;
    }
    return currentPage;
  }, [currentPage, descending, pageCount]);

  // 升序分页标签
  const categoriesAsc = useMemo(() => {
    return Array.from({ length: pageCount }, (_, i) => {
      const start = i * episodesPerPage + 1;
      const end = Math.min(start + episodesPerPage - 1, totalEpisodes);
      return { start, end };
    });
  }, [pageCount, episodesPerPage, totalEpisodes]);

  // 根据 descending 状态决定分页标签的排序和内容
  const categories = useMemo(() => {
    if (descending) {
      // 倒序时，label 也倒序显示
      return [...categoriesAsc]
        .reverse()
        .map(({ start, end }) => `${end}-${start}`);
    }
    return categoriesAsc.map(({ start, end }) => `${start}-${end}`);
  }, [categoriesAsc, descending]);

  const categoryContainerRef = useRef<HTMLDivElement>(null);
  const buttonRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const handleCategoryWheel = useCallback(
    (event: React.WheelEvent<HTMLDivElement>) => {
      if (!categoryContainerRef.current) return;

      if (event.deltaY === 0) {
        return;
      }

      event.preventDefault();
      categoryContainerRef.current.scrollBy({
        left: toHorizontalScrollDelta(event.deltaY),
        behavior: 'smooth',
      });
    },
    [],
  );

  // 当分页切换时，将激活的分页标签滚动到视口中间
  useEffect(() => {
    const btn = buttonRefs.current[displayPage];
    const container = categoryContainerRef.current;
    if (btn && container) {
      // 手动计算滚动位置，只滚动分页标签容器
      const containerRect = container.getBoundingClientRect();
      const btnRect = btn.getBoundingClientRect();
      const scrollLeft = container.scrollLeft;

      // 计算按钮相对于容器的位置
      const btnLeft = btnRect.left - containerRect.left + scrollLeft;
      const btnWidth = btnRect.width;
      const containerWidth = containerRect.width;

      // 计算目标滚动位置，使按钮居中
      const targetScrollLeft = btnLeft - (containerWidth - btnWidth) / 2;

      // 平滑滚动到目标位置
      container.scrollTo({
        left: targetScrollLeft,
        behavior: 'smooth',
      });
    }
  }, [displayPage, pageCount]);

  // 处理换源tab点击，只在点击时才搜索
  const handleSourceTabClick = () => {
    setActiveTab('sources');
  };

  const handleCategoryClick = useCallback(
    (index: number) => {
      if (descending) {
        // 在倒序时，需要将显示索引转换为实际索引
        setCurrentPage(pageCount - 1 - index);
      } else {
        setCurrentPage(index);
      }
    },
    [descending, pageCount],
  );

  const handleEpisodeClick = useCallback(
    (episodeNumber: number) => {
      onChange?.(episodeNumber);
    },
    [onChange],
  );

  const handleSourceClick = useCallback(
    (source: SearchResult) => {
      onSourceChange?.(source.source, source.id, source.title);
    },
    [onSourceChange],
  );

  const currentStart = currentPage * episodesPerPage + 1;
  const currentEnd = Math.min(
    currentStart + episodesPerPage - 1,
    totalEpisodes,
  );
  const sortedSources = useMemo(
    () =>
      sortSourcesWithCurrentFirst(availableSources, currentSource, currentId),
    [availableSources, currentSource, currentId],
  );

  return (
    <div className='app-panel flex h-full flex-col overflow-hidden rounded-3xl border-white/10 p-0 md:ml-2'>
      {/* 主要的 Tab 切换 */}
      <div className='border-white/8 bg-white/4 mb-0 flex shrink-0 border-b'>
        {totalEpisodes > 1 && (
          <div
            onClick={() => setActiveTab('episodes')}
            className={`relative flex-1 cursor-pointer px-4 py-3 text-center text-sm font-medium transition-all duration-200
              ${
                activeTab === 'episodes'
                  ? 'text-foreground bg-white/10'
                  : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
              }
            `.trim()}
          >
            选集
            {activeTab === 'episodes' && (
              <div className='bg-(--accent) absolute bottom-0 left-4 right-4 h-0.5 rounded-full' />
            )}
          </div>
        )}
        <div
          onClick={handleSourceTabClick}
          className={`relative flex-1 cursor-pointer px-4 py-3 text-center text-sm font-medium transition-all duration-200
            ${
              activeTab === 'sources'
                ? 'bg-(--accent)/10 text-foreground'
                : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
            }
          `.trim()}
        >
          换源
          {activeTab === 'sources' && (
            <div className='bg-(--accent) absolute bottom-0 left-4 right-4 h-0.5 rounded-full' />
          )}
        </div>
      </div>

      {/* 选集 Tab 内容 */}
      {activeTab === 'episodes' && (
        <>
          {/* 分类标签 */}
          <div className='border-white/8 mb-4 flex shrink-0 items-center gap-4 border-b px-4 py-3'>
            <div
              className='flex-1 overflow-x-auto'
              ref={categoryContainerRef}
              onWheel={handleCategoryWheel}
            >
              <div className='flex min-w-max gap-2'>
                {categories.map((label, idx) => {
                  const isActive = idx === displayPage;
                  return (
                    <button
                      key={label}
                      ref={(el) => {
                        buttonRefs.current[idx] = el;
                      }}
                      onClick={() => handleCategoryClick(idx)}
                      className={`relative w-20 shrink-0 whitespace-nowrap rounded-full px-3 py-2 text-center text-sm font-medium transition-colors
                        ${
                          isActive
                            ? 'border-(--accent)/20 bg-(--accent)/12 text-(--accent) border'
                            : 'text-muted-foreground hover:bg-white/6 hover:text-foreground border border-transparent'
                        }
                      `.trim()}
                    >
                      {label}
                      {isActive && (
                        <div className='bg-primary absolute bottom-0 left-0 right-0 h-0.5' />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
            {/* 向上/向下按钮 */}
            <button
              className='app-control text-muted-foreground hover:text-(--accent) flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors'
              onClick={() => {
                // 切换集数排序（正序/倒序）
                setDescending((prev) => !prev);
              }}
            >
              <svg
                className='h-4 w-4'
                fill='none'
                stroke='currentColor'
                viewBox='0 0 24 24'
              >
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth='2'
                  d='M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4'
                />
              </svg>
            </button>
          </div>

          {/* 集数网格 */}
          <div className='flex flex-1 flex-wrap content-start gap-2.5 overflow-y-auto px-4 pb-4'>
            {(() => {
              const len = currentEnd - currentStart + 1;
              const episodes = Array.from({ length: len }, (_, i) =>
                descending ? currentEnd - i : currentStart + i,
              );
              return episodes;
            })().map((episodeNumber) => {
              const isActive = episodeNumber === value;
              return (
                <button
                  key={episodeNumber}
                  onClick={() => handleEpisodeClick(episodeNumber - 1)}
                  className={`flex h-10 min-w-10 items-center justify-center whitespace-nowrap rounded-lg border px-3 py-2 font-mono text-sm font-medium transition-all duration-200
                    ${
                      isActive
                        ? 'border-(--accent)/25 bg-(--accent) text-black shadow-[0_12px_30px_rgba(0,0,0,0.28)]'
                        : 'text-foreground border-white/10 bg-white/5 hover:bg-white/10'
                    }`.trim()}
                >
                  {(() => {
                    const title = episodes_titles?.[episodeNumber - 1];
                    if (!title) {
                      return episodeNumber;
                    }
                    // 如果匹配"第X集"、"第X话"、"X集"、"X话"格式，提取中间的数字
                    const match = title.match(/(?:第)?(\d+)(?:集|话)/);
                    if (match) {
                      return match[1];
                    }
                    return title;
                  })()}
                </button>
              );
            })}
          </div>
        </>
      )}

      {/* 换源 Tab 内容 */}
      {activeTab === 'sources' && (
        <div className='mt-3 flex h-full flex-col px-3 pb-3'>
          {sourceSearchLoading && (
            <div className='flex items-center justify-center py-8'>
              <div className='border-primary h-8 w-8 animate-spin rounded-full border-b-2'></div>
              <span className='text-muted-foreground ml-2 text-sm'>
                搜索中...
              </span>
            </div>
          )}

          {sourceSearchError && (
            <div className='flex items-center justify-center py-8'>
              <div className='text-center'>
                <div className='mb-2 text-2xl'>⚠️</div>
                <p className='text-destructive text-sm'>{sourceSearchError}</p>
              </div>
            </div>
          )}

          {!sourceSearchLoading &&
            !sourceSearchError &&
            availableSources.length === 0 && (
              <div className='flex items-center justify-center py-8'>
                <div className='text-center'>
                  <div className='text-muted-foreground mb-2 text-2xl'>📺</div>
                  <p className='text-muted-foreground text-sm'>
                    暂无可用的换源
                  </p>
                </div>
              </div>
            )}

          {!sourceSearchLoading &&
            !sourceSearchError &&
            availableSources.length > 0 && (
              <div className='flex-1 space-y-2 overflow-y-auto pb-16'>
                {sortedSources.map((source, index) => {
                  const isCurrentSource =
                    source.source?.toString() === currentSource?.toString() &&
                    source.id?.toString() === currentId?.toString();
                  const episodeCount = source.episodes?.length || 0;
                  return (
                    <div
                      key={`${source.source}-${source.id}`}
                      onClick={() =>
                        !isCurrentSource && handleSourceClick(source)
                      }
                      className={`relative flex min-h-12 select-none items-center justify-between gap-3 rounded-2xl border px-3.5 py-3 transition-all duration-200
                      ${
                        isCurrentSource
                          ? 'border-(--accent)/25 bg-white/10 shadow-[0_14px_30px_rgba(0,0,0,0.2)]'
                          : 'hover:bg-white/8 cursor-pointer border-white/10 bg-white/5 hover:border-white/20'
                      }`.trim()}
                    >
                      <div className='min-w-0 flex-1'>
                        <div className='text-foreground truncate text-sm font-semibold leading-5'>
                          {source.source_name || source.source}
                        </div>
                        <div className='text-muted-foreground mt-0.5 text-xs leading-4'>
                          {episodeCount > 0 ? `${episodeCount} 集` : '待加载'}
                        </div>
                      </div>
                      <div className='text-muted-foreground shrink-0 text-xs'>
                        {isCurrentSource ? '当前源' : `源 ${index + 1}`}
                      </div>
                    </div>
                  );
                })}
                <div className='border-white/8 mt-auto shrink-0 border-t pt-2'>
                  <button
                    onClick={() => {
                      if (videoTitle) {
                        router.push(
                          `/search?q=${encodeURIComponent(videoTitle)}`,
                        );
                      }
                    }}
                    className='text-muted-foreground hover:text-(--accent) w-full rounded-2xl border border-white/10 bg-white/5 py-2.5 text-center text-xs tracking-[0.12em] transition-colors hover:bg-white/10'
                  >
                    影片匹配有误？点击去搜索
                  </button>
                </div>
              </div>
            )}
        </div>
      )}
    </div>
  );
};

export default EpisodeSelector;
