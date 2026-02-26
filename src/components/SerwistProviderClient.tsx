'use client';

import { SerwistProvider } from '@serwist/next/react';

export default function SerwistProviderClient({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SerwistProvider
      swUrl='/sw.js'
      disable={process.env.NODE_ENV === 'development'}
      cacheOnNavigation={false}
      reloadOnOnline={false}
      options={{ updateViaCache: 'none' }}
    >
      {children}
    </SerwistProvider>
  );
}
