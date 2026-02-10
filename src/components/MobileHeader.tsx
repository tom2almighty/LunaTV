import { Search } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

import { BackButton } from './BackButton';
import { SearchModal } from './SearchModal';
import { useSite } from './SiteProvider';
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
      <header className='md:hidden fixed top-0 left-0 right-0 z-[999] w-full bg-background/80 backdrop-blur-xl border-b border-border/50 shadow-sm'>
        <div className='h-12 flex items-center justify-between px-4'>
          {/* 左侧：搜索按钮、返回按钮和设置按钮 */}
          <div className='flex items-center gap-2'>
            <button
              onClick={() => setIsSearchOpen(true)}
              className='w-10 h-10 p-2 rounded-full flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors'
            >
              <Search className='w-5 h-5' />
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
        <div className='absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2'>
          <Link
            href='/'
            className='text-2xl font-bold text-primary tracking-tight hover:opacity-80 transition-opacity'
          >
            {siteName}
          </Link>
        </div>
      </header>
      <SearchModal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
    </>
  );
};

export default MobileHeader;
