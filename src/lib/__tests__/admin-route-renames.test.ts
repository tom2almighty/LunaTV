import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('admin route renames', () => {
  it('uses kebab-case admin endpoints in admin callers', () => {
    const videoSourceContent = readFileSync(
      'src/app/admin/_components/VideoSourceConfig.tsx',
      'utf8',
    );
    const configFileComponent = readFileSync(
      'src/app/admin/_components/ConfigFileComponent.tsx',
      'utf8',
    );
    const siteConfigComponent = readFileSync(
      'src/app/admin/_components/SiteConfigComponent.tsx',
      'utf8',
    );
    const dataMigration = readFileSync(
      'src/components/DataMigration.tsx',
      'utf8',
    );
    const adminPageClient = readFileSync(
      'src/app/admin/AdminPageClient.tsx',
      'utf8',
    );

    expect(configFileComponent).toContain('/api/admin/config-files');
    expect(configFileComponent).toContain(
      '/api/admin/config-subscriptions/fetch',
    );
    expect(siteConfigComponent).toContain('/api/admin/site-settings');
    expect(dataMigration).toContain('/api/admin/data-migrations/export');
    expect(dataMigration).toContain('/api/admin/data-migrations/import');
    expect(adminPageClient).toContain('/api/admin/system/reset');
    expect(videoSourceContent).toContain('/api/admin/sources');
    expect(videoSourceContent).not.toMatch(/\/api\/admin\/source(?!s)/);
  });
});
