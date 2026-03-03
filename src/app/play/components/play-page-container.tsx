import { ReactNode } from 'react';

type PlayPageContainerProps = {
  children: ReactNode;
};

export function PlayPageContainer({ children }: PlayPageContainerProps) {
  return (
    <div className='flex flex-col gap-4 px-5 py-4 lg:px-12 2xl:px-20'>
      {children}
    </div>
  );
}
