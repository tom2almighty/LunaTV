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
    <div className='app-panel mb-4 overflow-hidden rounded-[1.6rem]'>
      <button
        onClick={onToggle}
        className='border-white/6 flex w-full items-center justify-between gap-4 border-b bg-white/[0.035] px-6 py-4 backdrop-blur-xl transition-colors hover:bg-white/[0.06]'
      >
        <div className='flex items-center gap-3'>
          {icon}
          <h3 className='app-section-title text-foreground text-base font-semibold tracking-[0.08em] sm:text-lg'>
            {title}
          </h3>
        </div>
        <div className='text-muted-foreground'>
          {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </div>
      </button>
      {shouldRenderContent && (
        <div
          className={'px-6 py-5' + (isExpanded ? '' : ' hidden')}
          aria-hidden={!isExpanded}
        >
          {children}
        </div>
      )}
    </div>
  );
};
