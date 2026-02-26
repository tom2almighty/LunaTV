import { Suspense } from 'react';

import PageLayout from '@/components/PageLayout';

import PlayPageClient from './PlayPageClient';

export default function PlayPage() {
  return (
    <PageLayout activePath='/play'>
      <Suspense fallback={<div>Loading...</div>}>
        <PlayPageClient />
      </Suspense>
    </PageLayout>
  );
}
