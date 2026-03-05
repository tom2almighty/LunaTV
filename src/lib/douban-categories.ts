import { DEFAULT_DOUBAN_PAGE_LIMIT } from '@/lib/douban.constants';

export type DoubanPageType = 'movie' | 'tv' | 'show';

export interface SelectorOption {
  label: string;
  value: string;
}

export interface DoubanRecentHotParams {
  kind: 'movie' | 'tv';
  category: string;
  type: string;
  pageLimit: number;
  pageStart: number;
}

const MOVIE_PRIMARY_OPTIONS: SelectorOption[] = [
  { label: '热门电影', value: '热门' },
  { label: '最新电影', value: '最新' },
  { label: '豆瓣高分', value: '豆瓣高分' },
  { label: '冷门佳片', value: '冷门佳片' },
];

const MOVIE_SECONDARY_OPTIONS: SelectorOption[] = [
  { label: '全部', value: '全部' },
  { label: '华语', value: '华语' },
  { label: '欧美', value: '欧美' },
  { label: '韩国', value: '韩国' },
  { label: '日本', value: '日本' },
];

const TV_PRIMARY_OPTIONS: SelectorOption[] = [
  { label: '最近热门', value: '最近热门' },
];

const TV_SECONDARY_OPTIONS: SelectorOption[] = [
  { label: '综合', value: 'tv' },
  { label: '国产剧', value: 'tv_domestic' },
  { label: '欧美剧', value: 'tv_american' },
  { label: '日剧', value: 'tv_japanese' },
  { label: '韩剧', value: 'tv_korean' },
  { label: '动画', value: 'tv_animation' },
  { label: '纪录片', value: 'tv_documentary' },
];

const SHOW_PRIMARY_OPTIONS: SelectorOption[] = [
  { label: '最近热门', value: '最近热门' },
];

const SHOW_SECONDARY_OPTIONS: SelectorOption[] = [
  { label: '综合', value: 'show' },
  { label: '国内', value: 'show_domestic' },
  { label: '国外', value: 'show_foreign' },
];

export function normalizeDoubanPageType(value?: string | null): DoubanPageType {
  if (value === 'tv' || value === 'show') {
    return value;
  }
  return 'movie';
}

export function getPrimaryOptionsByType(
  type: DoubanPageType,
): SelectorOption[] {
  if (type === 'tv') {
    return TV_PRIMARY_OPTIONS;
  }
  if (type === 'show') {
    return SHOW_PRIMARY_OPTIONS;
  }
  return MOVIE_PRIMARY_OPTIONS;
}

export function getSecondaryOptionsByType(
  type: DoubanPageType,
): SelectorOption[] {
  if (type === 'tv') {
    return TV_SECONDARY_OPTIONS;
  }
  if (type === 'show') {
    return SHOW_SECONDARY_OPTIONS;
  }
  return MOVIE_SECONDARY_OPTIONS;
}

export function getDefaultSelection(type: DoubanPageType): {
  primary: string;
  secondary: string;
} {
  const primaryOptions = getPrimaryOptionsByType(type);
  const secondaryOptions = getSecondaryOptionsByType(type);
  return {
    primary: primaryOptions[0].value,
    secondary: secondaryOptions[0].value,
  };
}

export function buildRecentHotParams(input: {
  type: DoubanPageType;
  primarySelection: string;
  secondarySelection: string;
  pageLimit?: number;
  pageStart?: number;
}): DoubanRecentHotParams {
  const { type, primarySelection, secondarySelection, pageLimit, pageStart } =
    input;

  if (type === 'tv') {
    const validSecondarySet = new Set(
      TV_SECONDARY_OPTIONS.map((it) => it.value),
    );
    return {
      kind: 'tv',
      category: 'tv',
      type: validSecondarySet.has(secondarySelection)
        ? secondarySelection
        : 'tv',
      pageLimit: pageLimit ?? DEFAULT_DOUBAN_PAGE_LIMIT,
      pageStart: pageStart ?? 0,
    };
  }

  if (type === 'show') {
    const validSecondarySet = new Set(
      SHOW_SECONDARY_OPTIONS.map((it) => it.value),
    );
    return {
      kind: 'tv',
      category: 'show',
      type: validSecondarySet.has(secondarySelection)
        ? secondarySelection
        : 'show',
      pageLimit: pageLimit ?? DEFAULT_DOUBAN_PAGE_LIMIT,
      pageStart: pageStart ?? 0,
    };
  }

  const validPrimarySet = new Set(MOVIE_PRIMARY_OPTIONS.map((it) => it.value));
  const validSecondarySet = new Set(
    MOVIE_SECONDARY_OPTIONS.map((it) => it.value),
  );

  return {
    kind: 'movie',
    category: validPrimarySet.has(primarySelection) ? primarySelection : '热门',
    type: validSecondarySet.has(secondarySelection)
      ? secondarySelection
      : '全部',
    pageLimit: pageLimit ?? DEFAULT_DOUBAN_PAGE_LIMIT,
    pageStart: pageStart ?? 0,
  };
}
