/* eslint-disable @typescript-eslint/ban-ts-comment, @typescript-eslint/no-explicit-any, react-hooks/exhaustive-deps, no-console, @next/next/no-img-element */

'use client';

import { Heart } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import {
  deleteFavorite,
  generateStorageKey,
  isFavorited,
  saveFavorite,
  subscribeToDataUpdates,
} from '@/lib/db';
import { SearchResult } from '@/lib/types';
import { usePlaySessionBootstrap } from '@/hooks/usePlaySessionBootstrap';

import EpisodeSelector from '@/components/EpisodeSelector';

import { PlayErrorView } from '@/app/play/components/play-error-view';
import { PlayLoadingView } from '@/app/play/components/play-loading-view';
import { PlayPageContainer } from '@/app/play/components/play-page-container';
import { useArtPlayerInstance } from '@/app/play/hooks/use-art-player-instance';
import { usePlayPageActions } from '@/app/play/hooks/use-play-page-actions';
import { usePlayPageState } from '@/app/play/hooks/use-play-page-state';
import { usePlayProgress } from '@/app/play/hooks/use-play-progress';
import { usePlayReturnToSearch } from '@/app/play/hooks/use-play-return-to-search';
import { useWakeLock } from '@/app/play/hooks/use-wake-lock';
import { filterAdsFromM3U8 } from '@/app/play/services/m3u8-ad-filter';
import {
  clearPlayProgressForVideo,
  loadResumeProgress,
  persistPlayProgress,
} from '@/app/play/services/play-progress-service';
import {
  formatSkipDuration,
  isSkipConfigEmpty,
  loadSkipConfigForVideo,
  persistSkipConfigForVideo,
  SkipConfigValue,
  transferSkipConfigOnSourceSwitch,
} from '@/app/play/services/skip-config-service';

// 扩展 HTMLVideoElement 类型以支持 hls 属性
declare global {
  interface HTMLVideoElement {
    hls?: any;
  }
}

type PlayerLibraries = {
  Artplayer: any;
  Hls: any;
};

export function PlayPlayerRuntime() {
  const searchParams = useSearchParams();

  // -----------------------------------------------------------------------------
  // 状态变量（State）
  // -----------------------------------------------------------------------------
  const {
    loading,
    setLoading,
    loadingStage,
    setLoadingStage,
    loadingMessage,
    setLoadingMessage,
    error,
    setError,
    detail,
    setDetail,
    videoTitle,
    setVideoTitle,
    videoYear,
    setVideoYear,
    videoCover,
    setVideoCover,
    videoDoubanId,
    setVideoDoubanId,
    currentSource,
    setCurrentSource,
    currentId,
    setCurrentId,
    searchTitle,
    currentEpisodeIndex,
    setCurrentEpisodeIndex,
    totalEpisodes,
    availableSources,
    setAvailableSources,
    sourceSearchLoading,
    setSourceSearchLoading,
    sourceSearchError,
    setSourceSearchError,
    isEpisodeSelectorCollapsed,
    setIsEpisodeSelectorCollapsed,
    isVideoLoading,
    setIsVideoLoading,
    videoLoadingStage,
    setVideoLoadingStage,
    handleBootstrapSuccess,
  } = usePlayPageState();

  // 收藏状态
  const [favorited, setFavorited] = useState(false);

  // 跳过片头片尾配置
  const [skipConfig, setSkipConfig] = useState<SkipConfigValue>({
    enable: false,
    intro_time: 0,
    outro_time: 0,
  });
  const skipConfigRef = useRef(skipConfig);
  useEffect(() => {
    skipConfigRef.current = skipConfig;
  }, [
    skipConfig,
    skipConfig.enable,
    skipConfig.intro_time,
    skipConfig.outro_time,
  ]);

  // 跳过检查的时间间隔控制
  const lastSkipCheckRef = useRef(0);

  // 去广告开关（从 localStorage 继承，默认 true）
  const [blockAdEnabled, setBlockAdEnabled] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const v = localStorage.getItem('enable_blockad');
      if (v !== null) return v === 'true';
      const runtimeConfig = (
        window as Window & {
          RUNTIME_CONFIG?: { M3U8_AD_FILTER_ENABLED?: boolean };
        }
      ).RUNTIME_CONFIG;
      if (typeof runtimeConfig?.M3U8_AD_FILTER_ENABLED === 'boolean') {
        return runtimeConfig.M3U8_AD_FILTER_ENABLED;
      }
    }
    return true;
  });
  const blockAdEnabledRef = useRef(blockAdEnabled);
  useEffect(() => {
    blockAdEnabledRef.current = blockAdEnabled;
  }, [blockAdEnabled]);

  // 视频基本信息
  const playSessionId = searchParams.get('ps') || '';
  const returnToSearch = usePlayReturnToSearch(searchTitle, videoTitle);

  const currentSourceRef = useRef(currentSource);
  const currentIdRef = useRef(currentId);
  const videoTitleRef = useRef(videoTitle);
  const videoYearRef = useRef(videoYear);
  const detailRef = useRef<SearchResult | null>(detail);
  const currentEpisodeIndexRef = useRef(currentEpisodeIndex);

  // 同步最新值到 refs
  useEffect(() => {
    currentSourceRef.current = currentSource;
    currentIdRef.current = currentId;
    detailRef.current = detail;
    currentEpisodeIndexRef.current = currentEpisodeIndex;
    videoTitleRef.current = videoTitle;
    videoYearRef.current = videoYear;
  }, [
    currentSource,
    currentId,
    detail,
    currentEpisodeIndex,
    videoTitle,
    videoYear,
  ]);

  // 视频播放地址
  const [videoUrl, setVideoUrl] = useState('');

  // 用于记录是否需要在播放器 ready 后跳转到指定进度
  const resumeTimeRef = useRef<number | null>(null);
  // 上次使用的音量，默认 0.7
  const lastVolumeRef = useRef<number>(0.7);
  // 上次使用的播放速率，默认 1.0
  const lastPlaybackRateRef = useRef<number>(1.0);

  const {
    artPlayerRef,
    artContainerRef: artRef,
    destroyHlsInstance,
    cleanupPlayer,
  } = useArtPlayerInstance();
  const { requestWakeLock, releaseWakeLock } = useWakeLock();
  const [playerLibraries, setPlayerLibraries] =
    useState<PlayerLibraries | null>(null);

  usePlaySessionBootstrap(
    {
      playSessionId,
    },
    {
      setLoading,
      setSourceSearchLoading,
      setSourceSearchError,
      setLoadingStage,
      setLoadingMessage,
      setError,
      onBootstrapSuccess: handleBootstrapSuccess,
    },
  );

  useEffect(() => {
    let cancelled = false;

    const loadPlayerLibraries = async () => {
      try {
        const [artplayerModule, hlsModule] = await Promise.all([
          import('artplayer'),
          import('hls.js'),
        ]);

        if (!cancelled) {
          setPlayerLibraries({
            Artplayer: artplayerModule.default,
            Hls: hlsModule.default,
          });
        }
      } catch (err) {
        console.error('播放器依赖加载失败:', err);
        if (!cancelled) {
          setError('播放器依赖加载失败');
        }
      }
    };

    loadPlayerLibraries();

    return () => {
      cancelled = true;
    };
  }, []);

  // -----------------------------------------------------------------------------
  // 工具函数（Utils）
  // -----------------------------------------------------------------------------

  // 更新视频地址
  const updateVideoUrl = (
    detailData: SearchResult | null,
    episodeIndex: number,
  ) => {
    if (
      !detailData ||
      !detailData.episodes ||
      episodeIndex >= detailData.episodes.length
    ) {
      setVideoUrl('');
      return;
    }
    const newUrl = detailData?.episodes[episodeIndex] || '';
    if (newUrl !== videoUrl) {
      setVideoUrl(newUrl);
    }
  };

  const ensureVideoSource = (video: HTMLVideoElement | null, url: string) => {
    if (!video || !url) return;
    const sources = Array.from(video.getElementsByTagName('source'));
    const existed = sources.some((s) => s.src === url);
    if (!existed) {
      // 移除旧的 source，保持唯一
      sources.forEach((s) => s.remove());
      const sourceEl = document.createElement('source');
      sourceEl.src = url;
      video.appendChild(sourceEl);
    }

    // 始终允许远程播放（AirPlay / Cast）
    video.disableRemotePlayback = false;
    // 如果曾经有禁用属性，移除之
    if (video.hasAttribute('disableRemotePlayback')) {
      video.removeAttribute('disableRemotePlayback');
    }
  };

  // 跳过片头片尾配置相关函数
  const handleSkipConfigChange = async (newConfig: SkipConfigValue) => {
    if (!currentSourceRef.current || !currentIdRef.current) return;

    try {
      setSkipConfig(newConfig);
      await persistSkipConfigForVideo(
        currentSourceRef.current,
        currentIdRef.current,
        newConfig,
      );
      if (isSkipConfigEmpty(newConfig)) {
        artPlayerRef.current.setting.update({
          name: '跳过片头片尾',
          html: '跳过片头片尾',
          switch: skipConfigRef.current.enable,
          onSwitch: function (item: any) {
            const newConfig = {
              ...skipConfigRef.current,
              enable: !item.switch,
            };
            handleSkipConfigChange(newConfig);
            return !item.switch;
          },
        });
        artPlayerRef.current.setting.update({
          name: '设置片头',
          html: '设置片头',
          icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="5" cy="12" r="2" fill="currentColor"/><path d="M9 12L17 12" stroke="currentColor" stroke-width="2"/><path d="M17 6L17 18" stroke="currentColor" stroke-width="2"/></svg>',
          tooltip:
            skipConfigRef.current.intro_time === 0
              ? '设置片头时间'
              : `${formatTime(skipConfigRef.current.intro_time)}`,
          onClick: function () {
            const currentTime = artPlayerRef.current?.currentTime || 0;
            if (currentTime > 0) {
              const newConfig = {
                ...skipConfigRef.current,
                intro_time: currentTime,
              };
              handleSkipConfigChange(newConfig);
              return `${formatTime(currentTime)}`;
            }
          },
        });
        artPlayerRef.current.setting.update({
          name: '设置片尾',
          html: '设置片尾',
          icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M7 6L7 18" stroke="currentColor" stroke-width="2"/><path d="M7 12L15 12" stroke="currentColor" stroke-width="2"/><circle cx="19" cy="12" r="2" fill="currentColor"/></svg>',
          tooltip:
            skipConfigRef.current.outro_time >= 0
              ? '设置片尾时间'
              : `-${formatTime(-skipConfigRef.current.outro_time)}`,
          onClick: function () {
            const outroTime =
              -(
                artPlayerRef.current?.duration -
                artPlayerRef.current?.currentTime
              ) || 0;
            if (outroTime < 0) {
              const newConfig = {
                ...skipConfigRef.current,
                outro_time: outroTime,
              };
              handleSkipConfigChange(newConfig);
              return `-${formatTime(-outroTime)}`;
            }
          },
        });
      }
    } catch (err) {
      console.error('保存跳过片头片尾配置失败:', err);
    }
  };

  const formatTime = formatSkipDuration;

  const createCustomHlsJsLoader = (Hls: any) =>
    class CustomHlsJsLoader extends Hls.DefaultConfig.loader {
      constructor(config: any) {
        super(config);
        const load = this.load.bind(this);
        this.load = function (context: any, config: any, callbacks: any) {
          // 拦截manifest和level请求
          if (
            (context as any).type === 'manifest' ||
            (context as any).type === 'level'
          ) {
            const onSuccess = callbacks.onSuccess;
            callbacks.onSuccess = function (
              response: any,
              stats: any,
              context: any,
            ) {
              // 如果是m3u8文件，处理内容以移除广告分段
              if (response.data && typeof response.data === 'string') {
                // 过滤掉广告段 - 实现更精确的广告过滤逻辑
                response.data = filterAdsFromM3U8(response.data);
              }
              return onSuccess(response, stats, context, null);
            };
          }
          // 执行原始load方法
          load(context, config, callbacks);
        };
      }
    };

  // 当集数索引变化时自动更新视频地址
  useEffect(() => {
    updateVideoUrl(detail, currentEpisodeIndex);
  }, [detail, currentEpisodeIndex]);

  // 播放记录处理
  useEffect(() => {
    const initFromHistory = async () => {
      if (!currentSource || !currentId) return;

      try {
        const resumeProgress = await loadResumeProgress(
          currentSource,
          currentId,
        );
        if (resumeProgress) {
          if (resumeProgress.targetIndex !== currentEpisodeIndex) {
            setCurrentEpisodeIndex(resumeProgress.targetIndex);
          }
          resumeTimeRef.current = resumeProgress.targetTime;
        }
      } catch (err) {
        console.error('读取播放记录失败:', err);
      }
    };

    initFromHistory();
  }, [currentSource, currentId]);

  // 跳过片头片尾配置处理
  useEffect(() => {
    const initSkipConfig = async () => {
      if (!currentSource || !currentId) return;

      try {
        const config = await loadSkipConfigForVideo(currentSource, currentId);
        if (config) {
          setSkipConfig(config);
        }
      } catch (err) {
        console.error('读取跳过片头片尾配置失败:', err);
      }
    };

    initSkipConfig();
  }, [currentSource, currentId]);

  // 处理换源
  const handleSourceChange = async (
    newSource: string,
    newId: string,
    newTitle: string,
  ) => {
    try {
      // 显示换源加载状态
      setVideoLoadingStage('sourceChanging');
      setIsVideoLoading(true);

      // 记录当前播放进度（仅在同一集数切换时恢复）
      const currentPlayTime = artPlayerRef.current?.currentTime || 0;

      // 清除前一个历史记录
      if (currentSourceRef.current && currentIdRef.current) {
        try {
          await clearPlayProgressForVideo(
            currentSourceRef.current,
            currentIdRef.current,
          );
        } catch (err) {
          console.error('清除播放记录失败:', err);
        }
      }

      // 清除并设置下一个跳过片头片尾配置
      if (currentSourceRef.current && currentIdRef.current) {
        try {
          await transferSkipConfigOnSourceSwitch(
            currentSourceRef.current,
            currentIdRef.current,
            newSource,
            newId,
            skipConfigRef.current,
          );
        } catch (err) {
          console.error('清除跳过片头片尾配置失败:', err);
        }
      }

      if (!playSessionId) {
        throw new Error('播放会话已失效，请返回搜索页重试');
      }

      const switchResponse = await fetch(
        `/api/play/sessions/${encodeURIComponent(playSessionId)}/current`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            source: newSource,
            id: newId,
          }),
        },
      );
      const switchData = await switchResponse.json();
      if (!switchResponse.ok) {
        throw new Error(switchData.error || '换源失败');
      }

      const newDetail = switchData.detail as SearchResult;
      const sources = (switchData.available_sources || []) as SearchResult[];
      setAvailableSources(sources);
      setSourceSearchError(null);

      // 尝试跳转到当前正在播放的集数
      let targetIndex = currentEpisodeIndex;

      // 如果当前集数超出新源的范围，则跳转到第一集
      if (!newDetail.episodes || targetIndex >= newDetail.episodes.length) {
        targetIndex = 0;
      }

      // 如果仍然是同一集数且播放进度有效，则在播放器就绪后恢复到原始进度
      if (targetIndex !== currentEpisodeIndex) {
        resumeTimeRef.current = 0;
      } else if (
        (!resumeTimeRef.current || resumeTimeRef.current === 0) &&
        currentPlayTime > 1
      ) {
        resumeTimeRef.current = currentPlayTime;
      }

      setVideoTitle(newDetail.title || newTitle);
      setVideoYear(newDetail.year);
      setVideoCover(newDetail.poster);
      setVideoDoubanId(newDetail.douban_id || 0);
      setCurrentSource(newSource);
      setCurrentId(newId);
      setDetail(newDetail);
      setCurrentEpisodeIndex(targetIndex);
    } catch (err) {
      setIsVideoLoading(false);
      const message = err instanceof Error ? err.message : '换源失败';
      setSourceSearchError(message);
      setError(message);
    }
  };

  useEffect(() => {
    document.addEventListener('keydown', handleKeyboardShortcuts);
    return () => {
      document.removeEventListener('keydown', handleKeyboardShortcuts);
    };
  }, []);

  // ---------------------------------------------------------------------------
  // 键盘快捷键
  // ---------------------------------------------------------------------------
  // 处理全局快捷键
  const handleKeyboardShortcuts = (e: KeyboardEvent) => {
    // 忽略输入框中的按键事件
    if (
      (e.target as HTMLElement).tagName === 'INPUT' ||
      (e.target as HTMLElement).tagName === 'TEXTAREA'
    )
      return;

    // Alt + 左箭头 = 上一集
    if (e.altKey && e.key === 'ArrowLeft') {
      if (detailRef.current && currentEpisodeIndexRef.current > 0) {
        handlePreviousEpisode();
        e.preventDefault();
      }
    }

    // Alt + 右箭头 = 下一集
    if (e.altKey && e.key === 'ArrowRight') {
      const d = detailRef.current;
      const idx = currentEpisodeIndexRef.current;
      if (d && idx < d.episodes.length - 1) {
        handleNextEpisode();
        e.preventDefault();
      }
    }

    // 左箭头 = 快退
    if (!e.altKey && e.key === 'ArrowLeft') {
      if (artPlayerRef.current && artPlayerRef.current.currentTime > 5) {
        artPlayerRef.current.currentTime -= 10;
        e.preventDefault();
      }
    }

    // 右箭头 = 快进
    if (!e.altKey && e.key === 'ArrowRight') {
      if (
        artPlayerRef.current &&
        artPlayerRef.current.currentTime < artPlayerRef.current.duration - 5
      ) {
        artPlayerRef.current.currentTime += 10;
        e.preventDefault();
      }
    }

    // 上箭头 = 音量+
    if (e.key === 'ArrowUp') {
      if (artPlayerRef.current && artPlayerRef.current.volume < 1) {
        artPlayerRef.current.volume =
          Math.round((artPlayerRef.current.volume + 0.1) * 10) / 10;
        artPlayerRef.current.notice.show = `音量: ${Math.round(
          artPlayerRef.current.volume * 100,
        )}`;
        e.preventDefault();
      }
    }

    // 下箭头 = 音量-
    if (e.key === 'ArrowDown') {
      if (artPlayerRef.current && artPlayerRef.current.volume > 0) {
        artPlayerRef.current.volume =
          Math.round((artPlayerRef.current.volume - 0.1) * 10) / 10;
        artPlayerRef.current.notice.show = `音量: ${Math.round(
          artPlayerRef.current.volume * 100,
        )}`;
        e.preventDefault();
      }
    }

    // 空格 = 播放/暂停
    if (e.key === ' ') {
      if (artPlayerRef.current) {
        artPlayerRef.current.toggle();
        e.preventDefault();
      }
    }

    // f 键 = 切换全屏
    if (e.key === 'f' || e.key === 'F') {
      if (artPlayerRef.current) {
        artPlayerRef.current.fullscreen = !artPlayerRef.current.fullscreen;
        e.preventDefault();
      }
    }
  };

  // ---------------------------------------------------------------------------
  // 播放记录相关
  // ---------------------------------------------------------------------------
  // 保存播放进度
  const saveCurrentPlayProgress = async () => {
    if (
      !artPlayerRef.current ||
      !currentSourceRef.current ||
      !currentIdRef.current ||
      !videoTitleRef.current
    ) {
      return;
    }

    const player = artPlayerRef.current;

    try {
      await persistPlayProgress({
        source: currentSourceRef.current,
        id: currentIdRef.current,
        title: videoTitleRef.current,
        sourceName: detailRef.current?.source_name || '',
        year: detailRef.current?.year,
        cover: detailRef.current?.poster || '',
        episodeIndex: currentEpisodeIndexRef.current,
        totalEpisodes: detailRef.current?.episodes.length || 1,
        currentTime: player.currentTime || 0,
        duration: player.duration || 0,
        searchTitle,
      });
    } catch (err) {
      console.error('保存播放进度失败:', err);
    }
  };
  const { handleEpisodeChange, handlePreviousEpisode, handleNextEpisode } =
    usePlayPageActions({
      totalEpisodes,
      detailRef,
      currentEpisodeIndexRef,
      artPlayerRef,
      setCurrentEpisodeIndex,
      saveCurrentPlayProgress,
    });
  const { bindPlayer: bindProgressEvents } = usePlayProgress(
    saveCurrentPlayProgress,
  );

  useEffect(() => {
    // 页面即将卸载时保存播放进度和清理资源
    const handleBeforeUnload = () => {
      saveCurrentPlayProgress();
      releaseWakeLock();
      cleanupPlayer();
    };

    // 页面可见性变化时保存播放进度和释放 Wake Lock
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        saveCurrentPlayProgress();
        releaseWakeLock();
      } else if (document.visibilityState === 'visible') {
        // 页面重新可见时，如果正在播放则重新请求 Wake Lock
        if (artPlayerRef.current && !artPlayerRef.current.paused) {
          requestWakeLock();
        }
      }
    };

    // 添加事件监听器
    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      // 清理事件监听器
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // ---------------------------------------------------------------------------
  // 收藏相关
  // ---------------------------------------------------------------------------
  // 每当 source 或 id 变化时检查收藏状态
  useEffect(() => {
    if (!currentSource || !currentId) return;
    (async () => {
      try {
        const fav = await isFavorited(currentSource, currentId);
        setFavorited(fav);
      } catch (err) {
        console.error('检查收藏状态失败:', err);
      }
    })();
  }, [currentSource, currentId]);

  // 监听收藏数据更新事件
  useEffect(() => {
    if (!currentSource || !currentId) return;

    const unsubscribe = subscribeToDataUpdates(
      'favoritesUpdated',
      (favorites: Record<string, any>) => {
        const key = generateStorageKey(currentSource, currentId);
        const isFav = !!favorites[key];
        setFavorited(isFav);
      },
    );

    return unsubscribe;
  }, [currentSource, currentId]);

  // 切换收藏
  const handleToggleFavorite = async () => {
    if (
      !videoTitleRef.current ||
      !detailRef.current ||
      !currentSourceRef.current ||
      !currentIdRef.current
    )
      return;

    try {
      if (favorited) {
        // 如果已收藏，删除收藏
        await deleteFavorite(currentSourceRef.current, currentIdRef.current);
        setFavorited(false);
      } else {
        // 如果未收藏，添加收藏
        await saveFavorite(currentSourceRef.current, currentIdRef.current, {
          title: videoTitleRef.current,
          source_name: detailRef.current?.source_name || '',
          year: detailRef.current?.year,
          cover: detailRef.current?.poster || '',
          total_episodes: detailRef.current?.episodes.length || 1,
          save_time: Date.now(),
          search_title: searchTitle,
        });
        setFavorited(true);
      }
    } catch (err) {
      console.error('切换收藏失败:', err);
    }
  };

  useEffect(() => {
    const Artplayer = playerLibraries?.Artplayer;
    const Hls = playerLibraries?.Hls;

    if (
      !Artplayer ||
      !Hls ||
      !videoUrl ||
      loading ||
      currentEpisodeIndex === null ||
      !artRef.current
    ) {
      return;
    }

    const CustomHlsJsLoader = createCustomHlsJsLoader(Hls);

    // 确保选集索引有效
    if (
      !detail ||
      !detail.episodes ||
      currentEpisodeIndex >= detail.episodes.length ||
      currentEpisodeIndex < 0
    ) {
      setError(`选集索引无效，当前共 ${totalEpisodes} 集`);
      return;
    }

    if (!videoUrl) {
      setError('视频地址无效');
      return;
    }

    // 检测是否为WebKit浏览器
    const isWebkit =
      typeof window !== 'undefined' &&
      typeof (window as any).webkitConvertPointFromNodeToPage === 'function';

    // 非WebKit浏览器且播放器已存在，使用switch方法切换
    if (!isWebkit && artPlayerRef.current) {
      artPlayerRef.current.switch = videoUrl;
      artPlayerRef.current.title = `${videoTitle} - 第${
        currentEpisodeIndex + 1
      }集`;
      artPlayerRef.current.poster = videoCover;
      if (artPlayerRef.current?.video) {
        ensureVideoSource(
          artPlayerRef.current.video as HTMLVideoElement,
          videoUrl,
        );
      }
      return;
    }

    // WebKit浏览器或首次创建：销毁之前的播放器实例并创建新的
    if (artPlayerRef.current) {
      cleanupPlayer();
    }

    try {
      // 创建新的播放器实例
      Artplayer.PLAYBACK_RATE = [0.5, 0.75, 1, 1.25, 1.5, 2, 3];
      Artplayer.USE_RAF = false;
      Artplayer.FULLSCREEN_WEB_IN_BODY = true;

      artPlayerRef.current = new Artplayer({
        container: artRef.current,
        url: videoUrl,
        poster: videoCover,
        volume: 0.7,
        muted: false,
        autoplay: true,
        pip: true,
        autoSize: false,
        autoMini: false,
        screenshot: false,
        setting: true,
        loop: false,
        flip: false,
        playbackRate: true,
        aspectRatio: false,
        fullscreen: true,
        fullscreenWeb: true,
        subtitleOffset: false,
        miniProgressBar: false,
        mutex: true,
        playsInline: true,
        autoPlayback: false,
        airplay: true,
        theme:
          getComputedStyle(document.documentElement)
            .getPropertyValue('--primary')
            .trim() || 'currentColor',
        lang: 'zh-cn',
        hotkey: false,
        fastForward: true,
        autoOrientation: true,
        lock: true,
        moreVideoAttr: {
          crossOrigin: 'anonymous',
        },
        // HLS 支持配置
        customType: {
          m3u8: function (video: HTMLVideoElement, url: string) {
            destroyHlsInstance(video);
            const hls = new Hls({
              debug: false, // 关闭日志
              enableWorker: true, // WebWorker 解码，降低主线程压力
              lowLatencyMode: true, // 开启低延迟 LL-HLS

              /* 缓冲/内存相关 */
              maxBufferLength: 30, // 前向缓冲最大 30s，过大容易导致高延迟
              backBufferLength: 30, // 仅保留 30s 已播放内容，避免内存占用
              maxBufferSize: 60 * 1000 * 1000, // 约 60MB，超出后触发清理

              /* 自定义loader */
              loader: blockAdEnabledRef.current
                ? CustomHlsJsLoader
                : Hls.DefaultConfig.loader,
            });

            hls.loadSource(url);
            hls.attachMedia(video);
            video.hls = hls;

            ensureVideoSource(video, url);

            hls.on(Hls.Events.ERROR, function (event: any, data: any) {
              if (data?.fatal) {
                console.warn('HLS Fatal Error:', event, data);
                switch (data.type) {
                  case Hls.ErrorTypes.NETWORK_ERROR:
                    hls.startLoad();
                    break;
                  case Hls.ErrorTypes.MEDIA_ERROR:
                    hls.recoverMediaError();
                    break;
                  default:
                    destroyHlsInstance(video);
                    break;
                }
              }
            });
          },
        },
        icons: {
          loading:
            '<svg width="50" height="50" viewBox="0 0 50 50" xmlns="http://www.w3.org/2000/svg"><path d="M25.251 6.461c-10.318 0-18.683 8.365-18.683 18.683h4.068c0-8.07 6.545-14.615 14.615-14.615V6.461z" fill="currentColor"><animateTransform attributeName="transform" attributeType="XML" dur="1s" from="0 25 25" repeatCount="indefinite" to="360 25 25" type="rotate"/></path></svg>',
        },
        settings: [
          {
            html: '去广告',
            icon: '<text x="50%" y="50%" font-size="20" font-weight="bold" text-anchor="middle" dominant-baseline="middle" fill="currentColor">AD</text>',
            tooltip: blockAdEnabled ? '已开启' : '已关闭',
            onClick() {
              const newVal = !blockAdEnabled;
              try {
                localStorage.setItem('enable_blockad', String(newVal));
                if (artPlayerRef.current) {
                  resumeTimeRef.current = artPlayerRef.current.currentTime;
                  destroyHlsInstance(
                    artPlayerRef.current.video as HTMLVideoElement,
                  );
                  artPlayerRef.current.destroy();
                  artPlayerRef.current =
                    null as unknown as typeof artPlayerRef.current;
                }
                setBlockAdEnabled(newVal);
              } catch (_) {
                // ignore
              }
              return newVal ? '当前开启' : '当前关闭';
            },
          },
          {
            name: '跳过片头片尾',
            html: '跳过片头片尾',
            switch: skipConfigRef.current.enable,
            onSwitch: function (item: any) {
              const newConfig = {
                ...skipConfigRef.current,
                enable: !item.switch,
              };
              handleSkipConfigChange(newConfig);
              return !item.switch;
            },
          },
          {
            html: '删除跳过配置',
            onClick: function () {
              handleSkipConfigChange({
                enable: false,
                intro_time: 0,
                outro_time: 0,
              });
              return '';
            },
          },
          {
            name: '设置片头',
            html: '设置片头',
            icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="5" cy="12" r="2" fill="currentColor"/><path d="M9 12L17 12" stroke="currentColor" stroke-width="2"/><path d="M17 6L17 18" stroke="currentColor" stroke-width="2"/></svg>',
            tooltip:
              skipConfigRef.current.intro_time === 0
                ? '设置片头时间'
                : `${formatTime(skipConfigRef.current.intro_time)}`,
            onClick: function () {
              const currentTime = artPlayerRef.current?.currentTime || 0;
              if (currentTime > 0) {
                const newConfig = {
                  ...skipConfigRef.current,
                  intro_time: currentTime,
                };
                handleSkipConfigChange(newConfig);
                return `${formatTime(currentTime)}`;
              }
            },
          },
          {
            name: '设置片尾',
            html: '设置片尾',
            icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M7 6L7 18" stroke="currentColor" stroke-width="2"/><path d="M7 12L15 12" stroke="currentColor" stroke-width="2"/><circle cx="19" cy="12" r="2" fill="currentColor"/></svg>',
            tooltip:
              skipConfigRef.current.outro_time >= 0
                ? '设置片尾时间'
                : `-${formatTime(-skipConfigRef.current.outro_time)}`,
            onClick: function () {
              const outroTime =
                -(
                  artPlayerRef.current?.duration -
                  artPlayerRef.current?.currentTime
                ) || 0;
              if (outroTime < 0) {
                const newConfig = {
                  ...skipConfigRef.current,
                  outro_time: outroTime,
                };
                handleSkipConfigChange(newConfig);
                return `-${formatTime(-outroTime)}`;
              }
            },
          },
        ],
        // 控制栏配置
        controls: [
          {
            position: 'left',
            index: 13,
            html: '<i class="art-icon flex"><svg width="22" height="22" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" fill="currentColor"/></svg></i>',
            tooltip: '播放下一集',
            click: function () {
              handleNextEpisode();
            },
          },
        ],
      });

      // 监听播放器事件
      artPlayerRef.current.on('ready', () => {
        setError(null);

        // 播放器就绪后，如果正在播放则请求 Wake Lock
        if (artPlayerRef.current && !artPlayerRef.current.paused) {
          requestWakeLock();
        }
      });

      // 监听播放状态变化，控制 Wake Lock
      artPlayerRef.current.on('play', () => {
        requestWakeLock();
      });

      artPlayerRef.current.on('pause', () => {
        releaseWakeLock();
        saveCurrentPlayProgress();
      });

      artPlayerRef.current.on('video:ended', () => {
        releaseWakeLock();
      });

      // 如果播放器初始化时已经在播放状态，则请求 Wake Lock
      if (artPlayerRef.current && !artPlayerRef.current.paused) {
        requestWakeLock();
      }

      artPlayerRef.current.on('video:volumechange', () => {
        lastVolumeRef.current = artPlayerRef.current.volume;
      });
      artPlayerRef.current.on('video:ratechange', () => {
        lastPlaybackRateRef.current = artPlayerRef.current.playbackRate;
      });

      // 监听视频可播放事件，这时恢复播放进度更可靠
      artPlayerRef.current.on('video:canplay', () => {
        // 若存在需要恢复的播放进度，则跳转
        if (resumeTimeRef.current && resumeTimeRef.current > 0) {
          try {
            const duration = artPlayerRef.current.duration || 0;
            let target = resumeTimeRef.current;
            if (duration && target >= duration - 2) {
              target = Math.max(0, duration - 5);
            }
            artPlayerRef.current.currentTime = target;
          } catch (err) {
            console.warn('恢复播放进度失败:', err);
          }
        }
        resumeTimeRef.current = null;

        setTimeout(() => {
          if (
            Math.abs(artPlayerRef.current.volume - lastVolumeRef.current) > 0.01
          ) {
            artPlayerRef.current.volume = lastVolumeRef.current;
          }
          if (
            Math.abs(
              artPlayerRef.current.playbackRate - lastPlaybackRateRef.current,
            ) > 0.01 &&
            isWebkit
          ) {
            artPlayerRef.current.playbackRate = lastPlaybackRateRef.current;
          }
          artPlayerRef.current.notice.show = '';
        }, 0);

        // 隐藏换源加载状态
        setIsVideoLoading(false);
      });

      // 监听视频时间更新事件，实现跳过片头片尾
      artPlayerRef.current.on('video:timeupdate', () => {
        if (!skipConfigRef.current.enable) return;

        const currentTime = artPlayerRef.current.currentTime || 0;
        const duration = artPlayerRef.current.duration || 0;
        const now = Date.now();

        // 限制跳过检查频率为1.5秒一次
        if (now - lastSkipCheckRef.current < 1500) return;
        lastSkipCheckRef.current = now;

        // 跳过片头
        if (
          skipConfigRef.current.intro_time > 0 &&
          currentTime < skipConfigRef.current.intro_time
        ) {
          artPlayerRef.current.currentTime = skipConfigRef.current.intro_time;
          artPlayerRef.current.notice.show = `已跳过片头 (${formatTime(
            skipConfigRef.current.intro_time,
          )})`;
        }

        // 跳过片尾
        if (
          skipConfigRef.current.outro_time < 0 &&
          duration > 0 &&
          currentTime >
            artPlayerRef.current.duration + skipConfigRef.current.outro_time
        ) {
          if (
            currentEpisodeIndexRef.current <
            (detailRef.current?.episodes?.length || 1) - 1
          ) {
            handleNextEpisode();
          } else {
            artPlayerRef.current.pause();
          }
          artPlayerRef.current.notice.show = `已跳过片尾 (${formatTime(
            skipConfigRef.current.outro_time,
          )})`;
        }
      });

      artPlayerRef.current.on('error', (err: any) => {
        console.error('播放器错误:', err);
        if (artPlayerRef.current.currentTime > 0) {
          return;
        }
      });

      // 监听视频播放结束事件，自动播放下一集
      artPlayerRef.current.on('video:ended', () => {
        const d = detailRef.current;
        const idx = currentEpisodeIndexRef.current;
        if (d && d.episodes && idx < d.episodes.length - 1) {
          setTimeout(() => {
            setCurrentEpisodeIndex(idx + 1);
          }, 1000);
        }
      });

      bindProgressEvents(artPlayerRef.current);

      if (artPlayerRef.current?.video) {
        ensureVideoSource(
          artPlayerRef.current.video as HTMLVideoElement,
          videoUrl,
        );
      }
    } catch (err) {
      console.error('创建播放器失败:', err);
      setError('播放器初始化失败');
    }
  }, [
    playerLibraries,
    videoUrl,
    loading,
    blockAdEnabled,
    currentEpisodeIndex,
    detail,
    totalEpisodes,
    videoTitle,
    videoCover,
  ]);

  // 当组件卸载时清理定时器、Wake Lock 和播放器资源
  useEffect(() => {
    return () => {
      // 释放 Wake Lock
      releaseWakeLock();

      // 销毁播放器实例
      cleanupPlayer();
    };
  }, []);

  if (loading) {
    return (
      <PlayLoadingView
        loadingStage={loadingStage}
        loadingMessage={loadingMessage}
      />
    );
  }

  if (error) {
    return (
      <PlayErrorView
        error={error}
        videoTitle={videoTitle}
        onBack={returnToSearch}
        onRetry={() => window.location.reload()}
      />
    );
  }

  return (
    <PlayPageContainer>
      {/* 第一行：影片标题 */}
      <div className='border-border/60 bg-card/40 rounded-xl border px-4 py-3'>
        <div className='flex items-center justify-between gap-3'>
          <h1 className='text-foreground text-xl font-semibold'>
            {videoTitle || '影片标题'}
            {totalEpisodes > 1 && (
              <span className='text-muted-foreground ml-1'>
                {` > ${detail?.episodes_titles?.[currentEpisodeIndex] || `第 ${currentEpisodeIndex + 1} 集`}`}
              </span>
            )}
          </h1>
          <button
            type='button'
            onClick={returnToSearch}
            className='bg-muted text-foreground hover:bg-muted/80 rounded-lg px-3 py-1.5 text-sm font-medium'
          >
            返回搜索
          </button>
        </div>
      </div>
      {/* 第二行：播放器和选集 */}
      <div className='space-y-2'>
        {/* 折叠控制 - 仅在 lg 及以上屏幕显示 */}
        <div className='hidden justify-end lg:flex'>
          <button
            onClick={() =>
              setIsEpisodeSelectorCollapsed(!isEpisodeSelectorCollapsed)
            }
            className='bg-card/80 hover:bg-card/80 dark:hover:bg-card border-border/50 group relative flex items-center space-x-1.5 rounded-full border px-3 py-1.5 shadow-sm backdrop-blur-sm transition-all duration-200 hover:shadow-md'
            title={isEpisodeSelectorCollapsed ? '显示选集面板' : '隐藏选集面板'}
          >
            <svg
              className={`text-muted-foreground h-3.5 w-3.5 transition-transform duration-200 ${
                isEpisodeSelectorCollapsed ? 'rotate-180' : 'rotate-0'
              }`}
              fill='none'
              stroke='currentColor'
              viewBox='0 0 24 24'
            >
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth='2'
                d='M9 5l7 7-7 7'
              />
            </svg>
            <span className='text-foreground text-xs font-medium'>
              {isEpisodeSelectorCollapsed ? '显示' : '隐藏'}
            </span>

            {/* 精致的状态指示点 */}
            <div
              className={`absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full transition-all duration-200 ${
                isEpisodeSelectorCollapsed
                  ? 'bg-warning animate-pulse'
                  : 'bg-primary'
              }`}
            ></div>
          </button>
        </div>

        <div
          className={`lg:h-125 xl:h-162.5 grid gap-4 transition-all duration-300 ease-in-out ${
            isEpisodeSelectorCollapsed
              ? 'grid-cols-1'
              : 'grid-cols-1 md:grid-cols-[minmax(0,1fr)_320px]'
          }`}
        >
          {/* 播放器 */}
          <div
            className={`border-border/70 bg-card/25 h-full rounded-xl border shadow-sm transition-all duration-300 ease-in-out ${
              isEpisodeSelectorCollapsed ? 'col-span-1' : 'md:col-span-1'
            }`}
          >
            <div className='h-75 relative w-full lg:h-full'>
              <div
                ref={artRef}
                className='bg-card h-full w-full overflow-hidden rounded-xl shadow-sm'
              ></div>

              {/* 换源加载蒙层 */}
              {isVideoLoading && (
                <div className='bg-background/88 z-500 absolute inset-0 flex items-center justify-center rounded-xl backdrop-blur-md transition-all duration-300'>
                  <div className='mx-auto max-w-md px-6 text-center'>
                    {/* 动画影院图标 */}
                    <div className='relative mb-8'>
                      <div className='bg-primary/90 relative mx-auto flex h-24 w-24 transform items-center justify-center rounded-2xl shadow-2xl transition-transform duration-300 hover:scale-105'>
                        <div className='text-4xl text-white'>🎬</div>
                        {/* 旋转光环 */}
                        <div className='bg-primary absolute -inset-2 animate-spin rounded-2xl opacity-20'></div>
                      </div>

                      {/* 浮动粒子效果 */}
                      <div className='pointer-events-none absolute left-0 top-0 h-full w-full'>
                        <div className='bg-primary absolute left-2 top-2 h-2 w-2 animate-bounce rounded-full'></div>
                        <div
                          className='bg-primary absolute right-4 top-4 h-1.5 w-1.5 animate-bounce rounded-full'
                          style={{ animationDelay: '0.5s' }}
                        ></div>
                        <div
                          className='bg-primary absolute bottom-4 left-4 h-2 w-2 animate-bounce rounded-full'
                          style={{ animationDelay: '1s' }}
                        ></div>
                      </div>
                    </div>

                    {/* 换源消息 */}
                    <div className='space-y-2'>
                      <p className='text-foreground animate-pulse text-xl font-semibold tracking-wide'>
                        {videoLoadingStage === 'sourceChanging'
                          ? '🔄 切换播放源...'
                          : '🔄 视频加载中...'}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 选集和换源 - 在移动端始终显示，在 lg 及以上可折叠 */}
          <div
            className={`h-75 transition-all duration-300 ease-in-out md:overflow-hidden lg:h-full ${
              isEpisodeSelectorCollapsed
                ? 'lg:hidden lg:scale-95 lg:opacity-0'
                : 'lg:scale-100 lg:opacity-100'
            }`}
          >
            <EpisodeSelector
              totalEpisodes={totalEpisodes}
              episodes_titles={detail?.episodes_titles || []}
              value={currentEpisodeIndex + 1}
              onChange={handleEpisodeChange}
              onSourceChange={handleSourceChange}
              currentSource={currentSource}
              currentId={currentId}
              videoTitle={searchTitle || videoTitle}
              availableSources={availableSources}
              sourceSearchLoading={sourceSearchLoading}
              sourceSearchError={sourceSearchError}
            />
          </div>
        </div>
      </div>

      {/* 详情展示 */}
      <div className='border-border/60 bg-card/45 flex min-h-80 flex-col rounded-xl border p-6 shadow-sm'>
        {/* 标题 */}
        <h1 className='mb-3 flex w-full shrink-0 items-center text-center text-3xl font-bold tracking-wide md:text-left'>
          {videoTitle || '影片标题'}
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleToggleFavorite();
            }}
            className='ml-3 shrink-0 transition-opacity hover:opacity-80'
          >
            <FavoriteIcon filled={favorited} />
          </button>
        </h1>

        {/* 关键信息行 */}
        <div className='text-foreground mb-4 flex shrink-0 flex-wrap items-center gap-2 text-sm'>
          {detail?.score && detail.score !== '0.0' && detail.score !== '0' && (
            <span className='bg-warning/12 text-warning rounded-md px-2 py-1 text-sm font-semibold'>
              {detail.score} 分
            </span>
          )}
          {detail?.class && (
            <span className='bg-primary/12 text-primary rounded-md px-2 py-1 font-medium'>
              {detail.class}
            </span>
          )}
          {(detail?.year || videoYear) && (
            <span className='bg-muted/70 rounded-md px-2 py-1'>
              {detail?.year || videoYear}
            </span>
          )}
          {detail?.area && (
            <span className='bg-muted/70 rounded-md px-2 py-1'>
              {detail.area}
            </span>
          )}
          {detail?.lang && (
            <span className='bg-muted/70 rounded-md px-2 py-1'>
              {detail.lang}
            </span>
          )}
          {detail?.source_name && (
            <span className='border-border/70 bg-card rounded-md border px-2 py-1'>
              {detail.source_name}
            </span>
          )}
          {detail?.type_name && (
            <span className='bg-muted/70 rounded-md px-2 py-1'>
              {detail.type_name}
            </span>
          )}
          {videoDoubanId !== 0 && (
            <a
              href={`https://movie.douban.com/subject/${videoDoubanId.toString()}`}
              target='_blank'
              rel='noopener noreferrer'
              className='border-success/30 bg-success/12 text-success rounded-md border px-2 py-1 font-medium transition-opacity hover:opacity-85'
            >
              豆瓣
            </a>
          )}
        </div>

        {/* 演职员信息 */}
        {(detail?.directors || detail?.actors) && (
          <div className='text-muted-foreground mb-4 space-y-1 text-sm leading-6'>
            {detail?.directors && (
              <div className='line-clamp-1'>
                <span className='text-foreground mr-2 font-semibold'>
                  导演:
                </span>
                {detail.directors}
              </div>
            )}
            {detail?.actors && (
              <div className='line-clamp-2'>
                <span className='text-foreground mr-2 font-semibold'>
                  主演:
                </span>
                {detail.actors}
              </div>
            )}
          </div>
        )}
        {/* 剧情简介 */}
        {detail?.desc && (
          <div
            className='scrollbar-hide border-border/60 bg-muted/35 text-foreground mt-0 min-h-0 flex-1 overflow-y-auto rounded-lg border px-3 py-3 pr-2 text-sm leading-7 md:text-base'
            style={{ whiteSpace: 'pre-line' }}
          >
            {detail.desc}
          </div>
        )}
      </div>
    </PlayPageContainer>
  );
}

// FavoriteIcon 组件
const FavoriteIcon = ({ filled }: { filled: boolean }) => {
  if (filled) {
    return (
      <svg
        className='h-7 w-7'
        viewBox='0 0 24 24'
        xmlns='http://www.w3.org/2000/svg'
      >
        <path
          d='M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z'
          fill='var(--destructive)'
          stroke='var(--destructive)'
          strokeWidth='2'
          strokeLinecap='round'
          strokeLinejoin='round'
        />
      </svg>
    );
  }
  return <Heart className='text-muted-foreground h-7 w-7 stroke-1' />;
};
