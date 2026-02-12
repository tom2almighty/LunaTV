/* eslint-disable no-console */

import { Suspense } from 'react';

import { getDoubanCategoriesServer } from '@/lib/douban';

import HomeContent from '@/components/HomeContent';
import PageLayout from '@/components/PageLayout';

// 服务端数据获取
async function getHomeData() {
  try {
    const [moviesData, tvShowsData, varietyShowsData] = await Promise.all([
      getDoubanCategoriesServer({
        kind: 'movie',
        category: '热门',
        type: '全部',
      }),
      getDoubanCategoriesServer({ kind: 'tv', category: 'tv', type: 'tv' }),
      getDoubanCategoriesServer({ kind: 'tv', category: 'show', type: 'show' }),
    ]);

    return {
      movies: moviesData.code === 200 ? moviesData.list : [],
      tvShows: tvShowsData.code === 200 ? tvShowsData.list : [],
      varietyShows: varietyShowsData.code === 200 ? varietyShowsData.list : [],
    };
  } catch (error) {
    console.error('获取首页数据失败:', error);
    return {
      movies: [],
      tvShows: [],
      varietyShows: [],
    };
  }
}

export default async function Home() {
  const { movies, tvShows, varietyShows } = await getHomeData();

  return (
    <PageLayout>
      <Suspense
        fallback={
          <div className='flex min-h-screen items-center justify-center'>
            <div className='text-muted-foreground'>加载中...</div>
          </div>
        }
      >
        <HomeContent
          initialMovies={movies}
          initialTvShows={tvShows}
          initialVarietyShows={varietyShows}
        />
      </Suspense>
    </PageLayout>
  );
}
