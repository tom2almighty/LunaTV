import { useSearchParams } from 'react-router-dom';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

export const DOUBAN_TYPES = ['movie', 'tv', 'show'] as const;
export type DoubanType = (typeof DOUBAN_TYPES)[number];

const LABELS: Record<DoubanType, string> = {
  movie: '电影',
  tv: '剧集',
  show: '综艺',
};

export function CategoryTabs({
  value,
  onChange,
}: {
  value: DoubanType;
  onChange: (next: DoubanType) => void;
}) {
  return (
    <Tabs value={value} onValueChange={(v) => onChange(v as DoubanType)}>
      <TabsList>
        {DOUBAN_TYPES.map((t) => (
          <TabsTrigger key={t} value={t}>
            {LABELS[t]}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}

export function useDoubanType() {
  const [searchParams, setSearchParams] = useSearchParams();
  const raw = searchParams.get('type');
  const value: DoubanType = (DOUBAN_TYPES as readonly string[]).includes(raw ?? '')
    ? (raw as DoubanType)
    : 'movie';
  const setValue = (next: DoubanType) => {
    setSearchParams({ type: next }, { replace: true });
  };
  return { value, setValue };
}
