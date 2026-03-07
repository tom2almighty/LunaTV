import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { PlayPlayerRuntime } from '@/app/play/components/play-player-runtime';

vi.mock('next/navigation', () => ({
  useSearchParams: () => ({
    get: (key: string) => (key === 'ps' ? 'test-session' : null),
  }),
}));

vi.mock('artplayer', () => ({ default: {} }));
vi.mock('hls.js', () => ({ default: { DefaultConfig: { loader: class {} } } }));

vi.mock('@/lib/db', () => ({
  deleteFavorite: vi.fn(),
  generateStorageKey: vi.fn(() => 'key'),
  isFavorited: vi.fn(async () => false),
  saveFavorite: vi.fn(),
  subscribeToDataUpdates: vi.fn(() => vi.fn()),
}));

vi.mock('@/components/EpisodeSelector', () => ({
  default: () => <div data-testid='episode-selector-shell'>选集组件</div>,
}));

vi.mock('@/app/play/components/play-page-container', () => ({
  PlayPageContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid='play-page-container'>{children}</div>
  ),
}));

vi.mock('@/app/play/hooks/use-art-player-instance', () => ({
  useArtPlayerInstance: () => ({
    artPlayerRef: { current: null },
    artContainerRef: { current: null },
    destroyHlsInstance: vi.fn(),
    cleanupPlayer: vi.fn(),
  }),
}));

vi.mock('@/app/play/hooks/use-play-return-to-search', () => ({
  usePlayReturnToSearch: () => vi.fn(),
}));

vi.mock('@/app/play/hooks/use-play-session-bootstrap', () => ({
  usePlaySessionBootstrap: vi.fn(),
}));

vi.mock('@/app/play/hooks/use-play-progress', () => ({
  usePlayProgress: () => ({
    bindPlayer: vi.fn(),
  }),
}));

vi.mock('@/app/play/hooks/use-play-page-actions', () => ({
  usePlayPageActions: () => ({
    handleEpisodeChange: vi.fn(),
    handlePreviousEpisode: vi.fn(),
    handleNextEpisode: vi.fn(),
  }),
}));

vi.mock('@/app/play/hooks/use-wake-lock', () => ({
  useWakeLock: () => ({
    requestWakeLock: vi.fn(),
    releaseWakeLock: vi.fn(),
  }),
}));

vi.mock('@/app/play/hooks/use-play-page-state', () => ({
  usePlayPageState: () => ({
    loading: false,
    setLoading: vi.fn(),
    loadingStage: 'ready',
    setLoadingStage: vi.fn(),
    loadingMessage: 'ready',
    setLoadingMessage: vi.fn(),
    error: null,
    setError: vi.fn(),
    detail: {
      episodes_titles: ['第1集'],
      desc: '一段具有影院感的剧情简介。',
      score: '8.9',
      class: '科幻',
      year: '2017',
      area: '美国',
      lang: '英语',
      source_name: '蓝光源',
      type_name: '电影',
      directors: '丹尼斯·维伦纽瓦',
      actors: '瑞恩·高斯林',
    },
    setDetail: vi.fn(),
    videoTitle: '银翼杀手 2049',
    setVideoTitle: vi.fn(),
    videoYear: '2017',
    setVideoYear: vi.fn(),
    videoCover: '',
    setVideoCover: vi.fn(),
    videoDoubanId: 1295644,
    setVideoDoubanId: vi.fn(),
    currentSource: 'source-a',
    setCurrentSource: vi.fn(),
    currentId: 'id-1',
    setCurrentId: vi.fn(),
    searchTitle: '银翼杀手 2049',
    currentEpisodeIndex: 0,
    setCurrentEpisodeIndex: vi.fn(),
    totalEpisodes: 12,
    availableSources: [],
    setAvailableSources: vi.fn(),
    sourceSearchLoading: false,
    setSourceSearchLoading: vi.fn(),
    sourceSearchError: null,
    setSourceSearchError: vi.fn(),
    isEpisodeSelectorCollapsed: false,
    setIsEpisodeSelectorCollapsed: vi.fn(),
    isVideoLoading: false,
    setIsVideoLoading: vi.fn(),
    videoLoadingStage: 'playing',
    setVideoLoadingStage: vi.fn(),
    handleBootstrapSuccess: vi.fn(),
  }),
}));

vi.mock('@/app/play/services/m3u8-ad-filter', () => ({
  filterAdsFromM3U8: vi.fn((value: string) => value),
}));

vi.mock('@/app/play/services/play-progress-service', () => ({
  clearPlayProgressForVideo: vi.fn(),
  loadResumeProgress: vi.fn(async () => null),
  persistPlayProgress: vi.fn(),
}));

vi.mock('@/app/play/services/player-lifecycle', () => ({
  isPlayableEpisodeIndex: vi.fn(() => true),
  shouldReuseExistingPlayer: vi.fn(() => false),
}));

vi.mock('@/app/play/services/skip-config-service', () => ({
  formatSkipDuration: vi.fn(() => '0:00'),
  isSkipConfigEmpty: vi.fn(() => true),
  loadSkipConfigForVideo: vi.fn(async () => null),
  persistSkipConfigForVideo: vi.fn(),
  transferSkipConfigOnSourceSwitch: vi.fn(),
}));

describe('PlayPlayerRuntime view', () => {
  it('renders unified cinematic panels for title, player and details', () => {
    render(<PlayPlayerRuntime />);

    expect(screen.getByRole('button', { name: '返回搜索' })).toBeVisible();
    expect(screen.getByTestId('episode-selector-shell')).toBeVisible();
    expect(
      screen
        .getByText('一段具有影院感的剧情简介。')
        .closest('div[class*="app-control"]'),
    ).toHaveClass('app-control');
    expect(
      screen
        .getByRole('button', { name: '返回搜索' })
        .closest('div[class*="app-panel"]'),
    ).toHaveClass('app-panel');
  });
});
