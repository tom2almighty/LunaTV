import { Suspense } from 'react';

import PageLayout from '@/components/PageLayout';

import DoubanPageClient from './DoubanPageClient';

type DoubanPageProps = {
  searchParams?: {
    type?: string | string[];
  };
};

export default function DoubanPage({ searchParams }: DoubanPageProps) {
  const typeParam =
    typeof searchParams?.type === 'string'
      ? searchParams.type
      : Array.isArray(searchParams?.type)
        ? searchParams?.type[0]
        : undefined;

  const activePath = typeParam
    ? `/douban?type=${encodeURIComponent(typeParam)}`
    : '/douban';

  return (
    <PageLayout activePath={activePath}>
      <Suspense>
        <DoubanPageClient />
      </Suspense>
    </PageLayout>
  );
}
