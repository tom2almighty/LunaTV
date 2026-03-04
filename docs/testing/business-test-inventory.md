# Business Test Inventory

This inventory tracks automated tests that protect core business flows after the interaction unification refactor.

## Core Flow Mapping

- Search (normal): `src/hooks/__tests__/use-search-execution.test.ts`, `src/hooks/__tests__/useSearchResultFilters.test.ts`, `src/app/search/_state/__tests__/search-context-snapshot.test.ts`, `src/app/search/_state/__tests__/search-context-storage.test.ts`.
- Search (stream): partial automated coverage in `src/hooks/__tests__/use-search-execution.test.ts`; manual smoke required.
- Open play from search: `src/app/search/__tests__/search-preview-open-flow.test.tsx`, `src/components/video-card/__tests__/use-video-card-actions.test.ts`.
- Source/episode switch: `src/app/play/hooks/__tests__/use-play-page-state.test.ts` plus manual smoke.
- Favorites CRUD: `src/components/video-card/__tests__/use-video-card-actions.test.ts`.
- Play-records CRUD and resume: `src/app/play/hooks/__tests__/use-play-progress.test.ts`, `src/app/play/hooks/__tests__/use-play-return-to-search.test.ts`.
- Skip-config CRUD and intro/outro skip: partial automated coverage plus manual smoke.
- m3u8 ad-filter toggle: `src/app/play/services/__tests__/m3u8-ad-filter.test.ts` plus admin/runtime smoke.
- Admin user: `src/app/admin/_components/user-config/__tests__/use-user-config-actions.test.ts`.
- Admin user-group: `src/app/admin/_components/user-config/__tests__/user-group-actions.test.ts`.
- Admin source/site-settings/data-migration: manual smoke required.

## Retained Automated Suites

- `src/app/admin/_components/user-config/__tests__/use-user-config-actions.test.ts`
- `src/app/admin/_components/user-config/__tests__/user-group-actions.test.ts`
- `src/app/login/__tests__/page.test.tsx`
- `src/app/play/hooks/__tests__/use-play-page-state.test.ts`
- `src/app/play/hooks/__tests__/use-play-progress.test.ts`
- `src/app/play/hooks/__tests__/use-play-return-to-search.test.ts`
- `src/app/play/services/__tests__/m3u8-ad-filter.test.ts`
- `src/app/search/__tests__/search-context-restore.test.tsx`
- `src/app/search/__tests__/search-preview-open-flow.test.tsx`
- `src/app/search/_state/__tests__/search-context-snapshot.test.ts`
- `src/app/search/_state/__tests__/search-context-storage.test.ts`
- `src/components/video-card/__tests__/use-video-card-actions.test.ts`
- `src/hooks/__tests__/use-search-execution.test.ts`
- `src/hooks/__tests__/useSearchResultFilters.test.ts`
- `src/lib/__tests__/proxy-matcher.test.ts`
- `src/lib/search/__tests__/abortable-search.test.ts`
- `src/server/api/__tests__/guards.test.ts`
- `src/server/api/__tests__/handler.test.ts`
