import { createClient, type SupabaseClient } from '@supabase/supabase-js'

import type { Database } from '~/shared/api/schema/database.types'
import { env } from '~/shared/config/env'

let browserClient: SupabaseClient<Database> | undefined

export const getSupabaseBrowserClient = () => {
  browserClient ??= createClient<Database>(env.SUPABASE_URL, env.SUPABASE_PUBLISHABLE_KEY)
  return browserClient
}
