import { fireEvent, render, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import LoginPage from '@/app/login/page';

const replaceMock = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    replace: replaceMock,
  }),
  useSearchParams: () => new URLSearchParams(),
}));

describe('LoginPage API routes', () => {
  it('fetches public site config from RESTful endpoint', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ EnableRegistration: false }),
    });
    vi.stubGlobal('fetch', fetchMock);

    render(<LoginPage />);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith('/api/public/site');
    });
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
