import React, { type ReactNode } from 'react';

type UserActionsPanelProps = {
  title: string;
  actions?: ReactNode;
  children: ReactNode;
};

export function UserActionsPanel({
  title,
  actions,
  children,
}: UserActionsPanelProps) {
  return (
    <section className='space-y-3'>
      <div className='flex items-center justify-between'>
        <h4 className='text-foreground text-sm font-medium'>{title}</h4>
        {actions || null}
      </div>
      {children}
    </section>
  );
}
