import { createClient } from "@/utils/supabase/client"

// Retroactive fix: Export the singleton instance of the new browser client.
// This allows all existing files that import 'supabase' from this file
// to automatically use the new SSR-compatible cookie-based mechanism.
export const supabase = createClient()
