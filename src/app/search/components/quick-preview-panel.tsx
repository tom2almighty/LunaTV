type QuickPreviewPanelProps = {
  mode: 'desktop' | 'mobile';
  open: boolean;
  title: string;
  sourceCount: number;
  onClose: () => void;
  onPlayNow: () => void;
};

export function QuickPreviewPanel({
  mode,
  open,
  title,
  sourceCount,
  onClose,
  onPlayNow,
}: QuickPreviewPanelProps) {
  if (!open) return null;

  const containerClass =
    mode === 'desktop'
      ? 'w-full rounded-xl border border-border/60 bg-card/90 p-4'
      : 'w-full rounded-t-2xl border border-border/60 bg-card/95 p-4';

  return (
    <section
      className={containerClass}
      aria-label='快速预览'
      data-testid={`quick-preview-${mode}`}
    >
      <div className='mb-4 flex items-start justify-between gap-3'>
        <div>
          <h3 className='text-foreground text-lg font-semibold'>{title}</h3>
          <p className='text-muted-foreground text-sm'>
            {sourceCount} 个播放源
          </p>
        </div>
        <button
          type='button'
          onClick={onClose}
          className='text-muted-foreground hover:text-foreground text-sm'
          aria-label='关闭预览'
        >
          关闭
        </button>
      </div>

      <div
        className={mode === 'desktop' ? 'grid grid-cols-3 gap-2' : 'space-y-2'}
      >
        <button
          type='button'
          onClick={onPlayNow}
          className='bg-primary text-primary-foreground rounded-lg px-3 py-2 text-sm font-medium'
        >
          立即播放
        </button>
        <button
          type='button'
          className='bg-muted text-foreground rounded-lg px-3 py-2 text-sm font-medium'
        >
          换源预览
        </button>
        <button
          type='button'
          className='bg-muted text-foreground rounded-lg px-3 py-2 text-sm font-medium'
        >
          收藏
        </button>
      </div>
    </section>
  );
}
