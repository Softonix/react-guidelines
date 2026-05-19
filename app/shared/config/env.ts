const required = (opts: { key: string; value: string | undefined }): string => {
  if (!opts.value) throw new Error(`Missing environment variable: ${opts.key}`)
  return opts.value
}

export const env = {
  SUPABASE_URL: required({
    key: 'VITE_SUPABASE_URL',
    value: import.meta.env.VITE_SUPABASE_URL,
  }),
  SUPABASE_PUBLISHABLE_KEY: required({
    key: 'VITE_SUPABASE_PUBLISHABLE_KEY',
    value: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
  }),
} as const
