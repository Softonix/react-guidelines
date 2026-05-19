# App Setup — `root.tsx`, Mantine, Providers

There is no `app/` or `core/` FSD layer. Application setup lives in:

- `app/root.tsx` — Layout (HTML scaffold) + App (providers + Outlet) + ErrorBoundary
- `app/routes.ts` — programmatic route config (see `routing.md`)
- `app/app.css`, `app/theme.css` — global stylesheets
- `app/shared/providers/` — context providers (React Query, etc.)
- `app/shared/mantine/` — theme, colors, per-component overrides, MantineConfigProvider
- `app/shared/config/` — one-time setup modules, side-effect-imported from `root.tsx`

## `root.tsx`

Two distinct components: `Layout` (HTML scaffold), `App` (providers + outlet). Plus `ErrorBoundary` and `links` / `meta`.

```tsx
import { isRouteErrorResponse, Links, Meta, Outlet, Scripts, ScrollRestoration } from 'react-router'
import { mantineHtmlProps } from '@mantine/core'

import { ReactQueryClientProvider } from '~/shared/providers'
import { MantineConfigProvider } from '~/shared/mantine/mantine-config-provider'

import '~/shared/config/dayjs'
import './app.css'

import type { Route } from './+types/root'

export const links: Route.LinksFunction = () => [
  // global <link> tags (preconnects, fonts, …)
]

export function meta(_: Route.MetaArgs) {
  return [{ title: 'App' }]
}

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" {...mantineHtmlProps} data-mantine-color-scheme="dark">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  )
}

export default function App() {
  return (
    <ReactQueryClientProvider>
      <MantineConfigProvider>
        <Outlet />
      </MantineConfigProvider>
    </ReactQueryClientProvider>
  )
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  let message = 'Oops!'
  let details = 'An unexpected error occurred.'
  let stack: string | undefined

  if (isRouteErrorResponse(error)) {
    message = error.status === 404 ? '404' : 'Error'
    details = error.status === 404 ? 'The requested page could not be found.' : error.statusText || details
  } else if (import.meta.env.DEV && error instanceof Error) {
    details = error.message
    stack = error.stack
  }

  return (
    <main className="pt-16 p-4 container mx-auto">
      <h1>{message}</h1>
      <p>{details}</p>
      {stack && (
        <pre className="w-full p-4 overflow-x-auto"><code>{stack}</code></pre>
      )}
    </main>
  )
}
```

Rules:

- **`Layout`** is the HTML scaffold only. No business logic, no aesthetic chrome.
- **`App`** is providers + `<Outlet />` only. **No visual chrome** (no background gradients, no layout components). Visual chrome lives in views/widgets.
- **Provider order is fixed**: `ReactQueryClientProvider` → `MantineConfigProvider` → `<Outlet />`. React Query is the outer boundary.
- **`ErrorBoundary` is the fallback.** Specific routes/views may export their own `ErrorBoundary` for targeted UI.

## One-time setup via `shared/config/`

Module-level side effects (dayjs plugin extensions, third-party config) belong in `shared/config/<topic>.ts` and are side-effect-imported once from `root.tsx`. Don't put `dayjs.extend(...)` or library `.config({...})` calls at the top of `root.tsx`.

## Mantine setup

```
shared/mantine/
├── index.ts                       # createTheme(...) — fontSizes, radius, spacing, headings, primary
├── colors.ts                      # color palette spread into theme
├── mantine-config-provider.tsx    # assembles theme + components, wraps MantineProvider + Notifications + DatesProvider
├── <component>/
│   ├── index.ts                   # Component.extend({ defaultProps, classNames }) → customComponent
│   └── <component>.module.css     # CSS module for class overrides
```

### `shared/mantine/index.ts`

Theme primitives only — fontSizes, radius, spacing, headings, primary color, scale, default radius. Colors are spread in from `./colors.ts`. Don't scatter theme values across files.

### Per-component overrides

Add an override the **first time** you find yourself styling the same Mantine component the same way in multiple places. Don't preemptively wrap every primitive.

```tsx
// app/shared/mantine/button/index.ts
import { Button, type MantineThemeComponent } from '@mantine/core'
import classes from './button.module.css'

export const customButton: MantineThemeComponent = Button.extend({
  defaultProps: { /* … */ },
  classNames: { label: classes.label, section: classes.section },
})
```

### `MantineConfigProvider`

Single Mantine entry point. Assembles `{ ...theme, components: { Button: customButton, ... } }`, wraps `MantineProvider` + `Notifications` + `DatesProvider`.

```tsx
// app/shared/mantine/mantine-config-provider.tsx
import { MantineProvider } from '@mantine/core'
import { DatesProvider } from '@mantine/dates'
import { ModalsProvider } from '@mantine/modals'
import { Notifications } from '@mantine/notifications'
import { theme } from '.'
import { customButton } from './button'
// ... other custom components

const themeWithComponents = {
  ...theme,
  components: {
    Button: customButton,
    // ...
  },
}

export function MantineConfigProvider({ children }: { children: React.ReactNode }) {
  return (
    <MantineProvider theme={themeWithComponents} forceColorScheme="dark">
      <ModalsProvider>
        <Notifications position="bottom-left" autoClose={2000} zIndex={2000} />
        <DatesProvider settings={{ consistentWeeks: true }}>{children}</DatesProvider>
      </ModalsProvider>
    </MantineProvider>
  )
}
```

Start without `themeWithComponents` — pass `theme` directly until the first per-component override lands; only then introduce the spread.

## Styling system

Three tools, one per element. Pick the one closest to the concern:

- **Tailwind utilities** — layout, spacing, one-off positioning.
- **Mantine props/theme** — component styling (sizes, colors via theme tokens).
- **CSS modules** — component-scoped overrides that don't fit either of the above.

Don't mix all three on a single element.

### Styling custom components

Custom components that wrap a single element or compose Mantine primitives should accept class input from their callers via two global types declared in `app/global.d.ts`:

```ts
interface ClassProps {
  className?: ClassValue
}

interface ClassNamesProp<T extends string | number | symbol> {
  classNames?: Partial<Record<T, ClassValue>>
}
```

These are global (ambient) types — no import needed. Use them by intersecting into your props:

- **`ClassProps`** — for components with a single styling target. Caller passes a `ClassValue` (string, array, conditional object — anything `clsx` accepts), the component runs it through `clsx` before applying.
- **`ClassNamesProp<T>`** — for compound components with multiple internal slots. The generic `T` is the slot-name union. Mirrors Mantine's `classNames={{ root, label, section }}` API.

```tsx
import { cn } from '~/shared/utils'

type AppCardProps = ClassProps &
  ClassNamesProp<'root' | 'header' | 'body'> & {
    title: string
    children: React.ReactNode
  }

export function AppCard({ className, classNames, title, children }: AppCardProps) {
  return (
    <div className={cn('rounded border', classNames?.root, className)}>
      <div className={cn('p-3 font-semibold', classNames?.header)}>{title}</div>
      <div className={cn('p-3', classNames?.body)}>{children}</div>
    </div>
  )
}
```

Use the `cn` helper from `~/shared/utils` (wraps `clsx` + `tailwind-merge`) so later classes win over earlier ones when Tailwind utilities conflict — important when callers pass overrides via `className`/`classNames`.

Rules:

- **Always run consumer-provided class input through `cn`** before applying — never spread it raw. The whole point is that callers can pass arrays/objects/conditionals, and `cn` resolves Tailwind conflicts so later classes override earlier ones.
- **`className` applies last** when both are present, so callers can override slot defaults via the top-level prop on the root slot.
- **Pick one or both, not neither.** Components meant for reuse should accept at least `ClassProps`. Add `ClassNamesProp<T>` only when there are real internal slots worth exposing — don't pre-emptively split single-element components.
- **Don't widen `T`** to `string`. Enumerate the slot names so consumers get autocomplete and typos fail to compile.

## Providers in `shared/providers/`

Other context providers (React Query, future ones) live here, each in its own file with a default export wrapper:

```
shared/providers/
├── query-client-provider.tsx      # ReactQueryClientProvider (with Devtools in dev)
└── index.ts
```

Add additional providers as siblings; export from `index.ts`. Wire into `root.tsx`'s `App` component, outside `MantineConfigProvider`.
