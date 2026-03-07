/* eslint-disable @typescript-eslint/no-explicit-any,react-hooks/exhaustive-deps,@typescript-eslint/no-empty-function */

import {
  ExternalLink,
  Heart,
  Link,
  PlayCircleIcon,
  Trash2,
} from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import React, {
  forwardRef,
  memo,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useState,
} from 'react';

import {
  deleteFavorite,
  deletePlayRecord,
  generateStorageKey,
  isFavorited,
  saveFavorite,
  subscribeToDataUpdates,
  triggerGlobalError,
} from '@/lib/db';
import { SearchResult } from '@/lib/types';
import { processImageUrl } from '@/lib/utils';
import { useLongPress } from '@/hooks/useLongPress';

import { ImagePlaceholder } from '@/components/ImagePlaceholder';
import MobileActionSheet from '@/components/MobileActionSheet';
import { useVideoCardActions } from '@/components/video-card/use-video-card-actions';
import {
  buildPlaySessionCreateApiPath,
  buildPlaySessionPayload,
  buildPlaySessionUrl,
} from '@/components/video-card/use-video-card-navigation';
import { useVideoCardState } from '@/components/video-card/use-video-card-state';
import { VideoCardView } from '@/components/video-card/video-card-view';

import { useSite } from '@/context/SiteContext';

export interface VideoCardProps {
  id?: string;
  source?: string;
  title?: string;
  query?: string;
  poster?: string;
  episodes?: number;
  source_name?: string;
  source_names?: string[];
  progress?: number;
  year?: string;
  from: 'playrecord' | 'favorite' | 'search' | 'douban';
  currentEpisode?: number;
  douban_id?: number;
  onDelete?: () => void;
  rate?: string;
  type?: string;
  isAggregate?: boolean;
  play_group?: SearchResult[];
  testId?: string;
  onBeforePlayNavigate?: (payload: { key: string; title: string }) => void;
}

export type VideoCardHandle = {
  setEpisodes: (episodes?: number) => void;
  setSourceNames: (names?: string[]) => void;
  setDoubanId: (id?: number) => void;
};

const VideoCard = forwardRef<VideoCardHandle, VideoCardProps>(
  function VideoCard(
    {
      id,
      title = '',
      query = '',
      poster = '',
      episodes,
      source,
      source_name,
      source_names,
      progress = 0,
      year,
      from,
      currentEpisode,
      douban_id,
      onDelete,
      rate,
      type = '',
      isAggregate = false,
      play_group,
      testId,
      onBeforePlayNavigate,
    }: VideoCardProps,
    ref,
  ) {
    const router = useRouter();
    const { runtimeConfig } = useSite();
    const { executePlayAction } = useVideoCardActions(800);
    const [favorited, setFavorited] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isRouting, setIsRouting] = useState(false);
    const [showMobileActions, setShowMobileActions] = useState(false);
    const [searchFavorited, setSearchFavorited] = useState<boolean | null>(
      null,
    ); // 搜索结果的收藏状态

    // 可外部修改的可控字段
    const {
      dynamicEpisodes,
      setDynamicEpisodes,
      dynamicSourceNames,
      setDynamicSourceNames,
      dynamicDoubanId,
      setDynamicDoubanId,
    } = useVideoCardState({
      episodes,
      sourceNames: source_names,
      doubanId: douban_id,
    });

    useImperativeHandle(ref, () => ({
      setEpisodes: (eps?: number) => setDynamicEpisodes(eps),
      setSourceNames: (names?: string[]) => setDynamicSourceNames(names),
      setDoubanId: (id?: number) => setDynamicDoubanId(id),
    }));

    const actualTitle = title;
    const actualPoster = poster;
    const actualSource = source;
    const actualId = id;
    const actualDoubanId = dynamicDoubanId;
    const actualEpisodes = dynamicEpisodes;
    const actualYear = year;
    const actualQuery = query || '';
    const actualSearchType = isAggregate
      ? actualEpisodes && actualEpisodes === 1
        ? 'movie'
        : 'tv'
      : type;
    const previewKey = `${actualSource || 'agg'}-${actualId || actualTitle}`;
    const previewTitle = actualTitle || '未命名';
    const [hasHydrated, setHasHydrated] = useState(false);
    const resolvedPoster = useMemo(
      () =>
        processImageUrl(actualPoster, {
          includeStorage: hasHydrated,
          runtimeConfig,
        }),
      [actualPoster, hasHydrated, runtimeConfig],
    );

    useEffect(() => {
      setHasHydrated(true);
    }, []);

    // 获取收藏状态（搜索结果页面不检查）
    useEffect(() => {
      if (from === 'douban' || from === 'search' || !actualSource || !actualId)
        return;

      const fetchFavoriteStatus = async () => {
        try {
          const fav = await isFavorited(actualSource, actualId);
          setFavorited(fav);
        } catch (err) {
          throw new Error('检查收藏状态失败');
        }
      };

      fetchFavoriteStatus();

      // 监听收藏状态更新事件
      const storageKey = generateStorageKey(actualSource, actualId);
      const unsubscribe = subscribeToDataUpdates(
        'favoritesUpdated',
        (newFavorites: Record<string, any>) => {
          // 检查当前项目是否在新的收藏列表中
          const isNowFavorited = !!newFavorites[storageKey];
          setFavorited(isNowFavorited);
        },
      );

      return unsubscribe;
    }, [from, actualSource, actualId]);

    const handleToggleFavorite = useCallback(
      async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (from === 'douban' || !actualSource || !actualId) return;

        try {
          // 确定当前收藏状态
          const currentFavorited =
            from === 'search' ? searchFavorited : favorited;

          if (currentFavorited) {
            // 如果已收藏，删除收藏
            await deleteFavorite(actualSource, actualId);
            if (from === 'search') {
              setSearchFavorited(false);
            } else {
              setFavorited(false);
            }
          } else {
            // 如果未收藏，添加收藏
            await saveFavorite(actualSource, actualId, {
              title: actualTitle,
              source_name: source_name || '',
              year: actualYear || '',
              cover: actualPoster,
              total_episodes: actualEpisodes ?? 1,
              save_time: Date.now(),
            });
            if (from === 'search') {
              setSearchFavorited(true);
            } else {
              setFavorited(true);
            }
          }
        } catch (err) {
          throw new Error('切换收藏状态失败');
        }
      },
      [
        from,
        actualSource,
        actualId,
        actualTitle,
        source_name,
        actualYear,
        actualPoster,
        actualEpisodes,
        favorited,
        searchFavorited,
      ],
    );

    const handleDeleteRecord = useCallback(
      async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (from !== 'playrecord' || !actualSource || !actualId) return;
        try {
          await deletePlayRecord(actualSource, actualId);
          onDelete?.();
        } catch (err) {
          throw new Error('删除播放记录失败');
        }
      },
      [from, actualSource, actualId, onDelete],
    );

    const createPlaySession = useCallback(
      async (openInNewTab = false) => {
        const openSearchPage = () => {
          const keyword = (actualTitle || actualQuery || '').trim();
          if (!keyword) return;
          const searchUrl = `/search?q=${encodeURIComponent(keyword)}`;

          if (openInNewTab) {
            window.open(searchUrl, '_blank');
          } else {
            router.push(searchUrl);
          }
        };

        if (from === 'douban') {
          openSearchPage();
          return;
        }

        if (isRouting) return;
        setIsRouting(true);

        try {
          const payload = buildPlaySessionPayload({
            from,
            playGroup: play_group,
            title: actualTitle,
            year: actualYear,
            searchType: actualSearchType,
            query: actualQuery,
            source: actualSource,
            id: actualId,
          });

          const resp = await fetch(buildPlaySessionCreateApiPath(), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });
          const data = await resp.json();
          if (!resp.ok || !data.play_session_id) {
            throw new Error(data.error || '创建播放会话失败');
          }

          const url = buildPlaySessionUrl(String(data.play_session_id));
          if (openInNewTab) {
            window.open(url, '_blank');
          } else {
            router.push(url);
          }
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : '创建播放会话失败';
          triggerGlobalError(errorMessage);
          throw error;
        } finally {
          setIsRouting(false);
        }
      },
      [
        isRouting,
        from,
        play_group,
        actualTitle,
        actualYear,
        actualSearchType,
        actualQuery,
        actualSource,
        actualId,
        router,
      ],
    );

    const handleClick = useCallback(() => {
      onBeforePlayNavigate?.({ key: previewKey, title: previewTitle });
      void executePlayAction(() => createPlaySession(false));
    }, [
      createPlaySession,
      executePlayAction,
      onBeforePlayNavigate,
      previewKey,
      previewTitle,
    ]);

    // 新标签页播放处理函数
    const handlePlayInNewTab = useCallback(() => {
      onBeforePlayNavigate?.({ key: previewKey, title: previewTitle });
      void executePlayAction(() => createPlaySession(true));
    }, [
      createPlaySession,
      executePlayAction,
      onBeforePlayNavigate,
      previewKey,
      previewTitle,
    ]);

    // 检查搜索结果的收藏状态
    const checkSearchFavoriteStatus = useCallback(async () => {
      if (
        from === 'search' &&
        !isAggregate &&
        actualSource &&
        actualId &&
        searchFavorited === null
      ) {
        try {
          const fav = await isFavorited(actualSource, actualId);
          setSearchFavorited(fav);
        } catch (err) {
          setSearchFavorited(false);
        }
      }
    }, [from, isAggregate, actualSource, actualId, searchFavorited]);

    // 长按操作
    const handleLongPress = useCallback(() => {
      if (!showMobileActions) {
        // 防止重复触发
        // 立即显示菜单，避免等待数据加载导致动画卡顿
        setShowMobileActions(true);

        // 异步检查收藏状态，不阻塞菜单显示
        if (
          from === 'search' &&
          !isAggregate &&
          actualSource &&
          actualId &&
          searchFavorited === null
        ) {
          checkSearchFavoriteStatus();
        }
      }
    }, [
      showMobileActions,
      from,
      isAggregate,
      actualSource,
      actualId,
      searchFavorited,
      checkSearchFavoriteStatus,
    ]);

    // 长按手势hook
    const longPressProps = useLongPress({
      onLongPress: handleLongPress,
      onClick: handleClick, // 保持点击播放功能
      longPressDelay: 500,
    });

    const config = useMemo(() => {
      const configs = {
        playrecord: {
          showSourceName: true,
          showProgress: true,
          showPlayButton: true,
          showHeart: true,
          showCheckCircle: true,
          showDoubanLink: false,
          showRating: false,
          showYear: false,
        },
        favorite: {
          showSourceName: true,
          showProgress: false,
          showPlayButton: true,
          showHeart: true,
          showCheckCircle: false,
          showDoubanLink: false,
          showRating: false,
          showYear: false,
        },
        search: {
          showSourceName: true,
          showProgress: false,
          showPlayButton: true,
          showHeart: true, // 移动端菜单中需要显示收藏选项
          showCheckCircle: false,
          showDoubanLink: true, // 移动端菜单中显示豆瓣链接
          showRating: false,
          showYear: true,
        },
        douban: {
          showSourceName: false,
          showProgress: false,
          showPlayButton: true,
          showHeart: false,
          showCheckCircle: false,
          showDoubanLink: true,
          showRating: !!rate,
          showYear: false,
        },
      };
      return configs[from] || configs.search;
    }, [from, isAggregate, douban_id, rate]);

    // 移动端操作菜单配置
    const mobileActions = useMemo(() => {
      const actions = [];

      // 播放操作
      if (config.showPlayButton) {
        actions.push({
          id: 'play',
          label: '播放',
          icon: <PlayCircleIcon size={20} />,
          onClick: handleClick,
          color: 'primary' as const,
        });

        // 新标签页播放
        actions.push({
          id: 'play-new-tab',
          label: '新标签页播放',
          icon: <ExternalLink size={20} />,
          onClick: handlePlayInNewTab,
          color: 'default' as const,
        });
      }

      // 聚合源信息 - 直接在菜单中展示，不需要单独的操作项

      // 收藏/取消收藏操作
      if (config.showHeart && from !== 'douban' && actualSource && actualId) {
        const currentFavorited =
          from === 'search' ? searchFavorited : favorited;

        if (from === 'search') {
          // 搜索结果：根据加载状态显示不同的选项
          if (searchFavorited !== null) {
            // 已加载完成，显示实际的收藏状态
            actions.push({
              id: 'favorite',
              label: currentFavorited ? '取消收藏' : '添加收藏',
              icon: currentFavorited ? (
                <Heart
                  size={20}
                  className='fill-destructive stroke-destructive'
                />
              ) : (
                <Heart
                  size={20}
                  className='stroke-destructive fill-transparent'
                />
              ),
              onClick: () => {
                const mockEvent = {
                  preventDefault: () => {},
                  stopPropagation: () => {},
                } as React.MouseEvent;
                handleToggleFavorite(mockEvent);
              },
              color: currentFavorited
                ? ('danger' as const)
                : ('default' as const),
            });
          } else {
            // 正在加载中，显示占位项
            actions.push({
              id: 'favorite-loading',
              label: '收藏加载中...',
              icon: <Heart size={20} />,
              onClick: () => {}, // 加载中时不响应点击
              disabled: true,
            });
          }
        } else {
          // 非搜索结果：直接显示收藏选项
          actions.push({
            id: 'favorite',
            label: currentFavorited ? '取消收藏' : '添加收藏',
            icon: currentFavorited ? (
              <Heart
                size={20}
                className='fill-destructive stroke-destructive'
              />
            ) : (
              <Heart
                size={20}
                className='stroke-destructive fill-transparent'
              />
            ),
            onClick: () => {
              const mockEvent = {
                preventDefault: () => {},
                stopPropagation: () => {},
              } as React.MouseEvent;
              handleToggleFavorite(mockEvent);
            },
            color: currentFavorited
              ? ('danger' as const)
              : ('default' as const),
          });
        }
      }

      // 删除播放记录操作
      if (
        config.showCheckCircle &&
        from === 'playrecord' &&
        actualSource &&
        actualId
      ) {
        actions.push({
          id: 'delete',
          label: '删除记录',
          icon: <Trash2 size={20} />,
          onClick: () => {
            const mockEvent = {
              preventDefault: () => {},
              stopPropagation: () => {},
            } as React.MouseEvent;
            handleDeleteRecord(mockEvent);
          },
          color: 'danger' as const,
        });
      }

      // 豆瓣链接操作
      if (config.showDoubanLink && actualDoubanId && actualDoubanId !== 0) {
        actions.push({
          id: 'douban',
          label: '豆瓣详情',
          icon: <Link size={20} />,
          onClick: () => {
            const url = `https://movie.douban.com/subject/${actualDoubanId.toString()}`;
            window.open(url, '_blank', 'noopener,noreferrer');
          },
          color: 'default' as const,
        });
      }

      return actions;
    }, [
      config,
      from,
      actualSource,
      actualId,
      favorited,
      searchFavorited,
      actualDoubanId,
      isAggregate,
      dynamicSourceNames,
      handleClick,
      handleToggleFavorite,
      handleDeleteRecord,
    ]);

    return (
      <>
        <VideoCardView
          dataTestId={testId}
          onClick={handleClick}
          gestureProps={longPressProps}
          onContextMenu={(e) => {
            e.preventDefault();
            e.stopPropagation();

            setShowMobileActions(true);

            if (
              from === 'search' &&
              !isAggregate &&
              actualSource &&
              actualId &&
              searchFavorited === null
            ) {
              checkSearchFavoriteStatus();
            }

            return false;
          }}
          onDragStart={(e) => {
            e.preventDefault();
            return false;
          }}
        >
          {/* 海报容器 */}
          <div className='aspect-2/3 border-white/8 relative overflow-hidden rounded-[1.2rem] border bg-white/5 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]'>
            {/* 骨架屏 */}
            {!isLoading && <ImagePlaceholder aspectRatio='aspect-2/3' />}
            {/* 图片 */}
            <Image
              src={resolvedPoster}
              alt={actualTitle}
              fill
              className='pointer-events-none object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04]'
              referrerPolicy='no-referrer'
              loading='lazy'
              onLoad={() => setIsLoading(true)}
              onError={(e) => {
                // 图片加载失败时的重试机制
                const img = e.target as HTMLImageElement;
                if (!img.dataset.retried) {
                  img.dataset.retried = 'true';
                  setTimeout(() => {
                    img.src = processImageUrl(actualPoster, {
                      runtimeConfig,
                    });
                  }, 2000);
                }
              }}
              style={
                {
                  // 禁用图片的默认长按效果
                  WebkitUserSelect: 'none',
                  userSelect: 'none',
                  WebkitTouchCallout: 'none',
                  pointerEvents: 'none', // 图片不响应任何指针事件
                } as React.CSSProperties
              }
              onDragStart={(e) => {
                e.preventDefault();
                return false;
              }}
            />

            {/* 悬浮遮罩 */}
            <div className='bg-linear-to-t via-black/18 absolute inset-0 from-black/90 to-transparent opacity-100 transition-opacity duration-300 ease-in-out' />

            {/* 播放按钮 */}
            {config.showPlayButton && (
              <div
                data-button='true'
                className='absolute inset-0 flex items-center justify-center opacity-0 transition-all delay-75 duration-300 ease-in-out group-hover:opacity-100'
              >
                <PlayCircleIcon
                  size={50}
                  strokeWidth={0.8}
                  className='text-foreground fill-transparent opacity-90 drop-shadow-[0_10px_35px_rgba(0,0,0,0.45)] transition-all duration-300 ease-out hover:scale-[1.08] hover:text-[var(--accent)]'
                />
              </div>
            )}

            {/* 操作按钮 */}
            {(config.showHeart || config.showCheckCircle) && (
              <div
                data-button='true'
                className='absolute bottom-3 right-3 flex translate-y-2 gap-2 opacity-0 transition-all duration-300 ease-in-out sm:group-hover:translate-y-0 sm:group-hover:opacity-100'
              >
                {config.showCheckCircle && (
                  <Trash2
                    onClick={handleDeleteRecord}
                    size={20}
                    className='text-foreground hover:stroke-primary transition-all duration-300 ease-out hover:scale-[1.1]'
                  />
                )}
                {config.showHeart && from !== 'search' && (
                  <Heart
                    onClick={handleToggleFavorite}
                    size={20}
                    className={`transition-all duration-300 ease-out ${
                      favorited
                        ? 'fill-destructive stroke-destructive'
                        : 'stroke-primary-foreground hover:stroke-destructive/70 fill-transparent'
                    } hover:scale-[1.1]`}
                  />
                )}
              </div>
            )}

            {/* 年份徽章 */}
            {config.showYear &&
              actualYear &&
              actualYear !== 'unknown' &&
              actualYear.trim() !== '' && (
                <div className='bg-black/42 absolute left-3 top-3 rounded-full border border-white/10 px-2.5 py-1 text-[0.68rem] font-medium tracking-[0.12em] text-white shadow-[0_10px_24px_rgba(0,0,0,0.32)] backdrop-blur-xl transition-all duration-300 ease-out group-hover:opacity-90'>
                  {actualYear}
                </div>
              )}

            {/* 徽章 */}
            {config.showRating && rate && (
              <div className='absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-[var(--accent)] text-[0.7rem] font-semibold text-black shadow-[0_14px_30px_rgba(0,0,0,0.32)] transition-all duration-300 ease-out group-hover:scale-105'>
                {rate}
              </div>
            )}

            {actualEpisodes && actualEpisodes > 1 && (
              <div className='absolute right-3 top-3 rounded-full border border-white/10 bg-black/55 px-2.5 py-1 text-[0.68rem] font-semibold tracking-[0.12em] text-white shadow-[0_14px_30px_rgba(0,0,0,0.3)] transition-all duration-300 ease-out group-hover:scale-105'>
                {currentEpisode
                  ? `${currentEpisode}/${actualEpisodes}`
                  : actualEpisodes}
              </div>
            )}

            {/* 豆瓣链接 */}
            {config.showDoubanLink &&
              actualDoubanId &&
              actualDoubanId !== 0 && (
                <a
                  href={`https://movie.douban.com/subject/${actualDoubanId.toString()}`}
                  target='_blank'
                  rel='noopener noreferrer'
                  onClick={(e) => e.stopPropagation()}
                  className='absolute left-2 top-2 -translate-x-2 opacity-0 transition-all delay-100 duration-300 ease-in-out sm:group-hover:translate-x-0 sm:group-hover:opacity-100'
                >
                  <div className='bg-success text-success-foreground flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold shadow-md transition-all duration-300 ease-out hover:scale-[1.1] hover:opacity-90'>
                    <Link size={16} />
                  </div>
                </a>
              )}

            {/* 聚合播放源指示器 */}
            {isAggregate &&
              dynamicSourceNames &&
              dynamicSourceNames.length > 0 &&
              (() => {
                const uniqueSources = Array.from(new Set(dynamicSourceNames));
                const sourceCount = uniqueSources.length;

                return (
                  <div className='absolute bottom-2 right-2 opacity-0 transition-all delay-75 duration-300 ease-in-out sm:group-hover:opacity-100'>
                    <div className='group/sources relative'>
                      <div className='bg-secondary text-secondary-foreground hover:bg-secondary/80 flex h-6 w-6 cursor-pointer items-center justify-center rounded-full text-xs font-bold shadow-md transition-all duration-300 ease-out hover:scale-[1.1] sm:h-7 sm:w-7'>
                        {sourceCount}
                      </div>

                      {/* 播放源详情悬浮框 */}
                      {(() => {
                        // 优先显示的播放源（常见的主流平台）
                        const prioritySources = [
                          '爱奇艺',
                          '腾讯视频',
                          '优酷',
                          '芒果TV',
                          '哔哩哔哩',
                          'Netflix',
                          'Disney+',
                        ];

                        // 按优先级排序播放源
                        const sortedSources = uniqueSources.sort((a, b) => {
                          const aIndex = prioritySources.indexOf(a);
                          const bIndex = prioritySources.indexOf(b);
                          if (aIndex !== -1 && bIndex !== -1)
                            return aIndex - bIndex;
                          if (aIndex !== -1) return -1;
                          if (bIndex !== -1) return 1;
                          return a.localeCompare(b);
                        });

                        const maxDisplayCount = 6; // 最多显示6个
                        const displaySources = sortedSources.slice(
                          0,
                          maxDisplayCount,
                        );
                        const hasMore = sortedSources.length > maxDisplayCount;
                        const remainingCount =
                          sortedSources.length - maxDisplayCount;

                        return (
                          <div className='pointer-events-none invisible absolute bottom-full right-0 z-50 mb-2 translate-x-0 opacity-0 transition-all delay-100 duration-200 ease-out group-hover/sources:visible group-hover/sources:opacity-100 sm:right-0 sm:translate-x-0'>
                            <div className='app-panel min-w-25 max-w-35 sm:min-w-30 sm:max-w-50 overflow-hidden rounded-[1.1rem] p-1.5 text-xs sm:p-2 sm:text-xs'>
                              {/* 单列布局 */}
                              <div className='space-y-0.5 sm:space-y-1'>
                                {displaySources.map((sourceName, index) => (
                                  <div
                                    key={index}
                                    className='flex items-center gap-1 sm:gap-1.5'
                                  >
                                    <div className='bg-[var(--accent)]/70 h-0.5 w-0.5 shrink-0 rounded-full sm:h-1 sm:w-1'></div>
                                    <span
                                      className='truncate text-[10px] leading-tight sm:text-xs'
                                      title={sourceName}
                                    >
                                      {sourceName}
                                    </span>
                                  </div>
                                ))}
                              </div>

                              {/* 显示更多提示 */}
                              {hasMore && (
                                <div className='border-white/8 mt-1 border-t pt-1 sm:mt-2 sm:pt-1.5'>
                                  <div className='text-muted-foreground flex items-center justify-center'>
                                    <span className='text-[10px] font-medium sm:text-xs'>
                                      +{remainingCount} 播放源
                                    </span>
                                  </div>
                                </div>
                              )}

                              {/* 小箭头 */}
                              <div className='border-t-popover/90 absolute right-2 top-full h-0 w-0 border-l-4 border-r-4 border-t-4 border-transparent sm:right-3 sm:border-l-[6px] sm:border-r-[6px] sm:border-t-[6px]'></div>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                );
              })()}
          </div>

          {/* 进度条 */}
          {config.showProgress && progress !== undefined && (
            <div className='bg-white/8 mt-3 h-1.5 w-full overflow-hidden rounded-full'>
              <div
                className='h-full rounded-full bg-[var(--accent)] transition-all duration-500 ease-out'
                style={{ width: `${progress}%` }}
              />
            </div>
          )}

          {/* 标题与来源 */}
          <div className='mt-3 space-y-2.5 px-1.5 pb-1.5 text-left'>
            <div className='relative'>
              <span className='text-foreground peer block truncate text-sm font-semibold leading-6 tracking-[0.02em] transition-colors duration-300 ease-in-out group-hover:text-[var(--accent)] sm:text-[0.95rem]'>
                {actualTitle}
              </span>
              {/* 自定义 tooltip */}
              <div className='bg-black/88 text-popover-foreground pointer-events-none invisible absolute bottom-full left-1/2 mb-2 -translate-x-1/2 transform whitespace-nowrap rounded-xl border border-white/10 px-3 py-1.5 text-xs opacity-0 shadow-[0_18px_40px_rgba(0,0,0,0.35)] transition-all delay-100 duration-200 ease-out peer-hover:visible peer-hover:opacity-100'>
                {actualTitle}
                <div className='border-t-popover absolute left-1/2 top-full h-0 w-0 -translate-x-1/2 transform border-l-4 border-r-4 border-t-4 border-transparent'></div>
              </div>
            </div>
            {config.showSourceName && source_name && (
              <span className='text-muted-foreground mt-1 block text-xs'>
                <span className='inline-flex items-center rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[0.68rem] uppercase tracking-[0.12em] transition-all duration-300 ease-in-out group-hover:border-white/20 group-hover:text-[var(--accent)]'>
                  {source_name}
                </span>
              </span>
            )}
          </div>
        </VideoCardView>

        {/* 操作菜单 - 支持右键和长按触发 */}
        <MobileActionSheet
          isOpen={showMobileActions}
          onClose={() => setShowMobileActions(false)}
          title={actualTitle}
          poster={resolvedPoster}
          actions={mobileActions}
          sources={
            isAggregate && dynamicSourceNames
              ? Array.from(new Set(dynamicSourceNames))
              : undefined
          }
          isAggregate={isAggregate}
          sourceName={source_name}
          currentEpisode={currentEpisode}
          totalEpisodes={actualEpisodes}
        />
      </>
    );
  },
);

export default memo(VideoCard);
