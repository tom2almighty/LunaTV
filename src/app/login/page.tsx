/* eslint-disable @typescript-eslint/no-explicit-any */

'use client';

import { AlertCircle, CheckCircle } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';

import { CURRENT_VERSION } from '@/lib/version';
import { checkForUpdates, UpdateStatus } from '@/lib/version_check';

import { useSite } from '@/components/SiteProvider';

// 版本显示组件
function VersionDisplay() {
  const [updateStatus, setUpdateStatus] = useState<UpdateStatus | null>(null);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const checkUpdate = async () => {
      try {
        const status = await checkForUpdates();
        setUpdateStatus(status);
      } catch (_) {
        // do nothing
      } finally {
        setIsChecking(false);
      }
    };

    checkUpdate();
  }, []);

  return (
    <button
      onClick={() =>
        window.open('https://github.com/MoonTechLab/LunaTV', '_blank')
      }
      className='absolute bottom-4 left-1/2 transform -translate-x-1/2 flex items-center gap-2 text-xs text-muted-foreground transition-colors cursor-pointer'
    >
      <span className='font-mono'>v{CURRENT_VERSION}</span>
      {!isChecking && updateStatus !== UpdateStatus.FETCH_FAILED && (
        <div
          className={`flex items-center gap-1.5 ${updateStatus === UpdateStatus.HAS_UPDATE
            ? 'text-warning'
            : updateStatus === UpdateStatus.NO_UPDATE
              ? 'text-success'
              : ''
            }`}
        >
          {updateStatus === UpdateStatus.HAS_UPDATE && (
            <>
              <AlertCircle className='w-3.5 h-3.5' />
              <span className='font-semibold text-xs'>有新版本</span>
            </>
          )}
          {updateStatus === UpdateStatus.NO_UPDATE && (
            <>
              <CheckCircle className='w-3.5 h-3.5' />
              <span className='font-semibold text-xs'>已是最新</span>
            </>
          )}
        </div>
      )}
    </button>
  );
}

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
    <div className='relative min-h-screen flex items-center justify-center px-4 overflow-hidden'>
      <div className='bg-card/80 backdrop-blur-md p-8 rounded-2xl shadow-2xl w-full max-w-md border border-border transform hover:scale-[1.01] transition-all duration-300'>
        <div className='flex justify-center mb-6'>
          <span className='text-primary text-5xl font-bold tracking-tighter drop-shadow-md'>
            {siteName}
          </span>
        </div>
        <h1 className='text-foreground tracking-tight text-center text-3xl font-extrabold mb-8 drop-shadow-sm'>
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
                className='block w-full rounded-lg border-0 py-3 px-4 text-foreground shadow-sm ring-1 ring-border placeholder:text-muted-foreground focus:ring-2 focus:ring-primary focus:outline-none sm:text-base bg-input/60 backdrop-blur'
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
              autoComplete={isRegisterMode ? 'new-password' : 'current-password'}
              className='block w-full rounded-lg border-0 py-3 px-4 text-foreground shadow-sm ring-1 ring-border placeholder:text-muted-foreground focus:ring-2 focus:ring-primary focus:outline-none sm:text-base bg-input/60 backdrop-blur'
              placeholder={isRegisterMode ? '设置密码 (至少6位)' : '输入访问密码'}
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
                className='block w-full rounded-lg border-0 py-3 px-4 text-foreground shadow-sm ring-1 ring-border placeholder:text-muted-foreground focus:ring-2 focus:ring-primary focus:outline-none sm:text-base bg-input/60 backdrop-blur'
                placeholder='确认密码'
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
          )}

          {error && (
            <p className='text-sm text-destructive'>{error}</p>
          )}

          {/* 提交按钮 */}
          <button
            type='submit'
            disabled={loading}
            className='inline-flex w-full justify-center rounded-lg bg-primary py-3 text-base font-semibold text-primary-foreground shadow-lg transition-all duration-200 hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50'
          >
            {loading ? (isRegisterMode ? '注册中...' : '登录中...') : (isRegisterMode ? '注册' : '登录')}
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
                className='text-sm text-muted-foreground hover:text-primary transition-colors'
              >
                {isRegisterMode ? '已有账号？去登录' : '没有账号？去注册'}
              </button>
            </div>
          )}
        </form>
      </div>

      {/* 版本信息显示 */}
      <VersionDisplay />
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
