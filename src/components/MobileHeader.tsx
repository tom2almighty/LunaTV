import { Search } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

import { useSite } from '@/context/SiteContext';

import { BackButton } from './BackButton';
import { SearchModal } from './SearchModal';
import { ThemeToggle } from './ThemeToggle';
import { UserMenu } from './UserMenu';

interface MobileHeaderProps {
  showBackButton?: boolean;
}

const MobileHeader = ({ showBackButton = false }: MobileHeaderProps) => {
  const { siteName } = useSite();
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  return (
    <>
      <header className='bg-background/80 border-border/50 z-999 fixed left-0 right-0 top-0 w-full border-b shadow-sm backdrop-blur-xl md:hidden'>
        <div className='flex h-12 items-center justify-between px-4'>
          {/* 左侧：搜索按钮、返回按钮和设置按钮 */}
          <div className='flex items-center gap-2'>
            <button
              onClick={() => setIsSearchOpen(true)}
              className='text-muted-foreground hover:bg-muted flex h-10 w-10 items-center justify-center rounded-full p-2 transition-colors'
            >
              <Search className='h-5 w-5' />
            </button>
            {showBackButton && <BackButton />}
          </div>

          {/* 右侧按钮 */}
          <div className='flex items-center gap-2'>
            <ThemeToggle />
            <UserMenu />
          </div>
        </div>

        {/* 中间：Logo（绝对居中） */}
        <div className='absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2'>
          <Link
            href='/'
            className='text-primary text-2xl font-bold tracking-tight transition-opacity hover:opacity-80'
          >
            {siteName}
          </Link>
        </div>
      </header>
      <SearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
      />
    </>
  );
};

export default MobileHeader;
