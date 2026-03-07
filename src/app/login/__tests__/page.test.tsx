import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import LoginPage from '@/app/login/page';

const replaceMock = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    replace: replaceMock,
  }),
  useSearchParams: () => new URLSearchParams(),
}));

describe('LoginPage API routes', () => {
  beforeEach(() => {
    replaceMock.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('fetches public site config and hides register entry when registration is disabled', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ EnableRegistration: false }),
    });
    vi.stubGlobal('fetch', fetchMock);

    render(<LoginPage />);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith('/api/public/site');
    });

    expect(screen.getByRole('heading', { name: 'Sign In' })).toBeVisible();
    expect(screen.getByPlaceholderText('输入用户名')).toBeVisible();
    expect(screen.getByRole('button', { name: '登录' })).toBeEnabled();
    expect(
      screen.queryByRole('button', { name: '没有账号？去注册' }),
    ).not.toBeInTheDocument();
  });

  it('switches to register mode when registration is enabled', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ EnableRegistration: true }),
    });
    vi.stubGlobal('fetch', fetchMock);

    render(<LoginPage />);

    const switchButton = await screen.findByRole('button', {
      name: '没有账号？去注册',
    });
    fireEvent.click(switchButton);

    expect(screen.getByRole('heading', { name: 'Sign Up' })).toBeVisible();
    expect(screen.getByPlaceholderText('确认密码')).toBeVisible();
  });

  it('submits login with RESTful auth session endpoint', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ EnableRegistration: false }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ok: true }),
      });
    vi.stubGlobal('fetch', fetchMock);

    const { container } = render(<LoginPage />);
    const usernameInput = container.querySelector('#username');
    const passwordInput = container.querySelector('#password');
    const form = container.querySelector('form');

    expect(usernameInput).toBeTruthy();
    expect(passwordInput).toBeTruthy();
    expect(form).toBeTruthy();

    fireEvent.change(usernameInput!, { target: { value: 'alice' } });
    fireEvent.change(passwordInput!, { target: { value: 'secret123' } });
    fireEvent.submit(form!);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/auth/sessions',
        expect.objectContaining({
          method: 'POST',
        }),
      );
    });
  });
});
