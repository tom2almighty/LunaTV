/* eslint-disable no-console,@typescript-eslint/no-explicit-any, @typescript-eslint/no-non-null-assertion */

'use client';

import { KeyRound, LogOut, Shield, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { requestJson } from '@/lib/api/client';

import { UserMenuContainer } from '@/components/user-menu/user-menu-container';

interface AuthInfo {
  username?: string;
  role?: 'owner' | 'admin' | 'user';
}

const menuSurfaceClass =
  'app-panel fixed right-4 top-14 z-50 w-56 select-none overflow-hidden rounded-[1.5rem]';
const passwordPanelClass =
  'app-panel z-[1001] fixed left-1/2 top-1/2 w-full max-w-md -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-[1.75rem]';
const iconButtonClass =
  'app-control text-muted-foreground flex h-9 w-9 items-center justify-center rounded-full p-1 transition-colors hover:text-[var(--accent)]';
const inputClass =
  'app-control text-foreground placeholder:text-muted-foreground w-full rounded-2xl border px-3 py-2.5 text-sm outline-none transition-colors focus:border-[var(--accent)] focus:ring-0';

export const UserMenu: React.FC = () => {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const [authInfo, setAuthInfo] = useState<AuthInfo | null>(null);
  const [mounted, setMounted] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  useEffect(() => {
    if (!isChangePasswordOpen) {
      return;
    }

    const body = document.body;
    const html = document.documentElement;
    const originalBodyOverflow = body.style.overflow;
    const originalHtmlOverflow = html.style.overflow;

    body.style.overflow = 'hidden';
    html.style.overflow = 'hidden';

    return () => {
      body.style.overflow = originalBodyOverflow;
      html.style.overflow = originalHtmlOverflow;
    };
  }, [isChangePasswordOpen]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    let cancelled = false;

    requestJson<AuthInfo>('/api/auth/sessions/me')
      .then((session) => {
        if (!cancelled) {
          setAuthInfo(session);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setAuthInfo(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const handleMenuClick = () => {
    setIsOpen(!isOpen);
  };

  const handleCloseMenu = () => {
    setIsOpen(false);
  };

  const handleLogout = async () => {
    try {
      await requestJson('/api/auth/sessions/current', {
        method: 'DELETE',
      });
    } catch (error) {
      console.error('注销请求失败:', error);
    }
    window.location.href = '/';
  };

  const handleAdminPanel = () => {
    router.push('/admin');
  };

  const handleChangePassword = () => {
    setIsOpen(false);
    setIsChangePasswordOpen(true);
    setNewPassword('');
    setConfirmPassword('');
    setPasswordError('');
  };

  const handleCloseChangePassword = () => {
    setIsChangePasswordOpen(false);
    setNewPassword('');
    setConfirmPassword('');
    setPasswordError('');
  };

  const handleSubmitChangePassword = async () => {
    setPasswordError('');

    if (!newPassword) {
      setPasswordError('新密码不得为空');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('两次输入的密码不一致');
      return;
    }

    setPasswordLoading(true);

    try {
      await requestJson('/api/users/current/password', {
        method: 'PATCH',
        body: JSON.stringify({
          newPassword,
        }),
      });

      setIsChangePasswordOpen(false);
      await handleLogout();
    } catch (error) {
      setPasswordError(error instanceof Error ? error.message : '修改密码失败');
    } finally {
      setPasswordLoading(false);
    }
  };

  const showAdminPanel =
    authInfo?.role === 'owner' || authInfo?.role === 'admin';
  const showChangePassword = authInfo?.role !== 'owner';

  const getRoleText = (role: string) => {
    switch (role) {
      case 'owner':
        return '站长';
      case 'admin':
        return '管理员';
      default:
        return '用户';
    }
  };

  const menuPanel = (
    <>
      <div className='fixed inset-0 z-40' onClick={handleCloseMenu} />

      <div className={menuSurfaceClass}>
        <div className='border-white/8 border-b bg-white/5 px-3 py-2.5'>
          <div className='space-y-1'>
            <div className='flex items-center justify-between'>
              <span className='text-muted-foreground text-xs font-medium uppercase tracking-wider'>
                当前用户
              </span>
              <span
                className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-xs font-medium ${
                  (authInfo?.role || 'user') === 'owner'
                    ? 'border-warning/20 bg-warning/10 text-warning border'
                    : (authInfo?.role || 'user') === 'admin'
                      ? 'border-(--accent)/20 bg-(--accent)/10 text-(--accent) border'
                      : 'bg-white/6 text-foreground border border-white/10'
                }`}
              >
                {getRoleText(authInfo?.role || 'user')}
              </span>
            </div>
            <div className='flex items-center justify-between'>
              <div className='text-foreground truncate text-sm font-semibold'>
                {authInfo?.username || 'default'}
              </div>
              <div className='text-muted-foreground text-[10px]'>
                数据存储：SQLite
              </div>
            </div>
          </div>
        </div>

        <div className='py-1'>
          {showAdminPanel && (
            <button
              onClick={handleAdminPanel}
              className='text-foreground hover:bg-white/8 flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm transition-colors'
            >
              <Shield className='text-muted-foreground h-4 w-4' />
              <span className='font-medium'>管理面板</span>
            </button>
          )}

          {showChangePassword && (
            <button
              onClick={handleChangePassword}
              className='text-foreground hover:bg-white/8 flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm transition-colors'
            >
              <KeyRound className='text-muted-foreground h-4 w-4' />
              <span className='font-medium'>修改密码</span>
            </button>
          )}

          <div className='border-white/8 my-1 border-t'></div>

          <button
            onClick={handleLogout}
            className='text-destructive hover:bg-destructive/10 flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm transition-colors'
          >
            <LogOut className='h-4 w-4' />
            <span className='font-medium'>登出</span>
          </button>
        </div>
      </div>
    </>
  );

  const changePasswordPanel = (
    <>
      <div
        className='bg-(--overlay)/92 z-1000 fixed inset-0 backdrop-blur-md'
        onClick={handleCloseChangePassword}
        onTouchMove={(e) => {
          e.preventDefault();
        }}
        onWheel={(e) => {
          e.preventDefault();
        }}
        style={{
          touchAction: 'none',
        }}
      />

      <div className={passwordPanelClass}>
        <div
          className='h-full p-6'
          data-panel-content
          onTouchMove={(e) => {
            e.stopPropagation();
          }}
          style={{
            touchAction: 'auto',
          }}
        >
          <div className='mb-6 flex items-center justify-between'>
            <h3 className='text-foreground text-xl font-bold'>修改密码</h3>
            <button
              onClick={handleCloseChangePassword}
              className={iconButtonClass}
              aria-label='Close'
            >
              <X className='h-full w-full' />
            </button>
          </div>

          <div className='space-y-4'>
            <div>
              <label className='text-foreground mb-2 block text-sm font-medium'>
                新密码
              </label>
              <input
                type='password'
                className={inputClass}
                placeholder='请输入新密码'
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                disabled={passwordLoading}
              />
            </div>

            <div>
              <label className='text-foreground mb-2 block text-sm font-medium'>
                确认密码
              </label>
              <input
                type='password'
                className={inputClass}
                placeholder='请再次输入新密码'
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={passwordLoading}
              />
            </div>

            {passwordError && (
              <div className='border-destructive/20 bg-destructive/10 text-destructive rounded-[1.1rem] border p-3 text-sm'>
                {passwordError}
              </div>
            )}

            <div className='flex gap-3 pt-2'>
              <button
                onClick={handleCloseChangePassword}
                disabled={passwordLoading}
                className='app-control text-foreground hover:bg-white/8 flex-1 rounded-2xl border px-4 py-3 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50'
              >
                取消
              </button>
              <button
                onClick={handleSubmitChangePassword}
                disabled={passwordLoading}
                className='flex-1 rounded-2xl bg-[var(--accent)] px-4 py-3 text-sm font-medium text-black transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50'
              >
                {passwordLoading ? '修改中...' : '确认修改'}
              </button>
            </div>

            <div className='text-muted-foreground pt-2 text-center text-xs'>
              修改密码后需要重新登录
            </div>
          </div>
        </div>
      </div>
    </>
  );

  return (
    <UserMenuContainer
      isOpen={isOpen}
      mounted={mounted}
      isChangePasswordOpen={isChangePasswordOpen}
      onToggleMenu={handleMenuClick}
      menuPanel={menuPanel}
      changePasswordPanel={changePasswordPanel}
    />
  );
};
