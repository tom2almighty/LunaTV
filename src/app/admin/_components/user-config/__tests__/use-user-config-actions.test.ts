import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useUserConfigActions } from '@/app/admin/_components/user-config/use-user-config-actions';

describe('useUserConfigActions', () => {
  it('calls /api/admin/user with correct payload for add user', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({}),
    });
    vi.stubGlobal('fetch', fetchMock);

    const refreshConfig = vi.fn().mockResolvedValue(undefined);
    const showAlert = vi.fn();

    const { result } = renderHook(() =>
      useUserConfigActions(refreshConfig, showAlert),
    );

    await result.current.addUser({
      username: 'alice',
      password: 'pw123',
      userGroup: 'default',
    });

    expect(fetchMock).toHaveBeenCalledWith('/api/admin/user', expect.anything());
  });
});
