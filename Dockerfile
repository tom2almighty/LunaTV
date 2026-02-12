# ---- 第 1 阶段：安装依赖 ----
FROM node:20-alpine AS deps

# 安装必要的系统依赖
RUN apk add --no-cache libc6-compat

# 启用 corepack 并固定 pnpm 版本
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate

WORKDIR /app

# 仅复制依赖清单
COPY package.json pnpm-lock.yaml ./

# 安装依赖(使用 --frozen-lockfile 确保版本一致)
RUN --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile

# ---- 第 2 阶段：构建项目 ----
FROM node:20-alpine AS builder
RUN apk add --no-cache libc6-compat
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate

WORKDIR /app

# 复制依赖
COPY --from=deps /app/node_modules ./node_modules
# 复制源代码
COPY . .

# 构建时环境变量
ENV DOCKER_ENV=true \
    NEXT_TELEMETRY_DISABLED=1 \
    NODE_ENV=production

# 生成生产构建
RUN pnpm run build

# ---- 第 3 阶段：生成运行时镜像 ----
FROM node:20-alpine AS runner

# 安装运行时依赖
RUN apk add --no-cache \
    dumb-init \
    tini

# 创建非 root 用户
RUN addgroup -g 1001 -S nodejs && \
    adduser -u 1001 -S nextjs -G nodejs

WORKDIR /app

# 运行时环境变量
ENV NODE_ENV=production \
    HOSTNAME=0.0.0.0 \
    PORT=3000 \
    DOCKER_ENV=true \
    NEXT_TELEMETRY_DISABLED=1

# 批量复制文件(减少层数)
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# 切换到非特权用户
USER nextjs

EXPOSE 3000

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"

# 使用 tini 作为 init 进程
ENTRYPOINT ["tini", "--"]
CMD ["node", "server.js"]