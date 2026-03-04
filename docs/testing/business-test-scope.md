# Business-Only Test Scope

This document defines what test coverage is in scope for business-focused validation.

## Keep

- User-facing behaviors observable from UI interactions and rendered outcomes.
- Business rule enforcement and domain logic decisions.
- API behavior contracts: request handling, response status/body, and error behavior.
- Permission logic and access control outcomes.
- State restore flows that affect user continuity.

## Remove

- Source-code text scanning (for example, `readFileSync` against application source files).
- Line-count or file-size constraints.
- Endpoint rename snapshots that only lock string literals without behavior validation.
- "Function exists" assertions without behavior checks.
