# React SPA Supabase Starter

A scaffolded SPA starter. Pick it up, point it at a Supabase project, start shipping.

## Stack

- **React Router v8** (framework mode, `ssr: false` SPA build)
- **Mantine v9** + **Tailwind v4** for UI and styling
- **TanStack Query v5** for server state
- **Mantine Form** + **Zod** for forms and validation
- **Supabase** (`@supabase/supabase-js`) for data
- TypeScript (strict), ESLint, Prettier, Husky

Architecture: capped Feature-Sliced Design with `~/*` → `./app/*`.

## Documentation

- [`docs/architecture.md`](docs/architecture.md) — layers, slice anatomy, import direction
- [`docs/slices.md`](docs/slices.md) — per-layer guidance
- [`docs/data-layer.md`](docs/data-layer.md) — service objects, query/mutation hooks, form-to-mutation pattern
- [`docs/routing.md`](docs/routing.md) — programmatic routes, view = route component
- [`docs/app-setup.md`](docs/app-setup.md) — `root.tsx`, providers, Mantine config
- [`docs/styling.md`](docs/styling.md) — tokens, the three styling tools, anti-patterns
- [`docs/conventions.md`](docs/conventions.md) — naming, imports, forms, state management

## Prerequisites

- **Node.js** ≥ 24.15; 26.13 LTS recommended (see .nvmrc)
- **npm** ≥ 11
- **Docker** (for the local Supabase stack via `supabase start`)
- A `.env` with `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` (printed by `npm run db:start`)

## Getting started

```bash
npm install
npm run db:start     # boots local Supabase; copy the URL + publishable key into .env
npm run dev          # http://localhost:5173
```

### Other useful scripts

```bash
npm run typecheck     # react-router typegen + tsc
npm run lint          # eslint
npm run format        # prettier --write
npm run preflight     # typecheck + lint + format:check
npm run build         # production build
npm run db:reset      # reset local DB + re-run migrations
npm run db:gen-types  # regenerate app/shared/api/schema/database.types.ts
```

## Deployment

`npm run build` emits the static SPA in `build/client/` plus `build/server/`, which `npm run start` (react-router-serve) and the `Dockerfile` use. To deploy only `build/client/` to a static host, configure an SPA fallback that rewrites all paths to `/index.html`.
