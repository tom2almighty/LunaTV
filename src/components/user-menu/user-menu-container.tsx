import { User } from 'lucide-react';
import { ReactNode } from 'react';
import { createPortal } from 'react-dom';

import { SettingsModal } from '@/components/user-menu/settings-modal';

type UserMenuContainerProps = {
  isOpen: boolean;
  mounted: boolean;
  isSettingsOpen: boolean;
  isChangePasswordOpen: boolean;
  onToggleMenu: () => void;
  menuPanel: ReactNode;
  settingsPanel: ReactNode;
  changePasswordPanel: ReactNode;
};

export function UserMenuContainer({
  isOpen,
  mounted,
  isSettingsOpen,
  isChangePasswordOpen,
  onToggleMenu,
  menuPanel,
  settingsPanel,
  changePasswordPanel,
}: UserMenuContainerProps) {
  return (
    <>
      <div className='relative'>
        <button
          onClick={onToggleMenu}
          className='app-control text-muted-foreground flex h-10 w-10 items-center justify-center rounded-full p-2 transition-colors hover:text-[var(--accent)]'
          aria-label='User Menu'
        >
          <User className='h-full w-full' />
        </button>
      </div>

      {isOpen && mounted && createPortal(menuPanel, document.body)}

      <SettingsModal isOpen={isSettingsOpen} mounted={mounted}>
        {settingsPanel}
      </SettingsModal>

      {isChangePasswordOpen &&
        mounted &&
        createPortal(changePasswordPanel, document.body)}
    </>
  );
}
