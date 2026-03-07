/* eslint-disable @typescript-eslint/no-explicit-any */

'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';

import { useSite } from '@/context/SiteContext';

function LoginPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [username, setUsername] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [enableRegistration, setEnableRegistration] = useState(false);

  const { siteName } = useSite();

  // 在客户端挂载后获取注册开关状态
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // 获取注册开关状态
      fetch('/api/public/site')
        .then((res) => res.json())
        .then((data) => {
          setEnableRegistration(data.EnableRegistration === true);
        })
        .catch(() => {
          setEnableRegistration(false);
        });
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    // 注册模式验证
    if (isRegisterMode) {
      if (!username || !password || !confirmPassword) {
        setError('请填写所有字段');
        return;
      }
      if (password !== confirmPassword) {
        setError('两次输入的密码不一致');
        return;
      }
      if (password.length < 6) {
        setError('密码长度至少为 6 个字符');
        return;
      }
    } else {
      // 登录模式验证：需要用户名和密码
      if (!password || !username) return;
    }

    try {
      setLoading(true);
      const endpoint = isRegisterMode ? '/api/users' : '/api/auth/sessions';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          password,
          username,
        }),
      });

      if (res.ok) {
        const redirect = searchParams.get('redirect') || '/';
        router.replace(redirect);
      } else if (res.status === 401) {
        setError(isRegisterMode ? '注册失败' : '密码错误');
      } else if (res.status === 403) {
        setError('注册功能已关闭');
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? '服务器错误');
      }
    } catch (error) {
      setError('网络错误，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className='relative flex min-h-screen items-center justify-center overflow-hidden px-4'>
      <div className='app-panel w-full max-w-md rounded-[1.9rem] p-8 transition-transform duration-300 hover:scale-[1.01]'>
        <div className='mb-6 flex justify-center'>
          <span className='text-(--accent) text-5xl font-bold tracking-tighter drop-shadow-md'>
            {siteName}
          </span>
        </div>
        <h1 className='text-foreground mb-8 text-center text-3xl font-extrabold tracking-tight drop-shadow-sm'>
          {isRegisterMode ? 'Sign Up' : 'Sign In'}
        </h1>
        <form onSubmit={handleSubmit} className='space-y-6'>
          {/* 用户名输入框 - 始终显示 */}
          <div>
            <label htmlFor='username' className='sr-only'>
              用户名
            </label>
            <input
              id='username'
              type='text'
              autoComplete='username'
              className='app-control text-foreground placeholder:text-muted-foreground focus:border-(--accent) block w-full rounded-2xl border px-4 py-3 text-sm outline-none transition-colors focus:ring-0 sm:text-base'
              placeholder='输入用户名'
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>

          <div>
            <label htmlFor='password' className='sr-only'>
              密码
            </label>
            <input
              id='password'
              type='password'
              autoComplete={
                isRegisterMode ? 'new-password' : 'current-password'
              }
              className='app-control text-foreground placeholder:text-muted-foreground focus:border-(--accent) block w-full rounded-2xl border px-4 py-3 text-sm outline-none transition-colors focus:ring-0 sm:text-base'
              placeholder={
                isRegisterMode ? '设置密码 (至少6位)' : '输入访问密码'
              }
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {isRegisterMode && (
            <div>
              <label htmlFor='confirmPassword' className='sr-only'>
                确认密码
              </label>
              <input
                id='confirmPassword'
                type='password'
                autoComplete='new-password'
                className='app-control text-foreground placeholder:text-muted-foreground focus:border-(--accent) block w-full rounded-2xl border px-4 py-3 text-sm outline-none transition-colors focus:ring-0 sm:text-base'
                placeholder='确认密码'
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
          )}

          {error && (
            <p className='border-destructive/20 bg-destructive/10 text-destructive rounded-[1.1rem] border px-3 py-2 text-sm'>
              {error}
            </p>
          )}

          {/* 提交按钮 */}
          <button
            type='submit'
            disabled={loading}
            className='hover:opacity-92 bg-(--accent) inline-flex w-full justify-center rounded-2xl py-3 text-base font-semibold text-black transition-opacity duration-200 disabled:cursor-not-allowed disabled:opacity-50'
          >
            {loading
              ? isRegisterMode
                ? '注册中...'
                : '登录中...'
              : isRegisterMode
                ? '注册'
                : '登录'}
          </button>

          {/* 切换登录/注册模式 */}
          {enableRegistration && (
            <div className='text-center'>
              <button
                type='button'
                onClick={() => {
                  setIsRegisterMode(!isRegisterMode);
                  setError(null);
                  setPassword('');
                  setConfirmPassword('');
                }}
                className='text-muted-foreground hover:text-(--accent) text-sm transition-colors'
              >
                {isRegisterMode ? '已有账号？去登录' : '没有账号？去注册'}
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <LoginPageClient />
    </Suspense>
  );
}
