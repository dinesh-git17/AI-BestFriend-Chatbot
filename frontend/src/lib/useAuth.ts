"use client";
import { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";
import { User } from "@supabase/supabase-js"; // ✅ Import the User type

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null); // ✅ Fix: Explicitly define user type

  useEffect(() => {
    const fetchUser = async () => {
      const { data, error } = await supabase.auth.getUser();
      if (error) {
        console.error("Error fetching user:", error);
        return;
      }
      setUser(data.user); // ✅ No TypeScript error now
    };

    fetchUser();

    const { data: listener } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user || null);
    });

    return () => {
      listener?.subscription.unsubscribe();
    };
  }, []);

  return { user };
};
