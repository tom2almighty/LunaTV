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

    expect(configFileComponent).toContain('/api/admin/settings/config-file');
    expect(configFileComponent).toContain(
      '/api/admin/settings/config-subscription/fetch',
    );
    expect(siteConfigComponent).toContain('/api/admin/settings/site');
    expect(dataMigration).toContain('/api/admin/data-migrations/export');
    expect(dataMigration).toContain('/api/admin/data-migrations/import');
    expect(adminPageClient).toContain('/api/admin/settings/overview');
    expect(adminPageClient).toContain('/api/admin/system/reset');
    expect(adminPageClient.includes('/api/admin/config')).toBe(false);
    expect(videoSourceContent).toContain('/api/admin/sources');
    expect(videoSourceContent).not.toMatch(/\/api\/admin\/source(?!s)/);
  });

  it('removes legacy admin/search/key contracts from active callsites', () => {
    const allCallsites = [
      readFileSync('src/app/admin/AdminPageClient.tsx', 'utf8'),
      readFileSync('src/app/admin/_components/ConfigFileComponent.tsx', 'utf8'),
      readFileSync('src/app/admin/_components/SiteConfigComponent.tsx', 'utf8'),
      readFileSync('src/app/admin/_components/VideoSourceConfig.tsx', 'utf8'),
      readFileSync('src/hooks/useSearchExecution.ts', 'utf8'),
      readFileSync('src/hooks/usePlaySessionBootstrap.ts', 'utf8'),
      readFileSync('src/components/VideoCard.tsx', 'utf8'),
      readFileSync('src/lib/db/favorites.ts', 'utf8'),
      readFileSync('src/lib/db/play-records.ts', 'utf8'),
      readFileSync('src/lib/db/skip-configs.ts', 'utf8'),
      readFileSync('README.md', 'utf8'),
    ].join('\n');

    expect(allCallsites).not.toMatch(/\/api\/admin\/source\b/);
    expect(allCallsites).not.toMatch(/\/api\/search\/ws\b/);
    expect(allCallsites).not.toMatch(/\?key=/);
  });
});
