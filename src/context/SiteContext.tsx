import { createContext, useContext, useEffect } from 'react';

interface SiteContextValue {
  siteName: string;
}

const SiteContext = createContext<SiteContextValue>({
  siteName: 'vodhub',
});

export function useSite() {
  return useContext(SiteContext);
}

export function SiteProvider({ children }: { children: React.ReactNode }) {
  const siteName = import.meta.env.VITE_SITE_NAME || 'vodhub';

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
