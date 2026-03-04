import type { ReactNode } from 'react';

type UserTablePanelProps = {
  children: ReactNode;
};

export function UserTablePanel({ children }: UserTablePanelProps) {
  return (
    <div className='border-border relative max-h-96 overflow-x-auto overflow-y-auto rounded-lg border'>
      {children}
    </div>
  );
}
