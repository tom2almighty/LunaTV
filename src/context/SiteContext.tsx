'use client';

import { createContext, ReactNode, useContext } from 'react';

import type { RuntimeConfig } from '@/lib/runtime-config';

const SiteContext = createContext<{
  siteName: string;
  announcement?: string;
  runtimeConfig?: RuntimeConfig;
}>({
  siteName: 'MoonTV',
  announcement:
    '本网站仅提供影视信息搜索服务，所有内容均来自第三方网站。本站不存储任何视频资源，不对任何内容的准确性、合法性、完整性负责。',
});

export const useSite = () => useContext(SiteContext);

export function SiteProvider({
  children,
  siteName,
  announcement,
  runtimeConfig,
}: {
  children: ReactNode;
  siteName: string;
  announcement?: string;
  runtimeConfig?: RuntimeConfig;
}) {
  return (
    <SiteContext.Provider value={{ siteName, announcement, runtimeConfig }}>
      {children}
    </SiteContext.Provider>
  );
}
