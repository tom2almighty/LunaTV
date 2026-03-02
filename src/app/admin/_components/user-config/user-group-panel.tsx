import { ReactNode } from 'react';

type UserGroupPanelProps = {
  title: string;
  children: ReactNode;
};

export function UserGroupPanel({ title, children }: UserGroupPanelProps) {
  return (
    <section className='space-y-4'>
      <h3 className='text-foreground text-base font-semibold'>{title}</h3>
      {children}
    </section>
  );
}
