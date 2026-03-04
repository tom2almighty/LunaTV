# Core Business Regression Matrix

This matrix defines protected business capabilities that must remain stable after the gradual interaction unification refactor.

## Protected Capabilities

| Capability                          | Automated Coverage                                                                                                                                                                                                                            | Manual Smoke (when needed)                                               |
| ----------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| Search (normal)                     | `src/hooks/__tests__/use-search-execution.test.ts`, `src/hooks/__tests__/useSearchResultFilters.test.ts`, `src/app/search/_state/__tests__/search-context-snapshot.test.ts`, `src/app/search/_state/__tests__/search-context-storage.test.ts` | `/search` 输入关键词，校验结果列表、过滤器和状态恢复一致。               |
| Search (stream)                     | Partial: `src/hooks/__tests__/use-search-execution.test.ts`                                                                                                                                                                                   | `/search` 触发流式搜索，校验增量结果持续追加且 loading 正常结束。        |
| Open play from search               | `src/app/search/__tests__/search-preview-open-flow.test.tsx`, `src/components/video-card/__tests__/use-video-card-actions.test.ts`                                                                                                            | 从 `/search` 打开卡片，确认跳转到 `/play?ps=<sessionId>` 且会话有效。    |
| Source switch while playing         | Partial: `src/app/play/hooks/__tests__/use-play-page-state.test.ts`                                                                                                                                                                           | `/play` 切换播放源，校验剧集列表和当前索引按预期更新。                   |
| Episode switch while playing        | `src/app/play/hooks/__tests__/use-play-page-state.test.ts`                                                                                                                                                                                    | `/play` 切换集数，校验播放器链接和播放状态同步更新。                     |
| Favorites CRUD                      | `src/components/video-card/__tests__/use-video-card-actions.test.ts`                                                                                                                                                                          | 添加/取消收藏并刷新页面，确认收藏状态持久化。                            |
| Play-records CRUD + resume          | `src/app/play/hooks/__tests__/use-play-progress.test.ts`, `src/app/play/hooks/__tests__/use-play-return-to-search.test.ts`                                                                                                                    | 播放后退出再进入同视频，确认续播时间和记录一致。                         |
| Skip-config CRUD + intro/outro skip | Partial: `src/app/play/hooks/__tests__/use-play-page-state.test.ts`                                                                                                                                                                           | 配置片头/片尾跳过后刷新，确认配置保留且跳过时机正确。                    |
| m3u8 ad-filter toggle               | `src/app/play/services/__tests__/m3u8-ad-filter.test.ts`                                                                                                                                                                                      | `/admin` 修改站点开关后到 `/play` 验证默认值生效，本地覆盖开关行为正确。 |
| Admin user critical path            | `src/app/admin/_components/user-config/__tests__/use-user-config-actions.test.ts`                                                                                                                                                             | `/admin` 用户管理执行增改禁用，确认列表刷新和提示正确。                  |
| Admin user-group critical path      | `src/app/admin/_components/user-config/__tests__/user-group-actions.test.ts`                                                                                                                                                                  | `/admin` 用户组增改删并分配用户，确认权限映射正确。                      |
| Admin source critical path          | None dedicated                                                                                                                                                                                                                                | `/admin` 采集源增改排序保存后，搜索/播放可使用最新源。                   |
| Admin site-settings critical path   | None dedicated                                                                                                                                                                                                                                | `/admin` 站点设置保存后，`/api/public/site` 与页面运行时读取最新配置。   |
| Admin data-migration critical path  | None dedicated                                                                                                                                                                                                                                | `/admin` 导出后再导入，确认用户组/源/站点配置一致。                      |

## Mandatory Regression Commands

- `pnpm test:business`
- `pnpm test:run`

Both commands must pass before and after each major refactor batch.
