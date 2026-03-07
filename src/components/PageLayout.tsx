import { Navbar } from './Navbar';

interface PageLayoutProps {
  children: React.ReactNode;
}

const PageLayout = ({ children }: PageLayoutProps) => (
  <div className='bg-background text-foreground min-h-screen w-full'>
    <Navbar />
    <main className='relative min-h-screen min-w-0 pt-20 md:pt-24'>
      {children}
    </main>
  </div>
);

export default PageLayout;
