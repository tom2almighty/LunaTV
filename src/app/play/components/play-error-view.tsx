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
    <div className='bg-background flex min-h-screen items-center justify-center px-4'>
      <div className='mx-auto w-full max-w-md rounded-2xl border border-border/70 bg-card/60 px-6 py-8 text-center shadow-sm backdrop-blur-sm'>
        <div className='mb-6 text-4xl'>😵</div>
        <h2 className='text-foreground mb-4 text-2xl font-bold'>
          哎呀，出现了一些问题
        </h2>
        <div className='border-destructive/30 bg-destructive/8 mb-4 rounded-lg border p-4'>
          <p className='text-destructive text-sm font-medium'>{error}</p>
        </div>
        <div className='space-y-3'>
          <button
            onClick={onBack}
            className='bg-primary hover:bg-primary/90 text-primary-foreground w-full rounded-xl px-6 py-3 font-medium'
          >
            {videoTitle ? '🔍 返回搜索' : '← 返回上页'}
          </button>
          <button
            onClick={onRetry}
            className='bg-card text-foreground hover:bg-muted w-full rounded-xl border border-border/70 px-6 py-3 font-medium'
          >
            🔄 重新尝试
          </button>
        </div>
      </div>
    </div>
  );
}
