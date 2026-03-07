/* eslint-disable no-console */
'use client';

import { AlertCircle, AlertTriangle, CheckCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

import { buttonStyles } from './buttonStyles';

export interface AlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'success' | 'error' | 'warning';
  title: string;
  message?: string;
  timer?: number;
  showConfirm?: boolean;
}

export const AlertModal = ({
  isOpen,
  onClose,
  type,
  title,
  message,
  timer,
  showConfirm = false,
}: AlertModalProps) => {
  const [isVisible, setIsVisible] = useState(false);

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
        return <CheckCircle className='text-success h-8 w-8' />;
      case 'error':
        return <AlertCircle className='text-destructive h-8 w-8' />;
      case 'warning':
        return <AlertTriangle className='text-warning h-8 w-8' />;
      default:
        return null;
    }
  };

  return createPortal(
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4 backdrop-blur-xl transition-opacity duration-200 ${isVisible ? 'opacity-100' : 'opacity-0'}`}
    >
      <div
        className={`app-panel w-full max-w-sm rounded-[1.75rem] transition-all duration-200 ${isVisible ? 'scale-100' : 'scale-95'}`}
      >
        <div className='p-6 text-center'>
          <div className='mb-4 flex justify-center'>
            <div className='bg-white/6 flex h-14 w-14 items-center justify-center rounded-full border border-white/10'>
              {getIcon()}
            </div>
          </div>
          <h3 className='text-foreground mb-2 text-lg font-semibold'>
            {title}
          </h3>
          {message && <p className='text-muted-foreground mb-4'>{message}</p>}
          {showConfirm && (
            <button onClick={onClose} className={buttonStyles.primary}>
              确定
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
};

export type AlertModalState = {
  isOpen: boolean;
  type: 'success' | 'error' | 'warning';
  title: string;
  message?: string;
  timer?: number;
  showConfirm?: boolean;
};

export type AlertConfig = Omit<AlertModalState, 'isOpen'>;
export type ShowAlert = (config: AlertConfig) => void;

export const useAlertModal = () => {
  const [alertModal, setAlertModal] = useState<AlertModalState>({
    isOpen: false,
    type: 'success',
    title: '',
  });

  const showAlert: ShowAlert = (config) => {
    setAlertModal({ ...config, isOpen: true });
  };

  const hideAlert = () => {
    setAlertModal((prev) => ({ ...prev, isOpen: false }));
  };

  return { alertModal, showAlert, hideAlert };
};

export const showError = (message: string, showAlert?: ShowAlert) => {
  if (showAlert) {
    showAlert({ type: 'error', title: '错误', message, showConfirm: true });
  } else {
    console.error(message);
  }
};

export const showSuccess = (message: string, showAlert?: ShowAlert) => {
  if (showAlert) {
    showAlert({ type: 'success', title: '成功', message, timer: 2000 });
  } else {
    console.log(message);
  }
};
