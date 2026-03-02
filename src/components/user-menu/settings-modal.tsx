import { ReactNode } from 'react';
import { createPortal } from 'react-dom';

type SettingsModalProps = {
  isOpen: boolean;
  mounted: boolean;
  children: ReactNode;
};

export function SettingsModal({
  isOpen,
  mounted,
  children,
}: SettingsModalProps) {
  if (!isOpen || !mounted) {
    return null;
  }

  return createPortal(children, document.body);
}
