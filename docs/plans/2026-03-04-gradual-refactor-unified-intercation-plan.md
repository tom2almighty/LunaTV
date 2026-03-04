# Core-Business-Preserving Gradual Refactor Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Keep all core business behaviors (search/play/source-switch/episode-select/progress/favorites/play-records/skip-config/admin/m3u8-ad-filter) while simplifying code and unifying frontend-backend-database interactions.

**Architecture:** Introduce one interaction chain: `UI/Hook -> typed client -> API handler -> service -> repository -> SQLite`. Migrate by domain in small batches, preserving current API contracts first, then remove redundant paths. For m3u8 ad filtering, use a complexity gate: only add admin-managed config if it stays low-complexity and does not break the unification goal.

**Tech Stack:** Next.js App Router, TypeScript, Vitest, Testing Library, better-sqlite3.

---

### Task 1: Freeze Core Business Scope and Regression Guardrails

**Files:**

- Create: `docs/testing/core-business-regression-matrix.md`
- Modify: `docs/testing/business-test-inventory.md`

**Step 1: Define protected core business flows**

Document must include at least:

- Search (normal + stream), open play, source switch, episode switch.
- Favorites CRUD.
- Play-records CRUD and resume.
- Skip-config CRUD and intro/outro skip behavior.
- m3u8 ad-filter toggle behavior.
- Admin: user/user-group/source/site-settings/data-migration critical paths.

**Step 2: Map each flow to tests and manual smoke steps**

For each flow, mark:

- Existing automated test file(s), or
- Manual smoke command/path if missing.

**Step 3: Baseline verification**

Run:

- `pnpm test:business`
- `pnpm test:run`

Expected: PASS.

**Step 4: Commit**

```bash
git add docs/testing/core-business-regression-matrix.md docs/testing/business-test-inventory.md
git commit -m "docs: freeze core business regression guardrails for gradual refactor"
```

### Task 2: Introduce Unified API Handler Foundation (No Behavior Change)

**Files:**

- Create: `src/server/api/handler.ts`
- Modify: `src/server/api/http.ts`
- Test: `src/server/api/__tests__/handler.test.ts`

**Step 1: Add common API execution wrapper**

Implement wrapper for:

- Auth requirement (optional per route).
- Standard success/error response shape.
- Central error mapping (`ApiAuthError`, validation error, unknown error).

**Step 2: Add tests for wrapper behavior**

Test:

- unauthorized -> 401
- business error -> mapped status/code/message
- unknown error -> 500

**Step 3: Verify**

Run:

- `pnpm vitest run src/server/api/__tests__/handler.test.ts src/server/api/__tests__/guards.test.ts`

Expected: PASS.

**Step 4: Commit**

```bash
git add src/server/api/handler.ts src/server/api/http.ts src/server/api/__tests__/handler.test.ts
git commit -m "refactor: add unified api handler foundation"
```

### Task 3: Unify User-Domain Routes via Handler Template

**Files:**

- Modify: `src/app/api/user/favorites/route.ts`
- Modify: `src/app/api/user/favorites/[source]/[videoId]/route.ts`
- Modify: `src/app/api/user/play-records/route.ts`
- Modify: `src/app/api/user/play-records/[source]/[videoId]/route.ts`
- Modify: `src/app/api/user/skip-configs/route.ts`
- Modify: `src/app/api/user/skip-configs/[source]/[videoId]/route.ts`
- Modify: `src/app/api/user/search-history/route.ts`
- Modify: `src/app/api/user/search-history/[keyword]/route.ts`

**Step 1: Migrate route entry logic to common handler**

Keep existing API contract and payload fields unchanged.

**Step 2: Remove duplicated try/catch/auth boilerplate**

Route files should focus only on:

- input parsing
- calling service/repository
- returning business payload

**Step 3: Verify core user-domain behavior**

Run:

- `pnpm vitest run src/components/video-card/__tests__/use-video-card-actions.test.ts src/app/play/hooks/__tests__/use-play-return-to-search.test.ts`
- `pnpm test:business`

Expected: PASS.

**Step 4: Commit**

```bash
git add src/app/api/user
git commit -m "refactor: unify user-domain api routes with common handler"
```

### Task 4: Add Repository Layer for User Data (DB Interaction Unification)

**Files:**

- Create: `src/server/repositories/user-data-repository.ts`
- Modify: `src/lib/db.server.ts`
- Modify: user-domain route files from Task 3

**Step 1: Extract user data repository**

Repository covers:

- favorites
- play-records
- search-history
- skip-configs

**Step 2: Route layer uses repository only**

No direct SQL/helper wiring in route files.

**Step 3: Keep schema and SQL behavior unchanged**

Do not change tables/indexes in this task.

**Step 4: Verify**

Run:

- `pnpm test:business`
- `pnpm typecheck`

Expected: PASS.

**Step 5: Commit**

```bash
git add src/server/repositories/user-data-repository.ts src/lib/db.server.ts src/app/api/user
git commit -m "refactor: introduce user-data repository for unified db access"
```

### Task 5: Consolidate Frontend Typed API Client (UI -> API Unification)

**Files:**

- Create: `src/lib/api/client.ts`
- Create: `src/lib/api/user-data-client.ts`
- Modify: `src/lib/db/api-client.ts`
- Modify: `src/lib/db/favorites.ts`
- Modify: `src/lib/db/play-records.ts`
- Modify: `src/lib/db/search-history.ts`
- Modify: `src/lib/db/skip-configs.ts`

**Step 1: Introduce one typed HTTP client**

Centralize:

- request init defaults
- JSON parsing
- API error normalization
- auth-expired behavior

**Step 2: Repoint db client modules to shared typed client**

Keep current public function names so page-level business code is not disrupted.

**Step 3: Verify user-facing behavior**

Run:

- `pnpm vitest run src/components/video-card/__tests__/use-video-card-actions.test.ts src/app/login/__tests__/page.test.tsx`
- `pnpm test:business`

Expected: PASS.

**Step 4: Commit**

```bash
git add src/lib/api src/lib/db
git commit -m "refactor: consolidate frontend typed api client for user-data domains"
```

### Task 6: Split Play Runtime by Responsibility Without Behavior Changes

**Files:**

- Create: `src/app/play/services/m3u8-ad-filter.ts`
- Create: `src/app/play/services/play-progress-service.ts`
- Create: `src/app/play/services/skip-config-service.ts`
- Modify: `src/app/play/components/play-player-runtime.tsx`

**Step 1: Extract pure m3u8 filter function**

Move ad-filter logic from component body into pure utility + tests.

**Step 2: Extract play-progress and skip-config side-effect helpers**

Keep existing UX and persistence behavior identical.

**Step 3: Verify core play behaviors**

Run:

- `pnpm vitest run src/app/play/hooks/__tests__/use-play-page-state.test.ts src/app/play/hooks/__tests__/use-play-progress.test.ts`
- `pnpm test:business`

Expected: PASS.

**Step 4: Commit**

```bash
git add src/app/play/services src/app/play/components/play-player-runtime.tsx
git commit -m "refactor: split play runtime into focused services"
```

### Task 7: m3u8 Ad-Filter Backend Config Gate (Conditional Task)

**Files (if gate passes):**

- Modify: `src/lib/admin.types.ts`
- Modify: `src/lib/config.ts`
- Modify: `src/lib/runtime-config.ts`
- Modify: `src/app/layout.tsx`
- Modify: `src/app/api/admin/settings/site/route.ts`
- Modify: `src/app/admin/_components/SiteConfigComponent.tsx`
- Modify: `src/app/play/components/play-player-runtime.tsx`
- Modify: `src/app/api/public/site/route.ts`

**Step 1: Complexity gate decision**

Proceed only if all are true:

- only need global site-level toggle (`M3U8AdFilterEnabled`)
- no per-source/per-rule DSL
- no extra DB table needed (stored in existing SiteConfig JSON)
- no route contract break

If any false, skip this task and add decision note to docs.

**Step 2 (when proceeding): Add site-level toggle**

Add `M3U8AdFilterEnabled` to site config type and admin settings save API.

**Step 3 (when proceeding): Wire runtime usage**

Runtime default comes from server config, while keeping local user toggle optional as override.

**Step 4: Verify**

Run:

- `pnpm test:business`
- `pnpm lint`

Expected: PASS.

**Step 5: Commit**

```bash
git add src/lib/admin.types.ts src/lib/config.ts src/lib/runtime-config.ts src/app/layout.tsx src/app/api/admin/settings/site/route.ts src/app/admin/_components/SiteConfigComponent.tsx src/app/play/components/play-player-runtime.tsx src/app/api/public/site/route.ts
git commit -m "feat: add site-managed m3u8 ad-filter toggle with runtime wiring"
```

### Task 8: Unify Search/Play Session Route-Service Boundary

**Files:**

- Modify: `src/app/api/search/route.ts`
- Modify: `src/app/api/search/stream/route.ts`
- Modify: `src/app/api/play/sessions/route.ts`
- Modify: `src/app/api/play/sessions/[sessionId]/route.ts`
- Modify: `src/app/api/play/sessions/[sessionId]/current/route.ts`
- Modify: `src/server/services/search-service.ts`
- Modify: `src/lib/play-session.ts`

**Step 1: Move route-level business branches into service functions**

Routes keep transport concerns only.

**Step 2: Normalize service error surface**

Service emits typed business errors consumed by API handler.

**Step 3: Verify**

Run:

- `pnpm vitest run src/hooks/__tests__/use-search-execution.test.ts src/app/search/__tests__/search-context-restore.test.tsx`
- `pnpm test:business`

Expected: PASS.

**Step 4: Commit**

```bash
git add src/app/api/search src/app/api/play/sessions src/server/services/search-service.ts src/lib/play-session.ts
git commit -m "refactor: unify search and play-session route service boundaries"
```

### Task 9: Unify Admin Domain API Pattern (User/Group/Source/Settings)

**Files:**

- Modify: `src/app/api/admin/users/**/*.ts`
- Modify: `src/app/api/admin/user-groups/**/*.ts`
- Modify: `src/app/api/admin/sources/**/*.ts`
- Modify: `src/app/api/admin/settings/**/*.ts`
- Modify: `src/app/api/admin/system/reset/route.ts`
- Modify: `src/server/services/admin-user-service.ts`

**Step 1: Apply common API handler to admin routes**

Keep existing endpoint contracts unchanged.

**Step 2: Consolidate permission checks**

Use shared guard entry points instead of route-local ad-hoc checks.

**Step 3: Verify**

Run:

- `pnpm vitest run src/app/admin/_components/user-config/__tests__/use-user-config-actions.test.ts src/app/admin/_components/user-config/__tests__/user-group-actions.test.ts`
- `pnpm test:business`

Expected: PASS.

**Step 4: Commit**

```bash
git add src/app/api/admin src/server/services/admin-user-service.ts
git commit -m "refactor: unify admin api domain pattern and permission checks"
```

### Task 10: Remove Redundant Code/Template Paths

**Files:**

- Modify: `src/lib/db/index.ts`
- Modify: `src/lib/db/*.ts`
- Modify: `src/lib/config.ts`
- Delete/Modify: any dead files found by static checks
- Update docs: `README.md`, `docs/plans/2026-03-04-restful-api-route-map.md`

**Step 1: Static cleanup pass**

Run unused/dead-code detection and remove only proven-unused paths.

**Step 2: Keep one blessed path per concern**

- One frontend request entry.
- One API handler template.
- One repository access path per domain.

**Step 3: Verify**

Run:

- `pnpm test:business`
- `pnpm test:run`
- `pnpm lint`
- `pnpm typecheck`

Expected: PASS.

**Step 4: Commit**

```bash
git add src README.md docs/plans/2026-03-04-restful-api-route-map.md
git commit -m "refactor: prune redundant code paths after interaction unification"
```

### Task 11: Final Validation, Risk Checklist, and Inventory Refresh

**Files:**

- Modify: `docs/testing/core-business-regression-matrix.md`
- Modify: `docs/testing/business-test-inventory.md`
- Create: `docs/testing/refactor-risk-checklist.md`

**Step 1: Refresh coverage mapping**

Ensure each protected business capability maps to automated tests and/or smoke checklist.

**Step 2: Run full final verification**

Run:

- `pnpm test:business`
- `pnpm test:run`
- `pnpm lint`
- `pnpm typecheck`

Expected: PASS.

**Step 3: Commit**

```bash
git add docs/testing
git commit -m "docs: finalize core business coverage and refactor risk checklist"
```
