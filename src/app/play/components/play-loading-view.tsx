type PlayLoadingViewProps = {
  loadingStage: 'searching' | 'fetching' | 'ready';
  loadingMessage: string;
};

export function PlayLoadingView({
  loadingStage,
  loadingMessage,
}: PlayLoadingViewProps) {
  const stageIcon =
    loadingStage === 'searching'
      ? '🔍'
      : loadingStage === 'fetching'
        ? '🎬'
        : '✨';

  return (
    <div className='flex min-h-screen items-center justify-center px-4'>
      <div className='app-panel mx-auto w-full max-w-md rounded-[1.75rem] px-6 py-8 text-center'>
        <div className='bg-white/6 relative mx-auto mb-8 flex h-24 w-24 items-center justify-center rounded-3xl border border-white/10 text-4xl text-white shadow-[0_24px_60px_rgba(0,0,0,0.34)]'>
          <span className='bg-linear-to-br absolute inset-0 rounded-3xl from-white/10 to-transparent' />
          <span className='relative'>{stageIcon}</span>
        </div>
        <p className='text-foreground mb-2 text-xl font-semibold tracking-[0.04em]'>
          {loadingMessage}
        </p>
        <p className='text-muted-foreground text-sm'>请稍候片刻</p>
      </div>
    </div>
  );
}
