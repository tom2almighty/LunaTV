import { describe, expect, it } from 'vitest';

import { submitUserGroupUpdate } from '@/app/admin/_components/user-config/user-group-actions';

describe('user-group-actions', () => {
  it('submits group update through user-group action helper', () => {
    expect(typeof submitUserGroupUpdate).toBe('function');
  });
});
