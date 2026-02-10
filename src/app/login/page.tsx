/* eslint-disable @typescript-eslint/no-explicit-any */

'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';

import { useSite } from '@/components/SiteProvider';

function LoginPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [username, setUsername] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [shouldAskUsername, setShouldAskUsername] = useState(false);
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [enableRegistration, setEnableRegistration] = useState(false);

  const { siteName } = useSite();

  // 在客户端挂载后设置配置
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storageType = (window as any).RUNTIME_CONFIG?.STORAGE_TYPE;
      setShouldAskUsername(storageType && storageType !== 'localstorage');

      // 获取注册开关状态
      fetch('/api/server-config')
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
      // 登录模式验证
      if (!password || (shouldAskUsername && !username)) return;
    }

    try {
      setLoading(true);
      const endpoint = isRegisterMode ? '/api/register' : '/api/login';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          password,
          ...(shouldAskUsername || isRegisterMode ? { username } : {}),
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
      <div className='bg-card/80 border-border w-full max-w-md transform rounded-2xl border p-8 shadow-2xl backdrop-blur-md transition-all duration-300 hover:scale-[1.01]'>
        <div className='mb-6 flex justify-center'>
          <span className='text-primary text-5xl font-bold tracking-tighter drop-shadow-md'>
            {siteName}
          </span>
        </div>
        <h1 className='text-foreground mb-8 text-center text-3xl font-extrabold tracking-tight drop-shadow-sm'>
          {isRegisterMode ? 'Sign Up' : 'Sign In'}
        </h1>
        <form onSubmit={handleSubmit} className='space-y-6'>
          {(shouldAskUsername || isRegisterMode) && (
            <div>
              <label htmlFor='username' className='sr-only'>
                用户名
              </label>
              <input
                id='username'
                type='text'
                autoComplete='username'
                className='text-foreground ring-border placeholder:text-muted-foreground focus:ring-primary bg-input/60 block w-full rounded-lg border-0 px-4 py-3 shadow-sm ring-1 backdrop-blur focus:outline-none focus:ring-2 sm:text-base'
                placeholder='输入用户名'
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
          )}

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
              className='text-foreground ring-border placeholder:text-muted-foreground focus:ring-primary bg-input/60 block w-full rounded-lg border-0 px-4 py-3 shadow-sm ring-1 backdrop-blur focus:outline-none focus:ring-2 sm:text-base'
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
                className='text-foreground ring-border placeholder:text-muted-foreground focus:ring-primary bg-input/60 block w-full rounded-lg border-0 px-4 py-3 shadow-sm ring-1 backdrop-blur focus:outline-none focus:ring-2 sm:text-base'
                placeholder='确认密码'
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
          )}

          {error && <p className='text-destructive text-sm'>{error}</p>}

          {/* 提交按钮 */}
          <button
            type='submit'
            disabled={loading}
            className='bg-primary text-primary-foreground inline-flex w-full justify-center rounded-lg py-3 text-base font-semibold shadow-lg transition-all duration-200 hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50'
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
          {shouldAskUsername && enableRegistration && (
            <div className='text-center'>
              <button
                type='button'
                onClick={() => {
                  setIsRegisterMode(!isRegisterMode);
                  setError(null);
                  setPassword('');
                  setConfirmPassword('');
                }}
                className='text-muted-foreground hover:text-primary text-sm transition-colors'
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
