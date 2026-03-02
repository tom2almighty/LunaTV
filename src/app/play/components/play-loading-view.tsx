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
    <div className='bg-background flex min-h-screen items-center justify-center px-4'>
      <div className='mx-auto w-full max-w-md rounded-2xl border border-border/60 bg-card/60 px-6 py-8 text-center shadow-sm backdrop-blur-sm'>
        <div className='bg-primary relative mx-auto mb-8 flex h-24 w-24 items-center justify-center rounded-2xl text-4xl text-white shadow-xl'>
          {stageIcon}
        </div>
        <p className='text-foreground mb-2 text-xl font-semibold'>
          {loadingMessage}
        </p>
        <p className='text-muted-foreground text-sm'>请稍候片刻</p>
      </div>
    </div>
  );
}
