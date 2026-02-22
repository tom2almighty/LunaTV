/* eslint-disable @typescript-eslint/no-explicit-any, no-console, react-hooks/exhaustive-deps */
'use client';

import { Database, FileText, FolderOpen, Settings, Users, Video } from 'lucide-react';
import dynamic from 'next/dynamic';
import { Suspense, useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

import { AdminConfig, AdminConfigResult } from '@/lib/admin.types';
import DataMigration from '@/components/DataMigration';
import PageLayout from '@/components/PageLayout';

import { AlertModal, showError, showSuccess, useAlertModal } from './_components/AlertModal';
import { buttonStyles } from './_components/buttonStyles';
import { CollapsibleTab } from './_components/CollapsibleTab';
import { useLoadingState } from './_components/LoadingSystem';

const UserConfig = dynamic(() => import('./_components/UserConfig').then(m => ({ default: m.UserConfig })));
const VideoSourceConfig = dynamic(() => import('./_components/VideoSourceConfig').then(m => ({ default: m.VideoSourceConfig })));
const CategoryConfig = dynamic(() => import('./_components/CategoryConfig').then(m => ({ default: m.CategoryConfig })));
const ConfigFileComponent = dynamic(() => import('./_components/ConfigFileComponent').then(m => ({ default: m.ConfigFileComponent })));
const SiteConfigComponent = dynamic(() => import('./_components/SiteConfigComponent').then(m => ({ default: m.SiteConfigComponent })));

function AdminPageClient() {
  const { alertModal, showAlert, hideAlert } = useAlertModal();
  const { isLoading, withLoading } = useLoadingState();
  const [config, setConfig] = useState<AdminConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [role, setRole] = useState<'owner' | 'admin' | null>(null);
  const [showResetConfigModal, setShowResetConfigModal] = useState(false);
  const [expandedTabs, setExpandedTabs] = useState<{ [key: string]: boolean }>({
    userConfig: false,
    videoSource: false,
    siteConfig: false,
    categoryConfig: false,
    configFile: false,
    dataMigration: false,
  });

  const fetchConfig = useCallback(async (showLoading = false) => {
    try {
      if (showLoading) setLoading(true);
      const response = await fetch('/api/admin/config');
      if (!response.ok) {
        const data = (await response.json()) as any;
        throw new Error('获取配置失败: ' + data.error);
      }
      const data = (await response.json()) as AdminConfigResult;
      setConfig(data.Config);
      setRole(data.Role);
    } catch (err) {
      const msg = err instanceof Error ? err.message : '获取配置失败';
      showError(msg, showAlert);
      setError(msg);
    } finally {
      if (showLoading) setLoading(false);
    }
  }, []);

  useEffect(() => { fetchConfig(true); }, [fetchConfig]);

  const toggleTab = (tabKey: string) => {
    setExpandedTabs((prev) => ({ ...prev, [tabKey]: !prev[tabKey] }));
  };

  const handleConfirmResetConfig = async () => {
    await withLoading('resetConfig', async () => {
      try {
        const response = await fetch('/api/admin/reset');
        if (!response.ok) throw new Error('重置失败: ' + response.status);
        showSuccess('重置成功，请刷新页面！', showAlert);
        await fetchConfig();
        setShowResetConfigModal(false);
      } catch (err) {
        showError(err instanceof Error ? err.message : '重置失败', showAlert);
        throw err;
      }
    });
  };

  if (loading) {
    return (
      <PageLayout activePath='/admin'>
        <div className='px-2 py-4 sm:px-10 sm:py-8'>
          <div className='mx-auto max-w-[95%]'>
            <h1 className='text-foreground mb-8 text-2xl font-bold'>管理员设置</h1>
            <div className='space-y-4'>
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className='bg-muted h-20 animate-pulse rounded-lg' />
              ))}
            </div>
          </div>
        </div>
      </PageLayout>
    );
  }

  if (error) return null;

  return (
    <PageLayout activePath='/admin'>
      <div className='px-2 py-4 sm:px-10 sm:py-8'>
        <div className='mx-auto max-w-[95%]'>
          <div className='mb-8 flex items-center gap-2'>
            <h1 className='text-foreground text-2xl font-bold'>管理员设置</h1>
            {config && role === 'owner' && (
              <button
                onClick={() => setShowResetConfigModal(true)}
                className={'rounded-md px-3 py-1 text-xs transition-colors ' + buttonStyles.dangerSmall}
              >
                重置配置
              </button>
            )}
          </div>

          {role === 'owner' && (
            <CollapsibleTab title='配置文件' icon={<FileText size={20} className='text-muted-foreground' />} isExpanded={expandedTabs.configFile} onToggle={() => toggleTab('configFile')}>
              <ConfigFileComponent config={config} refreshConfig={fetchConfig} />
            </CollapsibleTab>
          )}

          <CollapsibleTab title='站点配置' icon={<Settings size={20} className='text-muted-foreground' />} isExpanded={expandedTabs.siteConfig} onToggle={() => toggleTab('siteConfig')}>
            <SiteConfigComponent config={config} refreshConfig={fetchConfig} />
          </CollapsibleTab>

          <div className='space-y-4'>
            <CollapsibleTab title='用户配置' icon={<Users size={20} className='text-muted-foreground' />} isExpanded={expandedTabs.userConfig} onToggle={() => toggleTab('userConfig')}>
              <UserConfig config={config} role={role} refreshConfig={fetchConfig} />
            </CollapsibleTab>

            <CollapsibleTab title='视频源配置' icon={<Video size={20} className='text-muted-foreground' />} isExpanded={expandedTabs.videoSource} onToggle={() => toggleTab('videoSource')}>
              <VideoSourceConfig config={config} refreshConfig={fetchConfig} />
            </CollapsibleTab>

            <CollapsibleTab title='分类配置' icon={<FolderOpen size={20} className='text-muted-foreground' />} isExpanded={expandedTabs.categoryConfig} onToggle={() => toggleTab('categoryConfig')}>
              <CategoryConfig config={config} refreshConfig={fetchConfig} />
            </CollapsibleTab>

            {role === 'owner' && (
              <CollapsibleTab title='数据迁移' icon={<Database size={20} className='text-muted-foreground' />} isExpanded={expandedTabs.dataMigration} onToggle={() => toggleTab('dataMigration')}>
                <DataMigration onRefreshConfig={fetchConfig} />
              </CollapsibleTab>
            )}
          </div>
        </div>
      </div>

      <AlertModal isOpen={alertModal.isOpen} onClose={hideAlert} type={alertModal.type} title={alertModal.title} message={alertModal.message} timer={alertModal.timer} showConfirm={alertModal.showConfirm} />

      {showResetConfigModal && createPortal(
        <div className='bg-background/50 fixed inset-0 z-50 flex items-center justify-center p-4' onClick={() => setShowResetConfigModal(false)}>
          <div className='bg-card w-full max-w-2xl rounded-lg shadow-xl' onClick={(e) => e.stopPropagation()}>
            <div className='p-6'>
              <div className='mb-6 flex items-center justify-between'>
                <h3 className='text-foreground text-xl font-semibold'>确认重置配置</h3>
                <button onClick={() => setShowResetConfigModal(false)} className='text-muted-foreground hover:text-foreground transition-colors'>
                  <svg className='h-6 w-6' fill='none' stroke='currentColor' viewBox='0 0 24 24'><path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M6 18L18 6M6 6l12 12' /></svg>
                </button>
              </div>
              <div className='mb-6'>
                <div className='bg-warning/10 border-warning/20 mb-4 rounded-lg border p-4'>
                  <p className='text-warning text-sm'>此操作将重置用户封禁和管理员设置、自定义视频源，站点配置将重置为默认值，是否继续？</p>
                </div>
              </div>
              <div className='flex justify-end space-x-3'>
                <button onClick={() => setShowResetConfigModal(false)} className={'px-6 py-2.5 text-sm font-medium ' + buttonStyles.secondary}>取消</button>
                <button onClick={handleConfirmResetConfig} disabled={isLoading('resetConfig')} className={'px-6 py-2.5 text-sm font-medium ' + (isLoading('resetConfig') ? buttonStyles.disabled : buttonStyles.danger)}>
                  {isLoading('resetConfig') ? '重置中...' : '确认重置'}
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </PageLayout>
  );
}

export default function AdminPage() {
  return (
    <Suspense>
      <AdminPageClient />
    </Suspense>
  );
}
