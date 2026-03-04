# Refactor Risk Checklist

Use this checklist before merging interaction-chain refactor changes.

## 1) Contract and Routing Risks

- [ ] User-domain endpoints still use resource path params (`{source}/{videoId}`) and keep response payload contracts unchanged.
- [ ] Play URL contract remains `/play?ps=<play_session_id>`.
- [ ] Search routes (`/api/search`, `/api/search/stream`) keep existing request/response compatibility.

## 2) Auth and Permission Risks

- [ ] User routes requiring login are wrapped by `executeApiHandler(..., { requireAuth: true })`.
- [ ] Admin routes use `executeAdminApiHandler` and shared role guards, no route-local permission drift.
- [ ] Unauthorized and forbidden cases still return correct status code and error shape.

## 3) Data Consistency Risks

- [ ] User data writes flow through `user-data-repository` (no new direct SQL in route handlers).
- [ ] Favorites/play-records/skip-config/search-history CRUD behavior remains unchanged.
- [ ] Resume progress and skip-config persistence still match previous behavior.

## 4) Runtime Behavior Risks

- [ ] m3u8 ad-filter default comes from site config (`M3U8AdFilterEnabled`).
- [ ] Local player toggle still works as runtime override.
- [ ] Source switch and episode switch keep stable playback and state transitions.

## 5) Required Verification

- [ ] `pnpm test:business`
- [ ] `pnpm test:run`
- [ ] `pnpm lint`
- [ ] `pnpm typecheck`

All items must be checked before closing the refactor task set.
