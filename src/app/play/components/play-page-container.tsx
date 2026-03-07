import { ReactNode } from 'react';

type PlayPageContainerProps = {
  children: ReactNode;
};

export function PlayPageContainer({ children }: PlayPageContainerProps) {
  return (
    <div className='app-page flex flex-col gap-5 pt-2 md:pt-4'>{children}</div>
  );
}
