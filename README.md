# vodhub

> 静态影视聚合播放器，基于 React + Vite + @ouonnki/cms-core，支持 Vercel、Cloudflare Pages、Netlify 与 Docker 自托管。

## 部署

- Build command: `pnpm build`
- Publish / Output directory: `dist`
- Node version: 20+

### 平台函数入口

| 平台 | 入口 |
| ---- | ---- |
| Vercel | `api/[...path].mjs` |
| Cloudflare Pages | `functions/api/[[path]].js` |
| Netlify | `netlify/functions/api.mjs` |
| Docker / 自托管 | `server.js` |

### 运行时环境变量

| 变量 | 必填 | 说明 |
| ---- | ---- | ---- |
| `SITE_NAME` | 否 | 站点名称，默认 `vodhub` |
| `ADMIN_PASSWORD` | 是 | 站点登录密码 |
| `AUTH_SECRET` | 是 | 登录 token 签名密钥（建议 32+ 字符随机串） |
| `AUTH_TOKEN_TTL` | 否 | token 有效期（秒），默认 604800 |
| `SOURCES_URL` | 二选一 | 视频源订阅地址（JSON） |
| `SOURCES_JSON` | 二选一 | 视频源 JSON 内联配置 |
| `SEARCH_CONCURRENCY` | 否 | CMS 聚合搜索并发数，默认 5，上限 20 |

## 接口

| 路径 | 方法 | 说明 |
| ---- | ---- | ---- |
| `/api/auth/login` | POST | 登录获取 token |
| `/api/auth/verify` | GET | 校验 token |
| `/api/site-config` | GET | 站点配置（公开） |
| `/api/search` | GET | 一次性聚合搜索 |
| `/api/search-stream` | GET | NDJSON 增量搜索流 |
| `/api/detail` | GET | 视频详情 |
| `/api/play-session` | POST | 建立播放会话 |
| `/api/recommendations` | GET | 首页推荐 |
| `/api/douban/category` | GET | 豆瓣分类聚合 |
| `/api/douban/categories` | GET | 可用分类列表 |
| `/api/image` | GET | 图片代理（绕过 Referer 限制） |

## 视频源配置

`SOURCES_JSON` 与 `SOURCES_URL` 使用标准苹果 CMS V10 源数组：

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
- @vidstack/react + HLS.js
- sonner

