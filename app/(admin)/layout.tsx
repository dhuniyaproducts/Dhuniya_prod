"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { getSupabase } from "@/lib/supabase";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    async function checkAuth() {
      const client = getSupabase();
      if (!client) {
        // No supabase configured — in dev mode, allow access
        setChecking(false);
        return;
      }

      const { data: { session } } = await client.auth.getSession();
      if (!session) {
        router.replace("/login");
        return;
      }
      setChecking(false);

      // Listen for auth changes
      const { data: { subscription } } = client.auth.onAuthStateChange((event, session) => {
        if (event === "SIGNED_OUT" || !session) {
          router.replace("/login");
        }
      });

      return () => subscription.unsubscribe();
    }

    checkAuth();
  }, [router, pathname]);

  if (checking) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="size-10 rounded-full border-4 border-amber-500/20 border-t-amber-600 animate-spin" />
          <p className="text-sm font-medium text-slate-500">Loading admin panel…</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

