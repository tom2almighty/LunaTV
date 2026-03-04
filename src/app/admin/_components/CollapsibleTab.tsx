'use client';

import { ChevronDown, ChevronUp } from 'lucide-react';
import React, { useEffect, useState } from 'react';

interface CollapsibleTabProps {
  title: string;
  icon?: React.ReactNode;
  isExpanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

export const CollapsibleTab = ({
  title,
  icon,
  isExpanded,
  onToggle,
  children,
}: CollapsibleTabProps) => {
  const [hasExpanded, setHasExpanded] = useState(isExpanded);

  useEffect(() => {
    if (isExpanded) {
      setHasExpanded(true);
    }
  }, [isExpanded]);

  const shouldRenderContent = isExpanded || hasExpanded;

  return (
    <div className='bg-card/80 ring-border mb-4 overflow-hidden rounded-xl shadow-sm ring-1 backdrop-blur-md'>
      <button
        onClick={onToggle}
        className='bg-muted/70 hover:bg-muted flex w-full items-center justify-between px-6 py-4 transition-colors'
      >
        <div className='flex items-center gap-3'>
          {icon}
          <h3 className='text-foreground text-lg font-medium'>{title}</h3>
        </div>
        <div className='text-muted-foreground'>
          {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </div>
      </button>
      {shouldRenderContent && (
        <div
          className={'px-6 py-4' + (isExpanded ? '' : ' hidden')}
          aria-hidden={!isExpanded}
        >
          {children}
        </div>
      )}
    </div>
  );
};
