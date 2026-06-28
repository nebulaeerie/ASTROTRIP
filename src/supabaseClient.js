import { createClient } from '@supabase/supabase-js'

const URL = import.meta.env.VITE_SUPABASE_URL
const KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!URL || !KEY) console.error('Missing Supabase env vars. Check your .env file.')

export const supabase = createClient(URL, KEY)
