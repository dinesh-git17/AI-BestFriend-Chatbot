"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    const checkSession = async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        router.push("/"); // ✅ Redirect to home if logged in
      } else {
        router.push("/auth/login"); // ❌ If no session, go back to login
      }
    };

    checkSession();
  }, [router]);

  return <p className="text-white text-center mt-20">Verifying login...</p>;
}
