import { ImageIcon } from 'lucide-react';

export default function ImagePlaceholder() {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-[linear-gradient(135deg,var(--color-surface),var(--color-surface-2))]">
      <ImageIcon className="h-7 w-7 text-[--color-border-strong]" strokeWidth={1} />
    </div>
  );
}
