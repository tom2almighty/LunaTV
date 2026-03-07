import type { ReactNode } from 'react';

type UserTablePanelProps = {
  children: ReactNode;
};

export function UserTablePanel({ children }: UserTablePanelProps) {
  return (
    <div className='app-panel relative max-h-96 overflow-x-auto overflow-y-auto rounded-[1.25rem] border-white/10 p-1'>
      {children}
    </div>
  );
}
