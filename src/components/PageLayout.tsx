import MobileBottomNav from './MobileBottomNav';
import MobileHeader from './MobileHeader';
import { Navbar } from './Navbar';

interface PageLayoutProps {
  children: React.ReactNode;
  activePath?: string;
}

const PageLayout = ({ children, activePath = '/' }: PageLayoutProps) => {
  return (
    <div className='w-full min-h-screen bg-background text-foreground'>
      {/* Mobile Header (Hidden on desktop) */}
      <div className='md:hidden'>
        <MobileHeader showBackButton={['/play', '/live'].includes(activePath)} />
      </div>

      {/* Desktop Navbar (Hidden on mobile) */}
      <div className='hidden md:block'>
        <Navbar />
      </div>

      {/* Main Content */}
      <main className='relative min-w-0 flex-1 transition-all duration-300 md:pt-16 pb-16 md:pb-0'>
        {children}
      </main>

      {/* Mobile Bottom Nav (Hidden on desktop) */}
      <div className='md:hidden fixed bottom-0 w-full z-50'>
        <MobileBottomNav activePath={activePath} />
      </div>
    </div>
  );
};

export default PageLayout;
