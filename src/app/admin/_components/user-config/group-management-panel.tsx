import type { ReactNode } from 'react';

type GroupManagementPanelProps = {
  header: ReactNode;
  body: ReactNode;
};

export function GroupManagementPanel({
  header,
  body,
}: GroupManagementPanelProps) {
  return (
    <section className='space-y-3'>
      {header}
      <div className='app-panel relative max-h-80 overflow-x-auto overflow-y-auto rounded-[1.25rem] border-white/10 p-1'>
        {body}
      </div>
    </section>
  );
}
