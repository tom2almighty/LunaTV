/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/exhaustive-deps, no-console */

'use client';

import { ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

import {
  clearAllFavorites,
  getAllFavorites,
  getAllPlayRecords,
  subscribeToDataUpdates,
} from '@/lib/db';
import { DoubanItem } from '@/lib/types';

import CapsuleSwitch from '@/components/CapsuleSwitch';
import ContinueWatching from '@/components/ContinueWatching';
import ScrollableRow from '@/components/ScrollableRow';
import VideoCard from '@/components/VideoCard';

import { useSite } from '@/context/SiteContext';

interface HomeContentProps {
  initialMovies: DoubanItem[];
  initialTvShows: DoubanItem[];
  initialVarietyShows: DoubanItem[];
}

type FavoriteItem = {
  id: string;
  source: string;
  title: string;
  poster: string;
  episodes: number;
  source_name: string;
  currentEpisode?: number;
  search_title?: string;
};

export default function HomeContent({
  initialMovies,
  initialTvShows,
  initialVarietyShows,
}: HomeContentProps) {
  const [activeTab, setActiveTab] = useState<'home' | 'favorites'>('home');
  const [favoriteItems, setFavoriteItems] = useState<FavoriteItem[]>([]);
  const { announcement, siteName } = useSite();
  const [showAnnouncement, setShowAnnouncement] = useState(false);

  // 检查公告弹窗状态
  useEffect(() => {
    if (typeof window !== 'undefined' && announcement) {
      const hasSeenAnnouncement = localStorage.getItem('hasSeenAnnouncement');
      if (hasSeenAnnouncement !== announcement) {
        setShowAnnouncement(true);
      } else {
        setShowAnnouncement(Boolean(!hasSeenAnnouncement && announcement));
      }
    }
  }, [announcement]);

  // 处理收藏数据更新的函数
  const updateFavoriteItems = async (allFavorites: Record<string, any>) => {
    const allPlayRecords = await getAllPlayRecords();

    const sorted = Object.entries(allFavorites)
      .sort(([, a], [, b]) => b.save_time - a.save_time)
      .map(([key, fav]) => {
        const plusIndex = key.indexOf('+');
        const source = key.slice(0, plusIndex);
        const id = key.slice(plusIndex + 1);
        const playRecord = allPlayRecords[key];
        const currentEpisode = playRecord?.index;

        return {
          id,
          source,
          title: fav.title,
          year: fav.year,
          poster: fav.cover,
          episodes: fav.total_episodes,
          source_name: fav.source_name,
          currentEpisode,
          search_title: fav?.search_title,
        } as FavoriteItem;
      });
    setFavoriteItems(sorted);
  };

  // 当切换到收藏夹时加载收藏数据
  useEffect(() => {
    if (activeTab !== 'favorites') return;

    const loadFavorites = async () => {
      const allFavorites = await getAllFavorites();
      await updateFavoriteItems(allFavorites);
    };

    loadFavorites();

    const unsubscribe = subscribeToDataUpdates(
      'favoritesUpdated',
      (newFavorites: Record<string, any>) => {
        updateFavoriteItems(newFavorites);
      },
    );

    return unsubscribe;
  }, [activeTab]);

  const handleCloseAnnouncement = (announcement: string) => {
    setShowAnnouncement(false);
    localStorage.setItem('hasSeenAnnouncement', announcement);
  };

  // 渲染视频行的辅助函数
  const renderVideoRow = (items: DoubanItem[], type?: string) => (
    <ScrollableRow>
      {items.map((item, index) => (
        <div key={index} className='sm:min-w-45 w-24 min-w-24 sm:w-44'>
          <VideoCard
            from='douban'
            title={item.title}
            poster={item.poster}
            douban_id={Number(item.id)}
            rate={item.rate}
            year={item.year}
            type={type}
          />
        </div>
      ))}
    </ScrollableRow>
  );

  return (
    <>
      <div className='app-page overflow-visible'>
        <section className='app-panel mb-8 overflow-hidden rounded-[1.75rem] p-5 sm:p-7'>
          <div className='flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between'>
            <div className='max-w-2xl space-y-3'>
              <p className='text-(--accent) text-[0.72rem] font-medium uppercase tracking-[0.32em]'>
                Moonlit Premium
              </p>
              <div className='space-y-2'>
                <h1 className='text-foreground text-3xl font-semibold tracking-[0.08em] sm:text-4xl'>
                  {siteName}
                </h1>
                <p className='text-muted-foreground max-w-xl text-sm leading-6 sm:text-base'>
                  聚合搜索、沉浸播放与收藏同步统一在一套更安静、更高级的观影界面里。
                </p>
              </div>
            </div>
            <div className='flex justify-start lg:justify-end'>
              <CapsuleSwitch
                options={[
                  { label: '首页', value: 'home' },
                  { label: '收藏夹', value: 'favorites' },
                ]}
                active={activeTab}
                onChange={(value) =>
                  setActiveTab(value as 'home' | 'favorites')
                }
              />
            </div>
          </div>
        </section>

        <div className='space-y-8'>
          {activeTab === 'favorites' ? (
            <section className='app-panel rounded-[1.75rem] p-5 sm:p-6'>
              <div className='mb-5 flex items-center justify-between gap-4'>
                <h2 className='app-section-title text-foreground text-lg font-semibold tracking-[0.08em] sm:text-xl'>
                  我的收藏
                </h2>
                {favoriteItems.length > 0 && (
                  <button
                    className='text-muted-foreground hover:text-foreground text-sm'
                    onClick={async () => {
                      await clearAllFavorites();
                      setFavoriteItems([]);
                    }}
                  >
                    清空
                  </button>
                )}
              </div>
              <div className='grid grid-cols-3 justify-start gap-x-2 gap-y-14 px-0 sm:grid-cols-[repeat(auto-fill,minmax(11rem,1fr))] sm:gap-x-8 sm:gap-y-20 sm:px-2'>
                {favoriteItems.map((item) => (
                  <div key={item.id + item.source} className='w-full'>
                    <VideoCard
                      query={item.search_title}
                      {...item}
                      from='favorite'
                      type={item.episodes > 1 ? 'tv' : ''}
                    />
                  </div>
                ))}
                {favoriteItems.length === 0 && (
                  <div className='text-muted-foreground col-span-full py-8 text-center'>
                    暂无收藏内容
                  </div>
                )}
              </div>
            </section>
          ) : (
            <>
              {/* 继续观看 */}
              <ContinueWatching />

              {/* 热门电影 */}
              <section className='app-panel rounded-[1.75rem] p-5 sm:p-6'>
                <div className='mb-5 flex items-center justify-between gap-4'>
                  <h2 className='app-section-title text-foreground text-lg font-semibold tracking-[0.08em] sm:text-xl'>
                    热门电影
                  </h2>
                  <Link
                    href='/douban?type=movie'
                    className='text-muted-foreground hover:text-foreground inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-sm transition-colors hover:bg-white/10'
                  >
                    查看更多
                    <ChevronRight className='ml-1 h-4 w-4' />
                  </Link>
                </div>
                {renderVideoRow(initialMovies, 'movie')}
              </section>

              {/* 热门剧集 */}
              <section className='app-panel rounded-[1.75rem] p-5 sm:p-6'>
                <div className='mb-5 flex items-center justify-between gap-4'>
                  <h2 className='app-section-title text-foreground text-lg font-semibold tracking-[0.08em] sm:text-xl'>
                    热门剧集
                  </h2>
                  <Link
                    href='/douban?type=tv'
                    className='text-muted-foreground hover:text-foreground inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-sm transition-colors hover:bg-white/10'
                  >
                    查看更多
                    <ChevronRight className='ml-1 h-4 w-4' />
                  </Link>
                </div>
                {renderVideoRow(initialTvShows)}
              </section>

              {/* 热门综艺 */}
              <section className='app-panel rounded-[1.75rem] p-5 sm:p-6'>
                <div className='mb-5 flex items-center justify-between gap-4'>
                  <h2 className='app-section-title text-foreground text-lg font-semibold tracking-[0.08em] sm:text-xl'>
                    热门综艺
                  </h2>
                  <Link
                    href='/douban?type=show'
                    className='text-muted-foreground hover:text-foreground inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-sm transition-colors hover:bg-white/10'
                  >
                    查看更多
                    <ChevronRight className='ml-1 h-4 w-4' />
                  </Link>
                </div>
                {renderVideoRow(initialVarietyShows)}
              </section>
            </>
          )}
        </div>
      </div>

      {/* 公告弹窗 */}
      {announcement && showAnnouncement && (
        <div
          className='fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4 backdrop-blur-xl'
          style={{ touchAction: 'none' }}
        >
          <div
            className='app-panel text-card-foreground w-full max-w-md rounded-[1.75rem] p-6 shadow-[0_28px_80px_rgba(0,0,0,0.45)]'
            style={{ touchAction: 'auto' }}
          >
            <div className='mb-4 flex items-start justify-between'>
              <h3 className='text-foreground border-(--accent) border-b pb-1 text-2xl font-bold tracking-tight'>
                提示
              </h3>
            </div>
            <div className='mb-6'>
              <div className='border-(--accent)/16 bg-(--accent)/10 relative mb-4 overflow-hidden rounded-[1.25rem] border'>
                <div className='bg-(--accent)/85 absolute inset-y-0 left-0 w-1.5'></div>
                <p className='text-muted-foreground ml-4 leading-relaxed'>
                  {announcement}
                </p>
              </div>
            </div>
            <button
              onClick={() => handleCloseAnnouncement(announcement)}
              className='hover:opacity-92 bg-(--accent) w-full rounded-2xl px-4 py-3 font-medium text-black shadow-[0_18px_40px_rgba(0,0,0,0.28)] transition-opacity'
            >
              我知道了
            </button>
          </div>
        </div>
      )}
    </>
  );
}
