# LunaTV (个人修改版)

<div align="center">
  <img src="public/logo.png" alt="LunaTV Logo" width="120">
</div>

> ⚠️ **重要说明**: 此项目是 [MoonTechLab/LunaTV](https://github.com/MoonTechLab/LunaTV) 的个人 Fork 版本，仅用于个人学习和使用。

> 🎬 **LunaTV** 是一个开箱即用的、跨平台的影视聚合播放器。它基于 **Next.js 14** + **Tailwind&nbsp;CSS** + **TypeScript** 构建，支持多资源搜索、在线播放、收藏同步、播放记录、云端存储，让你可以随时随地畅享海量免费影视内容。

<div align="center">

![Next.js](https://img.shields.io/badge/Next.js-14-000?logo=nextdotjs)
![TailwindCSS](https://img.shields.io/badge/TailwindCSS-4-38bdf8?logo=tailwindcss)
![TypeScript](https://img.shields.io/badge/TypeScript-4.x-3178c6?logo=typescript)
![License](https://img.shields.io/badge/License-MIT-green)
![Docker Ready](https://img.shields.io/badge/Docker-ready-blue?logo=docker)

</div>

---

## 功能特性

- **多源聚合搜索**：一次搜索立刻返回全源结果。
- **丰富详情页**：支持剧集列表、演员、年份、简介等完整信息展示。
- **流畅在线播放**：集成 HLS.js & ArtPlayer。
- **跨设备同步记录**：支持 SQLite 存储，多端同步进度。
- **PWA**：离线缓存、安装到桌面/主屏，移动端原生体验。
- **智能去广告**：自动跳过视频中的切片广告（实验性）。

> [!WARNING]
>
> 请不要在 B站、小红书、微信公众号、抖音、今日头条或其他中国大陆社交平台发布视频或文章宣传本项目，不授权任何“科技周刊/月刊”类项目或站点收录本项目。

## 部署

本项目**仅支持 Docker 或其他基于 Docker 的平台** 部署。

```yaml
services:
  moontv-core:
    image: ghcr.io/tom2almighty/lunatv:latest
    container_name: moontv-core
    restart: on-failure
    ports:
      - '3000:3000'
    environment:
      - APP_ADMIN_USER=admin
      - PASSWORD=admin_password
    volumes:
      - ./data:/app/data
```

## 配置文件

配置文件示例如下：

```json
{
  "cache_time": 7200,
  "api_site": {
    "dyttzy": {
      "api": "http://xxx.com/api.php/provide/vod",
      "name": "示例资源",
      "detail": "http://xxx.com"
    }
    // ...更多站点
  },
  "custom_category": [
    {
      "name": "华语",
      "type": "movie",
      "query": "华语"
    }
  ]
}
```

- `cache_time`：接口缓存时间（秒）。
- `api_site`：你可以增删或替换任何资源站，字段说明：
  - `key`：唯一标识，保持小写字母/数字。
  - `api`：资源站提供的 `vod` JSON API 根地址。
  - `name`：在界面中展示的名称。
  - `detail`：（可选）部分无法通过 API 获取剧集详情的站点，需要提供网页详情根 URL，用于爬取。
- `custom_category`：自定义分类配置，用于在导航中添加个性化的影视分类。以 type + query 作为唯一标识。支持以下字段：
  - `name`：分类显示名称（可选，如不提供则使用 query 作为显示名）
  - `type`：分类类型，支持 `movie`（电影）或 `tv`（电视剧）
  - `query`：搜索关键词，用于在豆瓣 API 中搜索相关内容

custom_category 支持的自定义分类已知如下：

- movie：热门、最新、经典、豆瓣高分、冷门佳片、华语、欧美、韩国、日本、动作、喜剧、爱情、科幻、悬疑、恐怖、治愈
- tv：热门、美剧、英剧、韩剧、日剧、国产剧、港剧、日本动画、综艺、纪录片

也可输入如 "哈利波特" 效果等同于豆瓣搜索

MoonTV 支持标准的苹果 CMS V10 API 格式。

#### 订阅

将完整的配置文件 base58 编码后提供 http 服务即为订阅链接，可在后台中使用。

## 环境变量

### 必需环境变量

| 变量名           | 说明                               | 默认值 | 示例                            |
| ---------------- | ---------------------------------- | ------ | ------------------------------- |
| `APP_ADMIN_USER` | 系统管理员密码，用于身份验证       | 无     | `PASSWORD=your_secure_password` |
| `USERNAME`       | 系统管理员用户名（多用户模式必需） | 无     | `USERNAME=admin`                |

### 站点配置

| 变量名                  | 说明         | 默认值       | 示例                               |
| ----------------------- | ------------ | ------------ | ---------------------------------- |
| `NEXT_PUBLIC_SITE_NAME` | 网站名称     | `MoonTV`     | `NEXT_PUBLIC_SITE_NAME=我的影视站` |
| `ANNOUNCEMENT`          | 网站公告内容 | 默认免责声明 | `ANNOUNCEMENT=欢迎使用本站!`       |

### 搜索配置

| 变量名                        | 说明             | 默认值 | 示例                             |
| ----------------------------- | ---------------- | ------ | -------------------------------- |
| `NEXT_PUBLIC_SEARCH_MAX_PAGE` | 搜索下游最大页数 | `5`    | `NEXT_PUBLIC_SEARCH_MAX_PAGE=10` |
| `NEXT_PUBLIC_FLUID_SEARCH`    | 是否启用流式搜索 | `true` | `NEXT_PUBLIC_FLUID_SEARCH=false` |

### 豆瓣配置

| 变量名                                | 说明                    | 默认值   | 示例                                                   |
| ------------------------------------- | ----------------------- | -------- | ------------------------------------------------------ |
| `NEXT_PUBLIC_DOUBAN_DATA_CACHE_TIME`  | 豆瓣数据缓存时间（秒）  | `7200`   | `NEXT_PUBLIC_DOUBAN_DATA_CACHE_TIME=3600`              |
| `NEXT_PUBLIC_DOUBAN_PROXY_TYPE`       | 豆瓣 API 代理类型       | `server` | `NEXT_PUBLIC_DOUBAN_PROXY_TYPE=direct`                 |
| `NEXT_PUBLIC_DOUBAN_PROXY`            | 自定义豆瓣 API 代理地址 | 空       | `NEXT_PUBLIC_DOUBAN_PROXY=https://proxy.com`           |
| `NEXT_PUBLIC_DOUBAN_IMAGE_PROXY_TYPE` | 豆瓣图片代理类型        | `server` | `NEXT_PUBLIC_DOUBAN_IMAGE_PROXY_TYPE=server`           |
| `NEXT_PUBLIC_DOUBAN_IMAGE_PROXY`      | 自定义豆瓣图片代理地址  | 空       | `NEXT_PUBLIC_DOUBAN_IMAGE_PROXY=https://img-proxy.com` |

### 功能开关

| 变量名                              | 说明                                     | 默认值  | 示例                                     |
| ----------------------------------- | ---------------------------------------- | ------- | ---------------------------------------- |
| `NEXT_PUBLIC_DISABLE_YELLOW_FILTER` | 是否禁用黄色内容过滤                     | `false` | `NEXT_PUBLIC_DISABLE_YELLOW_FILTER=true` |
| `NEXT_PUBLIC_ENABLE_OPTIMIZATION`   | 是否启用性能优化                         | `true`  | `NEXT_PUBLIC_ENABLE_OPTIMIZATION=false`  |
| `NEXT_PUBLIC_ENABLE_REGISTRATION`   | 是否开启前台用户注册功能（仅多用户模式） | `false` | `NEXT_PUBLIC_ENABLE_REGISTRATION=true`   |

## 安全与隐私提醒

### 请设置密码保护并关闭公网注册

为了您的安全和避免潜在的法律风险，我们要求在部署时**强烈建议关闭公网注册**：

### 部署要求

1. **仅供个人使用**：请勿将您的实例链接公开分享或传播
2. **遵守当地法律**：请确保您的使用行为符合当地法律法规

### 重要声明

- 本项目仅供学习和个人使用
- 请勿将部署的实例用于商业用途或公开服务
- 如因公开分享导致的任何法律问题，用户需自行承担责任
- 项目开发者不对用户的使用行为承担任何法律责任
- 本项目不在中国大陆地区提供服务。如有该项目在向中国大陆地区提供服务，属个人行为。在该地区使用所产生的法律风险及责任，属于用户个人行为，与本项目无关，须自行承担全部责任。特此声明

## License

[MIT](LICENSE) © 2025 MoonTV & Contributors

## 致谢

- [MoonTechLab/LunaTV](https://github.com/MoonTechLab/LunaTV) — 原项目，感谢原作者的开源贡献
- [ts-nextjs-tailwind-starter](https://github.com/theodorusclarence/ts-nextjs-tailwind-starter) — 项目最初基于该脚手架
- [LibreTV](https://github.com/LibreSpark/LibreTV) — 由此启发，站在巨人的肩膀上
- [ArtPlayer](https://github.com/zhw2590582/ArtPlayer) — 提供强大的网页视频播放器
- [HLS.js](https://github.com/video-dev/hls.js) — 实现 HLS 流媒体在浏览器中的播放支持
- 感谢所有提供免费影视接口的站点
