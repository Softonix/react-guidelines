# Dependency Audit & Upgrade — Spec

Date: 2026-11-09. Baseline: `main` @ 6f2d941.

## Audit result (`npm audit`, baseline lockfile)

29 advisories: **1 critical, 11 high, 15 moderate, 2 low**.

| Package (how it arrives) | Sev | Advisory | Fixed by |
|---|---|---|---|
| proxy-addr (via `@react-router/serve` → express 4) | critical | GHSA-jqcg-44mw-7w3h IP spoofing | serve 8.x (express 5) |
| body-parser, compression, qs, morgan (express 4) | high/mod | DoS, log forging | serve 8.x |
| react-router 7.15.1 (direct) | high | GHSA-wrjc-x8rr-h8h6 open redirect, GHSA-337j-9hxr-rhxg, GHSA-chx6-hx7r-mcp5, GHSA-h8fp-f39c-q6mh, GHSA-qwww-vcr4-c8h2 | ≥7.18.2 (we go 8.5.1) |
| vite 8.0.13 (direct) | high | GHSA-9jrq-w75r-8gcw, GHSA-rq7h-c2jc-7f22, launch-editor set | ≥8.1.6 |
| zod 4.4.3 (direct) | high | GHSA-mrhx-c7xc-m3w5 memory exhaustion | ≥4.6.6 |
| browserslist, baseline-browser-mapping, @babel/core (Babel chain) | high/mod/low | DoS, file read | in-range update |
| postcss, source-map-js, nanoid, esbuild | high/low | path traversal, DoS | in-range update |
| brace-expansion, minimatch (eslint plugins / typescript-eslint) | high/mod | ReDoS | brace-expansion: in-range update; minimatch: still open, see Result |
| js-yaml, valibot | high/mod | DoS | in-range update |

## Upgrade targets

| Package | From | To | Note |
|---|---|---|---|
| Node (local dev, `.nvmrc`) | 24.15 | **26.13.0** (LTS "Lithium") | user request |
| Node (Docker) | 20-alpine | **24-alpine** | matches official RR v8 template Dockerfile |
| engines.node | >=24.15 | >=24.15 (unchanged) | must include Docker's Node 24 |
| @types/node | ^24 | ^24.19.2 | types for lowest supported runtime |
| react-router, @react-router/{dev,node,serve} | 7.15.1 | **8.5.1** (exact pin) | major; serve kept (user decision) |
| react, react-dom | ^19.2.4 | ^19.3.1 | RR8 needs ≥19.2.7 |
| typescript | 5.9.3 | **6.0.3** | TS 7 blocked (below) |
| supabase (CLI) | 2.100 | **^3.0.0** | major; config changes |
| lint-staged | 16.4 | **^17.6.0** | major; no config change |
| @mantine/* | 9.2 | ^9.8.0 | |
| @tanstack/react-query(+devtools) | 5.100 | ^5.107.1 | bump together |
| @supabase/supabase-js | 2.106 | ^2.119.0 | |
| zod | 4.4 | ^4.6.7 | |
| vite | 8.0 | ^8.3.6 | |
| tailwindcss, @tailwindcss/vite | 4.3.0 | ^4.3.5 | |
| tailwind-preset-mantine | 4.0.3 | ^4.1.0 | regenerates `app/theme.css` |
| prettier | 3.8 | ^3.9.10 | reformats TS |
| eslint | 9.39.4 | ^9.39.5 | ESLint 10 blocked |
| typescript-eslint | 8.59 | ^8.72.1 | |
| remaining minors | — | latest in range | see plan Task 2/3 |
| mantine-form-zod-resolver | 1.3.0 | **removed** | `@mantine/form` built-in `schemaResolver` |

## Blocked upgrades (stay put, revisit later)

- **TypeScript 7** — typescript-eslint (latest + canary) peers `typescript <6.1.0`; TS 7.0 ships no JS API. ESLint crashes under TS 7.
- **ESLint 10** — eslint-plugin-react 7.37.5 (peer ≤ ^9.7) and eslint-plugin-jsx-a11y 6.10.2 (peer ≤ ^9) have no ESLint 10 release.
- **Babel 8** (`@babel/preset-typescript` 8) — vite-plugin-babel and `@react-router/dev@8` both depend on `@babel/core` 7.

## Required migrations

- **React Router 8**: no source changes (verified in a scratch copy). Node ≥22.22, React ≥19.2.7. With `ssr: false`, v8 still emits `build/server/index.js` so `react-router-serve` works again. Doc references "v7" → "v8". React Compiler setup via vite-plugin-babel is still the documented approach.
- **TypeScript 6**: tsconfig compiles unchanged. Clean-up: drop redundant `esModuleInterop`, `lib` → `["DOM", "ES2022"]` (DOM.Iterable merged into DOM). Prettier `importOrderTypeScriptVersion` → `'6.0.3'`.
- **Supabase CLI 3**: `[inbucket]` → `[local_smtp]` in `supabase/config.toml` (hard error otherwise); delete `[experimental] orioledb_version`; `[auth.email]`/`[auth.sms]` `enable_signup` → `enabled`; `gen types … --local` → drop `--local` (local is default).
- **Mantine Form / Zod docs**: `zodResolver` from `mantine-form-zod-resolver` → `schemaResolver(schema, { sync: true })` from `@mantine/form`; `z.string().email()` → `z.email()`.
- **Node**: `.nvmrc` → 26.13.0; Dockerfile `node:20-alpine` (already below RR8's minimum) → `node:24-alpine` per the RR v8 template, plus `--ignore-scripts` on the prod `npm ci` (husky `prepare`); README prerequisites.
- **Pre-existing doc/format bugs fixed on the way**: `docs/routing.md` references non-existent `npm run typegen`; `vite.config.ts` fails `prettier --check`.

## Result

### npm audit

`7 moderate severity vulnerabilities`: 7 packages in one dependency chain, all from a single advisory.

- **minimatch** 7.0.0 - 11.0.0, GHSA-g3hv-75wg-m249 ("minimatch has potential denial of service via globparts amplification")
- Path: `typescript-eslint` → `@typescript-eslint/{eslint-plugin,parser,type-utils,utils,typescript-estree}` → `minimatch` 10.x; only the nested minimatch is vulnerable, the other 6 packages are flagged because they depend on it.
- Fix exists only in minimatch 11.0.1. `@typescript-eslint/typescript-estree` 8.72.1 (current) and its canary (8.72.2-alpha.11) both depend on `minimatch: ^10.2.2`, and the latest 10.x (10.2.6) is inside the vulnerable range, so no in-range update clears it.
- `npm update`/`dedupe` change nothing. The only fix npm offers is `npm audit fix --force`, a breaking downgrade to typescript-eslint 8.36.0, whose peer range is `typescript >=4.8.4 <5.9.0` (verified with `npm view typescript-eslint@8.36.0 peerDependencies`), so it cannot work with TS 6. No `overrides` used.
- Low risk: dev/lint-time only, never in the shipped bundle or Docker runtime image; input is repo-controlled glob patterns.
- Revisit when typescript-estree moves to minimatch >=11.0.1.

No other advisories.

### Final core versions (`npm ls --depth=0`)

| Package | Version |
| --- | --- |
| Node (local / Docker) | 26.13.0 / 24-alpine |
| react-router, @react-router/dev, /node, /serve | 8.5.1 |
| react, react-dom | 19.3.1 |
| typescript | 6.0.3 |
| eslint | 9.39.5 |
| typescript-eslint | 8.72.1 |
| vite | 8.3.6 |
| tailwindcss, @tailwindcss/vite | 4.3.5 |
| @mantine/core | 9.8.0 |
| @tanstack/react-query | 5.107.1 |
| @supabase/supabase-js | 2.119.0 |
| zod | 4.6.7 |
| supabase (CLI) | 3.0.0 |
| lint-staged | 17.6.0 |
| prettier | 3.9.10 |

### Blocked upgrades still pending

`npm outdated` lists only: `typescript` 7.0.2, `eslint` 10.14.0, `@babel/preset-typescript` 8.0.7, `@types/node` 26.6.6 (held at ^24 to match the Docker runtime).

- TypeScript 7, ESLint 10, Babel 8: see "Blocked upgrades" above.

### Notes

- The Vite `envFile` deprecation notice (emitted by `@react-router/dev` 7.x) is gone after RR8; confirmed absent in Task 4's `react-router typegen` / `build` output on 8.5.1.
- The eslint 9 npm deprecation notice is expected while ESLint 10 is blocked.
- Supabase `project_id = "aurelius-english"` in `supabase/config.toml` collides with a pre-existing local docker volume from another project, so `db:gen-types` currently picks up foreign tables. `database.types.ts` was intentionally not regenerated. Changing `project_id` is out of scope and left to the user.
- `npm start` (`react-router-serve`) serves `/` with 200; an unknown path such as `/some/unknown/path` returns 404 with the SPA HTML shell (`entry.client` present), so client-side routing still renders the not-found route.
- Verified: `npm run preflight` and `npm run build` pass; Docker image builds on `node:24-alpine` and serves `/` with 200.
