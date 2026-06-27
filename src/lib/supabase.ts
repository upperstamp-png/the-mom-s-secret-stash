import { createClient } from "@supabase/supabase-js";

// Retrieve keys from Vite's environment variables or fall back to safe placeholders
const supabaseUrl =
  (typeof window !== "undefined"
    ? (import.meta.env.VITE_SUPABASE_URL as string)
    : (process.env.VITE_SUPABASE_URL as string)) ||
  "https://placeholder-project.supabase.co";

const supabaseAnonKey =
  (typeof window !== "undefined"
    ? (import.meta.env.VITE_SUPABASE_ANON_KEY as string)
    : (process.env.VITE_SUPABASE_ANON_KEY as string)) ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.placeholder";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
