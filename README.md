# vodhub

> 静态影视聚合播放器，基于 React + Vite + @ouonnki/cms-core，支持 Vercel、Cloudflare Pages、Netlify 等 Serverless/Edge 平台。

## 部署

- Build command: `pnpm build`
- Publish / Output directory: `dist`
- Node version: 20+

### 函数入口

- Vercel: `api/*.mjs`
- Cloudflare Pages: `functions/api/*`
- Netlify: `netlify/functions/api.mjs`

### 运行时环境变量

| 变量 | 说明 |
| ---- | ---- |
| `ADMIN_PASSWORD` | 站点登录密码 |
| `AUTH_SECRET` | 登录 token 签名密钥 |
| `AUTH_TOKEN_TTL_SECONDS` | token 有效期（秒） |
| `CONFIG_SUBSCRIPTION_URL` | 视频源订阅地址 |
| `CONFIG_FILE` | 视频源 JSON 配置 |
| `SEARCH_CONCURRENCY` | CMS 聚合搜索并发数 |

### 构建时环境变量

| 变量 | 说明 |
| ---- | ---- |
| `VITE_SITE_NAME` | 站点名称 |

## 功能接口

- `/api/auth/login`
- `/api/auth/verify`
- `/api/search-stream`
- `/api/search`
- `/api/detail`
- `/api/play-session`
- `/api/recommendations`
- `/api/douban/category`
- `/api/image`


## 视频源配置

`CONFIG_FILE` 和 `CONFIG_SUBSCRIPTION_URL` 使用标准苹果 CMS V10 源数组。

```json
[
  {
    "id": "my_source",
    "name": "示例资源",
    "url": "http://xxx.com/api.php/provide/vod",
    "detailUrl": "http://xxx.com",
    "timeout": 10000,
    "retry": 2,
    "isEnabled": true
  }
]
```

## 技术栈

- React 19 + Vite 7 + TypeScript
- @ouonnki/cms-core
- Tailwind CSS v4
- react-router-dom v7
- ArtPlayer + HLS.js
- sonner
