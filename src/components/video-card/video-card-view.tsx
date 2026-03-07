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
      className='border-white/8 group relative w-full cursor-pointer overflow-hidden rounded-[1.35rem] border bg-white/[0.025] shadow-[0_20px_60px_rgba(0,0,0,0.28)] transition-transform duration-300 ease-out motion-reduce:transition-none [@media(hover:hover)]:hover:z-50 [@media(hover:hover)]:hover:-translate-y-1 [@media(hover:hover)]:hover:scale-[1.015]'
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
