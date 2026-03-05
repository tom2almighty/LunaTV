# Security Hardening (Items 1-4) Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 完成密码存储安全化、会话 Cookie 安全化、Cron 鉴权、SSRF 防护四项安全改造，且不破坏现有业务流程。

**Architecture:** 以“最小侵入”方式在现有 API 层和基础库层新增安全边界。密码采用可平滑迁移的哈希验证策略；会话改为服务端可信（httpOnly）并补充会话信息接口；所有服务器主动出网入口统一走 URL 安全校验器。

**Tech Stack:** Next.js App Router、TypeScript、better-sqlite3、Web Crypto / Node crypto、Vitest。

---

### Task 1: 密码哈希与平滑迁移（替换明文密码）

**Files:**

- Create: `src/lib/security/password.ts`
- Modify: `src/lib/db.server.ts`
- Test: `src/lib/security/__tests__/password.test.ts`

**Step 1: Write the failing test**

- 覆盖：`hashPassword` 非明文、`verifyPassword` 正确/错误密码、旧明文迁移判定。

**Step 2: Run test to verify it fails**

- Run: `pnpm vitest run src/lib/security/__tests__/password.test.ts`
- Expected: FAIL（方法不存在）。

**Step 3: Write minimal implementation**

- 在 `password.ts` 实现：
- `hashPassword(plain)` -> `pbkdf2/scrypt + salt + iterations` 序列化存储（如 `v1$algo$iter$salt$hash`）。
- `verifyPassword(plain, stored)` -> 支持 `v1` 哈希校验。
- `isLegacyPlaintextPassword(stored)` -> 判断非哈希格式。

**Step 4: Integrate db layer**

- `registerUser`、`changePassword` 写入哈希。
- `verifyUser` 逻辑：
- 若哈希格式，直接校验。
- 若旧明文且匹配，立即重哈希并回写（懒迁移）。

**Step 5: Run tests**

- Run: `pnpm vitest run src/lib/security/__tests__/password.test.ts`
- Expected: PASS。

**Step 6: Commit**

- `git add src/lib/security/password.ts src/lib/security/__tests__/password.test.ts src/lib/db.server.ts`
- `git commit -m "feat(security): hash passwords with legacy auto-migration"`

### Task 2: 会话 Cookie 安全化 + 会话信息接口

**Files:**

- Create: `src/app/api/auth/sessions/me/route.ts`
- Modify: `src/app/api/auth/sessions/route.ts`
- Modify: `src/app/api/users/route.ts`
- Modify: `src/server/api/guards.ts`
- Modify: `src/lib/auth.ts`
- Modify: `src/components/UserMenu.tsx`
- Test: `src/server/api/__tests__/guards.test.ts`

**Step 1: Write failing tests**

- 覆盖：过期会话拒绝、缺失签名拒绝、正常会话通过。

**Step 2: Run tests to verify fail**

- Run: `pnpm vitest run src/server/api/__tests__/guards.test.ts`
- Expected: FAIL（新规则未实现）。

**Step 3: Secure cookie attributes**

- 登录/注册写 Cookie 改为：`httpOnly: true`、`sameSite: 'lax'`、`secure: process.env.NODE_ENV === 'production'`。
- Cookie payload 不再给前端直接读角色。

**Step 4: Add session TTL validation**

- 在 `guards.ts` 校验 cookie 中 `timestamp`（例如 7 天，支持 `SESSION_MAX_AGE_MS` 环境变量）。
- 过期返回 401。

**Step 5: Add /api/auth/sessions/me**

- 返回 `{ username, role }`，由服务端从鉴权上下文解析。
- 前端 `UserMenu` 改为请求该接口展示角色，移除对 `document.cookie` 解析依赖。

**Step 6: Run tests**

- Run: `pnpm vitest run src/server/api/__tests__/guards.test.ts src/app/login/__tests__/page.test.tsx`
- Expected: PASS。

**Step 7: Commit**

- `git add src/app/api/auth/sessions/me/route.ts src/app/api/auth/sessions/route.ts src/app/api/users/route.ts src/server/api/guards.ts src/lib/auth.ts src/components/UserMenu.tsx src/server/api/__tests__/guards.test.ts`
- `git commit -m "feat(security): harden auth cookies and enforce session expiry"`

### Task 3: 保护 /api/cron（防止外部任意触发）

**Files:**

- Modify: `src/app/api/cron/route.ts`
- Modify: `start.js`
- Test: `src/server/api/__tests__/cron-auth.test.ts` (new)

**Step 1: Write failing test**

- 覆盖：缺少/错误 token 返回 401，正确 token 返回 200。

**Step 2: Run test to verify fail**

- Run: `pnpm vitest run src/server/api/__tests__/cron-auth.test.ts`
- Expected: FAIL。

**Step 3: Implement token guard**

- 新增环境变量 `CRON_SECRET`。
- `/api/cron` 要求 Header：`x-cron-secret`，与环境变量一致才执行。
- `start.js` 调用 cron 时附带该 header。

**Step 4: Run tests**

- Run: `pnpm vitest run src/server/api/__tests__/cron-auth.test.ts`
- Expected: PASS。

**Step 5: Commit**

- `git add src/app/api/cron/route.ts start.js src/server/api/__tests__/cron-auth.test.ts`
- `git commit -m "feat(security): protect cron endpoint with shared secret"`

### Task 4: SSRF 防护（出网 URL 校验统一）

**Files:**

- Create: `src/lib/security/url-guard.ts`
- Modify: `src/app/api/image-proxy/route.ts`
- Modify: `src/app/api/admin/settings/config-subscription/fetch/route.ts`
- Modify: `src/app/api/cron/route.ts`
- Test: `src/lib/security/__tests__/url-guard.test.ts`

**Step 1: Write failing tests**

- 覆盖：
- 禁止 `file://`、`ftp://`、`localhost`、私网 IP（10/172.16/192.168/127）。
- 允许 `https://` 白名单域名（例如豆瓣图片域）。

**Step 2: Run test to verify fail**

- Run: `pnpm vitest run src/lib/security/__tests__/url-guard.test.ts`
- Expected: FAIL。

**Step 3: Implement URL guard**

- `assertSafeOutgoingUrl(url, options)`：
- 强制协议 `http/https`。
- DNS 解析后拒绝私网/回环地址。
- 支持域名白名单（`image-proxy` 固定白名单；订阅 fetch 可配置白名单）。

**Step 4: Integrate all outbound fetch points**

- `image-proxy` 调用前校验。
- `config-subscription/fetch` 与 `cron refreshConfig` 订阅 URL 校验。

**Step 5: Run tests**

- Run: `pnpm vitest run src/lib/security/__tests__/url-guard.test.ts`
- Expected: PASS。

**Step 6: Commit**

- `git add src/lib/security/url-guard.ts src/lib/security/__tests__/url-guard.test.ts src/app/api/image-proxy/route.ts src/app/api/admin/settings/config-subscription/fetch/route.ts src/app/api/cron/route.ts`
- `git commit -m "feat(security): add outbound url guard to mitigate SSRF"`

### Task 5: Full Verification

**Files:**

- Modify: `src/app/api/auth/sessions/route.ts`（若联调发现边界问题）
- Modify: `src/server/api/guards.ts`（若联调发现边界问题）

**Step 1: Run full checks**

- Run: `pnpm lint && pnpm typecheck && pnpm test:run`
- Expected: 全部通过。

**Step 2: Manual smoke**

- 登录/注册/登出流程。
- 播放/搜索/后台管理。
- `start.js` 自动 cron 正常。

**Step 3: Commit**

- `git add src/app/api/auth/sessions/route.ts src/server/api/guards.ts`
- `git commit -m "chore(security): finalize hardening verification fixes"`
