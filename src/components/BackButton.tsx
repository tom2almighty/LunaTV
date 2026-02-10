import { ArrowLeft } from 'lucide-react';

export function BackButton() {
  return (
    <button
      onClick={() => window.history.back()}
      className='text-muted-foreground hover:bg-muted/50 flex h-10 w-10 items-center justify-center rounded-full p-2 transition-colors'
      aria-label='Back'
    >
      <ArrowLeft className='h-full w-full' />
    </button>
  );
}
