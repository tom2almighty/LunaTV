# Douban Proxy Modes and Runtime Config Sync Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix `window.RUNTIME_CONFIG` not matching admin settings, and add independent preset-proxy pools for Douban data/image with 3 selectable modes (`server`, `preset`, `custom`) in both admin and frontend user settings.

**Architecture:** Promote proxy settings to a normalized SiteConfig model with explicit mode + preset-id + custom-url for data/image separately. Remove old two-mode fields directly (no backward compatibility). Inject runtime config from fresh server config every request, and centralize frontend proxy resolution logic so `UserMenu`, Douban data fetch, and image proxy share exactly one source of truth.

**Tech Stack:** Next.js App Router, TypeScript, React 19, route handlers, Vitest, Testing Library.

---

### Task 1: Normalize SiteConfig Schema (No Backward Compatibility)

**Files:**

- Modify: `src/lib/admin.types.ts`
- Modify: `src/lib/config.ts`
- Modify: `src/lib/runtime-config.ts`
- Modify: `src/app/api/admin/settings/site/route.ts`
- Test: `src/lib/__tests__/runtime-config.test.ts` (new)

**Step 1: Write failing test for runtime config shape**

```ts
// src/lib/__tests__/runtime-config.test.ts
import { buildRuntimeConfig } from '@/lib/runtime-config';

it('builds runtime config with new douban proxy schema', () => {
  const runtime = buildRuntimeConfig({
    // ... minimal required fields
    DoubanDataProxyMode: 'preset',
    DoubanDataProxyPresetId: 'data-a',
    DoubanDataProxyCustomUrl: '',
    DoubanDataProxyPresets: [
      { id: 'data-a', name: 'A', url: 'https://a/?url=' },
    ],
    DoubanImageProxyMode: 'server',
    DoubanImageProxyPresetId: '',
    DoubanImageProxyCustomUrl: '',
    DoubanImageProxyPresets: [],
  } as any);

  expect(runtime.DOUBAN_DATA_PROXY_MODE).toBe('preset');
  expect(runtime.DOUBAN_DATA_PROXY_PRESETS).toHaveLength(1);
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/lib/__tests__/runtime-config.test.ts`  
Expected: FAIL (missing new fields/types in runtime config).

**Step 3: Implement new schema end-to-end**

```ts
// SiteConfig (remove old DoubanProxyType/DoubanProxy/... fields)
type DoubanProxyMode = 'server' | 'preset' | 'custom';
type DoubanProxyPreset = { id: string; name: string; url: string };

DoubanDataProxyMode: DoubanProxyMode;
DoubanDataProxyPresetId: string;
DoubanDataProxyCustomUrl: string;
DoubanDataProxyPresets: DoubanProxyPreset[];
DoubanImageProxyMode: DoubanProxyMode;
DoubanImageProxyPresetId: string;
DoubanImageProxyCustomUrl: string;
DoubanImageProxyPresets: DoubanProxyPreset[];
```

**Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/lib/__tests__/runtime-config.test.ts`  
Expected: PASS.

**Step 5: Commit**

```bash
git add src/lib/admin.types.ts src/lib/config.ts src/lib/runtime-config.ts src/app/api/admin/settings/site/route.ts src/lib/__tests__/runtime-config.test.ts
git commit -m "refactor: normalize douban proxy schema for data/image modes"
```

---

### Task 2: Fix Runtime Config Staleness (Root Cause of Mismatch)

**Files:**

- Modify: `src/lib/config.ts`
- Modify: `src/app/layout.tsx`
- Modify: `src/app/api/admin/settings/site/route.ts`
- Modify: `src/app/api/admin/settings/config-file/route.ts`
- Modify: `src/app/api/cron/route.ts`
- Test: `src/lib/__tests__/config-freshness.test.ts` (new)

**Step 1: Write failing freshness test**

```ts
// pseudo: mock db getAdminConfig returning v1 then v2
it('getConfig reflects latest persisted config', async () => {
  expect((await getConfig()).SiteConfig.SiteName).toBe('v1');
  // simulate db changed externally
  expect((await getConfig()).SiteConfig.SiteName).toBe('v2');
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/lib/__tests__/config-freshness.test.ts`  
Expected: FAIL (current in-memory cache returns stale value).

**Step 3: Implement freshness fix**

```ts
// src/lib/config.ts
// remove long-lived cachedConfig for reads, always read DB in getConfig()
// keep only safe init path when DB empty
```

Also enforce fresh layout runtime injection:

```ts
// src/app/layout.tsx
export const dynamic = 'force-dynamic';
export const revalidate = 0;
```

After config writes and cron/config-file refresh, trigger path invalidation:

```ts
import { revalidatePath } from 'next/cache';
revalidatePath('/', 'layout');
```

**Step 4: Run targeted tests**

Run:

- `pnpm vitest run src/lib/__tests__/config-freshness.test.ts`
- `pnpm vitest run src/lib/__tests__/runtime-config.test.ts`

Expected: PASS.

**Step 5: Commit**

```bash
git add src/lib/config.ts src/app/layout.tsx src/app/api/admin/settings/site/route.ts src/app/api/admin/settings/config-file/route.ts src/app/api/cron/route.ts src/lib/__tests__/config-freshness.test.ts
git commit -m "fix: ensure runtime config uses fresh admin settings"
```

---

### Task 3: Add Shared Frontend Douban Proxy Resolver

**Files:**

- Create: `src/lib/douban-proxy-settings.ts`
- Modify: `src/lib/douban.client.ts`
- Modify: `src/lib/utils.ts`
- Test: `src/lib/__tests__/douban-proxy-settings.test.ts` (new)

**Step 1: Write failing resolver tests**

```ts
it('resolves data proxy url from preset mode', () => {
  const result = resolveDoubanDataProxy({
    runtime: {
      mode: 'server',
      presets: [{ id: 'p1', url: 'https://p/?url=' }],
    },
    storage: { mode: 'preset', presetId: 'p1' },
  });
  expect(result.proxyType).toBe('custom');
  expect(result.proxyUrl).toBe('https://p/?url=');
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/lib/__tests__/douban-proxy-settings.test.ts`  
Expected: FAIL (module not found).

**Step 3: Implement resolver and wire callers**

```ts
// resolve modes: server -> server API
// preset -> lookup preset id, fallback server when missing
// custom -> use custom url if non-empty else fallback server
```

Use this resolver in:

- `getDoubanProxyConfig()` in `douban.client.ts`
- `getDoubanImageProxyConfig()` in `utils.ts`

**Step 4: Run tests**

Run:

- `pnpm vitest run src/lib/__tests__/douban-proxy-settings.test.ts`
- `pnpm vitest run src/lib/__tests__/runtime-config.test.ts`

Expected: PASS.

**Step 5: Commit**

```bash
git add src/lib/douban-proxy-settings.ts src/lib/douban.client.ts src/lib/utils.ts src/lib/__tests__/douban-proxy-settings.test.ts
git commit -m "refactor: centralize douban proxy mode resolution"
```

---

### Task 4: Extend Admin SiteConfig UI for Independent Preset Pools

**Files:**

- Modify: `src/app/admin/_components/SiteConfigComponent.tsx`
- Modify: `src/app/api/admin/settings/site/route.ts`
- Modify: `src/lib/admin.types.ts` (if needed by component typing)
- Test: `src/app/admin/_components/__tests__/site-config-proxy-presets.test.tsx` (new)

**Step 1: Write failing UI test**

```tsx
it('shows 3 options for data/image proxy mode and manages preset list', () => {
  // render SiteConfigComponent with initial config
  // assert: server/preset/custom options exist for both sections
  // assert: can add preset row and edit name/url
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/app/admin/_components/__tests__/site-config-proxy-presets.test.tsx`  
Expected: FAIL.

**Step 3: Implement UI + payload changes**

Implementation requirements:

- Data and image preset lists are separate and independent.
- Each section supports:
  - mode selector: `server | preset | custom`
  - preset selector (when mode=`preset`)
  - custom URL input (when mode=`custom`)
  - preset list management (add/remove/edit `name` + `url`)
- POST payload sends only new schema fields; old fields removed.

**Step 4: Run tests**

Run:

- `pnpm vitest run src/app/admin/_components/__tests__/site-config-proxy-presets.test.tsx`
- `pnpm vitest run src/lib/__tests__/runtime-config.test.ts`

Expected: PASS.

**Step 5: Commit**

```bash
git add src/app/admin/_components/SiteConfigComponent.tsx src/app/api/admin/settings/site/route.ts src/app/admin/_components/__tests__/site-config-proxy-presets.test.tsx
git commit -m "feat: support independent douban proxy preset pools in admin"
```

---

### Task 5: Update Frontend UserMenu for 3-Mode Selection

**Files:**

- Modify: `src/components/UserMenu.tsx`
- Modify: `src/lib/douban.client.ts`
- Modify: `src/lib/utils.ts`
- Test: `src/components/__tests__/user-menu-douban-proxy.test.tsx` (new)

**Step 1: Write failing frontend behavior test**

```tsx
it('uses runtime default on first load and localStorage overrides at runtime', async () => {
  // runtime default mode = preset, localStorage empty -> preset selected
  // then set localStorage mode=custom -> custom selected
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/components/__tests__/user-menu-douban-proxy.test.tsx`  
Expected: FAIL.

**Step 3: Implement UserMenu state model**

New local keys (no compatibility fallback):

- `doubanDataProxyMode`
- `doubanDataProxyPresetId`
- `doubanDataProxyCustomUrl`
- `doubanImageProxyMode`
- `doubanImageProxyPresetId`
- `doubanImageProxyCustomUrl`

UI requirements:

- Data/Image sections each have 3 options.
- `preset` option uses respective preset pool from runtime config.
- `reset` writes runtime defaults to the new keys.

**Step 4: Run tests**

Run:

- `pnpm vitest run src/components/__tests__/user-menu-douban-proxy.test.tsx`
- `pnpm test:business`

Expected: PASS.

**Step 5: Commit**

```bash
git add src/components/UserMenu.tsx src/lib/douban.client.ts src/lib/utils.ts src/components/__tests__/user-menu-douban-proxy.test.tsx
git commit -m "feat: add 3-mode douban proxy settings in user menu"
```

---

### Task 6: Validation, Cleanup, and Documentation

**Files:**

- Modify: `README.md`
- Modify: `src/lib/config.ts` (final self-check defaults)
- Optional: `docs/plans/2026-03-05-douban-proxy-modes-and-runtime-config-sync.md` (status notes)

**Step 1: Add failing validation tests for invalid payload**

```ts
it('rejects invalid preset URL and invalid mode', async () => {
  // mode not in server/preset/custom => 400
  // preset URL empty or malformed => 400
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/server/api/__tests__/guards.test.ts`  
Expected: FAIL (until new validation added where applicable).

**Step 3: Implement strict validation + docs update**

Validation:

- Mode must be one of `server|preset|custom`.
- Preset IDs unique per pool.
- Preset URL must be non-empty HTTP/HTTPS.

Docs:

- Replace old env and old field descriptions with new proxy schema.
- Document explicitly: no backward compatibility; old keys/fields are obsolete.

**Step 4: Full verification**

Run:

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test:run`

Expected: all PASS.

**Step 5: Commit**

```bash
git add README.md src/lib/config.ts
git commit -m "docs: document new douban proxy modes and preset pools"
```

---

### Release Checklist

1. Admin updates Douban data/image proxy settings and saves.
2. Hard-refresh frontend page; verify `window.RUNTIME_CONFIG` matches admin exactly.
3. Clear `localStorage`; verify first-load selection equals runtime defaults.
4. Set frontend local overrides; verify runtime behavior follows local values.
5. Verify data proxy and image proxy pools remain independent.
6. Verify no code path references old fields or old localStorage keys.
