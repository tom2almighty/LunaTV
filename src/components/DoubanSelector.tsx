'use client';

import React, { useEffect, useRef, useState } from 'react';

import type { DoubanPageType } from '@/lib/douban-categories';
import {
  getPrimaryOptionsByType,
  getSecondaryOptionsByType,
} from '@/lib/douban-categories';

interface DoubanSelectorProps {
  type: DoubanPageType;
  primarySelection?: string;
  secondarySelection?: string;
  onPrimaryChange: (value: string) => void;
  onSecondaryChange: (value: string) => void;
}

const DoubanSelector: React.FC<DoubanSelectorProps> = ({
  type,
  primarySelection,
  secondarySelection,
  onPrimaryChange,
  onSecondaryChange,
}) => {
  const primaryOptions = getPrimaryOptionsByType(type);
  const secondaryOptions = getSecondaryOptionsByType(type);
  const secondaryLabel = type === 'movie' ? '地区' : '类型';

  const primaryContainerRef = useRef<HTMLDivElement>(null);
  const primaryButtonRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [primaryIndicatorStyle, setPrimaryIndicatorStyle] = useState<{
    left: number;
    width: number;
  }>({ left: 0, width: 0 });

  const secondaryContainerRef = useRef<HTMLDivElement>(null);
  const secondaryButtonRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [secondaryIndicatorStyle, setSecondaryIndicatorStyle] = useState<{
    left: number;
    width: number;
  }>({ left: 0, width: 0 });

  const updateIndicatorPosition = (
    activeIndex: number,
    containerRef: React.RefObject<HTMLDivElement | null>,
    buttonRefs: React.MutableRefObject<(HTMLButtonElement | null)[]>,
    setIndicatorStyle: React.Dispatch<
      React.SetStateAction<{ left: number; width: number }>
    >,
  ) => {
    if (
      activeIndex < 0 ||
      !buttonRefs.current[activeIndex] ||
      !containerRef.current
    ) {
      return;
    }

    const timeoutId = setTimeout(() => {
      const button = buttonRefs.current[activeIndex];
      const container = containerRef.current;
      if (!button || !container) {
        return;
      }

      const buttonRect = button.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();
      if (buttonRect.width <= 0) {
        return;
      }

      setIndicatorStyle({
        left: buttonRect.left - containerRect.left,
        width: buttonRect.width,
      });
    }, 0);

    return () => clearTimeout(timeoutId);
  };

  useEffect(() => {
    const activePrimaryIndex = primaryOptions.findIndex(
      (opt) => opt.value === (primarySelection || primaryOptions[0]?.value),
    );
    const cleanupPrimary = updateIndicatorPosition(
      activePrimaryIndex,
      primaryContainerRef,
      primaryButtonRefs,
      setPrimaryIndicatorStyle,
    );

    const activeSecondaryIndex = secondaryOptions.findIndex(
      (opt) => opt.value === (secondarySelection || secondaryOptions[0]?.value),
    );
    const cleanupSecondary = updateIndicatorPosition(
      activeSecondaryIndex,
      secondaryContainerRef,
      secondaryButtonRefs,
      setSecondaryIndicatorStyle,
    );

    return () => {
      cleanupPrimary?.();
      cleanupSecondary?.();
    };
  }, [
    primaryOptions,
    primarySelection,
    secondaryOptions,
    secondarySelection,
    type,
  ]);

  const renderCapsuleSelector = (
    options: { label: string; value: string }[],
    activeValue: string | undefined,
    onChange: (value: string) => void,
    isPrimary = false,
  ) => {
    const containerRef = isPrimary
      ? primaryContainerRef
      : secondaryContainerRef;
    const buttonRefs = isPrimary ? primaryButtonRefs : secondaryButtonRefs;
    const indicatorStyle = isPrimary
      ? primaryIndicatorStyle
      : secondaryIndicatorStyle;

    return (
      <div
        ref={containerRef}
        className='bg-muted/60 relative inline-flex rounded-full p-0.5 backdrop-blur-sm sm:p-1'
      >
        {indicatorStyle.width > 0 && (
          <div
            className='bg-card absolute bottom-0.5 top-0.5 rounded-full shadow-sm transition-all duration-300 ease-out sm:bottom-1 sm:top-1'
            style={{
              left: `${indicatorStyle.left}px`,
              width: `${indicatorStyle.width}px`,
            }}
          />
        )}

        {options.map((option, index) => {
          const isActive = activeValue === option.value;
          return (
            <button
              key={option.value}
              ref={(el) => {
                buttonRefs.current[index] = el;
              }}
              onClick={() => onChange(option.value)}
              className={`relative z-10 whitespace-nowrap rounded-full px-2 py-1 text-xs font-medium transition-all duration-200 sm:px-4 sm:py-2 sm:text-sm ${
                isActive
                  ? 'text-foreground cursor-default'
                  : 'text-muted-foreground hover:text-foreground cursor-pointer'
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    );
  };

  return (
    <div className='space-y-4 sm:space-y-6'>
      <div className='space-y-3 sm:space-y-4'>
        {primaryOptions.length > 1 && (
          <div className='flex flex-col gap-2 sm:flex-row sm:items-center'>
            <span className='text-muted-foreground min-w-12 text-xs font-medium sm:text-sm'>
              分类
            </span>
            <div className='overflow-x-auto'>
              {renderCapsuleSelector(
                primaryOptions,
                primarySelection || primaryOptions[0]?.value,
                onPrimaryChange,
                true,
              )}
            </div>
          </div>
        )}

        <div className='flex flex-col gap-2 sm:flex-row sm:items-center'>
          <span className='text-muted-foreground min-w-12 text-xs font-medium sm:text-sm'>
            {secondaryLabel}
          </span>
          <div className='overflow-x-auto'>
            {renderCapsuleSelector(
              secondaryOptions,
              secondarySelection || secondaryOptions[0]?.value,
              onSecondaryChange,
              false,
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DoubanSelector;
