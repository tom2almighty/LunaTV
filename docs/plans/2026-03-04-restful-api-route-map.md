# RESTful API Route Map (2026-03-04)

## User Data

| Domain         | List/Create                                | Single Resource                                        | Notes                                  |
| -------------- | ------------------------------------------ | ------------------------------------------------------ | -------------------------------------- |
| Favorites      | `GET/POST/DELETE /api/user/favorites`      | `GET/DELETE /api/user/favorites/{source}/{videoId}`    | bulk delete on collection route        |
| Play records   | `GET/POST/DELETE /api/user/play-records`   | `GET/DELETE /api/user/play-records/{source}/{videoId}` | bulk delete on collection route        |
| Skip configs   | `GET/POST /api/user/skip-configs`          | `GET/DELETE /api/user/skip-configs/{source}/{videoId}` | delete moved to resource route         |
| Search history | `GET/POST/DELETE /api/user/search-history` | `DELETE /api/user/search-history/{keyword}`            | keyword delete moved to resource route |

## Search and Detail

| Domain            | Route                                        |
| ----------------- | -------------------------------------------- |
| Non-stream search | `GET /api/search?q=`                         |
| Stream search     | `GET /api/search/stream?q=`                  |
| Video detail      | `GET /api/sources/{source}/videos/{videoId}` |

## Play

| Domain                | Route                                          |
| --------------------- | ---------------------------------------------- |
| Create session        | `POST /api/play/sessions`                      |
| Session snapshot      | `GET /api/play/sessions/{sessionId}`           |
| Switch current source | `PATCH /api/play/sessions/{sessionId}/current` |

## Admin Sources

| Domain                      | Route                                         |
| --------------------------- | --------------------------------------------- |
| List/Create                 | `GET/POST /api/admin/sources`                 |
| Single source update/delete | `PATCH/DELETE /api/admin/sources/{sourceKey}` |
| Reorder                     | `POST /api/admin/sources/order`               |
| Validation stream           | `GET /api/admin/sources/validation-stream?q=` |

## Admin Settings/System

| Domain                    | Route                                                |
| ------------------------- | ---------------------------------------------------- |
| Settings overview         | `GET /api/admin/settings/overview`                   |
| Site settings             | `POST /api/admin/settings/site`                      |
| Config file save          | `POST /api/admin/settings/config-file`               |
| Config subscription fetch | `POST /api/admin/settings/config-subscription/fetch` |
| System reset              | `POST /api/admin/system/reset`                       |

## Explicitly Removed Legacy Endpoints

- `/api/admin/source`
- `/api/admin/source/validate`
- `/api/admin/config`
- `/api/admin/site-settings`
- `/api/admin/config-files`
- `/api/admin/config-subscriptions/fetch`
- `/api/search/ws`
- `/api/detail`
