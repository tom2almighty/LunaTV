# 2026-03-02 RESTful API Route Map

## Cleanup Checklist

- [x] no Orion endpoint files exist
- [x] no old snake_case route directories exist
- [x] no play fallback query keys are generated

## Route Families

- Auth: `/api/auth/sessions`, `/api/auth/sessions/current`
- Public: `/api/public/site`
- User data: `/api/user/favorites`, `/api/user/play-records`, `/api/user/search-history`, `/api/user/skip-configs`
- Play sessions: `/api/play/sessions`, `/api/play/sessions/{sessionId}`
- Admin users: `/api/admin/users`, `/api/admin/users/{username}` and sub-resources
- Admin config/data: `/api/admin/config-files`, `/api/admin/config-subscriptions/fetch`, `/api/admin/site-settings`, `/api/admin/system/reset`, `/api/admin/data-migrations/{import|export}`
