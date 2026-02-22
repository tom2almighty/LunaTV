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
} from '@/lib/db.client';
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
  origin?: 'vod' | 'live';
};

export default function HomeContent({
  initialMovies,
  initialTvShows,
  initialVarietyShows,
}: HomeContentProps) {
  const [activeTab, setActiveTab] = useState<'home' | 'favorites'>('home');
  const [favoriteItems, setFavoriteItems] = useState<FavoriteItem[]>([]);
  const { announcement } = useSite();
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
          origin: fav?.origin,
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
      <div className='overflow-visible px-2 py-4 sm:px-10 sm:py-8'>
        {/* 顶部 Tab 切换 */}
        <div className='mb-8 flex justify-center'>
          <CapsuleSwitch
            options={[
              { label: '首页', value: 'home' },
              { label: '收藏夹', value: 'favorites' },
            ]}
            active={activeTab}
            onChange={(value) => setActiveTab(value as 'home' | 'favorites')}
          />
        </div>

        <div className='mx-auto max-w-[95%]'>
          {activeTab === 'favorites' ? (
            <section className='mb-8'>
              <div className='mb-4 flex items-center justify-between'>
                <h2 className='text-foreground text-xl font-bold'>我的收藏</h2>
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
              <section className='mb-8'>
                <div className='mb-4 flex items-center justify-between'>
                  <h2 className='text-foreground text-xl font-bold'>
                    热门电影
                  </h2>
                  <Link
                    href='/douban?type=movie'
                    className='text-muted-foreground hover:text-foreground flex items-center text-sm'
                  >
                    查看更多
                    <ChevronRight className='ml-1 h-4 w-4' />
                  </Link>
                </div>
                {renderVideoRow(initialMovies, 'movie')}
              </section>

              {/* 热门剧集 */}
              <section className='mb-8'>
                <div className='mb-4 flex items-center justify-between'>
                  <h2 className='text-foreground text-xl font-bold'>
                    热门剧集
                  </h2>
                  <Link
                    href='/douban?type=tv'
                    className='text-muted-foreground hover:text-foreground flex items-center text-sm'
                  >
                    查看更多
                    <ChevronRight className='ml-1 h-4 w-4' />
                  </Link>
                </div>
                {renderVideoRow(initialTvShows)}
              </section>

              {/* 热门综艺 */}
              <section className='mb-8'>
                <div className='mb-4 flex items-center justify-between'>
                  <h2 className='text-foreground text-xl font-bold'>
                    热门综艺
                  </h2>
                  <Link
                    href='/douban?type=show'
                    className='text-muted-foreground hover:text-foreground flex items-center text-sm'
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
          className='bg-background/50 fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm'
          style={{ touchAction: 'none' }}
        >
          <div
            className='bg-card text-card-foreground border-border w-full max-w-md rounded-xl border p-6 shadow-xl'
            style={{ touchAction: 'auto' }}
          >
            <div className='mb-4 flex items-start justify-between'>
              <h3 className='text-foreground border-primary border-b pb-1 text-2xl font-bold tracking-tight'>
                提示
              </h3>
            </div>
            <div className='mb-6'>
              <div className='bg-primary/10 dark:bg-primary/15 relative mb-4 overflow-hidden rounded-lg'>
                <div className='bg-primary dark:bg-primary/70 absolute inset-y-0 left-0 w-1.5'></div>
                <p className='text-muted-foreground ml-4 leading-relaxed'>
                  {announcement}
                </p>
              </div>
            </div>
            <button
              onClick={() => handleCloseAnnouncement(announcement)}
              className='bg-primary hover:bg-primary/90 text-primary-foreground w-full rounded-lg px-4 py-3 font-medium shadow-md'
            >
              我知道了
            </button>
          </div>
        </div>
      )}
    </>
  );
}
