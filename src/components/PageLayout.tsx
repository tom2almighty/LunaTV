import MobileBottomNav from './MobileBottomNav';
import MobileHeader from './MobileHeader';
import { Navbar } from './Navbar';

interface PageLayoutProps {
  children: React.ReactNode;
  activePath?: string;
}

const PageLayout = ({ children, activePath = '/' }: PageLayoutProps) => {
  return (
    <div className='bg-background text-foreground min-h-screen w-full'>
      {/* Mobile Header (Hidden on desktop) */}
      <div className='md:hidden'>
        <MobileHeader
          showBackButton={['/play', '/live'].includes(activePath)}
        />
      </div>

      {/* Desktop Navbar (Hidden on mobile) */}
      <div className='hidden md:block'>
        <Navbar />
      </div>

      {/* Main Content */}
      <main className='relative min-w-0 flex-1 pb-16 transition-all duration-300 md:pb-0 md:pt-16'>
        {children}
      </main>

      {/* Mobile Bottom Nav (Hidden on desktop) */}
      <div className='fixed bottom-0 z-50 w-full md:hidden'>
        <MobileBottomNav activePath={activePath} />
      </div>
    </div>
  );
};

export default PageLayout;
