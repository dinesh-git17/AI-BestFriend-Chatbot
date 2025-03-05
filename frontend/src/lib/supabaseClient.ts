import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true, // ✅ Ensures session persists after refresh
    autoRefreshToken: true, // ✅ Automatically refreshes token when needed
    detectSessionInUrl: true, // ✅ Ensures session is detected on OAuth sign-in
  },
});
