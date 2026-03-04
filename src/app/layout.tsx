/* eslint-disable @typescript-eslint/no-explicit-any */

import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';

import '../styles/globals.css';

import { getConfig } from '@/lib/config';
import {
  buildRuntimeConfig,
  serializeRuntimeConfig,
} from '@/lib/runtime-config';

import { SiteProvider } from '@/context/SiteContext';
import { ThemeProvider } from '@/context/ThemeContext';

import { GlobalErrorIndicator } from '../components/GlobalErrorIndicator';
import SerwistProviderClient from '../components/SerwistProviderClient';

const inter = Inter({ subsets: ['latin'] });

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
  const runtimeConfig = buildRuntimeConfig(config.SiteConfig);
  const runtimeConfigScript = serializeRuntimeConfig(runtimeConfig);

  return (
    <html lang='zh-CN' suppressHydrationWarning>
      <head>
        <meta
          name='viewport'
          content='width=device-width, initial-scale=1.0, viewport-fit=cover'
        />
        <link rel='apple-touch-icon' href='/icons/icon-192x192.png' />
        {/* eslint-disable-next-line @next/next/no-sync-scripts */}
        <script
          dangerouslySetInnerHTML={{
            __html: runtimeConfigScript,
          }}
        />
      </head>
      <body
        className={`${inter.className} bg-background text-foreground min-h-screen`}
      >
        <SerwistProviderClient>
          <ThemeProvider>
            <SiteProvider siteName={siteName} announcement={announcement}>
              {children}
              <GlobalErrorIndicator />
            </SiteProvider>
          </ThemeProvider>
        </SerwistProviderClient>
      </body>
    </html>
  );
}
