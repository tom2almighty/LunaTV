import { createContext, useContext, useEffect, useState } from 'react';

interface SiteContextValue {
  siteName: string;
}

const DEFAULT_SITE_NAME = 'vodhub';
const SiteContext = createContext<SiteContextValue>({
  siteName: DEFAULT_SITE_NAME,
});

export function useSite() {
  return useContext(SiteContext);
}

export function SiteProvider({ children }: { children: React.ReactNode }) {
  const [siteName, setSiteName] = useState(DEFAULT_SITE_NAME);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/site-config')
      .then((resp) => (resp.ok ? resp.json() : null))
      .then((data: { siteName?: string } | null) => {
        if (!cancelled && data?.siteName) setSiteName(data.siteName);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  // Keep the document title in sync with the configured site name.
  useEffect(() => {
    if (typeof document !== 'undefined' && siteName) {
      document.title = siteName;
    }
  }, [siteName]);

  return (
    <SiteContext.Provider value={{ siteName }}>
      {children}
    </SiteContext.Provider>
  );
}
