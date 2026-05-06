# vodhub

> 轻量级影视聚合播放器 —— React + Vite + [@ouonnki/cms-core](https://www.npmjs.com/package/@ouonnki/cms-core) 构建，纯前端 SPA。

## 快速开始

```bash
pnpm install
cp .env.example .env
pnpm dev
```

访问 http://localhost:3000

## 部署

### Docker

```yaml
services:
  vodhub:
    image: ghcr.io/tom2almighty/vodhub:latest
    ports:
      - "3000:3000"
    environment:
      - VITE_ADMIN_PASSWORD=your_password
      - VITE_SITE_NAME=vodhub
      - VITE_CONFIG_SUBSCRIPTION_URL=https://example.com/subscribe
```

### SaaS

构建命令 `pnpm build`，输出目录 `dist`。

## 环境变量

> 所有变量在构建时通过 `import.meta.env` 注入。修改后需要重新构建。

| 变量                           | 说明                                 | 默认值   |
| ------------------------------ | ------------------------------------ | -------- |
| `VITE_ADMIN_PASSWORD`          | 访问密码（必填）                     | 无       |
| `VITE_SITE_NAME`               | 站点名称（导航栏 + 浏览器标签）      | `vodhub` |
| `VITE_CONFIG_SUBSCRIPTION_URL` | 视频源订阅链接，启动时拉取           | 空       |
| `VITE_CONFIG_FILE`             | 视频源 JSON 字符串（订阅失败时回退） | 空       |
| `VITE_SEARCH_CONCURRENCY`      | CMS 聚合搜索并发数（1-20）           | `5`      |

`VITE_CONFIG_SUBSCRIPTION_URL` 优先于 `VITE_CONFIG_FILE`；订阅可用时不读取本地配置。

## 视频源配置

订阅链接和 `VITE_CONFIG_FILE` 都接受标准苹果 CMS V10 源数组：

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

字段说明：

| 字段        | 必填 | 说明                                      |
| ----------- | ---- | ----------------------------------------- |
| `id`        | ✓    | 源唯一标识（用于播放记录 / 收藏键）       |
| `name`      | ✓    | 显示名                                    |
| `url`       | ✓    | CMS API 地址（含 `/api.php/provide/vod`） |
| `detailUrl` | ✗    | 详情接口地址，默认与 `url` 相同           |
| `timeout`   | ✗    | 单次请求超时（毫秒）                      |
| `retry`     | ✗    | 重试次数                                  |
| `isEnabled` | ✗    | 是否启用，默认 `true`                     |

## 技术栈

- React 19 + Vite 7 + TypeScript
- @ouonnki/cms-core（CMS 客户端，事件驱动 + 流式聚合搜索）
- Tailwind CSS v4
- react-router-dom v7
- ArtPlayer + HLS.js
- sonner（Toast）
- Express 5

## License

[CC BY-NC-SA 4.0](LICENSE)
