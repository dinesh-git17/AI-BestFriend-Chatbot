"use client";

import { useState } from "react";
import { signUpWithEmail, signInWithEmail, signInWithOAuth } from "@/lib/auth";
import { Mail, Lock } from "lucide-react";
import { FcGoogle } from "react-icons/fc";
import { FaGithub } from "react-icons/fa";
import { motion } from "framer-motion";
import { Toaster, toast } from "react-hot-toast";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session?.user) {
        router.replace("/"); // ✅ Redirect if already logged in
      }
    };

    checkAuth();
  }, [router]);

  const handleLogin = async () => {
    setLoading(true);
    setError("");

    // ✅ Check if already logged in
    const { data } = await supabase.auth.getSession();
    if (data.session?.user) {
      toast.error("You are already logged in!");
      setLoading(false);
      return;
    }

    try {
      await signInWithEmail(email, password);
      toast.success("Logged in successfully!");
      window.location.href = "/";
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
        toast.error(err.message);
      } else {
        setError("An unexpected error occurred.");
        toast.error("An unexpected error occurred.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async () => {
    setLoading(true);
    setError("");
    try {
      await signUpWithEmail(email, password);
      toast.success("Sign up successful! Please verify your email.");
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
        toast.error(err.message);
      } else {
        setError("An unexpected error occurred.");
        toast.error("An unexpected error occurred.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleOAuthLogin = async (provider: "google" | "github") => {
    setLoading(true);
    setError("");
    try {
      await signInWithOAuth(provider);

      // ✅ Poll Supabase session to check if user is authenticated
      const checkSession = async () => {
        const { data } = await supabase.auth.getSession();
        if (data.session?.user) {
          window.location.href = "/"; // ✅ Redirect after confirming login
        } else {
          setTimeout(checkSession, 500); // ✅ Retry every 500ms until authenticated
        }
      };

      checkSession(); // Start checking session
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
        toast.error(err.message);
      } else {
        setError("An unexpected error occurred.");
        toast.error("An unexpected error occurred.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#0F0F1A] text-white p-6">
      <Toaster position="top-right" reverseOrder={false} />

      {/* Card Container */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="bg-[#15151e] p-8 rounded-lg shadow-lg w-full max-w-sm"
      >
        <h1 className="text-2xl font-semibold text-center mb-4">Welcome to Echo</h1>

        {/* Error Message */}
        {error && <p className="text-red-400 mb-4 text-sm text-center">{error}</p>}

        {/* Email Input */}
        <div className="relative mb-3">
          <Mail className="absolute left-3 top-3 text-gray-400" size={20} />
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full p-3 pl-10 rounded bg-[#252532] text-white outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Password Input */}
        <div className="relative mb-3">
          <Lock className="absolute left-3 top-3 text-gray-400" size={20} />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full p-3 pl-10 rounded bg-[#252532] text-white outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Login Button */}
        <button
          onClick={handleLogin}
          disabled={loading}
          className={`w-full p-3 rounded text-white transition ${
            loading ? "bg-blue-400 cursor-not-allowed" : "bg-blue-500 hover:bg-blue-600"
          }`}
        >
          {loading ? "Logging in..." : "Login"}
        </button>

        {/* Signup Button */}
        <button
          onClick={handleSignUp}
          disabled={loading}
          className={`w-full p-3 rounded text-white mt-2 transition ${
            loading ? "bg-green-400 cursor-not-allowed" : "bg-green-500 hover:bg-green-600"
          }`}
        >
          {loading ? "Signing up..." : "Sign Up"}
        </button>

        {/* Divider */}
        <div className="flex items-center my-4">
          <div className="flex-grow border-t border-gray-600"></div>
          <span className="mx-3 text-gray-400">or</span>
          <div className="flex-grow border-t border-gray-600"></div>
        </div>

        {/* OAuth Buttons */}
        <button
          onClick={() => handleOAuthLogin("google")}
          className="w-full p-3 bg-gray-200 hover:bg-gray-300 rounded text-black flex items-center justify-center gap-2 transition"
        >
          <FcGoogle size={20} />
          Sign in with Google
        </button>

        <button
          onClick={() => handleOAuthLogin("github")}
          className="w-full p-3 bg-gray-800 hover:bg-gray-900 rounded text-white flex items-center justify-center gap-2 mt-2 transition"
        >
          <FaGithub size={20} />
          Sign in with GitHub
        </button>
      </motion.div>
    </div>
  );
}
