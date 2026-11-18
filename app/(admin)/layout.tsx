"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getSupabase } from "@/lib/supabase";
import { Lock } from "lucide-react";
import Link from "next/link";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function checkAuth() {
      const client = getSupabase();
      if (!client) {
        if (isMounted) {
          setIsAuthenticated(false);
          setChecking(false);
          router.replace("/login");
        }
        return;
      }

      // 1. Fast local cache check: Instant response with zero UI flicker
      const {
        data: { session },
      } = await client.auth.getSession();

      if (!session?.user) {
        if (isMounted) {
          setIsAuthenticated(false);
          setChecking(false);
          router.replace("/login");
        }
        return;
      }

      // Active authenticated session found locally
      if (isMounted) {
        setIsAuthenticated(true);
        setChecking(false);
      }

      // 2. Validate token integrity in background
      try {
        const {
          data: { user },
          error,
        } = await client.auth.getUser();

        if (error || !user) {
          if (isMounted) {
            setIsAuthenticated(false);
            router.replace("/login");
          }
        }
      } catch {
        // Network glitch; keep local authenticated state
      }

      // 3. Listen for logout or session expiry
      const {
        data: { subscription },
      } = client.auth.onAuthStateChange((event, session) => {
        if (event === "SIGNED_OUT" || !session) {
          if (isMounted) {
            setIsAuthenticated(false);
            router.replace("/login");
          }
        } else if (session?.user) {
          if (isMounted) {
            setIsAuthenticated(true);
          }
        }
      });

      return () => subscription.unsubscribe();
    }

    checkAuth();

    return () => {
      isMounted = false;
    };
  }, [router]);

  if (checking) {
    return (
      <div className="min-h-screen bg-[#0a0600] flex flex-col items-center justify-center text-white px-4">
        <div className="flex flex-col items-center gap-3">
          <div className="size-10 rounded-full border-4 border-amber-500/20 border-t-amber-500 animate-spin" />
          <p className="text-xs font-bold uppercase tracking-wider text-amber-400/90">
            Verifying Admin Access…
          </p>
        </div>
      </div>
    );
  }

  // Strict Barrier: If not authenticated, do NOT render children under any condition
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#0a0600] flex flex-col items-center justify-center text-white px-4 text-center">
        <div className="size-16 rounded-2xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-center text-amber-400 mb-4 shadow-xl shadow-amber-500/10">
          <Lock className="size-8" />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Restricted Admin Portal</h2>
        <p className="text-xs sm:text-sm text-slate-400 max-w-sm mb-6 leading-relaxed">
          Access to this area requires authorized administrative credentials. Please sign in to continue.
        </p>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.replace("/login")}
            className="rounded-full bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-2.5 text-xs font-bold text-white shadow-lg shadow-amber-500/30 hover:scale-105 active:scale-95 transition-all cursor-pointer"
          >
            Sign In to Admin
          </button>
          <Link
            href="/"
            className="rounded-full border border-white/20 bg-white/5 px-6 py-2.5 text-xs font-bold text-slate-300 hover:bg-white/10 transition-all"
          >
            Return Home
          </Link>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

