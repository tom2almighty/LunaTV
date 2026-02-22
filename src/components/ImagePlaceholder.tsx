// 图片占位符组件 - 骨架屏效果，使用全局 CSS 变量 --skeleton / --skeleton-highlight
const ImagePlaceholder = ({ aspectRatio }: { aspectRatio: string }) => (
  <div
    className={`w-full ${aspectRatio} animate-shimmer rounded-lg`}
    style={{
      background:
        'linear-gradient(90deg, var(--skeleton) 25%, var(--skeleton-highlight) 50%, var(--skeleton) 75%)',
      backgroundSize: '200% 100%',
    }}
  />
);

export { ImagePlaceholder };
