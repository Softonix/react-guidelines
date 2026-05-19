# Slices — Per-Layer Guidance

This doc covers when to add a slice to each layer and the conventions inside it. For directory layout and import direction, see `architecture.md`.

## `shared/`

Cross-cutting code with no domain ownership. Imports nothing from project layers.

```
shared/
├── api/             # data-source client + generated schema (see data-layer.md)
├── config/          # one-time setup modules (dayjs, third-party config, …)
├── hooks/           # generic use-*.ts
├── mantine/         # theme, colors, MantineConfigProvider, per-component overrides
├── providers/       # ReactQueryClientProvider and other context providers
├── types/           # cross-cutting *.types.ts
├── ui/              # generic app-*.tsx
├── utils/           # generic *.utils.ts
└── constants.ts     # truly global constants (DEFAULT_PAGE_SIZE, ...)
```

File naming inside `shared/`:

- `shared/ui/` — `app-<name>.tsx` prefix to distinguish from Mantine primitives and entity UI.
- `shared/hooks/` — `use-<name>.ts`.
- `shared/utils/` — `<topic>.utils.ts`.
- `shared/types/` — `<topic>.types.ts`.
- `shared/config/` — `<topic>.ts` (small files, no suffix).
- `shared/constants.ts` — flat file. If it grows, split into `shared/constants/` directory.

Domain-specific helpers belong in the entity's `lib/`, not `shared/utils/`. `shared/` is for cross-cutting concerns.

## `entities/`

A backend domain resource. Owns the API service, types, query/mutation hooks, and optional presentational UI tied to the entity's data shape.

**When to add:** when a domain concept has a backend resource and at least one read or write. Don't preemptively create empty entity slices.

**Folder shape:**

```
entities/<resource>/
├── lib/
│   ├── <resource>.api.ts        # the *Api object
│   ├── <resource>.queries.ts    # query/mutation hooks + query-key factory
│   ├── <resource>.types.ts      # request/response types
│   └── ...                      # optional: more *.queries.ts (sub-concerns), *.utils.ts
├── ui/                          # optional
│   ├── <resource>-card.tsx
│   ├── <resource>-list.tsx
│   └── ...
└── index.ts                     # explicit named exports
```

**File-naming rule:** the folder name and the file prefix match (`entities/items/lib/items.api.ts`). Sub-concern splits use a singular noun derived from the entity (`item-list.queries.ts`, `item-detail.queries.ts`) when one `<resource>.queries.ts` grows past ~150 lines or a clear sub-concern emerges (list vs. detail, nested resources).

**Incremental adoption is fine.** Start with what you need (often just `<resource>.api.ts`); add types/queries/UI as the slice grows. Don't pad with empty files.

**Imports:** `shared/` only. **No peer-entity imports.** Cross-entity relationships are typed by ID; consumers (features, views, widgets) compose.

**Entity UI** is presentational — `<resource>-card.tsx`, `<resource>-badges.tsx`. Anything that orchestrates a flow (modals, multi-step interactions, mutation-bundled UI state) belongs in features or views.

## `features/`

A self-contained user interaction that **does not own a backend resource**. Has UI + its own state/behavior, but no API.

**Examples:** sort/filter controls, theme toggle, command palette, drag-to-reorder, modal flows.

**When to add:** when an interaction is reused across two or more views, **or** when the interaction is complex enough that isolating it materially helps testing/maintenance (e.g. drag-and-drop with its own state machine). Build inside the consuming view first; extract on the second use case.

**Folder shape:**

```
features/<feature>/
├── ui/
│   ├── <feature>-controls.tsx
│   └── ...
├── lib/
│   ├── use-<feature>.ts
│   └── <feature>.config.ts
└── index.ts
```

**Imports:** `shared/`, `entities/`. No peer-feature, widget, or view imports.

If the interaction owns/fetches a resource, it's an entity, not a feature.

## `widgets/`

A composite UI block reused across **two or more view layouts**. Header, sidebar, footer, top-nav.

**When to add:** when a second view needs the same composite. Build inside the first consuming view; extract on the second use.

**Folder shape:**

```
widgets/<widget>/
├── ui/
│   └── <widget>.tsx
├── lib/                # only if the widget needs its own data/state hooks (rare)
└── index.ts
```

**Imports:** `shared/`, `entities/`, `features/`. No view, peer-widget imports.

## `views/`

Page-level units. The view UI component **is the route component** — see `routing.md`.

**Folder shape:**

```
views/<view>/
├── ui/
│   ├── <view>-layout.tsx              # if the view is a layout route
│   ├── <view>-<thing>-page.tsx        # route components registered in routes.ts
│   └── <subcomponent>.tsx             # view-local components
├── lib/                               # optional
│   ├── use-<thing>-form.ts            # view-local form hook (see data-layer.md)
│   └── <thing>.queries.ts             # cross-entity / view-only data hooks
└── (no index.ts — views have no barrel)
```

**Imports:** anything below (`shared`, `entities`, `features`, `widgets`).

**`ui/` stays flat** until ~10 files; then group by sub-feature into subfolders. Don't preemptively nest.

**`lib/` is optional.** Add it for:

- **Form hooks** — `use-<form>-form.ts` returning `{ form, handleSubmit, isLoading }`.
- **View-only data hooks** — queries/mutations that compose multiple entities or are purely view-specific. Anything tied to a single backend resource lives in that resource's entity.

Routes (the view UI files registered in `routes.ts`) need a default export. All other files use named exports.
