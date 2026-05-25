import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { siteOptions } from '@/lib/query/options';

export function useSite() {
  const { data } = useQuery(siteOptions());
  const siteName = data?.siteName ?? 'vodhub';

  useEffect(() => {
    if (typeof document !== 'undefined' && siteName) {
      document.title = siteName;
    }
  }, [siteName]);

  return { siteName };
}
