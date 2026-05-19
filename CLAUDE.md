# React SPA Supabase Starter

Frontend codebase. Stack: React Router v7 (framework mode), Mantine v9, TanStack Query v5, Tailwind v4, Mantine Form + Zod. Data source is Supabase.

Architecture: capped Feature-Sliced Design. TS path alias `~/*` → `./app/*`.

## Documentation

- docs/architecture.md
- docs/slices.md
- docs/data-layer.md
- docs/routing.md
- docs/app-setup.md
- docs/styling.md
- docs/conventions.md


When you have a function with more than one parameter with the same type, use an object parameter instead of positional parameters:

```ts
// BAD
const addUserToPost = (userId: string, postId: string) => {};

// GOOD
const addUserToPost = (opts: { userId: string; postId: string }) => {};
```

When commiting, always use one line concise commit messages. DO NOT INCLUDE the 'Co-authored' part.

Try to stick to the DRY principle where reasonable. Assess each task/feature separately.

## Styling

Prefer using tailwind whenever possible. Modify theme if some style is a candidate for it. See `docs/styling.md` for the full UI guidelines.

Refer to `docs/styling.md`

### Comments in the code
Keep comments to a minimum.

When using supabase cli, use npx command.