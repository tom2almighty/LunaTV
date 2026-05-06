import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import Artplayer from 'artplayer';
import Hls from 'hls.js';
import { fetchSourceDetail, type PlaySessionResponse } from '../lib/cms/detail';
import {
  generateStorageKey,
  getAllPlayRecords,
  savePlayRecord,
} from '../lib/db';
import { processImageUrl, stripDescriptionHtml } from '../lib/utils';
import PlaybackPanel from '../components/PlaybackPanel';

const SESSION_KEY = 'vodhub_play_session';
const PROGRESS_SAVE_INTERVAL_MS = 5000;
const PROGRESS_RESUME_THRESHOLD_S = 5; // ignore saved time below this

interface PlayState {
  source: string;
  id: string;
  index: number;
  time: number;
  total: number;
}

export default function Play() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [detail, setDetail] = useState<any>(null);
  const [title, setTitle] = useState('');
  const [year, setYear] = useState('');
  const [cover, setCover] = useState('');
  const [currentSource, setCurrentSource] = useState('');
  const [currentId, setCurrentId] = useState('');
  const [episodeIndex, setEpisodeIndex] = useState(0);
  const [availableSources, setAvailableSources] = useState<any[]>([]);
  const [videoUrl, setVideoUrl] = useState('');
  const [switching, setSwitching] = useState(false);
  const artRef = useRef<HTMLDivElement>(null);
  const artInstance = useRef<any>(null);
  const initialized = useRef(false);

  // Live snapshot of what's currently playing — kept in sync via timeupdate.
  const playStateRef = useRef<PlayState>({ source: '', id: '', index: 0, time: 0, total: 0 });
  // Pending seek to apply once the player is ready (used to resume).
  const pendingSeekRef = useRef<number>(0);
  // Throttle for periodic progress saves.
  const lastSaveRef = useRef<number>(0);
  // Latest detail/title/etc — needed inside event callbacks that capture stale values.
  const metaRef = useRef({ title: '', year: '', detail: null as any });

  useEffect(() => {
    metaRef.current = { title, year, detail };
  }, [title, year, detail]);

  // ─── Persist current play state to local storage ──────────────────
  const persistProgress = useCallback((force = false) => {
    const s = playStateRef.current;
    if (!s.source || !s.id || s.total <= 0) return;
    const now = Date.now();
    if (!force && now - lastSaveRef.current < PROGRESS_SAVE_INTERVAL_MS) return;
    lastSaveRef.current = now;
    const meta = metaRef.current;
    savePlayRecord(s.source, s.id, {
      title: meta.title || '',
      source_name: meta.detail?.source_name || '',
      year: meta.year || '',
      cover: meta.detail?.poster || '',
      total_episodes: meta.detail?.episodes?.length || 1,
      index: s.index,
      play_time: Math.floor(s.time),
      total_time: Math.floor(s.total),
      save_time: now,
      search_title: meta.title || '',
    });
  }, []);

  // ─── Initialise from session storage ──────────────────────────────
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) { setError('播放会话已失效，请返回搜索页重试'); setLoading(false); return; }

    try {
      const session = JSON.parse(raw) as PlaySessionResponse;
      setAvailableSources(session.available_sources || []);
      setTitle(session.title);
      setYear(session.year);
      setCurrentSource(session.current_source);
      setCurrentId(session.current_id);
      const d = session.detail;
      setDetail(d);
      setCover(d?.poster || '');

      // Resume from saved record if present.
      getAllPlayRecords().then((records) => {
        const key = generateStorageKey(session.current_source, session.current_id);
        const saved = records[key];
        const startIndex = saved?.index ?? 0;
        setEpisodeIndex(startIndex);
        if (saved && saved.play_time > PROGRESS_RESUME_THRESHOLD_S) {
          pendingSeekRef.current = saved.play_time;
        }
        if (d?.episodes?.length) setVideoUrl(d.episodes[startIndex] || d.episodes[0] || '');
        setLoading(false);
      }).catch(() => {
        if (d?.episodes?.length) setVideoUrl(d.episodes[0] || '');
        setLoading(false);
      });
    } catch {
      setError('会话数据损坏');
      setLoading(false);
    }
  }, []);

  // ─── Save on tab close / unmount ──────────────────────────────────
  useEffect(() => {
    const handler = () => persistProgress(true);
    window.addEventListener('beforeunload', handler);
    window.addEventListener('pagehide', handler);
    return () => {
      window.removeEventListener('beforeunload', handler);
      window.removeEventListener('pagehide', handler);
      persistProgress(true);
    };
  }, [persistProgress]);

  // ─── Build / rebuild Artplayer when videoUrl changes ──────────────
  useEffect(() => {
    if (loading || !videoUrl || !artRef.current) return;
    if (artInstance.current) { artInstance.current.destroy(); artInstance.current = null; }

    // Sync play state for this episode/source pair.
    playStateRef.current = {
      source: currentSource,
      id: currentId,
      index: episodeIndex,
      time: 0,
      total: 0,
    };

    const accent = getComputedStyle(document.documentElement).getPropertyValue('--color-accent').trim() || '#e50914';
    const seekTo = pendingSeekRef.current;
    pendingSeekRef.current = 0;

    const art = new Artplayer({
      container: artRef.current,
      url: videoUrl,
      poster: cover ? processImageUrl(cover) : '',
      volume: 0.7,
      autoplay: true,
      pip: true,
      setting: true,
      fullscreen: true,
      fullscreenWeb: true,
      playsInline: true,
      airplay: true,
      theme: accent,
      lang: 'zh-cn',
      hotkey: true,
      moreVideoAttr: { crossOrigin: 'anonymous', playsInline: true },
      customType: {
        m3u8: function (video: HTMLVideoElement, url: string) {
          const hls = new Hls({ debug: false, enableWorker: true, lowLatencyMode: true });
          hls.loadSource(url);
          hls.attachMedia(video);
          (video as any).hls = hls;
        },
      },
      settings: [
        {
          html: '播放速度',
          width: 180,
          tooltip: '1.0x',
          selector: [
            { html: '0.5x', value: 0.5 },
            { html: '0.75x', value: 0.75 },
            { html: '1.0x', value: 1.0, default: true },
            { html: '1.25x', value: 1.25 },
            { html: '1.5x', value: 1.5 },
            { html: '2.0x', value: 2.0 },
          ],
          onSelect: function (this: any, item: any) {
            this.playbackRate = item.value;
            return item.html;
          },
        },
        {
          html: '视频比例',
          width: 180,
          tooltip: '默认',
          selector: [
            { html: '默认', value: 'default', default: true },
            { html: '4:3', value: '4:3' },
            { html: '16:9', value: '16:9' },
          ],
          onSelect: function (this: any, item: any) {
            this.aspectRatio = item.value;
            return item.html;
          },
        },
        {
          html: '画面镜像',
          width: 180,
          tooltip: '关闭',
          switch: false,
          onSwitch: function (this: any, item: any) {
            const next = !item.switch;
            const video = this.template?.$video as HTMLVideoElement | undefined;
            if (video) video.style.transform = next ? 'scaleX(-1)' : '';
            return next;
          },
        },
      ],
    });

    art.on('ready', () => {
      setError(null);
      const video: HTMLVideoElement | undefined = art.template?.$video;
      if (video && seekTo > 0) {
        const apply = () => {
          if (video.duration && Number.isFinite(video.duration) && seekTo < video.duration - 2) {
            try { video.currentTime = seekTo; } catch { /* ignore */ }
          }
        };
        if (video.readyState >= 1) apply();
        else video.addEventListener('loadedmetadata', apply, { once: true });
      }
    });

    // Hide the "切换中" overlay only once the new video can actually play.
    // Falls back to 'video:loadedmetadata' for sources that don't trigger
    // canplay reliably; either is fine since we just need a one-shot signal.
    const clearSwitching = () => setSwitching(false);
    art.on('video:canplay', clearSwitching);
    art.on('video:loadedmetadata', clearSwitching);

    art.on('video:timeupdate', () => {
      const video: HTMLVideoElement | undefined = art.template?.$video;
      if (!video) return;
      playStateRef.current.time = video.currentTime;
      playStateRef.current.total = video.duration || 0;
      persistProgress();
    });

    art.on('video:pause', () => persistProgress(true));
    art.on('error', (err: any) => console.error('player error', err));
    art.on('video:ended', () => {
      // Mark episode complete then advance.
      const total = playStateRef.current.total || 0;
      if (total > 0) {
        playStateRef.current.time = total;
        persistProgress(true);
      }
      const eps = metaRef.current.detail?.episodes;
      if (eps && playStateRef.current.index < eps.length - 1) {
        setEpisodeIndex((p: number) => p + 1);
      }
    });

    artInstance.current = art;
    return () => {
      persistProgress(true);
      art.destroy();
      artInstance.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, videoUrl]);

  // ─── Episode selection ────────────────────────────────────────────
  useEffect(() => {
    if (!detail?.episodes?.length) return;
    setVideoUrl(detail.episodes[episodeIndex] || '');
  }, [episodeIndex, detail]);

  const handleEpisodeChange = useCallback((ep: number) => {
    persistProgress(true);
    pendingSeekRef.current = 0; // start fresh on episode change
    setEpisodeIndex(ep - 1);
  }, [persistProgress]);

  // ─── Source switch (carry over current time) ──────────────────────
  // Returns a promise that resolves on success, rejects on failure.
  // The caller (PlaybackPanel) uses this to clear its optimistic
  // pending-selection state when the request fails.
  // The `switching` overlay is NOT cleared here — it stays on until the
  // newly-built player fires `'video:canplay'` (see videoUrl effect),
  // so the user keeps seeing feedback until the new video can actually play.
  const handleSourceChange = async (newSource: string, newId: string, newTitle: string) => {
    if (newSource === currentSource && newId === currentId) return;

    persistProgress(true);
    const carryOverTime = playStateRef.current.time;

    setSwitching(true);
    try {
      const nd = await fetchSourceDetail(newSource, newId);

      // If the new source already has a saved record, prefer it.
      let resumeTime = carryOverTime;
      let resumeIndex = 0;
      try {
        const records = await getAllPlayRecords();
        const saved = records[generateStorageKey(newSource, newId)];
        if (saved) {
          resumeIndex = saved.index ?? 0;
          if (saved.play_time > PROGRESS_RESUME_THRESHOLD_S) resumeTime = saved.play_time;
        }
      } catch { /* ignore */ }

      setDetail(nd);
      setTitle(nd.title || newTitle);
      setCover(nd.poster);
      setCurrentSource(newSource);
      setCurrentId(newId);

      // Set the seek target before episode change triggers player rebuild.
      pendingSeekRef.current = resumeTime;
      setEpisodeIndex(resumeIndex);

      toast.success('已切换播放源');
    } catch (err) {
      // Failure: clear the overlay immediately and re-throw so the
      // optimistic UI in PlaybackPanel can roll back its pending state.
      setSwitching(false);
      toast.error('切换失败');
      throw err;
    }
  };


  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex items-center gap-2 text-sm text-[--color-muted-foreground]">
          <div className="spinner" />
          加载中
        </div>
      </div>
    );
  }
  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
        <p className="text-base text-[--color-foreground]">{error}</p>
        <Link to="/search" className="btn-ghost inline-flex items-center gap-2">
          <ArrowLeft className="h-4 w-4" strokeWidth={1.75} /> 返回搜索
        </Link>
      </div>
    );
  }

  return (
    <div className="app-page animate-fade-in">
      {/* Player + Sidebar */}
      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        {/* Player — aspect-ratio on the bg-black container so the video
            fully fills it (no centered video with empty bands). */}
        <div
          className="relative overflow-hidden rounded-2xl border border-[--color-border] bg-black shadow-(--shadow-card)"
          style={{ aspectRatio: '16 / 9' }}
        >
          <div ref={artRef} className="absolute inset-0 bg-black" />
          {switching && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/80 backdrop-blur-sm">
              <div className="flex items-center gap-2 text-sm text-[--color-foreground]">
                <div className="spinner" />
                切换中
              </div>
            </div>
          )}
        </div>

        {/* Combined tabbed picker (episodes + sources in one card).
            On lg+, self-stretch makes this cell match the row height —
            which equals the player height (driven by 16:9 aspect-ratio).
            min-h-0 lets the inner scroll area kick in when content
            (episodes / sources) exceeds the available height.
            max-h via 100vh-7rem keeps it sane on short viewports. */}
        <aside className="lg:sticky lg:top-20 lg:max-h-[calc(100vh-7rem)] lg:min-h-0 lg:self-stretch">
          <PlaybackPanel
            totalEpisodes={detail?.episodes?.length || 0}
            episodes_titles={detail?.episodes_titles || []}
            episodeValue={episodeIndex + 1}
            onEpisodeChange={handleEpisodeChange}
            currentSource={currentSource}
            currentId={currentId}
            videoTitle={title}
            availableSources={availableSources}
            onSourceChange={handleSourceChange}
          />
        </aside>
      </div>

      {/* Detail block — clean text only, no backdrop */}
      <section className="surface-card mt-8 rounded-2xl p-5 sm:p-7">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight text-[--color-foreground] sm:text-[1.75rem]">
            {title}
          </h1>
          {detail?.episodes_titles?.[episodeIndex] && (
            <p className="mt-1.5 text-sm text-[--color-muted-foreground]">
              正在播放 · {detail.episodes_titles[episodeIndex]}
            </p>
          )}
        </div>

        {/* Meta pills */}
        <div className="mt-4 flex flex-wrap gap-2">
          {detail?.type_name && <span className="pill pill-accent">{detail.type_name}</span>}
          {(detail?.year || year) && <span className="pill pill-muted">{detail?.year || year}</span>}
          {detail?.area && <span className="pill pill-muted">{detail.area}</span>}
          {detail?.remark && <span className="pill pill-muted">{detail.remark}</span>}
          {detail?.source_name && <span className="pill">{detail.source_name}</span>}
        </div>

        {/* Description */}
        {detail?.desc && (
          <>
            <div className="mt-6 mb-2 text-xs font-semibold uppercase tracking-wider text-[--color-muted-foreground]">
              简介
            </div>
            <p className="text-sm leading-7 text-[--color-foreground]/90">
              {stripDescriptionHtml(detail.desc)}
            </p>
          </>
        )}
      </section>
    </div>
  );
}
