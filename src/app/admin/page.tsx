import { Suspense } from 'react';

import PageLayout from '@/components/PageLayout';

import AdminPageClient from './AdminPageClient';

export default function AdminPage() {
  return (
    <PageLayout activePath='/admin'>
      <Suspense>
        <AdminPageClient />
      </Suspense>
    </PageLayout>
  );
}
