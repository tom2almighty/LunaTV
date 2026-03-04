# Search-to-Play UX Redesign Design

**Date:** 2026-03-04  
**Scope:** `search -> preview -> play` core journey  
**Priority:** UX-first, large redesign

---

## 1. Goals

- Make the `search -> play` path feel intentional, immersive, and low-friction.
- Keep interaction semantics consistent across desktop and mobile.
- Preserve existing backend contracts and session creation flow where possible.
- Reduce context loss when users jump from search to play and then back.

## 2. Non-goals

- No backend API redesign in this phase.
- No major data-model migrations.
- No broad admin-side UX changes in this phase.

## 3. Experience Direction (Chosen)

Chosen direction: **Immersive Cinema Flow**.

- Search page behaves like a content discovery surface, not only a form + list.
- Card click opens a preview layer first; play is a deliberate CTA inside preview.
- Play page keeps player-first focus and gives a stable way back to search context.

## 4. Information Architecture

### Search Page (Three Layers)

1. `Hero Search`

- Large search input
- Quick-entry chips (hot/recent)
- Clear visual hierarchy for first action

2. `Discovery Strip`

- Recommendation/updated sections (can start with lightweight placeholders)
- Supports users without a precise keyword

3. `Result Wall`

- Immersive poster wall
- Default to aggregate mode
- Strong metadata badges (year/source-count/playability)

### Play Page (Player-first)

1. Compact context bar: title, current episode, return-to-search
2. Stable decision modules: episode selector, source switcher, description panel
3. Return action restores previous search state (query/filter/position/open preview)

## 5. Core Interaction Model

### Two-step entry from Search

1. Card click: open `Quick Preview` (no immediate navigation)
2. Preview primary CTA: `Play now` -> create play session -> route to `/play`

### Context Restoration

- On jump to play, persist a search snapshot in `sessionStorage`:
  - `query`
  - `viewMode`
  - filters
  - scroll position
  - active preview identity
- On return to search, restore snapshot and resume browsing position.

## 6. Responsive Consistency Strategy

Principle: **same task flow, adaptive layout**.

- Desktop: right-side preview drawer.
- Mobile: bottom preview sheet (expandable to near full-screen).
- Same CTA order on all devices:
  1. `立即播放` (primary)
  2. `换源预览` (secondary)
  3. `收藏 / 豆瓣` (secondary)
- Same recovery behavior on all devices when returning from play.

## 7. Component and State Design

### Search-side components

- `SearchHero`
- `DiscoveryStrip`
- `ResultWall`
- `QuickPreviewDrawer` (desktop) / `QuickPreviewSheet` (mobile)

### State additions

- `activeResult`: currently previewed item/group
- `isPreviewOpen`
- `resultScrollSnapshot`
- `intentPlayPayload`

### Reuse plan

- Reuse `useSearchExecution` for search lifecycle and stream updates.
- Reuse `useSearchResultFilters` for filter semantics.
- Refactor `VideoCard` click intent from direct route to preview-open.

## 8. Error Handling and Fallback

- Stream source failure should not collapse whole result wall.
- Session creation failure is handled in preview layer with inline retry.
- Network instability can fall back to non-stream search mode (existing logic).

## 9. Testing and Acceptance

### Must-pass user path

`keyword input -> open preview -> play now -> back to search (restored context)`

### Test priorities

- State restoration tests (query/filter/scroll/active preview)
- Component behavior tests (preview open/close, CTA routing)
- Responsive behavior tests (drawer/sheet branches)
- Session creation error + retry behavior

### UX acceptance

- Play entry in <= 2 primary clicks after results appear.
- No forced re-filtering after returning from play.
- Mobile and desktop complete the same intent with same semantic sequence.

## 10. Rollout Strategy

1. Build preview layer and restoration first, preserving current API contracts.
2. Replace direct-card-navigation with preview-first navigation.
3. Introduce discovery strip modules incrementally.
4. Perform focused UX validation on desktop + mobile before wider rollout.
