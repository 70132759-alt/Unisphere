# Unisphere

A university social network — feed, profiles, societies, events, jobs, messaging, notifications, campus map and calendar.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000, served under `/api`)
- `pnpm --filter @workspace/unisphere run dev` — run the web app
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/scripts run seed` — seed the database with campus map data (UOL locations)
- Required env: `DATABASE_URL` (Postgres connection string), `SESSION_SECRET`, `CLERK_SECRET_KEY`, `CLERK_PUBLISHABLE_KEY`

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Frontend: React 19 + Vite, wouter, TanStack Query
- Auth: Replit-managed Clerk
- Build: esbuild (server CJS bundle), Vite (client)

## Where things live

| Concern              | Path                                                  |
|----------------------|-------------------------------------------------------|
| DB tables            | `lib/db/src/schema/*.ts`                              |
| API contract         | `lib/api-spec/openapi.yaml` (source of truth)         |
| API route handlers   | `artifacts/api-server/src/routes/*.ts`                |
| Frontend pages       | `artifacts/unisphere/src/pages/*.tsx`                 |
| Frontend components  | `artifacts/unisphere/src/components/*.tsx`            |
| Generated hooks/zod  | `lib/api-client-react/src/generated/`, `lib/api-zod/src/generated/` |
| Seed script          | `scripts/src/seed.ts`                                 |
| Auth bridge          | `artifacts/api-server/src/lib/currentUser.ts`         |
| Clerk proxy mw       | `artifacts/api-server/src/middlewares/clerkProxyMiddleware.ts` |

## Architecture decisions

- **Contract-first API.** OpenAPI is the single source of truth. Frontend never imports server code; both depend only on generated artifacts.
- **Denormalized counters.** `followersCount`, `likesCount`, `membersCount`, `attendeesCount` stored on parent rows and maintained by route handlers — cheap reads, no joins for feed rendering.
- **Composite libs / leaf apps.** `lib/*` emit declarations via `tsc --build`. Apps in `artifacts/*` are typechecked with `--noEmit`.
- **Auth via Replit-managed Clerk.** Web app uses `@clerk/react` with cookie sessions; API uses `@clerk/express`. Every `/api/*` route is protected by `requireAuth` middleware which JIT-provisions a local `users` row keyed by `clerkUserId`.
- **Early-return discipline in handlers.** Every Express handler must `return` after sending an error response.

## Product

A campus-focused social network for university students:

- **Feed** — posts, stories, likes, comments, hashtags
- **Profile** — bio, stats, posts, connections
- **Societies** — browse + join campus clubs
- **Events** — discover and RSVP to campus events
- **Calendar** — month view with RSVP-able events
- **Jobs** — listings + save + apply
- **Messages** — 1:1 chat
- **Notifications** — activity feed
- **Campus map** — interactive building directory (seeded with 8 University of Lahore locations)

## User preferences

- Keep the codebase portable — the data layer (`lib/db`) should remain swappable.
- Don't edit generated files (`lib/api-zod/src/generated/`, `lib/api-client-react/src/generated/`). Edit `lib/api-spec/openapi.yaml` and re-run codegen.

## Gotchas

- **All routes must `return` after early `res.status(...).json(...)`.** Multiple responses → `ERR_HTTP_HEADERS_SENT`.
- **Counter integrity.** Only adjust denormalized counters when an insert actually creates a row (check `.returning().length`).
- **`zod/v4`, not `zod`.** Imports must be from `zod/v4` to match generator output.
- **Don't run `pnpm dev` at the root.** Apps are started via workspace filters or Replit workflows.
- **After editing the OpenAPI spec, run codegen before touching consumers.**

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
