import { DragEvent, MouseEvent, ReactNode } from 'react';

type VideoCardViewProps = {
  dataTestId?: string;
  onClick: () => void;
  onContextMenu: (e: MouseEvent<HTMLDivElement>) => boolean;
  onDragStart: (e: DragEvent<HTMLDivElement>) => boolean;
  gestureProps: Record<string, unknown>;
  children: ReactNode;
};

export function VideoCardView({
  dataTestId,
  onClick,
  onContextMenu,
  onDragStart,
  gestureProps,
  children,
}: VideoCardViewProps) {
  return (
    <div
      data-testid={dataTestId}
      className='[@media(hover:hover)]:hover:border-white/14 group relative w-full cursor-pointer overflow-hidden rounded-[1.35rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.045),rgba(255,255,255,0.018))] px-2 pb-3 pt-2 shadow-[0_20px_60px_rgba(0,0,0,0.28),inset_0_1px_0_rgba(255,255,255,0.05)] transition-transform duration-300 ease-out motion-reduce:transition-none [@media(hover:hover)]:hover:z-50 [@media(hover:hover)]:hover:-translate-y-1 [@media(hover:hover)]:hover:scale-[1.015]'
      onClick={onClick}
      {...gestureProps}
      style={{
        WebkitUserSelect: 'none',
        userSelect: 'none',
        WebkitTouchCallout: 'none',
        WebkitTapHighlightColor: 'transparent',
        touchAction: 'manipulation',
        pointerEvents: 'auto',
      }}
      onContextMenu={onContextMenu}
      onDragStart={onDragStart}
    >
      {children}
    </div>
  );
}
