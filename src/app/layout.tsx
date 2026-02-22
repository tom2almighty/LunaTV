/* eslint-disable @typescript-eslint/no-explicit-any */

import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';

import '../styles/globals.css';

import { getConfig } from '@/lib/config';

import { SiteProvider } from '@/context/SiteContext';
import { ThemeProvider } from '@/context/ThemeContext';

import { GlobalErrorIndicator } from '../components/GlobalErrorIndicator';

const inter = Inter({ subsets: ['latin'] });
export const dynamic = 'force-dynamic';

// 动态生成 metadata，支持配置更新后的标题变化
export async function generateMetadata(): Promise<Metadata> {
  const config = await getConfig();
  const siteName = config.SiteConfig.SiteName;

  return {
    title: siteName,
    description: '影视聚合',
    manifest: '/manifest.json',
  };
}

export const viewport: Viewport = {
  viewportFit: 'cover',
  themeColor: '#000000',
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const config = await getConfig();

  const siteName = config.SiteConfig.SiteName;
  const announcement = config.SiteConfig.Announcement;
  const doubanProxyType = config.SiteConfig.DoubanProxyType;
  const doubanProxy = config.SiteConfig.DoubanProxy;
  const doubanImageProxyType = config.SiteConfig.DoubanImageProxyType;
  const doubanImageProxy = config.SiteConfig.DoubanImageProxy;
  const disableYellowFilter = config.SiteConfig.DisableYellowFilter;
  const fluidSearch = config.SiteConfig.FluidSearch;

  const customCategories = config.CustomCategories.filter(
    (category) => !category.disabled,
  ).map((category) => ({
    name: category.name || '',
    type: category.type,
    query: category.query,
  }));

  // 将运行时配置注入到全局 window 对象，供客户端在运行时读取
  const runtimeConfig = {
    DOUBAN_PROXY_TYPE: doubanProxyType,
    DOUBAN_PROXY: doubanProxy,
    DOUBAN_IMAGE_PROXY_TYPE: doubanImageProxyType,
    DOUBAN_IMAGE_PROXY: doubanImageProxy,
    DISABLE_YELLOW_FILTER: disableYellowFilter,
    CUSTOM_CATEGORIES: customCategories,
    FLUID_SEARCH: fluidSearch,
  };

  return (
    <html lang='zh-CN' suppressHydrationWarning>
      <head>
        <meta
          name='viewport'
          content='width=device-width, initial-scale=1.0, viewport-fit=cover'
        />
        <link rel='apple-touch-icon' href='/icons/icon-192x192.png' />
        {/* 将配置序列化后直接写入脚本，浏览器端可通过 window.RUNTIME_CONFIG 获取 */}
        {/* eslint-disable-next-line @next/next/no-sync-scripts */}
        <script
          dangerouslySetInnerHTML={{
            __html: `window.RUNTIME_CONFIG = ${JSON.stringify(runtimeConfig)};`,
          }}
        />
      </head>
      <body
        className={`${inter.className} bg-background text-foreground min-h-screen`}
      >
        <ThemeProvider>
          <SiteProvider siteName={siteName} announcement={announcement}>
            {children}
            <GlobalErrorIndicator />
          </SiteProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
