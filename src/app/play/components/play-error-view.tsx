type PlayErrorViewProps = {
  error: string;
  videoTitle: string;
  onBack: () => void;
  onRetry: () => void;
};

export function PlayErrorView({
  error,
  videoTitle,
  onBack,
  onRetry,
}: PlayErrorViewProps) {
  return (
    <div className='flex min-h-screen items-center justify-center px-4'>
      <div className='app-panel mx-auto w-full max-w-md rounded-[1.75rem] px-6 py-8 text-center'>
        <div className='mb-6 text-4xl'>😵</div>
        <h2 className='text-foreground mb-4 text-2xl font-semibold tracking-[0.04em]'>
          哎呀，出现了一些问题
        </h2>
        <div className='border-destructive/25 bg-destructive/10 mb-5 rounded-2xl border p-4'>
          <p className='text-destructive text-sm font-medium'>{error}</p>
        </div>
        <div className='space-y-3'>
          <button
            onClick={onBack}
            className='hover:opacity-92 bg-(--accent) w-full rounded-2xl px-6 py-3 font-medium text-black transition-opacity'
          >
            {videoTitle ? '🔍 返回搜索' : '← 返回上页'}
          </button>
          <button
            onClick={onRetry}
            className='bg-white/6 text-foreground w-full rounded-2xl border border-white/10 px-6 py-3 font-medium transition-colors hover:bg-white/10'
          >
            🔄 重新尝试
          </button>
        </div>
      </div>
    </div>
  );
}
