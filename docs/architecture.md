# Architecture — Capped FSD

This project uses **capped Feature-Sliced Design**. "Capped" means: all standard FSD layers (`shared`, `entities`, `features`, `widgets`, `views`) are available; add a layer or slice when a real need appears, not preemptively. Two deviations from canonical FSD:

- The FSD `app` layer is dissolved into `shared/providers/` (other providers), `shared/mantine/` (theme + per-component overrides), and root-level files (`root.tsx`, `routes.ts`, `app.css`, `theme.css`). There is **no `app/` or `core/` layer**.
- The FSD `pages` layer is renamed **`views/`**. The view UI component **is** the route component (see `routing.md`).

## Directory layout

```
app/
├── shared/                # Cross-cutting reusable code
│   ├── api/               # Data-source client + generated schema (see data-layer.md)
│   │   ├── client/        # Client init
│   │   ├── schema/        # Generated DB types
│   │   └── index.ts
│   ├── config/            # One-time setup modules
│   ├── hooks/             # generic use-* hooks
│   ├── mantine/           # theme, colors, MantineConfigProvider, per-component overrides
│   ├── providers/         # ReactQueryClientProvider and other context providers
│   ├── types/             # cross-cutting *.types.ts
│   ├── ui/                # generic app-* components
│   ├── utils/             # generic *.utils.ts
│   └── constants.ts       # global constants
├── entities/              # Backend-resource slices (added per resource)
│   └── <resource>/
│       ├── lib/           # <resource>.api.ts, *.queries.ts, *.types.ts
│       ├── ui/            # optional: <resource>-card.tsx, <resource>-list.tsx, ...
│       └── index.ts
├── features/              # Self-contained interactions without backend ownership
│   └── <feature>/
│       ├── ui/
│       ├── lib/
│       └── index.ts
├── widgets/               # Composite UI reused across two or more views
│   └── <widget>/
│       ├── ui/
│       └── index.ts
├── views/                 # Page-level units; view UI = route component
│   └── <view>/
│       ├── ui/            # route components + view-local components
│       └── lib/           # form hooks, view-only data hooks (no barrel)
├── root.tsx               # Layout (HTML scaffold) + App (providers + Outlet) + ErrorBoundary
├── routes.ts              # Programmatic route config (see routing.md)
├── app.css                # global stylesheet entry
└── theme.css              # global theme variables (if used)
```

`entities/`, `features/`, `widgets/`, and `views/` directories don't need to exist until you populate them. Create the folder when you create the first slice in it.

## Slice anatomy

Standard segments inside a slice:

- **`ui/`** — React components.
- **`lib/`** — non-UI code: API services, query/mutation hooks, types, utils, configs.

Both segments are flat (no nested `model/`, no nested barrels). Files inside `lib/` use suffix conventions: `<thing>.api.ts`, `<thing>.queries.ts`, `<thing>.types.ts`, `<thing>.utils.ts`, `<thing>.config.ts`, `<thing>.constants.ts`.

Per layer:

| Layer | `lib/` | `ui/` | `index.ts` |
|---|---|---|---|
| `shared/<group>/` | yes (group-dependent contents) | yes (in `shared/ui/`) | yes per group |
| `entities/<x>/` | always | optional | required |
| `features/<x>/` | always | always | required |
| `widgets/<x>/` | optional | always | required |
| `views/<x>/` | optional | always | **none** |

Views have no barrel: routes import view components by full path (`~/views/<view>/ui/<view>-layout`).

## Import direction

Top consumes bottom. Never import upward; never reach into a sibling slice's internals.

```
routes.ts  →  views/  →  widgets/  →  features/  →  entities/  →  shared/
                     ↘  features/  ↗
                     ↘  entities/  ↗
                     ↘  shared/   ↗
```

Specific rules:

- **`shared/`** imports nothing from project layers (only third-party).
- **`entities/<x>/`** imports `shared/` only. **No imports from peer entities.** Model cross-entity relationships via IDs; let consumers compose.
- **`features/<x>/`** imports `shared/` and `entities/`. No peer-feature imports.
- **`widgets/<x>/`** imports `shared/`, `entities/`, `features/`. No peer-widget imports.
- **`views/<x>/`** imports anything below it. Views may also have view-local `lib/` for cross-entity / view-only data hooks.
- **`routes.ts`** imports view UI components only (it's the route registry).

## Path alias

`tsconfig.json` declares `~/*` → `./app/*`. Always use `~` for cross-slice imports. Relative imports are reserved for same-folder siblings.

```ts
import { itemsApi, useItemsList } from '~/entities/items'
import { SortControls, useSort } from '~/features/sort'
import { Header } from '~/widgets/header'
import { AppGrid } from '~/shared/ui'
```

## Barrel exports

- **Slice root barrel (`<slice>/index.ts`)** — required for `entities/`, `features/`, `widgets/`. **Explicit named exports only.** No `export *`. The barrel is the slice's public API; anything not listed is private.
- **No nested barrels** inside slices. The slice barrel reaches directly into `./lib/<file>` and `./ui/<component>`. One source of truth per slice.
- **Views have no barrel.** Import view components by full path.
- **Shared sub-groups (`shared/ui/`, `shared/hooks/`, `shared/utils/`, `shared/types/`)** — each has an `index.ts` with explicit named exports.

Example:

```ts
// app/entities/items/index.ts
export { itemsApi } from './lib/items.api'
export { ITEMS_QUERY_KEY, useItemsList } from './lib/item-list.queries'
export {
  ITEM_QUERY_KEY,
  useCreateItem,
  useDeleteItem,
  useItem,
  useUpdateItem,
} from './lib/item.queries'
export { type GetItemsParams, type Item } from './lib/items.types'
```
