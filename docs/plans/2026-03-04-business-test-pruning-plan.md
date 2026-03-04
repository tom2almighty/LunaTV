# Business-Only Test Suite Pruning Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Keep only business-behavior tests and remove implementation-detail tests that assert file text, file length, route string literals, or existence-only checks.

**Architecture:** Use a prune-and-verify approach: first define explicit keep/remove rules, then delete low-value tests, then rewrite mixed-value tests into behavior assertions. Run fast targeted checks after each task and full verification at the end.

**Tech Stack:** Vitest, Testing Library, Next.js app router, TypeScript.

**Scope Reference:** `docs/testing/business-test-scope.md` is the canonical keep/remove rule set for this plan.

---

### Task 1: Lock Test Scope (Business-Only Definition)

**Files:**

- Create: `docs/testing/business-test-scope.md`
- Modify: `docs/plans/2026-03-04-business-test-pruning-plan.md`

**Step 1: Write scope document**

Create `docs/testing/business-test-scope.md` with:

- Keep: user-facing behaviors, business rules, API behavior contracts, permission logic, state restore flows.
- Remove: source-code text scanning (`readFileSync` over app source), line-count constraints, endpoint rename snapshots, "function exists" assertions.

**Step 2: Record current baseline**

Run: `pnpm test:run`  
Expected: All tests pass before pruning starts.

**Step 3: Commit**

```bash
git add docs/testing/business-test-scope.md docs/plans/2026-03-04-business-test-pruning-plan.md
git commit -m "docs: define business-only test scope for pruning"
```

### Task 2: Remove Non-Business Contract/String Tests

**Files:**

- Delete: `src/lib/__tests__/admin-route-renames.test.ts`
- Delete: `src/lib/__tests__/api-routes.test.ts`
- Delete: `src/lib/__tests__/legacy-endpoints.test.ts`
- Delete: `src/app/api/admin/users/__tests__/routes.test.ts`
- Delete: `src/app/play/hooks/__tests__/play-query-contract.test.ts`
- Delete: `src/hooks/__tests__/use-play-session-bootstrap.test.ts`
- Delete: `src/lib/__tests__/next-config-policy.test.ts`

**Step 1: Delete files**

Remove the listed files.

**Step 2: Verify no stale imports**

Run: `rg -n "admin-route-renames|api-routes|legacy-endpoints|play-query-contract|use-play-session-bootstrap|next-config-policy" src`  
Expected: No test references remain.

**Step 3: Run targeted tests**

Run: `pnpm vitest run src/app/login/__tests__/page.test.tsx src/app/search/__tests__/search-context-restore.test.tsx src/components/video-card/__tests__/use-video-card-actions.test.ts`  
Expected: PASS.

**Step 4: Commit**

```bash
git add src/lib/__tests__ src/app/api/admin/users/__tests__ src/app/play/hooks/__tests__ src/hooks/__tests__
git commit -m "test: remove non-business source-contract tests"
```

### Task 3: Rewrite Mixed Tests to Pure Behavior

**Files:**

- Modify: `src/hooks/__tests__/use-search-execution.test.ts`
- Modify: `src/app/play/hooks/__tests__/use-play-page-state.test.ts`

**Step 1: Write failing behavior test for search staleness logic**

In `use-search-execution.test.ts`, add a case that must fail first:

- same query, same run token => payload is not stale.
- same query, lower payload token => stale.

Run: `pnpm vitest run src/hooks/__tests__/use-search-execution.test.ts`  
Expected: FAIL before implementation/test adjustment, then PASS after update.

**Step 2: Remove non-business assertions**

Delete assertions that scan source files for route strings or line counts.

**Step 3: Keep only user/business behavior assertions**

`use-play-page-state.test.ts` should only validate episode index behavior, not component file length.

**Step 4: Commit**

```bash
git add src/hooks/__tests__/use-search-execution.test.ts src/app/play/hooks/__tests__/use-play-page-state.test.ts
git commit -m "test: keep behavior-only assertions in mixed tests"
```

### Task 4: Replace Meaningless Admin Test with Business Action Test

**Files:**

- Modify: `src/app/admin/_components/user-config/__tests__/user-group-actions.test.ts`

**Step 1: Write failing test**

Replace the current "function exists" assertion with:

- mock `fetch`
- call `submitUserGroupUpdate` with `add` and `edit`
- assert endpoint/method/body are correct.

Run: `pnpm vitest run src/app/admin/_components/user-config/__tests__/user-group-actions.test.ts`  
Expected: FAIL first, then PASS after completing test setup/mocks.

**Step 2: Keep test business-focused**

Ensure assertions validate behavior:

- action -> endpoint mapping
- request payload correctness
- error propagation on non-OK response.

**Step 3: Commit**

```bash
git add src/app/admin/_components/user-config/__tests__/user-group-actions.test.ts
git commit -m "test: cover user-group action behavior instead of existence check"
```

### Task 5: Full Verification and Test Inventory Update

**Files:**

- Create: `docs/testing/business-test-inventory.md`

**Step 1: Build final inventory**

List retained tests and business reason per file.

**Step 2: Run full verification**

Run:

- `pnpm test:run`
- `pnpm lint`
- `pnpm typecheck`

Expected: all pass.

**Step 3: Commit**

```bash
git add docs/testing/business-test-inventory.md
git commit -m "docs: add business test inventory after pruning"
```

### Task 6: Optional Safety Net (If You Want More Confidence)

**Files:**

- Optional modify: `vitest.config.ts`
- Optional add: `package.json` scripts

**Step 1: Add `test:business` script (optional)**

Create a script that runs only retained business test files for fast CI path.

**Step 2: Keep full `test:run` for nightly/full checks**

Do not remove the full suite command; use business suite for PR speed only.

**Step 3: Commit (optional)**

```bash
git add package.json vitest.config.ts
git commit -m "test: add business-only test script for faster feedback"
```
