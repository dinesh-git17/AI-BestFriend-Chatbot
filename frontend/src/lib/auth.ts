import { supabase } from "./supabaseClient";

// ✅ Sign Up with Email & Password
export const signUpWithEmail = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) throw error;
  return data.user; // ✅ Extract user from data
};

// ✅ Sign In with Email & Password
export const signInWithEmail = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) throw error;
  return data.user; // ✅ Extract user from data
};

// ✅ Sign In with OAuth (Google, GitHub, etc.)
export const signInWithOAuth = async (provider: "google" | "github") => {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: `${window.location.origin}/auth/callback`, // ✅ Redirects to a callback page
    },
  });
  if (error) throw error;
  return data;
};

// ✅ Sign Out & Redirect to Home
export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
  window.location.href = "/"; // ✅ Redirect to home after logout
};
