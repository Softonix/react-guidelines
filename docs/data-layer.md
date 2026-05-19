# Data Layer

This doc covers the **structural conventions** for the data layer that hold regardless of transport (REST, GraphQL, BaaS clients, RPC, etc.). The chosen data source plugs in via the `shared/api/` client; everything else stays the same.

## Layout

```
shared/api/
├── client/         # Data-source client init
├── schema/         # Generated DB types (if the data source supports type generation)
└── index.ts        # exports the client + commonly-used type helpers

entities/<resource>/lib/
├── <resource>.api.ts        # service object, wraps the client
├── <resource>.queries.ts    # query/mutation hooks + query-key factory
└── <resource>.types.ts      # request/response/derived types
```

`shared/api/` holds only the data-source client and schema. **All domain APIs and data hooks live in entities.**

## Schema types (`shared/api/schema/`)

If the backend supports generating TypeScript types from its schema, the generated file lives in `shared/api/schema/` and **must not be hand-edited**. The sibling `schema/index.ts` is the public API of the schema module and re-exports the helpers worth using application-wide:

```ts
// app/shared/api/schema/index.ts
export type { Database, Json, Tables, TablesInsert, TablesUpdate } from './database.types'
```

Always import schema types via the barrel (`~/shared/api` or `~/shared/api/schema`) — never reach into the generated file directly. The indirection lets you swap the generator or add helpers without touching every entity.

### Refining text + check columns in the entity

Database CHECK constraints (`status in ('pending','accepted',...)`) are often flat text from the schema generator's perspective — every constrained column lands as `string`. Narrow them to literal unions in the entity's own `<resource>.types.ts` using `type-fest`'s `Merge`. Keep the refinement next to the entity that owns the resource; don't bake entity-specific narrowing into the schema barrel.

```ts
// app/entities/items/lib/items.types.ts
import type { Merge } from 'type-fest'
import type { Tables, TablesInsert, TablesUpdate } from '~/shared/api'

// Mirror the DB CHECK constraint. Single source of truth at the entity.
export type ItemStatus = 'draft' | 'active' | 'archived'

export type Item = Merge<
  Tables<'items'>,
  { status: ItemStatus }
>

export type ItemInsert = Merge<
  TablesInsert<'items'>,
  { status?: ItemStatus }
>

export type ItemUpdate = Merge<
  TablesUpdate<'items'>,
  { status?: ItemStatus }
>
```

Rules:

- Use `Merge` from `type-fest`. Don't hand-roll an `Omit<...> & {...}` chain — it's the same idea but easier to misread.
- The literal union sits next to the merged type so a future migration touches one file.
- Cross-entity unions live in `~/shared/types`. Reuse those instead of redeclaring the same literals per entity.
- The `Insert`/`Update` variants make constrained fields optional to mirror the DB default. Required fields stay required.
- Service code (`<resource>.api.ts`) returns the refined type. Casting at the service boundary is acceptable because the DB CHECK guarantees the value set — no runtime narrowing needed.

## Service objects (`<resource>.api.ts`)

One file per resource. Export a single object `<resource>Api` whose methods wrap the data-source client. The service is the seam between the entity and the underlying transport: when transport changes, only this file changes.

```ts
// app/entities/items/lib/items.api.ts
import { getSupabaseBrowserClient } from '~/shared/api'
import type { Item, GetItemsParams, CreateItemInput } from './items.types'

const client = getSupabaseBrowserClient()

export const itemsApi = {
  list: async (params: GetItemsParams): Promise<{ items: Item[]; total: number }> => {
    // transport call here
  },
  byId: async (itemId: string): Promise<Item> => {
    // transport call here
  },
  create: async (input: CreateItemInput): Promise<Item> => {
    // transport call here
  },
  // ...
}
```

Why the indirection (vs. calling the client from queries directly):

1. Queries stay focused on cache shape; transport details stay in one place.
2. Any non-React caller (utilities, route loaders, tests) consumes the same `*Api` without going through React Query.
3. When multiple transports mix in one entity (RPC + table queries + an external API), the entity still presents one coherent surface.

## Query and mutation hooks (`<resource>.queries.ts`)

Query/mutation hooks live in the **entity** that owns the resource. Cross-entity or view-only data hooks may live in `views/<view>/lib/` instead — but never inside the consuming UI component, and never inside `shared/api/`.

### Query-key factory

Each `*.queries.ts` exports a plain-object factory:

```ts
export const ITEMS_QUERY_KEY = {
  root: ['items'] as const,
  list: (params: GetItemsParams) => [...ITEMS_QUERY_KEY.root, 'list', params] as const,
  detail: (itemId: string) => [...ITEMS_QUERY_KEY.root, 'detail', itemId] as const,
}
```

Rules:

- `root` is the broadest key — the invalidation target for any mutation that touches the resource.
- Variants extend `root` with discriminators and params.
- Keys are stable identifiers (e.g. `'items'`), **not** API paths.
- Mutations invalidate by the broadest key that covers affected data — usually `root`, sometimes a sub-key.

### Queries

```ts
import { useDebouncedValue } from '@mantine/hooks'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { DEFAULT_PAGE_SIZE } from '~/shared/constants'
import { itemsApi } from './items.api'
import type { GetItemsParams } from './items.types'

export const ITEMS_QUERY_KEY = {
  root: ['items'] as const,
  list: (params: GetItemsParams) => [...ITEMS_QUERY_KEY.root, 'list', params] as const,
}

export function useItemsList(params: GetItemsParams) {
  const [debounced] = useDebouncedValue(params, 500)
  const { data, ...rest } = useQuery({
    queryKey: ITEMS_QUERY_KEY.list(debounced),
    queryFn: () => itemsApi.list(debounced),
    staleTime: 5 * 60 * 1000,
    placeholderData: keepPreviousData,
  })
  const items = data?.items ?? []
  const totalItems = data?.total ?? 0
  const totalPages = Math.ceil(totalItems / (params.pageSize ?? DEFAULT_PAGE_SIZE))
  return { items, totalItems, totalPages, ...rest }
}
```

Conventions:

- Debounce filter params with `useDebouncedValue` (500ms) before passing into queries that react to user input.
- `useInfiniteQuery` for cursor pagination, `useQuery` with `keepPreviousData` for offset/page pagination.
- Return derived data (flattened pages, totals, page count) alongside `...rest` so callers don't re-derive.

### Mutations

```ts
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { itemsApi } from './items.api'
import { ITEMS_QUERY_KEY } from './item-list.queries'

export const ITEM_QUERY_KEY = {
  root: (itemId: string) => ['items', 'detail', itemId] as const,
}

export function useCreateItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: itemsApi.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ITEMS_QUERY_KEY.root })
    },
  })
}

export function useUpdateItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (opts: { itemId: string; input: UpdateItemInput }) =>
      itemsApi.update(opts),
    onSuccess: (_, { itemId }) => {
      qc.invalidateQueries({ queryKey: ITEM_QUERY_KEY.root(itemId) })
      qc.invalidateQueries({ queryKey: ITEMS_QUERY_KEY.root })
    },
  })
}
```

Mutation invalidation pattern: invalidate the detail key for the affected record + the list root.

## Sub-concern splits

Start with one `<resource>.queries.ts`. Split into multiple files when the file grows past ~150 lines or when a clear sub-concern emerges:

```
entities/items/lib/
├── items.api.ts
├── items.types.ts
├── item-list.queries.ts      # list/cursor/offset hooks + ITEMS_QUERY_KEY
├── item.queries.ts           # detail/CRUD hooks + ITEM_QUERY_KEY
└── item-comments.queries.ts  # nested-resource hooks + COMMENTS_QUERY_KEY
```

The entity `index.ts` re-exports the public surface from each file (explicit named exports per `architecture.md`).

## Form-to-mutation pattern

Forms call entity mutations — never the data client directly.

```ts
// app/views/auth/lib/use-sign-in-form.ts
import { useForm } from '@mantine/form'
import { zodResolver } from 'mantine-form-zod-resolver'
import { z } from 'zod'
import { useSignIn } from '~/entities/me'

const SignInSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
})

export function useSignInForm() {
  const signIn = useSignIn()

  const form = useForm<z.infer<typeof SignInSchema>>({
    mode: 'uncontrolled',
    initialValues: { email: '', password: '' },
    validate: zodResolver(SignInSchema),
  })

  const handleSubmit = form.onSubmit((values) => signIn.mutateAsync(values))

  return { form, handleSubmit, isLoading: signIn.isPending }
}
```

Reasons: consistency, automatic cache invalidation through the mutation's `onSuccess`, and a transport swap won't touch form code.
