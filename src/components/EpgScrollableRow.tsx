/* eslint-disable react-hooks/exhaustive-deps */

import { Clock, Target, Tv } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { formatTimeToHHMM, parseCustomTimeFormat } from '@/lib/time';

interface EpgProgram {
  start: string;
  end: string;
  title: string;
}

interface EpgScrollableRowProps {
  programs: EpgProgram[];
  currentTime?: Date;
  isLoading?: boolean;
}

export default function EpgScrollableRow({
  programs,
  currentTime = new Date(),
  isLoading = false,
}: EpgScrollableRowProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [currentPlayingIndex, setCurrentPlayingIndex] = useState<number>(-1);

  // 处理滚轮事件，实现横向滚动
  const handleWheel = (e: WheelEvent) => {
    if (isHovered && containerRef.current) {
      e.preventDefault(); // 阻止默认的竖向滚动

      const container = containerRef.current;
      const scrollAmount = e.deltaY * 4; // 增加滚动速度

      // 根据滚轮方向进行横向滚动
      container.scrollBy({
        left: scrollAmount,
        behavior: 'smooth',
      });
    }
  };

  // 阻止页面竖向滚动
  const preventPageScroll = (e: WheelEvent) => {
    if (isHovered) {
      e.preventDefault();
    }
  };

  // 自动滚动到正在播放的节目
  const scrollToCurrentProgram = () => {
    if (containerRef.current) {
      const currentProgramIndex = programs.findIndex((program) =>
        isCurrentlyPlaying(program),
      );
      if (currentProgramIndex !== -1) {
        const programElement = containerRef.current.children[
          currentProgramIndex
        ] as HTMLElement;
        if (programElement) {
          const container = containerRef.current;
          const programLeft = programElement.offsetLeft;
          const containerWidth = container.clientWidth;
          const programWidth = programElement.offsetWidth;

          // 计算滚动位置，使正在播放的节目居中显示
          const scrollLeft =
            programLeft - containerWidth / 2 + programWidth / 2;

          container.scrollTo({
            left: Math.max(0, scrollLeft),
            behavior: 'smooth',
          });
        }
      }
    }
  };

  useEffect(() => {
    if (isHovered) {
      // 鼠标悬停时阻止页面滚动
      document.addEventListener('wheel', preventPageScroll, { passive: false });
      document.addEventListener('wheel', handleWheel, { passive: false });
    } else {
      // 鼠标离开时恢复页面滚动
      document.removeEventListener('wheel', preventPageScroll);
      document.removeEventListener('wheel', handleWheel);
    }

    return () => {
      document.removeEventListener('wheel', preventPageScroll);
      document.removeEventListener('wheel', handleWheel);
    };
  }, [isHovered]);

  // 组件加载后自动滚动到正在播放的节目
  useEffect(() => {
    // 延迟执行，确保DOM完全渲染
    const timer = setTimeout(() => {
      // 初始化当前正在播放的节目索引
      const initialPlayingIndex = programs.findIndex((program) =>
        isCurrentlyPlaying(program),
      );
      setCurrentPlayingIndex(initialPlayingIndex);
      scrollToCurrentProgram();
    }, 100);

    return () => clearTimeout(timer);
  }, [programs, currentTime]);

  // 定时刷新正在播放状态
  useEffect(() => {
    // 每分钟刷新一次正在播放状态
    const interval = setInterval(() => {
      // 更新当前正在播放的节目索引
      const newPlayingIndex = programs.findIndex((program) => {
        try {
          const start = parseCustomTimeFormat(program.start);
          const end = parseCustomTimeFormat(program.end);
          return currentTime >= start && currentTime < end;
        } catch {
          return false;
        }
      });

      if (newPlayingIndex !== currentPlayingIndex) {
        setCurrentPlayingIndex(newPlayingIndex);
        // 如果正在播放的节目发生变化，自动滚动到新位置
        scrollToCurrentProgram();
      }
    }, 60000); // 60秒 = 1分钟

    return () => clearInterval(interval);
  }, [programs, currentTime, currentPlayingIndex]);

  // 格式化时间显示
  const formatTime = (timeString: string) => {
    return formatTimeToHHMM(timeString);
  };

  // 判断节目是否正在播放
  const isCurrentlyPlaying = (program: EpgProgram) => {
    try {
      const start = parseCustomTimeFormat(program.start);
      const end = parseCustomTimeFormat(program.end);
      return currentTime >= start && currentTime < end;
    } catch {
      return false;
    }
  };

  // 加载中状态
  if (isLoading) {
    return (
      <div className='pt-4'>
        <div className='mb-3 flex items-center justify-between'>
          <h4 className='text-foreground flex items-center gap-2 text-xs font-medium sm:text-sm'>
            <Clock className='h-3 w-3 sm:h-4 sm:w-4' />
            今日节目单
          </h4>
          <div className='w-16 sm:w-20'></div>
        </div>
        <div className='flex min-h-[100px] items-center justify-center sm:min-h-[120px]'>
          <div className='text-muted-foreground flex items-center gap-3 sm:gap-4'>
            <div className='border-border border-t-primary h-5 w-5 animate-spin rounded-full border-2 sm:h-6 sm:w-6'></div>
            <span className='text-sm sm:text-base'>加载节目单...</span>
          </div>
        </div>
      </div>
    );
  }

  // 无节目单状态
  if (!programs || programs.length === 0) {
    return (
      <div className='pt-4'>
        <div className='mb-3 flex items-center justify-between'>
          <h4 className='text-foreground flex items-center gap-2 text-xs font-medium sm:text-sm'>
            <Clock className='h-3 w-3 sm:h-4 sm:w-4' />
            今日节目单
          </h4>
          <div className='w-16 sm:w-20'></div>
        </div>
        <div className='flex min-h-[100px] items-center justify-center sm:min-h-[120px]'>
          <div className='text-muted-foreground flex items-center gap-2 sm:gap-3'>
            <Tv className='h-4 w-4 sm:h-5 sm:w-5' />
            <span className='text-sm sm:text-base'>暂无节目单数据</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className='mt-2 pt-4'>
      <div className='mb-3 flex items-center justify-between'>
        <h4 className='text-foreground flex items-center gap-2 text-xs font-medium sm:text-sm'>
          <Clock className='h-3 w-3 sm:h-4 sm:w-4' />
          今日节目单
        </h4>
        {currentPlayingIndex !== -1 && (
          <button
            onClick={scrollToCurrentProgram}
            className='text-muted-foreground hover:text-primary bg-muted/50 bg-card hover:bg-primary/10 border-border hover:border-primary/50 flex items-center gap-1 rounded-lg border px-2 py-1.5 text-xs font-medium transition-all duration-200 sm:gap-1.5 sm:px-2.5 sm:py-2'
            title='滚动到当前播放位置'
          >
            <Target className='h-2.5 w-2.5 sm:h-3 sm:w-3' />
            <span className='hidden sm:inline'>当前播放</span>
            <span className='sm:hidden'>当前</span>
          </button>
        )}
      </div>

      <div
        className='relative'
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div
          ref={containerRef}
          className='scrollbar-hide flex min-h-[100px] overflow-x-auto px-2 py-2 pb-4 sm:min-h-[120px] sm:px-4'
        >
          {programs.map((program, index) => {
            // 使用 currentPlayingIndex 来判断播放状态，确保样式能正确更新
            const isPlaying = index === currentPlayingIndex;
            const isFinishedProgram = index < currentPlayingIndex;
            const isUpcomingProgram = index > currentPlayingIndex;

            return (
              <div
                key={index}
                className={`flex min-h-[100px] w-36 flex-shrink-0 flex-col rounded-lg border p-2 transition-all duration-200 sm:min-h-[120px] sm:w-48 sm:p-3 ${
                  isPlaying
                    ? 'bg-primary/10 border-primary/30'
                    : isFinishedProgram
                      ? 'bg-muted/50 bg-card border-border border-border'
                      : isUpcomingProgram
                        ? 'bg-muted border-border'
                        : 'bg-card border-border hover:border-border hover:border-border'
                }`}
              >
                {/* 时间显示在顶部 */}
                <div className='mb-2 flex flex-shrink-0 items-center justify-between sm:mb-3'>
                  <span
                    className={`text-xs font-medium ${
                      isPlaying
                        ? 'text-primary'
                        : isFinishedProgram
                          ? 'text-muted-foreground'
                          : isUpcomingProgram
                            ? 'text-muted-foreground'
                            : 'text-muted-foreground text-foreground'
                    }`}
                  >
                    {formatTime(program.start)}
                  </span>
                  <span className='text-muted-foreground text-xs'>
                    {formatTime(program.end)}
                  </span>
                </div>

                {/* 标题在中间，占据剩余空间 */}
                <div
                  className={`flex-1 text-xs font-medium sm:text-sm ${
                    isPlaying
                      ? 'text-primary'
                      : isFinishedProgram
                        ? 'text-muted-foreground'
                        : isUpcomingProgram
                          ? 'text-foreground'
                          : 'text-foreground'
                  }`}
                  style={{
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    lineHeight: '1.4',
                    maxHeight: '2.8em',
                  }}
                  title={program.title}
                >
                  {program.title}
                </div>

                {/* 正在播放状态在底部 */}
                {isPlaying && (
                  <div className='mt-auto flex flex-shrink-0 items-center gap-1 pt-1 sm:gap-1.5 sm:pt-2'>
                    <div className='bg-primary h-1.5 w-1.5 animate-pulse rounded-full sm:h-2 sm:w-2'></div>
                    <span className='text-primary text-xs font-medium'>
                      正在播放
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
