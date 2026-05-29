# Testing Strategy Proposal Roadmap

## 1. Purpose

This project is still an MVP/POC, so the testing strategy should protect the highest-risk paths without slowing down iteration. The goal is not full coverage on day one. The goal is a small CI safety net that catches broken builds, invalid contracts, and obvious API regressions before they land.

The current codebase already has a useful foundation:

- TypeScript backend in `src/`
- Vite/React web app in `apps/web/`
- Generated client SDK in `packages/client-sdk/`
- Prisma schema and migrations in `prisma/`
- OpenAPI contract in `openapi/openapi.yaml`
- Existing scripts for Prisma validation, OpenAPI validation, SDK generation, backend build, and web build

## 2. Guiding Principles

1. Keep CI fast enough that developers actually use it.
2. Start with CI now, add route-level smoke tests next, and leave E2E for later.
3. Prefer contract-driven tests because the API already has `openapi/openapi.yaml`.
4. Test user-critical flows before edge cases.
5. Avoid fragile end-to-end coverage until the MVP UX stabilizes.
6. Treat generated SDK drift as a CI failure only after `openapi:types` is confirmed deterministic.

## 3. Current Baseline

The root `package.json` already defines these useful scripts:

| Script | Purpose |
|--------|---------|
| `npm run prisma:validate` | Validates `prisma/schema.prisma` |
| `npm run openapi:validate` | Validates `openapi/openapi.yaml` |
| `npm run openapi:types` | Regenerates SDK schema types from OpenAPI |
| `npm run sdk:build` | Regenerates OpenAPI types and builds client SDK |
| `npm run build` | Compiles backend TypeScript |
| `npm run check` | Runs Prisma validation, OpenAPI validation, and backend build |
| `npm run web:build` | Builds SDK and web app |

These are enough to create the first CI gate immediately. Because `npm run web:build` already runs `npm run sdk:build`, the initial workflow should avoid separately regenerating/building the SDK unless that extra check is intentional.

## 4. Proposed Test Pyramid for MVP

### Static Checks

Static checks should be the first line of defense because they are fast, deterministic, and cheap to maintain.

Recommended CI checks:

- `npm ci`
- `npm run prisma:validate`
- `npm run openapi:validate`
- `npm run build`
- `npm run web:build`

Near-term additions:

- ESLint for backend, SDK, and web TypeScript
- TypeScript no-emit checks if any package is not fully covered by existing build scripts
- OpenAPI linting with Spectral for naming, response consistency, auth declarations, pagination shape, and error schema reuse
- Prettier or equivalent formatting check after build checks are stable

### Contract Tests

The OpenAPI file should become the center of automated API testing.

Recommended contract test layers:

1. Validate the OpenAPI document in CI.
2. Add route-level smoke tests for key API paths.
3. Regenerate SDK types in CI and fail on uncommitted drift after deterministic output is confirmed.
4. Add negative request validation tests for required fields, invalid enum values, invalid pagination, and unauthorized requests.
5. Later, add fuzz/property tests using an OpenAPI-aware tool as scheduled or non-blocking coverage first.

Good candidate tools:

| Tool | Use |
|------|-----|
| `swagger-cli` | Current spec validation |
| `openapi-typescript` | Current SDK schema type generation |
| `@stoplight/spectral-cli` | OpenAPI linting rules |
| Schemathesis | OpenAPI-driven API fuzz and contract tests after route smoke coverage exists |
| Prism | Mock server or request/response validation during development |
| Vitest + Supertest | Focused route tests against the backend app/server factory |

### Unit Tests

Unit tests should target logic that is easy to break and cheap to isolate.

Initial backend targets:

- `src/utils/slug.ts`
- `src/lib/playlistHref.ts`
- `src/lib/chartRange.ts`
- `src/lib/playlistMaps.ts`
- `src/lib/playbackMaps.ts`
- auth/session helpers where practical

Initial web targets:

- `apps/web/src/lib/routes.ts`
- `apps/web/src/lib/queueTrack.ts`
- `apps/web/src/lib/playerKeyboard.ts`
- `apps/web/src/lib/format.ts`
- auth storage helpers

Recommended tooling:

- Vitest for backend, SDK, and frontend unit tests
- React Testing Library only for stable shared components or hooks

### Integration Tests

Integration tests should cover API behavior that depends on routing, validation, Prisma, and auth.

Recommended first flows:

- health check returns `200`
- register, login, get current user, logout
- unauthenticated protected routes return `401`
- homepage endpoint returns the documented shape
- playlist create, read, update visibility, delete
- recording list and detail endpoints
- favorites add/remove flows for recordings and playlists
- admin routes reject non-admin users

For MVP CI, prefer a MySQL or MariaDB service container if the Prisma schema is MySQL-first. SQLite can break when the schema uses MySQL-specific field types or database behavior.

### End-to-End Smoke Tests

Full browser tests should stay small until the UX stabilizes.

Recommended Playwright smoke tests:

- app loads without runtime crash
- login/register page renders
- homepage renders seeded rows
- playlist page opens and shows tracks
- basic player controls render
- studio route redirects guests to login

These should be added after static and API contract checks are stable.

## 5. OpenAPI-Driven Automated Testing Plan

### Phase A: Contract Validity

Keep the existing validation step:

```bash
npm run openapi:validate
```

Add OpenAPI linting:

```bash
npx spectral lint openapi/openapi.yaml
```

Suggested lint rules:

- every operation has an `operationId`
- every operation has at least one success response
- error responses use `ErrorResponse`
- protected endpoints declare `bearerAuth`
- paginated list endpoints use consistent `page`, `pageSize`, and `meta`
- path parameters are declared and typed

### Phase B: SDK Drift Detection

After `openapi:types` is confirmed deterministic, CI should regenerate OpenAPI types and fail if generated output changes:

```bash
npm run openapi:types
git diff --exit-code packages/client-sdk/src/generated/schema.ts
```

This catches cases where `openapi/openapi.yaml` changed but generated client types were not committed. Keep this out of the first CI PR if generated files reorder or format differently between environments.

### Phase C: Runtime Contract Smoke Tests

Add a small test suite that starts the backend app/server factory and checks representative endpoints against the contract.

Recommended approach:

- Use Vitest + Supertest or the closest equivalent for the backend framework.
- Import the app/server factory from the backend entrypoint.
- Seed only the minimum data required for the test.
- Assert status code, content type, top-level shape, and that no route unexpectedly returns an undocumented `500`.
- Keep response validation narrow at first and aligned with OpenAPI schemas.
- Use shared test factories for users, sessions, playlists, and recordings.

Initial tests:

- `GET /api/v1/health`
- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`
- `GET /api/v1/auth/me`
- `GET /api/v1/homepage`
- one protected route without token
- one invalid request body to confirm OpenAPI request validation returns `request_validation_failed`

Homepage smoke tests should seed known public data so they do not depend on whatever happens to be in an empty or developer-local database.

### Phase D: OpenAPI Fuzz Testing

Once route smoke tests are stable, add Schemathesis as a non-blocking or scheduled CI job first.

Example shape:

```bash
schemathesis run openapi/openapi.yaml --base-url=http://localhost:4000
```

Recommended rollout:

1. Run manually during API-heavy changes.
2. Add as a scheduled nightly job.
3. Promote a small subset to blocking CI once false positives are understood.

This is useful for catching missing request validation, undocumented `500` responses, malformed schemas, and inconsistent status codes.

## 6. CI Roadmap

### Phase 1: Immediate CI Gate

Target: 1 day.

Add a GitHub Actions workflow that runs on pull requests and pushes:

```bash
npm ci
npm run check
npm run web:build
```

Expected value:

- catches broken TypeScript
- catches invalid Prisma schema
- catches invalid OpenAPI document
- catches broken generated SDK/web build chain

Recommended first PR scope:

1. Add `.github/workflows/ci.yml`.
2. Run `npm ci`.
3. Run `npm run check`.
4. Run `npm run web:build`.
5. Add or document a local mirror command: `npm run check && npm run web:build`.

### Phase 2: Local CI Mirror and Static Quality

Target: 1 to 2 days.

Add:

- `npm run ci` as the single local mirror for what GitHub runs
- TypeScript no-emit checks if needed
- SDK drift detection after `openapi:types` is confirmed deterministic
- ESLint
- Spectral OpenAPI linting
- formatting check after build and smoke checks are stable

Expected value:

- catches inconsistent API design earlier
- catches accidental generated client drift
- keeps code style stable during fast MVP iteration

### Phase 3: API Smoke Tests

Target: 2 to 4 days.

Add:

- Vitest
- Supertest
- CI environment documentation such as `.env.ci.example`
- test database setup with MySQL or MariaDB if Prisma is MySQL-first
- migration setup using `npx prisma migrate deploy` or a test DB reset before integration tests
- seed helpers for auth, users, playlists, recordings
- smoke tests for health, auth, homepage, playlists, favorites, protected route behavior

Expected value:

- catches broken backend routing
- catches auth regressions
- proves the most important API flows still work after schema or route changes

### Phase 4: OpenAPI Runtime Contract Tests

Target: 2 to 5 days after Phase 3.

Add:

- automated request/response checks for selected OpenAPI operations
- negative request tests from schema constraints
- optional Schemathesis nightly job

Expected value:

- turns `openapi/openapi.yaml` into an executable contract
- catches undocumented response changes
- catches request validation gaps

### Phase 5: Browser Smoke Tests

Target: after MVP screens stabilize.

Add:

- Playwright
- app boot smoke
- auth screen smoke
- homepage smoke
- playlist page smoke
- studio guest redirect smoke

Expected value:

- catches frontend runtime failures that TypeScript cannot catch
- protects the core user journey without maintaining a large fragile suite

## 7. Recommended GitHub Actions Workflow Shape

Initial workflow:

```yaml
name: CI

on:
  pull_request:
  push:
    branches: [main, master]

jobs:
  static:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm run check
      - run: npm run web:build
```

Later workflow additions:

```yaml
      - run: npm run lint
      - run: npm run format:check
      - run: npm run openapi:types
      - run: git diff --exit-code packages/client-sdk/src/generated/schema.ts
      - run: npm test
```

If integration tests require MySQL or MariaDB, add a service container and set CI environment variables for `DATABASE_URL`.

Document CI environment variables before adding integration tests:

- `DATABASE_URL`
- auth/JWT/session secrets
- upload/storage path or mock settings
- any public API base URL used by the web app build

## 8. Proposed Package Scripts

Recommended scripts to add over time:

```json
{
  "scripts": {
    "ci": "npm run check && npm run web:build",
    "lint": "eslint .",
    "format:check": "prettier --check .",
    "openapi:lint": "spectral lint openapi/openapi.yaml",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:api": "vitest run tests/api",
    "test:e2e": "playwright test"
  }
}
```

For the MVP, keep `npm run ci` aligned with the GitHub Actions workflow. Expand it only when the corresponding CI phase is adopted. Do not block CI on E2E tests until they are stable.

## 9. Definition of Done for MVP CI

The MVP testing setup is good enough when every pull request verifies:

- dependencies install cleanly
- Prisma schema is valid
- OpenAPI contract is valid
- backend TypeScript compiles
- SDK builds
- web app builds

After follow-up phases, add:

- generated SDK types are current
- core API smoke tests pass
- protected routes reject missing auth
- invalid request bodies are rejected by OpenAPI validation
- database migrations apply cleanly in CI

## 10. Risks and Mitigations

| Risk | Mitigation |
|------|------------|
| CI becomes slow | Keep E2E tests out of blocking CI at first |
| OpenAPI spec drifts from implementation | Regenerate SDK in CI and add contract smoke tests |
| Tests require too much seed data | Create small test factories and seed only what each suite needs |
| Database setup becomes brittle | Use a MySQL/MariaDB service container when Prisma is MySQL-first |
| Fuzz tests create noisy failures | Run Schemathesis nightly before making it blocking |
| Frontend tests become fragile | Focus browser tests on smoke coverage, not visual details |
| Formatting blocks useful MVP work | Add formatting checks after build and smoke checks are stable |

## 11. Suggested First Pull Request

The first testing PR should be small:

1. Add `.github/workflows/ci.yml`.
2. Run `npm ci`, `npm run check`, and `npm run web:build`.
3. Document the expected local command:

```bash
npm run check && npm run web:build
```

After that lands, add follow-up PRs in this order:

1. Add `npm run ci` as the local mirror command.
2. Confirm deterministic SDK generation, then add SDK drift detection.
3. Add Vitest/Supertest route smoke tests with test factories and CI database setup.
4. Add linting, Spectral, and formatting checks once the basic CI loop is stable.
5. Add Playwright browser smoke tests after core routes and contracts are stable.
