import { Suspense } from 'react';

import PageLayout from '@/components/PageLayout';

import DoubanPageClient from './DoubanPageClient';

type DoubanPageProps = {
  searchParams?: Promise<{
    type?: string | string[];
  }>;
};

export default async function DoubanPage({ searchParams }: DoubanPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const typeParam =
    typeof resolvedSearchParams?.type === 'string'
      ? resolvedSearchParams.type
      : Array.isArray(resolvedSearchParams?.type)
        ? resolvedSearchParams?.type[0]
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
