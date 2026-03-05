# API & Frontend Consistency and Smoothness Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 统一后端 API 鉴权与响应协议，并消除前端搜索页/滚动链路中的主要卡顿点。

**Architecture:** 先收敛服务端（鉴权 + 响应协议 + RAW 路由迁移），再收敛客户端调用层，最后处理前端性能热点（滚动可见性、虚拟网格监听、聚合统计重复计算）。通过小步 TDD + 任务级提交保障可回滚性。

**Tech Stack:** Next.js App Router, TypeScript, React 19, Vitest, Testing Library

---

执行提示：

- 失败排查使用 `@superpowers/systematic-debugging`
- 实现阶段严格按 `@superpowers/test-driven-development` 先测后改

### Task 1: 建立统一 API 契约与测试基线

**Files:**

- Modify: `src/server/api/handler.ts`
- Modify: `src/server/api/http.ts`
- Modify: `src/server/api/__tests__/handler.test.ts`
- Create: `src/server/api/__tests__/response-contract.test.ts`

**Step 1: 写失败测试（约束成功/失败结构）**

```ts
it('returns standard success envelope by default', async () => {
  const res = await executeApiHandler(req, async () => ({ id: '1' }));
  expect(await res.json()).toEqual({ success: true, data: { id: '1' } });
});

it('returns standard error envelope by default', async () => {
  const res = await executeApiHandler(req, async () => {
    throw new ApiValidationError('bad');
  });
  expect(await res.json()).toMatchObject({
    success: false,
    error: { code: 'VALIDATION_ERROR', message: 'bad' },
  });
});
```

**Step 2: 运行测试确认失败**

Run: `pnpm vitest run src/server/api/__tests__/response-contract.test.ts -t "envelope"`
Expected: FAIL（当前 RAW/标准行为混合导致断言不稳定）

**Step 3: 最小实现（确保默认标准协议稳定）**

```ts
// handler.ts
const { responseShape = 'standard' } = options;
// success: jsonApiSuccess(...)
// error: jsonApiError(...)
```

**Step 4: 运行测试确认通过**

Run: `pnpm vitest run src/server/api/__tests__/handler.test.ts src/server/api/__tests__/response-contract.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/server/api/handler.ts src/server/api/http.ts src/server/api/__tests__/handler.test.ts src/server/api/__tests__/response-contract.test.ts
git commit -m "test(api): lock response contract with standard envelope"
```

### Task 2: 强化鉴权校验（签名验证 + 活跃用户一致性）

**Files:**

- Create: `src/server/api/auth-verifier.ts`
- Modify: `src/server/api/guards.ts`
- Modify: `src/proxy.ts`
- Modify: `src/server/api/__tests__/guards.test.ts`

**Step 1: 写失败测试（伪造 cookie 不通过）**

```ts
it('rejects tampered auth cookie signature', async () => {
  await expect(
    requireActiveUsername(requestWithTamperedCookie),
  ).rejects.toThrow('Unauthorized');
});
```

**Step 2: 运行测试确认失败**

Run: `pnpm vitest run src/server/api/__tests__/guards.test.ts -t "tampered"`
Expected: FAIL

**Step 3: 最小实现（抽离并复用签名验证）**

```ts
// auth-verifier.ts
export async function verifyAuthSignature(username: string, signature: string) {
  // HMAC-SHA256 verify
}

// guards.ts
if (!authInfo?.username || !authInfo?.signature)
  throw new ApiAuthError('Unauthorized');
const ok = await verifyAuthSignature(authInfo.username, authInfo.signature);
if (!ok) throw new ApiAuthError('Unauthorized');
```

**Step 4: 运行测试确认通过**

Run: `pnpm vitest run src/server/api/__tests__/guards.test.ts src/lib/__tests__/proxy-matcher.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/server/api/auth-verifier.ts src/server/api/guards.ts src/proxy.ts src/server/api/__tests__/guards.test.ts
git commit -m "feat(auth): enforce cookie signature verification in api guards"
```

### Task 3: 迁移账号相关 RAW 路由到统一 handler

**Files:**

- Modify: `src/app/api/auth/sessions/route.ts`
- Modify: `src/app/api/auth/sessions/current/route.ts`
- Modify: `src/app/api/users/route.ts`
- Modify: `src/app/api/users/current/password/route.ts`
- Modify: `src/app/login/__tests__/page.test.tsx`

**Step 1: 写失败测试（登录/注册/改密返回协议一致）**

```ts
expect(body).toMatchObject({ success: true, data: { ok: true } });
expect(errorBody).toMatchObject({
  success: false,
  error: { code: expect.any(String) },
});
```

**Step 2: 运行测试确认失败**

Run: `pnpm vitest run src/app/login/__tests__/page.test.tsx`
Expected: FAIL（页面对旧 `error` 文本路径有依赖）

**Step 3: 最小实现（统一 executeApiHandler + 显式错误码）**

```ts
return executeApiHandler(
  request,
  async () => {
    // validate body
    return { ok: true };
  },
  { requireAuth: false, responseShape: 'standard' },
);
```

**Step 4: 运行测试确认通过**

Run: `pnpm vitest run src/app/login/__tests__/page.test.tsx src/server/api/__tests__/handler.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/app/api/auth/sessions/route.ts src/app/api/auth/sessions/current/route.ts src/app/api/users/route.ts src/app/api/users/current/password/route.ts src/app/login/__tests__/page.test.tsx
git commit -m "refactor(api): migrate auth and user routes to unified handler"
```

### Task 4: 迁移高风险 RAW 路由（管理员迁移 + 视频详情）

**Files:**

- Modify: `src/app/api/admin/data-migrations/export/route.ts`
- Modify: `src/app/api/admin/data-migrations/import/route.ts`
- Modify: `src/app/api/sources/[source]/videos/[videoId]/route.ts`
- Create: `src/app/api/__tests__/data-migration-routes.test.ts`

**Step 1: 写失败测试（权限不足、参数错误、成功下载）**

```ts
expect(res.status).toBe(401);
expect(json.error.code).toBe('UNAUTHORIZED');
```

**Step 2: 运行测试确认失败**

Run: `pnpm vitest run src/app/api/__tests__/data-migration-routes.test.ts`
Expected: FAIL

**Step 3: 最小实现（改用 executeAdminApiHandler / executeApiHandler）**

```ts
return executeAdminApiHandler(
  request,
  async ({ username }) => {
    // export/import logic
    return new NextResponse(binary, { headers });
  },
  { ownerOnly: true },
);
```

**Step 4: 运行测试确认通过**

Run: `pnpm vitest run src/app/api/__tests__/data-migration-routes.test.ts src/server/api/__tests__/handler.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/app/api/admin/data-migrations/export/route.ts src/app/api/admin/data-migrations/import/route.ts src/app/api/sources/[source]/videos/[videoId]/route.ts src/app/api/__tests__/data-migration-routes.test.ts
git commit -m "refactor(api): unify admin migration and source detail routes"
```

### Task 5: 消除 back-to-top 常驻轮询

**Files:**

- Modify: `src/hooks/useBackToTopVisibility.ts`
- Create: `src/hooks/__tests__/useBackToTopVisibility.test.ts`

**Step 1: 写失败测试（仅滚动事件触发更新）**

```ts
expect(requestAnimationFrame).not.toHaveBeenCalled();
fireEvent.scroll(document.body);
expect(result.current).toBe(true);
```

**Step 2: 运行测试确认失败**

Run: `pnpm vitest run src/hooks/__tests__/useBackToTopVisibility.test.ts`
Expected: FAIL

**Step 3: 最小实现（事件驱动 + raf 节流）**

```ts
const onScroll = () => {
  if (rafId != null) return;
  rafId = requestAnimationFrame(() => {
    rafId = null;
    setVisible(readScrollTop() > threshold);
  });
};
```

**Step 4: 运行测试确认通过**

Run: `pnpm vitest run src/hooks/__tests__/useBackToTopVisibility.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/hooks/useBackToTopVisibility.ts src/hooks/__tests__/useBackToTopVisibility.test.ts
git commit -m "perf(search): remove perpetual raf loop in back-to-top hook"
```

### Task 6: 搜索页渲染链路降耗（虚拟网格 + 聚合统计）

**Files:**

- Modify: `src/hooks/useSearchVirtualGrid.ts`
- Modify: `src/hooks/useSearchResultFilters.ts`
- Modify: `src/app/search/SearchPageClient.tsx`
- Modify: `src/hooks/__tests__/useSearchResultFilters.test.ts`
- Create: `src/hooks/__tests__/useSearchVirtualGrid.test.ts`

**Step 1: 写失败测试（不重复重建 observer，聚合统计可复用）**

```ts
expect(buildStatsSpy).toHaveBeenCalledTimes(1);
expect(observeSpy).toHaveBeenCalledTimes(1);
```

**Step 2: 运行测试确认失败**

Run: `pnpm vitest run src/hooks/__tests__/useSearchResultFilters.test.ts src/hooks/__tests__/useSearchVirtualGrid.test.ts`
Expected: FAIL

**Step 3: 最小实现**

```ts
// useSearchVirtualGrid.ts
useEffect(() => {
  /* observer init */
}, [showResults, viewMode]);

// useSearchResultFilters.ts
const groupStatsMap = useMemo(() => {
  // precompute once per aggregatedResults
}, [aggregatedResults]);
```

**Step 4: 运行测试确认通过**

Run: `pnpm vitest run src/hooks/__tests__/useSearchResultFilters.test.ts src/hooks/__tests__/useSearchVirtualGrid.test.ts src/hooks/__tests__/use-search-execution.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/hooks/useSearchVirtualGrid.ts src/hooks/useSearchResultFilters.ts src/app/search/SearchPageClient.tsx src/hooks/__tests__/useSearchResultFilters.test.ts src/hooks/__tests__/useSearchVirtualGrid.test.ts
git commit -m "perf(search): reduce virtual grid churn and aggregate recomputation"
```

### Task 7: 前端 API 调用层收敛（高频页面优先）

**Files:**

- Modify: `src/lib/api/client.ts`
- Modify: `src/app/admin/AdminPageClient.tsx`
- Modify: `src/app/login/page.tsx`
- Modify: `src/components/UserMenu.tsx`
- Modify: `src/components/DataMigration.tsx`

**Step 1: 写失败测试（401/错误信息统一处理）**

```ts
await expect(requestJson('/api/admin/settings/overview')).rejects.toMatchObject(
  {
    code: 'UNAUTHORIZED',
  },
);
```

**Step 2: 运行测试确认失败**

Run: `pnpm vitest run src/app/login/__tests__/page.test.tsx`
Expected: FAIL（页面仍依赖散落 fetch 分支）

**Step 3: 最小实现（用 requestJson/requestWithAuth 替换直接 fetch）**

```ts
const data = await requestJson<AdminConfigResult>(
  '/api/admin/settings/overview',
);
await requestJsonPost('/api/auth/sessions', { username, password });
```

**Step 4: 运行测试确认通过**

Run: `pnpm vitest run src/app/login/__tests__/page.test.tsx src/app/admin/_components/user-config/__tests__/use-user-config-actions.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/lib/api/client.ts src/app/admin/AdminPageClient.tsx src/app/login/page.tsx src/components/UserMenu.tsx src/components/DataMigration.tsx
git commit -m "refactor(frontend): converge api calls to shared client"
```

### Task 8: 端到端验证与文档收尾

**Files:**

- Modify: `README.md`
- Modify: `docs/plans/2026-03-05-api-frontend-refactor-brief.md`

**Step 1: 执行全量质量门禁**

Run: `pnpm lint && pnpm typecheck && pnpm test:run`
Expected: 全部 PASS

**Step 2: 记录验证结果与兼容策略**

```md
- Updated API contract to success/data/error.
- Legacy ok/error payload compatibility kept in client parser during migration window.
```

**Step 3: 回归冒烟（手动）**

Run:

- `pnpm dev`
- 手动验证登录、注册、搜索、收藏、管理员导入导出
  Expected: 核心流程可用，控制台无新增错误

**Step 4: Commit**

```bash
git add README.md docs/plans/2026-03-05-api-frontend-refactor-brief.md
git commit -m "docs: finalize api/frontend refactor verification notes"
```
