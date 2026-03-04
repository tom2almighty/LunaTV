import React, { type ReactNode } from 'react';

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
      <div className='border-border relative max-h-80 overflow-x-auto overflow-y-auto rounded-lg border'>
        {body}
      </div>
    </section>
  );
}
