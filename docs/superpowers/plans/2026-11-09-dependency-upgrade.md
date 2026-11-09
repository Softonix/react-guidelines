# Dependency Audit & Upgrade Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Clear all `npm audit` advisories, move core deps (Node, React Router, TypeScript, Supabase CLI, lint-staged, Mantine, TanStack Query, Zod, Vite, Tailwind) to latest compatible versions, and migrate code/docs for their breaking changes.

**Architecture:** Dependency-only change in ordered layers. Each task bumps one group, applies that group's migrations, and leaves the repo green (`preflight` + `build`). Runtime/minor bumps come first so React Router 8's React ≥19.2.7 peer is already met when it lands.

**Tech Stack:** Node 26 LTS (local) / Node 24 (Docker, per RR template), npm 11, React Router 8 (framework mode, `ssr: false`), React 19.3, Mantine 9.8, TanStack Query 5, Zod 4.6, Vite 8, Tailwind 4, TypeScript 6, ESLint 9, Supabase CLI 3.

**Spec:** `docs/superpowers/specs/2026-11-09-dependency-audit.md` (audit table, target versions, blocked upgrades, migration list).

## Global Constraints

- Node: `.nvmrc` = `26.13.0` (latest LTS, local dev). Docker base = `node:24-alpine`, matching the official React Router v8 template (`remix-run/react-router-templates` `default/Dockerfile`). Because Docker runs 24, `engines.node` stays `">=24.15"` and `@types/node` stays on `^24` (types for the lowest supported runtime, so no Node 26-only APIs get used).
- React Router family (`react-router`, `@react-router/dev`, `@react-router/node`, `@react-router/serve`) pinned **exactly** to `8.5.1` (repo convention: exact pins for this family). `@react-router/serve` is **kept** (user decision).
- **Do not** upgrade: TypeScript past `6.0.x`, ESLint past `9.x`, `@babel/preset-typescript` past `7.x`. Reasons in spec § Blocked upgrades. Never use `--legacy-peer-deps` / `--force`.
- Commits: one-line concise messages, **no `Co-Authored-By` trailer** (CLAUDE.md overrides harness default).
- Supabase CLI always via `npx supabase …`.
- Generated files are never hand-edited: `app/theme.css` (by tailwind-preset-mantine Vite plugin on `dev`/`build`), `app/shared/api/schema/database.types.ts` (by `npm run db:gen-types`).
- "Green" for every task = `npm run preflight` exits 0 **and** `npm run build` exits 0.
- Keep comments to a minimum; `.md` files are prettier-ignored — keep their authored formatting.

## Review Focus

1. **Deep-link refresh under `npm start`** — `GET /some/unknown/path` on the served build must return the SPA HTML (app renders its 404 boundary), not Express `Cannot GET`. Test in Task 4 Step 6.
2. **React Compiler silently dropped** — after Vite/RR upgrades the compiler must still transform components. Test: built client bundle contains `react.memo_cache_sentinel` (Task 4 Step 5).
3. **Docker image on Node 24** — `docker build` must succeed and the container must serve `/` (Task 6 Step 4). Old Dockerfile used Node 20, already below RR8's floor.
4. **Generated DB types drift under CLI 3** — `npm run db:gen-types` with the new CLI (no `--local`) must produce a byte-identical `database.types.ts` (Task 5 Step 5).
5. **Local Node 26 vs Docker Node 24 drift** — everything must also install and build on Node 24 with no `EBADENGINE` warnings (Task 1 Step 6); the Docker build in Task 6 Step 4 is the end-to-end check.

---

### Task 1: Node 26 LTS locally, Node 24 Docker (RR template) + green baseline

**Files:**
- Modify: `.nvmrc`, `package.json` (`@types/node` latest 24.x), `Dockerfile` (all 4 `FROM` lines + prod `npm ci`), `README.md:28-29`, `vite.config.ts` (format only)

**Interfaces:**
- Produces: Node 26.13.0 active in shell for all later tasks; baseline `preflight` green.

- [ ] **Step 1: Prove the current gaps**

Run: `node -v; grep -c node:20 Dockerfile; npm run format:check`
Expected: node ≠ v26.13.0, Dockerfile count `4`, format:check FAILS on `vite.config.ts` (pre-existing import order issue).

- [ ] **Step 2: Install and activate Node 26**

Run: `echo 26.13.0 > .nvmrc && nvm install && nvm use && node -v && npm -v`
Expected: `v26.13.0`, npm `11.x`.

- [ ] **Step 3: Apply toolchain edits**

- `package.json`: `engines` unchanged (`">=24.15"`); `npm install -D @types/node@^24.19.2`.
- `Dockerfile`: every `node:20-alpine` → `node:24-alpine` (as in the RR v8 template); production-deps stage `RUN npm ci --omit=dev --ignore-scripts`. This is the one deliberate difference from the template: this repo's `prepare` → `husky` script fails when dev deps are omitted.
- `README.md` Prerequisites: `**Node.js** ≥ 24.15; 26.13 LTS recommended (see .nvmrc)`, `**npm** ≥ 11`.
- `npx prettier --write vite.config.ts`.

- [ ] **Step 4: Reinstall**

Run: `rm -rf node_modules && npm install`
Expected: exit 0, no `EBADENGINE` warnings.

- [ ] **Step 5: Verify green**

Run: `npm run preflight && npm run build`
Expected: both exit 0.

- [ ] **Step 6: Verify Node 24 compatibility (Review Focus 5)**

Run: `nvm install 24 && nvm exec 24 npm install --dry-run 2>&1 | grep -i ebadengine; echo exit=$?`
Expected: no output from grep, `exit=1`. Repeat this check after Tasks 3–5 (lint-staged 17 needs ≥22.22.1, RR8 ≥22.22.0: both fine on 24).

- [ ] **Step 7: Commit**

```bash
git add .nvmrc package.json package-lock.json Dockerfile README.md vite.config.ts
git commit -m "chore: Node 26 LTS for local dev, Node 24 Docker image per RR template"
```

---

### Task 2: Runtime dependency updates + Mantine schemaResolver docs

**Files:**
- Modify: `package.json`, `package-lock.json`, `docs/data-layer.md:212-232`, `docs/conventions.md:39`

**Interfaces:**
- Produces: React `^19.3.1` installed (RR8 peer prerequisite for Task 4). `mantine-form-zod-resolver` gone; docs use `schemaResolver` from `@mantine/form`.

- [ ] **Step 1: Prove vulnerable runtime deps**

Run: `npm audit --omit=dev 2>&1 | grep -E "^(zod|react-router)\b"`
Expected: both listed.

- [ ] **Step 2: Bump runtime deps**

```bash
npm install @mantine/core@^9.8.0 @mantine/dates@^9.8.0 @mantine/form@^9.8.0 @mantine/hooks@^9.8.0 \
  @mantine/modals@^9.8.0 @mantine/notifications@^9.8.0 @tanstack/react-query@^5.107.1 \
  @supabase/supabase-js@^2.119.0 zod@^4.6.7 react@^19.3.1 react-dom@^19.3.1 \
  dayjs@^1.11.23 tailwind-merge@^3.7.0 isbot@^5.2.2
npm install -D @tanstack/react-query-devtools@^5.107.1 @types/react@^19.3.0 @types/react-dom@^19.3.0
npm uninstall mantine-form-zod-resolver
```

- [ ] **Step 3: Update form docs**

- `docs/data-layer.md` form example: drop the `mantine-form-zod-resolver` import; import `{ useForm, schemaResolver } from '@mantine/form'`; `email: z.email()`; `validate: schemaResolver(SignInSchema, { sync: true })`. Rest of the snippet unchanged.
- `docs/conventions.md:39`: `- **Mantine Form + Zod** via the built-in \`schemaResolver\` from \`@mantine/form\` (Standard Schema). Pass \`{ sync: true }\` so \`form.isValid()\`/\`validate()\` stay synchronous.`

- [ ] **Step 4: Verify no stale references**

Run: `grep -rn "mantine-form-zod-resolver\|zodResolver\|z.string().email" --exclude-dir=node_modules --exclude-dir=superpowers . ; echo exit=$?`
Expected: no matches, `exit=1`.

- [ ] **Step 5: Verify green**

Run: `npm run preflight && npm run build`
Expected: both exit 0. If `app/theme.css` changed, leave it for Task 3 (`git checkout app/theme.css`).

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json docs/data-layer.md docs/conventions.md
git commit -m "chore: update runtime deps, replace zod resolver with mantine schemaResolver"
```

---

### Task 3: Dev tooling — TypeScript 6, Vite, Tailwind, ESLint/Prettier, lint-staged 17

**Files:**
- Modify: `package.json`, `package-lock.json`, `tsconfig.json`, `.prettierrc.js:176`, `app/theme.css` (regenerated), any TS files reformatted by Prettier 3.9

**Interfaces:**
- Consumes: Node 26 (Task 1).
- Produces: `typescript@6.0.3`; tsconfig without `esModuleInterop`, `lib: ["DOM", "ES2022"]`.

- [ ] **Step 1: Bump dev tooling**

```bash
npm install -D typescript@~6.0.3 vite@^8.3.6 tailwindcss@^4.3.5 @tailwindcss/vite@^4.3.5 \
  tailwind-preset-mantine@^4.1.0 prettier@^3.9.10 eslint@^9.39.5 typescript-eslint@^8.72.1 \
  eslint-plugin-react-refresh@^0.5.7 globals@^17.14.0 type-fest@^5.10.0 \
  @babel/preset-typescript@^7.29.7 lint-staged@^17.6.0
```

Expected: exit 0, no `ERESOLVE`.

- [ ] **Step 2: TS 6 config clean-up**

- `tsconfig.json`: remove `"esModuleInterop": true`; `"lib": ["DOM", "ES2022"]`. Keep `strict`, `rootDirs`, `types` explicit.
- `.prettierrc.js`: `importOrderTypeScriptVersion: '6.0.3'`.

- [ ] **Step 3: Apply Prettier 3.9 formatting**

Run: `npm run format && git diff --stat`
Expected: only formatting changes in `.ts/.tsx/.js/.json/.css` files (no `.md`, no generated files).

- [ ] **Step 4: Verify green**

Run: `npm run preflight && npm run build && npx tsc -v && npx lint-staged --version && git diff app/theme.css | grep -c "color-success"`
Expected: green; `Version 6.0.3`; lint-staged `17.6.x`; theme diff count ≥ 1 (preset 4.1 regenerated it); eslint prints no "unsupported TypeScript version" warning.

- [ ] **Step 5: Commit** (pre-commit hook exercises lint-staged 17; it must pass without `--no-verify`)

```bash
git add -A
git commit -m "chore: update dev tooling, TypeScript 6, lint-staged 17"
```

---

### Task 4: React Router 8

**Files:**
- Modify: `package.json` (4 exact pins), `package-lock.json`, `README.md:7`, `CLAUDE.md:3`, `docs/routing.md:3,71`, `docs/conventions.md:28`, `app/views/home/ui/home-page.tsx:11`

**Interfaces:**
- Consumes: React `^19.3.1` (Task 2), TypeScript 6 (Task 3).
- Produces: `npm start` = `react-router-serve ./build/server/index.js` working against the v8 build (script unchanged).

- [ ] **Step 1: Prove the current state**

Run: `npm run build >/dev/null && ls build/server/index.js; npm audit 2>&1 | grep -cE "^(react-router|@react-router|proxy-addr|body-parser)"`
Expected: `ls` fails (no server build on v7 SPA), count > 0.

- [ ] **Step 2: Bump the family (exact pins)**

```bash
npm install --save-exact react-router@8.5.1 @react-router/node@8.5.1 @react-router/serve@8.5.1
npm install -D --save-exact @react-router/dev@8.5.1
```

Expected: exit 0. No source changes needed (`root.tsx`, `routes.ts`, `react-router.config.ts`, `vite.config.ts` stay as is).

- [ ] **Step 3: Update v7 → v8 references**

- `README.md:7`: `**React Router v8**`. `CLAUDE.md:3`: `React Router v8 (framework mode)`.
- `docs/routing.md:3`: `**React Router v8**`. `docs/routing.md:71`: `The types are generated by \`react-router typegen\` (run as part of \`npm run typecheck\`).`
- `docs/conventions.md:28`: `per React Router v8`.
- `app/views/home/ui/home-page.tsx:11`: `React Router v8 + Mantine + Tailwind scaffold.`

- [ ] **Step 4: Verify green + build artefacts**

Run: `npm run preflight && rm -rf build && npm run build && ls build/client/index.html build/server/index.js`
Expected: green; both files exist. **If `build/server/index.js` is missing, stop and report to the user** — do not switch to another server.

- [ ] **Step 5: Verify React Compiler still applied (Review Focus 2)**

Run: `grep -l "react.memo_cache_sentinel" build/client/assets/*.js | head -1`
Expected: at least one file path printed.

- [ ] **Step 6: Smoke-test `npm start` incl. deep link (Review Focus 1)**

Run (Bash `run_in_background` for the server): `PORT=3123 npm start`, then:
`curl -s -o /dev/null -w "%{http_code}\n" localhost:3123/ ; curl -s localhost:3123/some/unknown/path | grep -c "entry.client"`
Expected: `200`; count ≥ 1 (SPA HTML served for unknown path, not `Cannot GET`). Stop the server afterwards.

- [ ] **Step 7: Smoke-test dev server**

Run `npm run dev` (background), open `http://localhost:5173` in the browser.
Expected: title `App`, heading `Welcome 2`, subtitle `React Router v8 + Mantine + Tailwind scaffold.`, no console errors. Stop the server.

- [ ] **Step 8: Commit**

```bash
git add package.json package-lock.json README.md CLAUDE.md docs/routing.md docs/conventions.md app/views/home/ui/home-page.tsx
git commit -m "chore: upgrade React Router to v8"
```

---

### Task 5: Supabase CLI 3

**Files:**
- Modify: `package.json` (`supabase` dep, `db:gen-types` script), `package-lock.json`, `supabase/config.toml:99,216,254,390-392`

**Interfaces:**
- Produces: `npm run db:gen-types` = `supabase gen types typescript --schema public > app/shared/api/schema/database.types.ts`.

- [ ] **Step 1: Bump CLI and prove config breaks**

Run: `npm install -D supabase@^3.0.0 && npx supabase --version && npm run db:start`
Expected: version `3.0.x`; `db:start` FAILS with `[inbucket] … no longer supported`. (Requires Docker running.)

- [ ] **Step 2: Migrate `supabase/config.toml`**

- Line 99 `[inbucket]` → `[local_smtp]` (keys inside unchanged).
- `[auth.email]` line 216 `enable_signup = true` → `enabled = true`.
- `[auth.sms]` line 254 `enable_signup = false` → `enabled = false`.
- `[experimental]` line 392: delete `orioledb_version = ""` and its comment on line 391.
- Leave `[auth]` line 171 `enable_signup` untouched (not deprecated).

- [ ] **Step 3: Update script**

`package.json` `db:gen-types`: remove `--local`.

- [ ] **Step 4: Verify CLI runs clean**

Run: `npm run db:start 2>&1 | grep -iE "deprecat|warn|error"; npm run db:status`
Expected: grep prints nothing; status prints API URL and publishable key.

- [ ] **Step 5: Verify generated types unchanged (Review Focus 4)**

Run: `npm run db:gen-types && git diff --exit-code app/shared/api/schema/database.types.ts; npm run db:stop`
Expected: `git diff` exit 0.

- [ ] **Step 6: Verify green and commit**

Run: `npm run preflight && npm run build`

```bash
git add package.json package-lock.json supabase/config.toml
git commit -m "chore: upgrade Supabase CLI to v3"
```

---

### Task 6: Transitive refresh, audit gate, Docker, final docs

**Files:**
- Modify: `package-lock.json`, `README.md` (stack lines if versions changed), `docs/superpowers/specs/2026-11-09-dependency-audit.md` (append "Result" section)

- [ ] **Step 1: Refresh transitive deps within ranges**

Run: `npm update && npm dedupe`
Expected: exit 0.

- [ ] **Step 2: Audit gate**

Run: `npm audit; npm outdated`
Expected: `found 0 vulnerabilities`. `npm outdated` shows only the blocked majors: `typescript` (7.x), `eslint` (10.x), `@babel/preset-typescript` (8.x). Anything else outdated → bump it in range or record why not. If an advisory remains with no fix, record package/GHSA/reason in the spec's Result section instead of overriding.

- [ ] **Step 3: Full verification**

Run: `npm run preflight && rm -rf build && npm run build`
Expected: green.

- [ ] **Step 4: Docker build + run (Review Focus 3)**

Run: `docker build -t rr-starter . && docker run -d --rm -p 3124:3000 --name rr-starter rr-starter && sleep 3 && curl -s -o /dev/null -w "%{http_code}\n" localhost:3124/ ; docker stop rr-starter`
Expected: build succeeds on `node:24-alpine`; `200`.

- [ ] **Step 5: Record result**

Append to the spec a `## Result` section: final `npm audit` summary, final versions of the core packages (from `npm ls --depth=0`), blocked upgrades still pending.

- [ ] **Step 6: Commit**

```bash
git add package-lock.json README.md docs/superpowers/specs/2026-11-09-dependency-audit.md
git commit -m "chore: refresh lockfile, audit clean"
```
