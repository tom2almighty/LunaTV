# RESTful API Full Refactor Design Notes

## Scope

This design captures the final architecture after migrating from mixed action-style endpoints to RESTful resource routes, with no backward compatibility layer.

## Route Design

- Authentication:
  - `POST /api/auth/sessions`
  - `DELETE /api/auth/sessions/current`
  - `PATCH /api/users/current/password`
- Public config:
  - `GET /api/public/site`
- User data resources:
  - `GET|POST|DELETE /api/user/favorites`
  - `GET|POST|DELETE /api/user/play-records`
  - `GET|POST|DELETE /api/user/search-history`
  - `GET|POST|DELETE /api/user/skip-configs`
- Play flow:
  - `POST /api/play/sessions`
  - `GET|PATCH /api/play/sessions/{sessionId}`
  - Page URL is strictly `/play?ps=<sessionId>`.
- Admin resources:
  - User management: `/api/admin/users` and per-user sub-resources
  - User groups: `/api/admin/user-groups` and `/api/admin/user-groups/assignments`
  - Config/system/data migration:
    - `/api/admin/config-files`
    - `/api/admin/config-subscriptions/fetch`
    - `/api/admin/site-settings`
    - `/api/admin/system/reset`
    - `/api/admin/data-migrations/import`
    - `/api/admin/data-migrations/export`

## Frontend Structure Splits

- Play page:
  - `play-page-container.tsx`
  - `use-play-page-state.ts`
  - `use-play-page-actions.ts`
- Admin user settings:
  - `user-config-container.tsx`
  - `user-group-actions.ts`
- User menu:
  - `user-menu-container.tsx`
- Video card:
  - `video-card-view.tsx`
  - `use-video-card-state.ts`
  - `use-video-card-navigation.ts`

## Non-Goals

- No compatibility shims for removed legacy route names.
- No fallback query mode in play page URL generation or bootstrap logic.
