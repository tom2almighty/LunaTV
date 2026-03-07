import { ReactNode } from 'react';

type UserListPanelProps = {
  title: string;
  children: ReactNode;
};

export function UserListPanel({ title, children }: UserListPanelProps) {
  return (
    <section className='app-panel space-y-4 rounded-[1.5rem] p-5'>
      <h3 className='app-section-title text-foreground text-base font-semibold tracking-[0.08em]'>
        {title}
      </h3>
      {children}
    </section>
  );
}
