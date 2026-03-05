# Play Session Persistence + Search Fan-out Control (Items 5-6) Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 将播放会话从进程内缓存迁移为可恢复存储，并为搜索下游并发增加限流/熔断，提升重启恢复能力与高并发稳定性。

**Architecture:** 在不改前端协议（`/api/play/sessions/*`）的前提下，引入持久化会话仓储抽象；搜索链路抽象出统一调度器，对源请求执行并发上限与健康状态控制。优先保持现有 API 响应结构不变。

**Tech Stack:** Next.js App Router、TypeScript、better-sqlite3、Vitest。

---

### Task 1: 设计并落地播放会话持久化表结构（SQLite 方案）

**Files:**

- Modify: `src/lib/sqlite.ts`
- Create: `src/server/repositories/play-session-repository.ts`
- Test: `src/server/repositories/__tests__/play-session-repository.test.ts`

**Step 1: Write failing test**

- 覆盖：创建会话、读取会话、更新当前源、过期清理。

**Step 2: Run test to verify fail**

- Run: `pnpm vitest run src/server/repositories/__tests__/play-session-repository.test.ts`
- Expected: FAIL。

**Step 3: Add DB table/index**

- 新增 `play_sessions` 表，字段建议：
- `session_id`、`username`、`payload_json`、`created_at`、`expires_at`、`updated_at`。
- 新增索引：`idx_play_sessions_username`、`idx_play_sessions_expires_at`。

**Step 4: Implement repository**

- 提供 `save/get/updateCurrent/deleteExpired`。
- `payload_json` 保存当前 `PlaySession` 结构。

**Step 5: Run tests**

- Run: `pnpm vitest run src/server/repositories/__tests__/play-session-repository.test.ts`
- Expected: PASS。

**Step 6: Commit**

- `git add src/lib/sqlite.ts src/server/repositories/play-session-repository.ts src/server/repositories/__tests__/play-session-repository.test.ts`
- `git commit -m "feat(play-session): add sqlite persistence repository"`

### Task 2: 将 play-session 业务从内存 Map 切换到仓储

**Files:**

- Modify: `src/lib/play-session.ts`
- Test: `src/app/play/hooks/__tests__/use-play-page-state.test.ts`
- Test: `src/server/api/__tests__/response-contract.test.ts`

**Step 1: Write failing tests**

- 覆盖：
- 会话创建后可跨函数调用读取。
- `set current` 后状态持久化。
- 过期后返回会话不存在。

**Step 2: Run tests to verify fail**

- Run: `pnpm vitest run src/server/api/__tests__/response-contract.test.ts`
- Expected: FAIL。

**Step 3: Replace in-memory cache**

- 保留原对外函数签名：`createPlaySession/getPlaySession/setPlaySessionCurrent/...`。
- 内部改为 repository 读写。
- TTL 与容量控制策略迁移为数据库层清理（周期清理 + 按需清理）。

**Step 4: Run tests**

- Run: `pnpm vitest run src/server/api/__tests__/response-contract.test.ts src/app/play/hooks/__tests__/use-play-page-state.test.ts`
- Expected: PASS。

**Step 5: Commit**

- `git add src/lib/play-session.ts src/server/api/__tests__/response-contract.test.ts src/app/play/hooks/__tests__/use-play-page-state.test.ts`
- `git commit -m "refactor(play-session): migrate session storage to sqlite"`

### Task 3: 搜索下游并发上限（fan-out concurrency limit）

**Files:**

- Create: `src/server/services/source-search-scheduler.ts`
- Modify: `src/server/services/search-service.ts`
- Test: `src/server/services/__tests__/source-search-scheduler.test.ts`

**Step 1: Write failing test**

- 覆盖：
- 并发不超过设定值。
- 所有任务均执行。
- 单任务失败不影响整体。

**Step 2: Run test to verify fail**

- Run: `pnpm vitest run src/server/services/__tests__/source-search-scheduler.test.ts`
- Expected: FAIL。

**Step 3: Implement scheduler**

- `runWithConcurrencyLimit(tasks, limit)`。
- `limit` 默认值（如 5），支持 env 覆盖（`SEARCH_FANOUT_CONCURRENCY`）。

**Step 4: Integrate in search-service**

- `searchAllSources` 和 `createSearchStreamResponse` 统一通过 scheduler 调度。
- 保持 SSE 事件协议不变。

**Step 5: Run tests**

- Run: `pnpm vitest run src/server/services/__tests__/source-search-scheduler.test.ts src/hooks/__tests__/use-search-execution.test.ts`
- Expected: PASS。

**Step 6: Commit**

- `git add src/server/services/source-search-scheduler.ts src/server/services/__tests__/source-search-scheduler.test.ts src/server/services/search-service.ts`
- `git commit -m "perf(search): add bounded fan-out concurrency scheduler"`

### Task 4: 引入源级熔断/退避（circuit breaker lite）

**Files:**

- Create: `src/server/services/source-health.ts`
- Modify: `src/server/services/search-service.ts`
- Test: `src/server/services/__tests__/source-health.test.ts`

**Step 1: Write failing test**

- 覆盖：
- 连续失败达到阈值后进入 open 状态。
- 冷却窗口后允许 half-open 探测。
- 成功后恢复 closed。

**Step 2: Run test to verify fail**

- Run: `pnpm vitest run src/server/services/__tests__/source-health.test.ts`
- Expected: FAIL。

**Step 3: Implement source health manager**

- 配置项：`failureThreshold`、`cooldownMs`。
- 记录每个 source 的失败/成功状态。

**Step 4: Integrate in search flows**

- 对 open 状态源短路（SSE 仍上报 source_error，错误原因标识 `circuit_open`）。
- 请求成功后更新健康状态。

**Step 5: Run tests**

- Run: `pnpm vitest run src/server/services/__tests__/source-health.test.ts src/lib/search/__tests__/abortable-search.test.ts`
- Expected: PASS。

**Step 6: Commit**

- `git add src/server/services/source-health.ts src/server/services/__tests__/source-health.test.ts src/server/services/search-service.ts`
- `git commit -m "feat(search): add source circuit-breaker for unstable downstreams"`

### Task 5: 端到端回归与监控点

**Files:**

- Modify: `src/app/api/search/route.ts`
- Modify: `src/app/api/search/stream/route.ts`
- Modify: `src/app/api/play/sessions/[sessionId]/route.ts`

**Step 1: Add lightweight metrics logs**

- 记录：搜索耗时、命中源数、熔断跳过源数、会话读取失败率。

**Step 2: Run regression checks**

- Run: `pnpm lint && pnpm typecheck && pnpm test:run`
- Expected: 全部通过。

**Step 3: Manual smoke**

- 搜索页：流式结果逐源回填正常。
- 播放页：重启服务后，已有 `ps` 会话仍可恢复（未过期）。

**Step 4: Commit**

- `git add src/app/api/search/route.ts src/app/api/search/stream/route.ts src/app/api/play/sessions/[sessionId]/route.ts`
- `git commit -m "chore(observability): add reliability metrics for search and play sessions"`
