# Business Test Inventory

This inventory lists retained tests after pruning, and maps them to protected core-business flows used by the gradual refactor plan.

## Protected Flow Mapping

- Search (normal): `src/hooks/__tests__/use-search-execution.test.ts`, `src/hooks/__tests__/useSearchResultFilters.test.ts`, `src/app/search/_state/__tests__/search-context-snapshot.test.ts`, `src/app/search/_state/__tests__/search-context-storage.test.ts`.
- Search (stream): partial automated coverage via `src/hooks/__tests__/use-search-execution.test.ts`; manual smoke required (see `docs/testing/core-business-regression-matrix.md`).
- Open play from search: `src/app/search/__tests__/search-preview-open-flow.test.tsx`, `src/components/video-card/__tests__/use-video-card-actions.test.ts`.
- Source switch and episode switch in play: `src/app/play/hooks/__tests__/use-play-page-state.test.ts` plus manual smoke.
- Favorites CRUD: `src/components/video-card/__tests__/use-video-card-actions.test.ts` plus manual smoke.
- Play-records CRUD and resume: `src/app/play/hooks/__tests__/use-play-progress.test.ts`, `src/app/play/hooks/__tests__/use-play-return-to-search.test.ts`.
- Skip-config CRUD and intro/outro skip: partial automated coverage via play hook tests; manual smoke required.
- m3u8 ad-filter toggle: manual smoke required.
- Admin user: `src/app/admin/_components/user-config/__tests__/use-user-config-actions.test.ts`.
- Admin user-group: `src/app/admin/_components/user-config/__tests__/user-group-actions.test.ts`.
- Admin source/site-settings/data-migration: manual smoke required.

## Retained Tests

- `src/app/admin/_components/user-config/__tests__/use-user-config-actions.test.ts`: verifies admin user creation action sends expected API request.
- `src/app/admin/_components/user-config/__tests__/user-group-actions.test.ts`: verifies user-group add/edit action mapping, request payload correctness, and backend error propagation.
- `src/app/login/__tests__/page.test.tsx`: verifies login page user flow behavior.
- `src/app/play/hooks/__tests__/use-play-page-state.test.ts`: verifies episode index behavior when source episode lists change.
- `src/app/play/hooks/__tests__/use-play-progress.test.ts`: verifies play progress behavior.
- `src/app/play/hooks/__tests__/use-play-return-to-search.test.ts`: verifies returning to search context behavior.
- `src/app/search/__tests__/search-context-restore.test.tsx`: verifies restoring search view mode and position from session state.
- `src/app/search/__tests__/search-preview-open-flow.test.tsx`: verifies search preview open behavior.
- `src/app/search/_state/__tests__/search-context-snapshot.test.ts`: verifies snapshot state behavior for search context.
- `src/app/search/_state/__tests__/search-context-storage.test.ts`: verifies search context storage behavior.
- `src/components/video-card/__tests__/use-video-card-actions.test.ts`: verifies video-card user action behavior.
- `src/hooks/__tests__/use-search-execution.test.ts`: verifies stale payload/business execution guards for search runs.
- `src/hooks/__tests__/useSearchResultFilters.test.ts`: verifies search result filtering behavior.
- `src/lib/__tests__/proxy-matcher.test.ts`: verifies proxy matching behavior used by application routing.
- `src/lib/search/__tests__/abortable-search.test.ts`: verifies abortable search behavior for request lifecycle control.
- `src/server/api/__tests__/guards.test.ts`: verifies server-side guard behavior for API access control.
