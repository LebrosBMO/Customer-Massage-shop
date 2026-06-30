import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// When credentials are missing we expose a null client so the UI can
// degrade gracefully (the reservation form falls back to a friendly notice
// instead of crashing). Fill in .env to enable real submissions.
export const supabase = url && anonKey ? createClient(url, anonKey) : null

export const supabaseConfigured = Boolean(url && anonKey)
