import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('admin user routes', () => {
  it('uses RESTful admin user and group endpoints in UI actions', () => {
    const actionsContent = readFileSync(
      'src/app/admin/_components/user-config/use-user-config-actions.ts',
      'utf8',
    );
    const userConfigContent = readFileSync(
      'src/app/admin/_components/UserConfig.tsx',
      'utf8',
    );
    const userGroupActionsContent = readFileSync(
      'src/app/admin/_components/user-config/user-group-actions.ts',
      'utf8',
    );
    const merged = `${actionsContent}\n${userConfigContent}\n${userGroupActionsContent}`;

    expect(/\/api\/admin\/user['"`]/.test(merged)).toBe(false);
    expect(merged.includes('/api/admin/users')).toBe(true);
    expect(merged.includes('/api/admin/user-groups')).toBe(true);
  });
});
