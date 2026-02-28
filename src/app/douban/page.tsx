import { Suspense } from 'react';

import PageLayout from '@/components/PageLayout';

import DoubanPageClient from './DoubanPageClient';

export default function DoubanPage() {
  return (
    <PageLayout>
      <Suspense>
        <DoubanPageClient />
      </Suspense>
    </PageLayout>
  );
}
