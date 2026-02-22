'use client';

import { Dialog, Transition } from '@headlessui/react';
import { Search, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Fragment, useEffect, useState } from 'react';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SearchModal = ({ isOpen, onClose }: SearchModalProps) => {
  const [query, setQuery] = useState('');
  const router = useRouter();

  useEffect(() => {
    if (isOpen) {
      setQuery('');
    }
  }, [isOpen]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/search?q=${encodeURIComponent(query)}`);
      onClose();
    }
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as='div' className='relative z-50' onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter='ease-out duration-300'
          enterFrom='opacity-0'
          enterTo='opacity-100'
          leave='ease-in duration-200'
          leaveFrom='opacity-100'
          leaveTo='opacity-0'
        >
          <div className='bg-background/50 fixed inset-0 backdrop-blur-sm' />
        </Transition.Child>

        <div className='fixed inset-0 overflow-y-auto'>
          <div className='flex min-h-full items-start justify-center p-4 pt-20 text-center'>
            <Transition.Child
              as={Fragment}
              enter='ease-out duration-300'
              enterFrom='opacity-0 scale-95'
              enterTo='opacity-100 scale-100'
              leave='ease-in duration-200'
              leaveFrom='opacity-100 scale-100'
              leaveTo='opacity-0 scale-95'
            >
              <Dialog.Panel className='bg-background border-border w-full max-w-2xl transform overflow-hidden rounded-2xl border p-6 text-left align-middle shadow-xl transition-all'>
                <form onSubmit={handleSearch} className='relative'>
                  <Search className='text-foreground absolute left-4 top-1/2 h-6 w-6 -translate-y-1/2' />
                  <input
                    type='text'
                    className='bg-background/50 border-background text-foreground placeholder-muted-foreground w-full rounded-xl border py-4 pl-12 pr-12 text-lg transition-colors focus:border-red-600 focus:outline-none focus:ring-1 focus:ring-red-600'
                    placeholder='输入影视标题进行搜索'
                    autoFocus
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                  {query && (
                    <button
                      type='button'
                      onClick={() => setQuery('')}
                      className='text-foreground absolute right-4 top-1/2 -translate-y-1/2'
                    >
                      <X className='h-5 w-5' />
                    </button>
                  )}
                </form>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};
