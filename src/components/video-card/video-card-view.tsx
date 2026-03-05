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
      className='group relative w-full cursor-pointer rounded-lg bg-transparent transition-transform duration-200 ease-out motion-reduce:transition-none [@media(hover:hover)]:hover:z-50 [@media(hover:hover)]:hover:scale-[1.03]'
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
