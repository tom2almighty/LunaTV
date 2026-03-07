import { User } from 'lucide-react';
import { ReactNode } from 'react';
import { createPortal } from 'react-dom';

type UserMenuContainerProps = {
  isOpen: boolean;
  mounted: boolean;
  isChangePasswordOpen: boolean;
  onToggleMenu: () => void;
  menuPanel: ReactNode;
  changePasswordPanel: ReactNode;
};

export function UserMenuContainer({
  isOpen,
  mounted,
  isChangePasswordOpen,
  onToggleMenu,
  menuPanel,
  changePasswordPanel,
}: UserMenuContainerProps) {
  return (
    <>
      <div className='relative'>
        <button
          onClick={onToggleMenu}
          className='app-control text-muted-foreground hover:text-(--accent) flex h-10 w-10 items-center justify-center rounded-full p-2 transition-colors'
          aria-label='User Menu'
        >
          <User className='h-full w-full' />
        </button>
      </div>

      {isOpen && mounted && createPortal(menuPanel, document.body)}

      {isChangePasswordOpen &&
        mounted &&
        createPortal(changePasswordPanel, document.body)}
    </>
  );
}
