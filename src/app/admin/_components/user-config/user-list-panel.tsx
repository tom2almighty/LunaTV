import { ReactNode } from 'react';

type UserListPanelProps = {
  title: string;
  children: ReactNode;
};

export function UserListPanel({ title, children }: UserListPanelProps) {
  return (
    <section className='space-y-4'>
      <h3 className='text-foreground text-base font-semibold'>{title}</h3>
      {children}
    </section>
  );
}
