"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getSupabase } from "@/lib/supabase";
import { Sparkles, Eye, EyeOff, AlertCircle, Lock } from "lucide-react";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [checkingSession, setCheckingSession] = useState(true);

  // If already logged in, redirect to dashboard
  useEffect(() => {
    async function check() {
      const client = getSupabase();
      if (!client) {
        setCheckingSession(false);
        return;
      }
      const { data: { session } } = await client.auth.getSession();
      if (session) {
        router.replace("/dashboard");
      } else {
        setCheckingSession(false);
      }
    }
    check();
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!email.trim() || !password) {
      setError("Please enter your email and password.");
      return;
    }

    setLoading(true);
    try {
      const client = getSupabase();
      if (!client) {
        setError("Supabase is not configured. Please set environment variables.");
        setLoading(false);
        return;
      }

      const { error: signInError } = await client.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (signInError) {
        if (signInError.message.includes("Invalid login credentials")) {
          setError("Incorrect email or password. Please try again.");
        } else {
          setError(signInError.message);
        }
        setLoading(false);
        return;
      }

      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message || "Login failed. Please try again.");
      setLoading(false);
    }
  };

  if (checkingSession) {
    return (
      <div className="min-h-screen bg-[#0f0a00] flex items-center justify-center">
        <div className="size-10 rounded-full border-4 border-amber-500/20 border-t-amber-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f0a00] flex flex-col items-center justify-center px-4 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-amber-600/15 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-0 w-72 h-72 bg-orange-500/10 rounded-full blur-[80px]" />
      </div>

      {/* Back link */}
      <div className="relative z-10 mb-8 w-full max-w-sm">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-amber-400 transition-colors"
        >
          ← Back to Home
        </Link>
      </div>

      {/* Card */}
      <div className="relative z-10 w-full max-w-sm">
        {/* Brand */}
        <div className="mb-8 text-center">
          <div className="inline-flex size-16 items-center justify-center rounded-2xl overflow-hidden bg-white/10 p-0.5 border border-white/15 shadow-xl shadow-amber-500/20 mb-4">
            <img
              src="/logo.jpg"
              alt="Dhuniya Products Logo"
              className="size-full object-cover rounded-xl"
              loading="eager"
              decoding="async"
              width={64}
              height={64}
            />
          </div>
          <h1 className="text-2xl font-black text-white">Dhuniya Products</h1>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-500 mt-1">
            Admin Portal
          </p>
        </div>

        {/* Form Card */}
        <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl p-7 shadow-2xl">
          <div className="flex items-center gap-2 mb-6">
            <Lock className="size-4 text-amber-500" />
            <h2 className="text-base font-bold text-white">Sign in to continue</h2>
          </div>

          {error && (
            <div className="mb-5 flex items-start gap-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 p-3.5 text-xs text-rose-400">
              <AlertCircle className="size-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1.5">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@dhuniya.lk"
                autoComplete="email"
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-slate-600 outline-none focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/15 transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1.5">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 pr-11 text-sm text-white placeholder:text-slate-600 outline-none focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/15 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 py-3 text-sm font-bold text-white shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 hover:scale-[1.02] active:scale-100 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed disabled:scale-100 mt-2"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="size-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  Signing in…
                </span>
              ) : (
                "Sign In to Admin"
              )}
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-xs text-slate-600">
          Dhuniya Products · KDS/1597 · Maruthamunai
        </p>
      </div>
    </div>
  );
}

