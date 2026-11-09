# Conventions

## Naming

| Kind | Convention | Example |
|---|---|---|
| Files | kebab-case | `items-grid.tsx`, `item-list.queries.ts` |
| Components | PascalCase | `ItemsGrid` |
| Hooks | `useXxx` camelCase | `useItemsList`, `useSignInForm` |
| API objects | `<resource>Api` camelCase | `itemsApi` |
| API methods | camelCase verb | `list`, `byId`, `create`, `update` |
| Types | PascalCase | `Item`, `GetItemsParams` |
| Query-key factories | `<RESOURCE>_QUERY_KEY` SCREAMING_SNAKE_CASE | `ITEMS_QUERY_KEY` |
| Constants | SCREAMING_SNAKE_CASE | `DEFAULT_PAGE_SIZE` |
| Generic UI components | `app-<name>` prefix | `app-grid.tsx` → `AppGrid` |

**Entity folder name and file prefix match.** `entities/items/lib/items.api.ts` (not `entities/items/lib/widget.api.ts`). Sub-concern files use a singular noun: `item-list.queries.ts`, `item-detail.queries.ts`.

**Route view filename suffixes.** Files inside `views/<view>/ui/` registered in `app/routes.ts` follow these suffixes so the route-vs-helper distinction is visible from the filename alone:

- Files registered as `layout(...)` → `*-layout.tsx`. Example: `views/auth/ui/auth-layout.tsx`.
- Files registered as `route(...)` or `index(...)` → `*-page.tsx`. Example: `views/auth/ui/auth-sign-in-page.tsx`.
- Non-route subcomponents inside `views/<view>/ui/` → no suffix. Example: `views/auth/ui/sign-in-card.tsx`.

## Exports

- **Named exports as the default.** Component files, hook files, util files, query files, API service files, barrel files — all named.
- **Exception: route view files** (the ones registered in `app/routes.ts`) need a default export per React Router v7. These live in `app/views/<view>/ui/` and additionally export `meta` / `ErrorBoundary` as named exports.
- **Barrel files (`index.ts`)** re-export named symbols only. No `export *`.

## Imports

- **Use the `~` alias** for cross-slice imports (`~/shared/...`, `~/entities/...`, `~/features/...`, `~/widgets/...`, `~/views/...`). Relative paths are reserved for same-folder siblings.
- **Type-only imports use `import type`** (enforced by `verbatimModuleSyntax: true` in tsconfig). Mixed: `import { foo, type Bar }`.
- **Order:** external packages first, then `~/*` absolute imports, then relative imports. Blank line between groups.

## Forms

- **Mantine Form + Zod** via the built-in `schemaResolver` from `@mantine/form` (Standard Schema). Pass `{ sync: true }` so `form.isValid()`/`validate()` stay synchronous.
- **Form hooks live in the consuming view's `lib/`** as `use-<name>-form.ts`.
- **Schema declared inline** at the top of the form hook file. Promote to a shared schema only when reused.
- **`mode: 'uncontrolled'`** as the Mantine Form default.
- **Hooks return `{ form, handleSubmit, isLoading }`.** The UI renders inputs and binds to `form`; submission logic stays in the hook.
- **Submit through entity mutations**, never the data client directly. The mutation handles cache invalidation in `onSuccess`.

## State management

- **Server state → React Query.** No duplicating server data into local state.
- **URL state → React Router** (`useSearchParams`, route params). Filters, pagination, tab selection, anything shareable.
- **Local component state → `useState` / `useReducer`** for UI-only state.
- **Form state → Mantine Form** in a view-local form hook.
- **Feature-local state → custom hook in the feature's `lib/`** (e.g. `useSort()`).
- **Cross-component coordination within a slice → custom hook in the slice's `lib/`**, lifted to the nearest common parent. No Context for slice-internal state.
- **Auth/current-user state → `entities/me`.** Treat the current user as a resource with React Query owning the cache.
- **Theme/color scheme → Mantine's `useMantineColorScheme`.** Don't roll a parallel store.
- **No global client-side store** (Zustand, Redux). If a real cross-cutting need appears, raise it in review before introducing a library — usually the answer is the URL or a synthetic React Query key.


## UI organization within a slice

- **`ui/` stays flat** until ~10 files; then group by sub-feature into subfolders.
- **Don't preemptively nest.** A view with 3 components doesn't need subfolders.
- **One component per file.** Filename matches the component name in kebab-case (`items-grid.tsx` → `ItemsGrid`).

## Scripts

See root `package.json`.

## TypeScript

See root `tsconfig.json`.
