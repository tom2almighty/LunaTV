/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import {
  AlertCircle,
  AlertTriangle,
  CheckCircle,
  Download,
  FileCheck,
  Lock,
  Upload,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

interface DataMigrationProps {
  onRefreshConfig?: () => Promise<void>;
}

interface AlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'success' | 'error' | 'warning';
  title: string;
  message?: string;
  html?: string;
  confirmText?: string;
  onConfirm?: () => void;
  showConfirm?: boolean;
  timer?: number;
}

const overlayClass =
  'fixed inset-0 z-50 flex items-center justify-center bg-[color:var(--overlay)]/92 p-4 backdrop-blur-md';
const modalPanelClass =
  'app-panel w-full max-w-md rounded-[1.75rem] transition-all duration-200';
const secondaryActionClass =
  'app-control rounded-2xl px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-white/10';
const primaryActionClass =
  'rounded-2xl bg-[var(--accent)] px-4 py-2.5 text-sm font-medium text-black transition-opacity hover:opacity-92';
const migrationInputClass =
  'app-control w-full rounded-2xl border px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none transition-colors focus:border-[var(--accent)] focus:ring-0';
const exportCardClass = 'app-panel flex flex-col rounded-[1.5rem] p-6';
const iconTileClass =
  'flex h-10 w-10 items-center justify-center rounded-2xl border border-[var(--accent)]/20 bg-[var(--accent)]/10';

const AlertModal = ({
  isOpen,
  onClose,
  type,
  title,
  message,
  html,
  confirmText = '确定',
  onConfirm,
  showConfirm = false,
  timer,
}: AlertModalProps) => {
  const [isVisible, setIsVisible] = useState(false);

  // 控制动画状态
  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
      if (timer) {
        setTimeout(() => {
          onClose();
        }, timer);
      }
    } else {
      setIsVisible(false);
    }
  }, [isOpen, timer, onClose]);

  if (!isOpen) return null;

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle className='text-success h-12 w-12' />;
      case 'error':
        return <AlertCircle className='text-destructive h-12 w-12' />;
      case 'warning':
        return <AlertTriangle className='text-warning h-12 w-12' />;
      default:
        return null;
    }
  };

  const getBgColor = () => {
    switch (type) {
      case 'success':
        return 'bg-success/10 border-success/30';
      case 'error':
        return 'bg-destructive/10 border-destructive/30';
      case 'warning':
        return 'bg-warning/10 border-warning/30';
      default:
        return 'bg-info/10 border-info/30';
    }
  };

  return createPortal(
    <div
      className={`${overlayClass} transition-opacity duration-200 ${isVisible ? 'opacity-100' : 'opacity-0'}`}
      onClick={onClose}
    >
      <div
        className={`${modalPanelClass} ${getBgColor()} ${isVisible ? 'scale-100' : 'scale-95'}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className='p-6 text-center'>
          <div className='mb-4 flex justify-center'>{getIcon()}</div>

          <h3 className='text-foreground mb-2 text-lg font-semibold'>
            {title}
          </h3>

          {message && <p className='text-muted-foreground mb-4'>{message}</p>}

          {html && (
            <div
              className='text-muted-foreground mb-4 text-left'
              dangerouslySetInnerHTML={{ __html: html }}
            />
          )}

          <div className='flex justify-center gap-3'>
            {showConfirm && onConfirm ? (
              <>
                <button onClick={onClose} className={secondaryActionClass}>
                  取消
                </button>
                <button
                  onClick={() => {
                    onConfirm();
                    onClose();
                  }}
                  className={primaryActionClass}
                >
                  {confirmText}
                </button>
              </>
            ) : (
              <button onClick={onClose} className={primaryActionClass}>
                确定
              </button>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
};

const DataMigration = ({ onRefreshConfig }: DataMigrationProps) => {
  const [exportPassword, setExportPassword] = useState('');
  const [importPassword, setImportPassword] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [alertModal, setAlertModal] = useState<{
    isOpen: boolean;
    type: 'success' | 'error' | 'warning';
    title: string;
    message?: string;
    html?: string;
    confirmText?: string;
    onConfirm?: () => void;
    showConfirm?: boolean;
    timer?: number;
  }>({
    isOpen: false,
    type: 'success',
    title: '',
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const showAlert = (config: Omit<typeof alertModal, 'isOpen'>) => {
    setAlertModal({ ...config, isOpen: true });
  };

  const hideAlert = () => {
    setAlertModal((prev) => ({ ...prev, isOpen: false }));
  };

  // 导出数据
  const handleExport = async () => {
    if (!exportPassword.trim()) {
      showAlert({
        type: 'error',
        title: '错误',
        message: '请输入加密密码',
      });
      return;
    }

    try {
      setIsExporting(true);

      const response = await fetch('/api/admin/data-migrations/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          password: exportPassword,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `导出失败: ${response.status}`);
      }

      // 获取文件名
      const contentDisposition = response.headers.get('content-disposition');
      const filenameMatch = contentDisposition?.match(/filename="(.+)"/);
      const filename = filenameMatch?.[1] || 'moontv-backup.dat';

      // 下载文件
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.style.display = 'none';
      a.style.position = 'fixed';
      a.style.top = '0';
      a.style.left = '0';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      showAlert({
        type: 'success',
        title: '导出成功',
        message: '数据已成功导出，请妥善保管备份文件和密码',
        timer: 3000,
      });

      setExportPassword('');
    } catch (error) {
      showAlert({
        type: 'error',
        title: '导出失败',
        message: error instanceof Error ? error.message : '导出过程中发生错误',
      });
    } finally {
      setIsExporting(false);
    }
  };

  // 文件选择处理
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  // 导入数据
  const handleImport = async () => {
    if (!selectedFile) {
      showAlert({
        type: 'error',
        title: '错误',
        message: '请选择备份文件',
      });
      return;
    }

    if (!importPassword.trim()) {
      showAlert({
        type: 'error',
        title: '错误',
        message: '请输入解密密码',
      });
      return;
    }

    try {
      setIsImporting(true);

      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('password', importPassword);

      const response = await fetch('/api/admin/data-migrations/import', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || `导入失败: ${response.status}`);
      }

      showAlert({
        type: 'success',
        title: '导入成功',
        html: `
          <div class="text-left">
            <p><strong>导入完成！</strong></p>
            <p class="mt-2">导入的用户数量: ${result.importedUsers}</p>
            <p>导入播放记录: ${result.importedPlayRecords ?? 0}</p>
            <p>导入收藏: ${result.importedFavorites ?? 0}</p>
            <p>导入搜索历史: ${result.importedSearchHistory ?? 0}</p>
            <p>导入跳过配置: ${result.importedSkipConfigs ?? 0}</p>
            <p>备份时间: ${new Date(result.backupCreatedAt).toLocaleString('zh-CN')}</p>
            <p>备份格式版本: v${result.formatVersion ?? '未知'}</p>
            <p class="mt-3 text-warning">请刷新页面以查看最新数据。</p>
          </div>
        `,
        confirmText: '刷新页面',
        showConfirm: true,
        onConfirm: async () => {
          // 清理状态
          setSelectedFile(null);
          setImportPassword('');
          if (fileInputRef.current) {
            fileInputRef.current.value = '';
          }

          // 刷新配置
          if (onRefreshConfig) {
            await onRefreshConfig();
          }

          // 刷新页面
          window.location.reload();
        },
      });
    } catch (error) {
      showAlert({
        type: 'error',
        title: '导入失败',
        message: error instanceof Error ? error.message : '导入过程中发生错误',
      });
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <>
      <div className='mx-auto max-w-6xl space-y-6'>
        {/* 简洁警告提示 */}
        <div className='border-warning/20 bg-warning/10 flex items-center gap-3 rounded-[1.25rem] border p-4'>
          <AlertTriangle className='text-warning h-5 w-5 shrink-0' />
          <p className='text-warning text-sm'>
            数据迁移操作请谨慎，确保已备份重要数据
          </p>
        </div>

        {/* 主要操作区域 - 响应式布局 */}
        <div className='grid grid-cols-1 gap-6 lg:grid-cols-2'>
          {/* 数据导出 */}
          <div className={exportCardClass}>
            <div className='mb-6 flex items-center gap-3'>
              <div className={iconTileClass}>
                <Download className='h-4 w-4 text-[var(--accent)]' />
              </div>
              <div>
                <h3 className='text-foreground font-semibold'>数据导出</h3>
                <p className='text-muted-foreground text-sm'>
                  创建加密备份文件
                </p>
              </div>
            </div>

            <div className='flex flex-1 flex-col'>
              <div className='space-y-4'>
                {/* 密码输入 */}
                <div>
                  <label className='text-foreground mb-2 flex items-center gap-2 text-sm font-medium'>
                    <Lock className='h-4 w-4' />
                    加密密码
                  </label>
                  <input
                    type='password'
                    value={exportPassword}
                    onChange={(e) => setExportPassword(e.target.value)}
                    placeholder='设置强密码保护备份文件'
                    className={migrationInputClass}
                    disabled={isExporting}
                  />
                  <p className='text-muted-foreground mt-1 text-xs'>
                    导入时需要使用相同密码
                  </p>
                </div>

                {/* 备份内容列表 */}
                <div className='text-muted-foreground space-y-1 text-xs'>
                  <p className='text-foreground mb-2 font-medium'>备份内容：</p>
                  <div className='grid grid-cols-2 gap-1'>
                    <div>• 管理配置</div>
                    <div>• 用户数据</div>
                    <div>• 播放记录</div>
                    <div>• 收藏夹</div>
                  </div>
                </div>
              </div>

              {/* 导出按钮 */}
              <button
                onClick={handleExport}
                disabled={isExporting || !exportPassword.trim()}
                className={`mt-10 w-full rounded-2xl px-4 py-2.5 font-medium transition-opacity ${
                  isExporting || !exportPassword.trim()
                    ? 'bg-white/6 text-muted-foreground cursor-not-allowed'
                    : 'hover:opacity-92 bg-[var(--accent)] text-black'
                }`}
              >
                {isExporting ? (
                  <div className='flex items-center justify-center gap-2'>
                    <div className='h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent'></div>
                    导出中...
                  </div>
                ) : (
                  <div className='flex items-center justify-center gap-2'>
                    <Download className='h-4 w-4' />
                    导出数据
                  </div>
                )}
              </button>
            </div>
          </div>

          {/* 数据导入 */}
          <div className={exportCardClass}>
            <div className='mb-6 flex items-center gap-3'>
              <div className={iconTileClass}>
                <Upload className='h-4 w-4 text-[var(--accent)]' />
              </div>
              <div>
                <h3 className='text-foreground font-semibold'>数据导入</h3>
                <p className='text-destructive text-sm'>⚠️ 将清空现有数据</p>
              </div>
            </div>

            <div className='flex flex-1 flex-col'>
              <div className='space-y-4'>
                {/* 文件选择 */}
                <div>
                  <label className='text-foreground mb-2 flex items-center gap-2 text-sm font-medium'>
                    <FileCheck className='h-4 w-4' />
                    备份文件
                    {selectedFile && (
                      <span className='text-success ml-auto text-xs font-normal'>
                        {selectedFile.name} (
                        {(selectedFile.size / 1024).toFixed(1)} KB)
                      </span>
                    )}
                  </label>
                  <input
                    ref={fileInputRef}
                    type='file'
                    accept='.dat'
                    onChange={handleFileSelect}
                    className='app-control text-foreground file:text-foreground hover:file:bg-white/14 w-full rounded-2xl border px-3 py-2.5 outline-none transition-colors file:mr-3 file:rounded-xl file:border-0 file:bg-white/10 file:px-3 file:py-1.5 file:text-sm file:font-medium focus:border-[var(--accent)] focus:ring-0'
                    disabled={isImporting}
                  />
                </div>

                {/* 密码输入 */}
                <div>
                  <label className='text-foreground mb-2 flex items-center gap-2 text-sm font-medium'>
                    <Lock className='h-4 w-4' />
                    解密密码
                  </label>
                  <input
                    type='password'
                    value={importPassword}
                    onChange={(e) => setImportPassword(e.target.value)}
                    placeholder='输入导出时的加密密码'
                    className={migrationInputClass}
                    disabled={isImporting}
                  />
                </div>
              </div>

              {/* 导入按钮 */}
              <button
                onClick={handleImport}
                disabled={
                  isImporting || !selectedFile || !importPassword.trim()
                }
                className={`mt-10 w-full rounded-2xl px-4 py-2.5 font-medium transition-opacity ${
                  isImporting || !selectedFile || !importPassword.trim()
                    ? 'bg-white/6 text-muted-foreground cursor-not-allowed'
                    : 'bg-destructive text-destructive-foreground hover:opacity-92'
                }`}
              >
                {isImporting ? (
                  <div className='flex items-center justify-center gap-2'>
                    <div className='h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent'></div>
                    导入中...
                  </div>
                ) : (
                  <div className='flex items-center justify-center gap-2'>
                    <Upload className='h-4 w-4' />
                    导入数据
                  </div>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 弹窗组件 */}
      <AlertModal
        isOpen={alertModal.isOpen}
        onClose={hideAlert}
        type={alertModal.type}
        title={alertModal.title}
        message={alertModal.message}
        html={alertModal.html}
        confirmText={alertModal.confirmText}
        onConfirm={alertModal.onConfirm}
        showConfirm={alertModal.showConfirm}
        timer={alertModal.timer}
      />
    </>
  );
};

export default DataMigration;
