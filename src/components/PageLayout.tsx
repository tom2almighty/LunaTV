'use client';

import { Navbar } from './Navbar';

interface PageLayoutProps {
  children: React.ReactNode;
  activePath?: string;
}

const PageLayout = ({ children }: PageLayoutProps) => (
  <div className='bg-background text-foreground min-h-screen w-full'>
    <Navbar />
    <main className='relative min-w-0 flex-1 pt-14'>{children}</main>
  </div>
);

export default PageLayout;
