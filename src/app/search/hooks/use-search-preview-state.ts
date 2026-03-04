import { useCallback, useState } from 'react';

type SearchPreviewPayload = {
  key: string;
  title: string;
  sourceCount?: number;
  onPlayNow?: () => void;
};

export function useSearchPreviewState() {
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [activePreview, setActivePreview] =
    useState<SearchPreviewPayload | null>(null);

  const openPreview = useCallback((preview: SearchPreviewPayload) => {
    setActivePreview(preview);
    setIsPreviewOpen(true);
  }, []);

  const closePreview = useCallback(() => {
    setIsPreviewOpen(false);
  }, []);

  return {
    isPreviewOpen,
    activePreview,
    openPreview,
    closePreview,
  };
}
