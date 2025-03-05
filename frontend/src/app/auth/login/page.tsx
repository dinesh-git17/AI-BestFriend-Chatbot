"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { signUpWithEmail, signInWithEmail, signInWithOAuth } from "@/lib/auth";
import { Mail, Lock } from "lucide-react";
import { FcGoogle } from "react-icons/fc";
import { FaGithub } from "react-icons/fa";
import { motion } from "framer-motion";
import { Toaster, toast } from "react-hot-toast";

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
        router.replace("/"); // Redirect if already logged in
      }
    };

    checkAuth();
  }, [router]);

  const handleLogin = async () => {
    setLoading(true);
    setError("");

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

      const checkSession = async () => {
        const { data } = await supabase.auth.getSession();
        if (data.session?.user) {
          window.location.href = "/";
        } else {
          setTimeout(checkSession, 500);
        }
      };

      checkSession();
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
    <div className="flex flex-col items-center justify-center min-h-screen p-6 text-white bg-gradient-to-br from-[#0A0F1F] via-[#0B1321] to-[#020A14]">
      <Toaster position="top-right" reverseOrder={false} />

      {/* Login Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative bg-[#131823] bg-opacity-80 backdrop-blur-md p-8 rounded-2xl shadow-xl w-full max-w-md border border-gray-700"
      >
        <h1 className="text-3xl font-semibold text-center mb-6">Welcome to Echo</h1>

        {/* Error Message */}
        {error && <p className="text-red-400 mb-4 text-sm text-center">{error}</p>}

        {/* Email Input */}
        <div className="relative mb-4">
          <Mail className="absolute left-4 top-4 text-gray-400" size={20} />
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full p-3 pl-12 rounded-lg bg-[#252532] text-white outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Password Input */}
        <div className="relative mb-4">
          <Lock className="absolute left-4 top-4 text-gray-400" size={20} />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full p-3 pl-12 rounded-lg bg-[#252532] text-white outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Login Button */}
        <button
          onClick={handleLogin}
          disabled={loading}
          className={`w-full p-3 rounded-lg font-semibold transition ${
            loading ? "bg-blue-400 cursor-not-allowed" : "bg-blue-500 hover:bg-blue-600"
          }`}
        >
          {loading ? "Logging in..." : "Login"}
        </button>

        {/* Signup Button */}
        <button
          onClick={handleSignUp}
          disabled={loading}
          className={`w-full p-3 rounded-lg font-semibold mt-3 transition ${
            loading ? "bg-green-400 cursor-not-allowed" : "bg-green-500 hover:bg-green-600"
          }`}
        >
          {loading ? "Signing up..." : "Sign Up"}
        </button>

        {/* Divider */}
        <div className="flex items-center my-6">
          <div className="flex-grow border-t border-gray-600"></div>
          <span className="mx-4 text-gray-400">or</span>
          <div className="flex-grow border-t border-gray-600"></div>
        </div>

        {/* OAuth Buttons */}
        <button
          onClick={() => handleOAuthLogin("google")}
          className="w-full p-3 bg-gray-200 hover:bg-gray-300 rounded-lg text-black flex items-center justify-center gap-2 transition font-semibold"
        >
          <FcGoogle size={24} />
          Sign in with Google
        </button>

        <button
          onClick={() => handleOAuthLogin("github")}
          className="w-full p-3 bg-gray-800 hover:bg-gray-900 rounded-lg text-white flex items-center justify-center gap-2 mt-3 transition font-semibold"
        >
          <FaGithub size={24} />
          Sign in with GitHub
        </button>
      </motion.div>
    </div>
  );
}
