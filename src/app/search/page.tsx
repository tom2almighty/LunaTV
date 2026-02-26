import { Suspense } from 'react';

import PageLayout from '@/components/PageLayout';

import SearchPageClient from './SearchPageClient';

export default function SearchPage() {
  return (
    <PageLayout activePath='/search'>
      <Suspense>
        <SearchPageClient />
      </Suspense>
    </PageLayout>
  );
}
