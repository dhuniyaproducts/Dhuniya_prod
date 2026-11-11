import { createClient, SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

let supabaseInstance: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
  if (supabaseInstance) return supabaseInstance;
  if (!supabaseUrl || !supabaseAnonKey) {
    if (typeof window !== "undefined") {
      console.warn(
        "Supabase environment variables (NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY) are not set. Falling back to local offline storage."
      );
    }
    return null;
  }
  supabaseInstance = createClient(supabaseUrl, supabaseAnonKey);
  return supabaseInstance;
}

export type DbProduct = {
  id: number;
  name: string;
  unit: string;
  price: number;
  active: boolean;
  image_url?: string | null;
  created_at?: string;
};

export type DbOrder = {
  id: string;
  date: string;
  delivery_date: string;
  customer: string;
  product_id: number;
  qty: number;
  rate?: number | null;
  status: string;
  notes?: string | null;
  created_at?: string;
};
