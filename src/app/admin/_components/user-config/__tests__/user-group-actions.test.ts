import { afterEach, describe, expect, it, vi } from 'vitest';

import { submitUserGroupUpdate } from '@/app/admin/_components/user-config/user-group-actions';

describe('user-group-actions', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('maps add/edit actions to the right endpoint, method and payload', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue({ ok: true, json: async () => ({}) });
    vi.stubGlobal('fetch', fetchMock);

    await submitUserGroupUpdate({
      action: 'add',
      groupName: 'ops',
      enabledApis: ['/api/search'],
    });
    await submitUserGroupUpdate({
      action: 'edit',
      groupName: 'ops core',
      enabledApis: ['/api/search', '/api/admin/users'],
    });

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      '/api/admin/user-groups',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          name: 'ops',
          enabledApis: ['/api/search'],
        }),
      }),
    );

    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      '/api/admin/user-groups/ops%20core',
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({
          enabledApis: ['/api/search', '/api/admin/users'],
        }),
      }),
    );
  });

  it('throws backend error message when response is not ok', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({ error: 'group conflict' }),
    });
    vi.stubGlobal('fetch', fetchMock);

    await expect(
      submitUserGroupUpdate({
        action: 'add',
        groupName: 'ops',
      }),
    ).rejects.toThrow('group conflict');
  });
});
