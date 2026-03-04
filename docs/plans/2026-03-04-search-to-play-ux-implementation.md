# Search-to-Play UX Redesign Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Deliver an immersive, preview-first `search -> play` UX with consistent responsive behavior and full search-context restoration when returning from play.

**Architecture:** Keep existing REST/session APIs and refactor frontend into a preview-first flow. Introduce explicit search context snapshot utilities, modular search UI components, and a stable play-page return path. Use TDD for each small step, verify fail/pass locally, and commit per task.

**Tech Stack:** Next.js 16, React 19, TypeScript, Tailwind CSS, Vitest, Testing Library

---

### Task 1: Add Search Context Snapshot Utilities

**Files:**

- Create: `src/app/search/_state/search-context-snapshot.ts`
- Test: `src/app/search/_state/__tests__/search-context-snapshot.test.ts`

**Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest';

import {
  parseSearchContextSnapshot,
  serializeSearchContextSnapshot,
} from '../search-context-snapshot';

describe('search context snapshot', () => {
  it('serializes and parses a valid payload', () => {
    const raw = serializeSearchContextSnapshot({
      query: '庆余年',
      viewMode: 'agg',
      filterAll: {
        source: 'all',
        title: 'all',
        year: 'all',
        yearOrder: 'none',
      },
      filterAgg: {
        source: 'all',
        title: 'all',
        year: 'all',
        yearOrder: 'desc',
      },
      scrollTop: 640,
      activeKey: 'agg-庆余年-2024-tv',
    });
    const parsed = parseSearchContextSnapshot(raw);
    expect(parsed?.query).toBe('庆余年');
    expect(parsed?.scrollTop).toBe(640);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/app/search/_state/__tests__/search-context-snapshot.test.ts`  
Expected: FAIL with module/function-not-found error.

**Step 3: Write minimal implementation**

```ts
export type SearchContextSnapshot = {
  version: 1;
  query: string;
  viewMode: 'agg' | 'all';
  filterAll: {
    source: string;
    title: string;
    year: string;
    yearOrder: 'none' | 'asc' | 'desc';
  };
  filterAgg: {
    source: string;
    title: string;
    year: string;
    yearOrder: 'none' | 'asc' | 'desc';
  };
  scrollTop: number;
  activeKey: string | null;
};
```

Add `serializeSearchContextSnapshot` and `parseSearchContextSnapshot` with safe JSON parse and version check.

**Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/app/search/_state/__tests__/search-context-snapshot.test.ts`  
Expected: PASS.

**Step 5: Commit**

```bash
git add src/app/search/_state/search-context-snapshot.ts src/app/search/_state/__tests__/search-context-snapshot.test.ts
git commit -m "feat(search): add context snapshot serializer for restore flow"
```

### Task 2: Build Preview State Hook (Drawer/Sheet Independent)

**Files:**

- Create: `src/app/search/hooks/use-search-preview-state.ts`
- Test: `src/app/search/hooks/__tests__/use-search-preview-state.test.ts`

**Step 1: Write the failing test**

```ts
import { renderHook, act } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { useSearchPreviewState } from '../use-search-preview-state';

describe('useSearchPreviewState', () => {
  it('opens and closes preview with active payload', () => {
    const { result } = renderHook(() => useSearchPreviewState());
    act(() => result.current.openPreview({ key: 'agg-a', title: 'A' }));
    expect(result.current.isPreviewOpen).toBe(true);
    expect(result.current.activePreview?.key).toBe('agg-a');
    act(() => result.current.closePreview());
    expect(result.current.isPreviewOpen).toBe(false);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/app/search/hooks/__tests__/use-search-preview-state.test.ts`  
Expected: FAIL with missing hook/module.

**Step 3: Write minimal implementation**

```ts
import { useCallback, useState } from 'react';

export function useSearchPreviewState() {
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [activePreview, setActivePreview] = useState<{
    key: string;
    title: string;
  } | null>(null);
  const openPreview = useCallback((preview: { key: string; title: string }) => {
    setActivePreview(preview);
    setIsPreviewOpen(true);
  }, []);
  const closePreview = useCallback(() => setIsPreviewOpen(false), []);
  return { isPreviewOpen, activePreview, openPreview, closePreview };
}
```

**Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/app/search/hooks/__tests__/use-search-preview-state.test.ts`  
Expected: PASS.

**Step 5: Commit**

```bash
git add src/app/search/hooks/use-search-preview-state.ts src/app/search/hooks/__tests__/use-search-preview-state.test.ts
git commit -m "feat(search): add preview state hook for search result cards"
```

### Task 3: Add Quick Preview Panel with Responsive Variants

**Files:**

- Create: `src/app/search/components/quick-preview-panel.tsx`
- Test: `src/app/search/components/__tests__/quick-preview-panel.test.tsx`

**Step 1: Write the failing test**

```tsx
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { QuickPreviewPanel } from '../quick-preview-panel';

describe('QuickPreviewPanel', () => {
  it('renders primary and secondary actions with consistent labels', () => {
    const onPlay = vi.fn();
    render(
      <QuickPreviewPanel
        mode='desktop'
        open
        title='庆余年'
        sourceCount={6}
        onClose={() => {}}
        onPlayNow={onPlay}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: '立即播放' }));
    expect(onPlay).toHaveBeenCalledTimes(1);
    expect(
      screen.getByRole('button', { name: '换源预览' }),
    ).toBeInTheDocument();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/app/search/components/__tests__/quick-preview-panel.test.tsx`  
Expected: FAIL with missing component.

**Step 3: Write minimal implementation**

Create a panel component with shared action slot and a `mode` prop (`desktop`/`mobile`) controlling layout only, not behavior.

```tsx
type Props = {
  mode: 'desktop' | 'mobile';
  open: boolean;
  title: string;
  sourceCount: number;
  onClose: () => void;
  onPlayNow: () => void;
};
```

Ensure CTA text is exactly:

- `立即播放`
- `换源预览`
- `收藏`

**Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/app/search/components/__tests__/quick-preview-panel.test.tsx`  
Expected: PASS.

**Step 5: Commit**

```bash
git add src/app/search/components/quick-preview-panel.tsx src/app/search/components/__tests__/quick-preview-panel.test.tsx
git commit -m "feat(search-ui): add responsive quick preview panel"
```

### Task 4: Refactor Search Result Click Flow to Preview-First

**Files:**

- Modify: `src/app/search/SearchPageClient.tsx`
- Modify: `src/components/VideoCard.tsx`
- Test: `src/app/search/__tests__/search-preview-open-flow.test.tsx`

**Step 1: Write the failing test**

```tsx
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import SearchPageClient from '../SearchPageClient';

describe('search preview open flow', () => {
  it('opens preview instead of routing immediately when clicking result card', async () => {
    render(<SearchPageClient />);
    // arrange mocked results + click first card
    fireEvent.click(await screen.findByTestId('search-card-0'));
    expect(screen.getByText('立即播放')).toBeInTheDocument();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/app/search/__tests__/search-preview-open-flow.test.tsx`  
Expected: FAIL because current card click still routes directly.

**Step 3: Write minimal implementation**

- Add `onPreviewOpen` behavior in search result rendering.
- Keep `VideoCard` default navigation for non-search contexts.
- For `from='search'`, allow a prop switch such as `interactionMode='preview-first'`.

```tsx
<VideoCard
  from='search'
  interactionMode='preview-first'
  onOpenPreview={(payload) => openPreview(payload)}
/>
```

**Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/app/search/__tests__/search-preview-open-flow.test.tsx`  
Expected: PASS.

**Step 5: Commit**

```bash
git add src/app/search/SearchPageClient.tsx src/components/VideoCard.tsx src/app/search/__tests__/search-preview-open-flow.test.tsx
git commit -m "feat(search): switch result interaction to preview-first flow"
```

### Task 5: Persist and Restore Search Context Across Play Navigation

**Files:**

- Modify: `src/app/search/SearchPageClient.tsx`
- Modify: `src/components/VideoCard.tsx`
- Create: `src/app/search/_state/search-context-storage.ts`
- Test: `src/app/search/_state/__tests__/search-context-storage.test.ts`
- Test: `src/app/search/__tests__/search-context-restore.test.tsx`

**Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest';

import {
  saveSearchContext,
  loadSearchContext,
} from '../search-context-storage';

describe('search context storage', () => {
  it('saves and loads snapshot through sessionStorage', () => {
    saveSearchContext({ query: '庆余年', viewMode: 'agg', scrollTop: 520 });
    const restored = loadSearchContext();
    expect(restored?.query).toBe('庆余年');
    expect(restored?.scrollTop).toBe(520);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/app/search/_state/__tests__/search-context-storage.test.ts src/app/search/__tests__/search-context-restore.test.tsx`  
Expected: FAIL with missing storage helpers and restore behavior.

**Step 3: Write minimal implementation**

- Before `Play now` navigation, persist snapshot.
- On `SearchPageClient` mount with matching query, restore filters/view mode/scroll.
- Clear consumed snapshot safely after restore.

```ts
const STORAGE_KEY = 'search-context-v1';
sessionStorage.setItem(STORAGE_KEY, serialized);
```

**Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/app/search/_state/__tests__/search-context-storage.test.ts src/app/search/__tests__/search-context-restore.test.tsx`  
Expected: PASS.

**Step 5: Commit**

```bash
git add src/app/search/SearchPageClient.tsx src/components/VideoCard.tsx src/app/search/_state/search-context-storage.ts src/app/search/_state/__tests__/search-context-storage.test.ts src/app/search/__tests__/search-context-restore.test.tsx
git commit -m "feat(search): persist and restore browsing context across play route"
```

### Task 6: Add Play Page Return Action with Restored Intent

**Files:**

- Modify: `src/app/play/components/play-player-runtime.tsx`
- Create: `src/app/play/hooks/use-play-return-to-search.ts`
- Test: `src/app/play/hooks/__tests__/use-play-return-to-search.test.ts`

**Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest';

import { buildReturnSearchUrl } from '../use-play-return-to-search';

describe('play return search url', () => {
  it('returns query-based search path with restore marker', () => {
    expect(buildReturnSearchUrl('庆余年')).toBe(
      '/search?q=%E5%BA%86%E4%BD%99%E5%B9%B4&restore=1',
    );
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/app/play/hooks/__tests__/use-play-return-to-search.test.ts`  
Expected: FAIL with missing helper.

**Step 3: Write minimal implementation**

Create a helper/hook used by play page header/back action:

```ts
export function buildReturnSearchUrl(title: string) {
  return `/search?q=${encodeURIComponent(title)}&restore=1`;
}
```

Integrate the action in `play-player-runtime.tsx` for normal/failed states.

**Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/app/play/hooks/__tests__/use-play-return-to-search.test.ts`  
Expected: PASS.

**Step 5: Commit**

```bash
git add src/app/play/components/play-player-runtime.tsx src/app/play/hooks/use-play-return-to-search.ts src/app/play/hooks/__tests__/use-play-return-to-search.test.ts
git commit -m "feat(play): add context-aware return to search action"
```

### Task 7: Final Verification and UX Regression Gate

**Files:**

- Modify (if needed): `src/app/search/__tests__/search-preview-open-flow.test.tsx`
- Modify (if needed): `src/app/search/__tests__/search-context-restore.test.tsx`
- Modify (if needed): `src/app/search/components/__tests__/quick-preview-panel.test.tsx`
- Modify (if needed): `src/app/play/hooks/__tests__/use-play-return-to-search.test.ts`

**Step 1: Add failing regression checks for responsive consistency**

Add assertions for desktop/mobile variants sharing the same CTA text and action order.

**Step 2: Run targeted tests to verify red/green cycle**

Run:

- `pnpm vitest run src/app/search/components/__tests__/quick-preview-panel.test.tsx`
- `pnpm vitest run src/app/search/__tests__/search-preview-open-flow.test.tsx`
- `pnpm vitest run src/app/search/__tests__/search-context-restore.test.tsx`
- `pnpm vitest run src/app/play/hooks/__tests__/use-play-return-to-search.test.ts`

Expected: All PASS.

**Step 3: Run quality gates**

Run:

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test:run`

Expected: PASS with zero lint/type errors.

**Step 4: Commit final verification updates**

```bash
git add src/app/search src/app/play
git commit -m "test(ux): enforce search-to-play responsive interaction contract"
```
