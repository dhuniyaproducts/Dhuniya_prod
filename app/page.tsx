"use client";

import { useState, useEffect } from "react";
import { getSupabase } from "@/lib/supabase";
import { optimizeImageUrl } from "@/lib/cloudinary";
import {
  Sparkles,
  MapPin,
  Phone,
  ArrowRight,
  Star,
  Lock,
  Award,
  Heart,
  Clock,
  Sparkle,
  ZoomIn,
} from "lucide-react";
import Link from "next/link";

type Product = {
  id: number;
  name: string;
  nameTamil?: string;
  nameSinhala?: string;
  unit: string;
  price: number;
  active: boolean;
  imageUrl?: string;
  images?: string[];
  description?: string;
  contents?: string;
};

const money = (v: number) => `Rs. ${v.toLocaleString("en-LK")}`;

// ── Clean & Fast Product Card Component ──────────────────────────────────────
function ProductCard({ product, index }: { product: Product; index: number }) {
  const [imgErr, setImgErr] = useState(false);

  const allImages = [product.imageUrl, ...(product.images ?? [])].filter(Boolean) as string[];
  const hasMultiple = allImages.length > 1;

  const initials = product.name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const optimizedSrc = product.imageUrl ? optimizeImageUrl(product.imageUrl, 550) : "";

  return (
    <Link
      href={`/sweets/${product.id}`}
      className="group relative flex flex-col rounded-2xl sm:rounded-3xl overflow-hidden border border-white/10 bg-white/5 hover:border-amber-400/60 hover:bg-white/10 text-left w-full cursor-pointer"
    >
      <div className="relative h-28 sm:h-56 md:h-60 overflow-hidden bg-gradient-to-br from-amber-950/80 to-[#120800]">
        {optimizedSrc && !imgErr ? (
          <img
            src={optimizedSrc}
            alt={product.name}
            className="w-full h-full object-cover"
            onError={() => setImgErr(true)}
            loading={index < 4 ? "eager" : "lazy"}
            decoding="async"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center p-3 sm:p-6 text-center">
            <div className="size-12 sm:size-20 rounded-xl sm:rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/30 flex items-center justify-center mb-2 sm:mb-3">
              <span className="text-lg sm:text-3xl font-black text-amber-300">{initials}</span>
            </div>
            <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-amber-400/80">Dhuniya</p>
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent pointer-events-none" />

        {/* Price badge */}
        <div className="absolute bottom-2 left-2 sm:bottom-3 sm:left-3 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 px-2.5 sm:px-3.5 py-0.5 sm:py-1 text-[11px] sm:text-xs font-black text-white shadow-md shadow-black/50">
          {money(product.price)} <span className="font-normal text-[9px] sm:text-[11px] text-amber-100">/ {product.unit}</span>
        </div>

        {/* Top badges */}
        <div className="absolute top-2 right-2 sm:top-3 sm:right-3 flex gap-1 z-10">
          {hasMultiple && (
            <div className="rounded-full bg-black/75 border border-amber-400/40 px-2 py-0.5 text-[9px] font-bold text-amber-300 flex items-center gap-1 shadow-sm">
              <ZoomIn className="size-2.5" /> {allImages.length}
            </div>
          )}
          <div className="rounded-full bg-black/70 border border-white/15 px-2 py-0.5 text-[9px] sm:text-[10px] font-bold text-amber-300">
            Fresh
          </div>
        </div>
      </div>

      <div className="flex flex-col flex-1 p-2.5 sm:p-5">
        {/* Sweet Name in English */}
        <h3 className="text-xs sm:text-lg font-bold text-white group-hover:text-amber-300 leading-snug line-clamp-1">
          {product.name}
        </h3>

        {/* Sweet Name in Tamil and Sinhala */}
        {(product.nameTamil || product.nameSinhala) && (
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            {product.nameTamil && (
              <span className="text-[11px] sm:text-xs font-bold text-amber-400/90 truncate">
                {product.nameTamil}
              </span>
            )}
            {product.nameTamil && product.nameSinhala && (
              <span className="text-amber-500/40 text-[10px]">•</span>
            )}
            {product.nameSinhala && (
              <span className="text-[11px] sm:text-xs font-semibold text-orange-300/80 truncate">
                {product.nameSinhala}
              </span>
            )}
          </div>
        )}

        <p className="mt-1.5 sm:mt-2 text-[11px] sm:text-xs text-slate-300/80 leading-relaxed flex-1 line-clamp-2">
          {product.description?.trim() || "Authentic eastern recipe made fresh with premium ingredients in Maruthamunai."}
        </p>

        <div className="mt-2.5 pt-2.5 border-t border-white/10 flex items-center justify-between text-xs">
          <div className="flex items-center gap-0.5 sm:gap-1">
            {[1, 2, 3, 4, 5].map((s) => (
              <Star key={s} className="size-2.5 sm:size-3 fill-amber-400 text-amber-400" />
            ))}
          </div>
          <span className="text-amber-400 font-bold text-[10px] sm:text-xs flex items-center gap-0.5">
            View Sweet →
          </span>
        </div>
      </div>
    </Link>
  );
}

// ── Hero Section ───────────────────────────────────────────────────────────────
function HeroSection() {
  return (
    <section className="relative min-h-[70vh] sm:min-h-[85vh] flex items-center justify-center overflow-hidden bg-[#0a0600] pt-16 pb-10 sm:pt-28 sm:pb-20">
      <div className="absolute inset-0 bg-gradient-to-b from-[#180d01] via-[#0f0700] to-[#0a0600]" />
      <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[700px] h-[700px] bg-gradient-to-br from-amber-500/15 via-orange-600/10 to-transparent rounded-full blur-[120px] pointer-events-none" />

      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, #f59e0b 1px, transparent 0)`,
          backgroundSize: "36px 36px",
        }}
      />

      <div className="relative z-10 text-center px-4 max-w-5xl mx-auto">
        <div className="inline-flex items-center gap-1.5 sm:gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 sm:px-4 sm:py-1.5 text-[10px] sm:text-xs font-bold uppercase tracking-wider sm:tracking-[0.2em] text-amber-300 mb-4 sm:mb-8">
          <Sparkles className="size-3 sm:size-3.5 text-amber-400" />
          <span>Authentic Eastern Heritage · Maruthamunai</span>
        </div>

        <h1 className="text-3xl sm:text-6xl md:text-8xl font-black tracking-tight text-white leading-[1.08] sm:leading-[1.02] mb-3 sm:mb-6">
          <span>Dhuniya</span>{" "}
          <span className="bg-gradient-to-r from-amber-300 via-amber-400 to-orange-400 bg-clip-text text-transparent">
            Products
          </span>
        </h1>

        <div className="inline-block mb-3 sm:mb-5">
          <p className="text-xs sm:text-2xl md:text-3xl font-extrabold uppercase tracking-[0.16em] sm:tracking-[0.25em] text-amber-200">
            Eastern Traditional Sweet
          </p>
          <div className="h-0.5 w-16 sm:w-28 bg-gradient-to-r from-amber-400 to-orange-500 mx-auto mt-2 sm:mt-3 rounded-full" />
        </div>

        <p className="text-slate-300 text-xs sm:text-base md:text-lg max-w-2xl mx-auto leading-relaxed mb-6 sm:mb-10 px-2 sm:px-0">
          Experience handcrafted heritage sweets made with authentic eastern Sri Lankan recipes,
          pure ingredients, and time-honoured artistry.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 sm:gap-4 mb-8 sm:mb-16">
          <a
            href="#sweets"
            className="flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-2.5 sm:px-8 sm:py-3.5 text-xs sm:text-sm font-bold text-white shadow-lg shadow-amber-500/25 hover:opacity-90 w-full sm:w-auto"
          >
            <span>Explore Sweet Catalog</span>
            <ArrowRight className="size-3.5 sm:size-4" />
          </a>
          <a
            href="tel:0756656135"
            className="flex items-center justify-center gap-2 rounded-full border border-amber-500/40 bg-white/5 px-6 py-2.5 sm:px-8 sm:py-3.5 text-xs sm:text-sm font-bold text-amber-300 hover:bg-white/10 hover:border-amber-400 hover:text-amber-200 w-full sm:w-auto"
          >
            <Phone className="size-3.5 sm:size-4" />
            <span>Order by Phone: 0756656135</span>
          </a>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4 max-w-3xl mx-auto">
          {[
            { label: "100% Pure Recipe", icon: Award },
            { label: "Handcrafted Daily", icon: Heart },
            { label: "Eastern Tradition", icon: Sparkle },
            { label: "Fresh Handover", icon: Clock },
          ].map(({ label, icon: Icon }) => (
            <div
              key={label}
              className="flex items-center justify-center gap-1.5 sm:gap-2 rounded-xl sm:rounded-2xl border border-white/10 bg-white/5 py-2 px-2 sm:py-3 sm:px-3 hover:border-amber-400/40 hover:bg-white/10"
            >
              <Icon className="size-3.5 sm:size-4 text-amber-400 shrink-0" />
              <span className="text-[11px] sm:text-xs font-semibold text-slate-300 truncate">{label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Contact Section ────────────────────────────────────────────────────────────
function ContactSection() {
  return (
    <section id="contact" className="py-8 sm:py-20 px-3 sm:px-6 bg-gradient-to-b from-[#0a0600] to-[#120800] relative">
      <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-amber-500/30 to-transparent" />

      <div className="max-w-4xl mx-auto text-center">
        <span className="text-[10px] sm:text-xs font-bold uppercase tracking-[0.25em] text-amber-400">Authentic Taste</span>
        <h2 className="mt-1 sm:mt-2 text-xl sm:text-3xl md:text-4xl font-black text-white mb-1 sm:mb-2">
          Visit Us or Place Orders
        </h2>
        <p className="text-slate-400 text-xs sm:text-sm max-w-md mx-auto mb-5 sm:mb-8 px-2 sm:px-0">
          Handcrafted for celebrations and bulk orders. Contact us directly or visit our Maruthamunai kitchen.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-5 text-left">
          <a
            href="tel:0756656135"
            className="group flex sm:flex-col items-center sm:items-start justify-between rounded-xl sm:rounded-2xl border border-white/10 bg-white/5 p-3 sm:p-5 hover:border-amber-400/60 hover:bg-white/10 h-full"
          >
            <div className="flex sm:flex-col items-center sm:items-start gap-2.5 sm:gap-3 min-w-0">
              <div className="size-8 sm:size-10 rounded-lg sm:rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                <Phone className="size-4 sm:size-5" />
              </div>
              <div className="min-w-0">
                <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-slate-400 truncate">Direct Mobile</p>
                <p className="text-xs sm:text-lg font-black text-white group-hover:text-amber-300 truncate">
                  0756656135
                </p>
              </div>
            </div>
            <span className="text-[10px] sm:text-xs text-amber-400 font-bold flex items-center gap-1 shrink-0 ml-2 sm:ml-0 sm:mt-3">
              <span>Call Now</span>
              <ArrowRight className="size-3" />
            </span>
          </a>

          <div className="flex sm:flex-col items-center sm:items-start justify-between rounded-xl sm:rounded-2xl border border-white/10 bg-white/5 p-3 sm:p-5 hover:border-amber-400/40 hover:bg-white/10 h-full">
            <div className="flex sm:flex-col items-center sm:items-start gap-2.5 sm:gap-3 min-w-0">
              <div className="size-8 sm:size-10 rounded-lg sm:rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                <MapPin className="size-4 sm:size-5" />
              </div>
              <div className="min-w-0">
                <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-slate-400 truncate">Kitchen Address</p>
                <p className="text-xs sm:text-base font-bold text-white truncate">138, France City</p>
                <p className="text-[10px] sm:text-xs text-slate-400 truncate">Maruthamunai</p>
              </div>
            </div>
            <span className="text-[9px] sm:text-[10px] text-slate-400 shrink-0 ml-2 sm:ml-0 sm:mt-3">
              Daily handover
            </span>
          </div>

          <div className="flex sm:flex-col items-center sm:items-start justify-between rounded-xl sm:rounded-2xl border border-white/10 bg-white/5 p-3 sm:p-5 hover:border-amber-400/40 hover:bg-white/10 h-full">
            <div className="flex sm:flex-col items-center sm:items-start gap-2.5 sm:gap-3 min-w-0">
              <div className="size-8 sm:size-10 rounded-lg sm:rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                <Award className="size-4 sm:size-5" />
              </div>
              <div className="min-w-0">
                <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-slate-400 truncate">Craftsmanship</p>
                <p className="text-xs sm:text-base font-bold text-white truncate">100% Traditional</p>
                <p className="text-[10px] sm:text-xs text-slate-400 truncate">Pure ghee &amp; milk</p>
              </div>
            </div>
            <span className="text-[9px] sm:text-[10px] text-amber-400/90 shrink-0 ml-2 sm:ml-0 sm:mt-3">
              Fresh daily
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}

// ── Footer ─────────────────────────────────────────────────────────────────────
function Footer() {
  return (
    <footer className="border-t border-white/10 bg-black px-4 py-12">
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-2xl overflow-hidden bg-white/10 p-0.5 border border-white/15 shrink-0">
            <img src="/logo.jpg" alt="Dhuniya Products Logo" className="size-full object-cover rounded-xl" loading="lazy" decoding="async" width={44} height={44} />
          </div>
          <div>
            <p className="font-black text-white text-base">Dhuniya Products</p>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-400">Eastern Traditional Sweet</p>
          </div>
        </div>

        <div className="text-center sm:text-right">
          <p className="text-xs text-slate-400">
            Direct Order Mobile: <strong className="text-slate-200">0756656135</strong>
          </p>
          <p className="text-xs text-slate-500 mt-0.5">138, France City, Maruthamunai, Sri Lanka</p>
        </div>

        <Link
          href="/login"
          className="flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-5 py-2 text-xs font-bold text-slate-300 hover:border-amber-400 hover:text-amber-300 hover:bg-white/10"
        >
          <Lock className="size-3.5 text-amber-400" />
          <span>Admin Login</span>
        </Link>
      </div>
    </footer>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function PublicPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const loadProducts = async () => {
    setLoading(true);
    setLoadError(false);

    // Purge any legacy localStorage cache keys so only live Supabase data is ever used
    try {
      localStorage.removeItem("dhuniya_products");
      localStorage.removeItem("dhuniya_orders");
      localStorage.removeItem("dhuniya_customers");
      localStorage.removeItem("dhuniya_customers_v2");
    } catch {}

    // Fetch fresh real data purely from Supabase
    try {
      const client = getSupabase();
      if (!client) throw new Error("Supabase client unavailable");

      const { data, error } = await client
        .from("products")
        .select("id,name,name_tamil,name_sinhala,unit,price,active,image_url,images,description,contents")
        .eq("active", true)
        .order("id", { ascending: true });

      if (error) throw error;
      if (data && data.length > 0) {
        const raw = data.map((p: any) => ({
          id: Number(p.id),
          name: p.name,
          nameTamil: p.name_tamil || undefined,
          nameSinhala: p.name_sinhala || undefined,
          unit: p.unit,
          price: Number(p.price),
          active: Boolean(p.active),
          imageUrl: p.image_url || undefined,
          images: Array.isArray(p.images) ? p.images : (p.images ? JSON.parse(p.images) : []),
          description: p.description || undefined,
          contents: p.contents || undefined,
        }));

        // Deduplicate by name and merge richest attributes
        const mapByName = new Map<string, Product>();
        for (const item of raw) {
          const key = item.name.trim().toLowerCase();
          const existing = mapByName.get(key);
          if (!existing) {
            mapByName.set(key, item);
          } else {
            mapByName.set(key, {
              ...existing,
              ...item,
              imageUrl: item.imageUrl || existing.imageUrl,
              images: item.images && item.images.length > 0 ? item.images : existing.images,
              description: item.description || existing.description,
              contents: item.contents || existing.contents,
              nameTamil: item.nameTamil || existing.nameTamil,
              nameSinhala: item.nameSinhala || existing.nameSinhala,
            });
          }
        }
        const cleanProducts = Array.from(mapByName.values());
        setProducts(cleanProducts);
        setLoadError(false);
      } else {
        setProducts([]);
      }
    } catch (err) {
      console.error("Failed to load products from database:", err);
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  return (
    <div className="bg-[#0a0600] text-white min-h-screen selection:bg-amber-500 selection:text-black">
      {/* Fixed Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-3 sm:px-8 py-2.5 sm:py-4 bg-black/90 border-b border-white/10">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="flex size-8 sm:size-10 items-center justify-center rounded-lg sm:rounded-xl overflow-hidden bg-white/10 p-0.5 border border-white/15 shadow-md shadow-amber-500/20 shrink-0">
            <img src="/logo.jpg" alt="Dhuniya Products Logo" className="size-full object-cover rounded-md sm:rounded-lg" loading="eager" decoding="async" width={40} height={40} />
          </div>
          <div>
            <span className="font-black text-white text-xs sm:text-base tracking-tight block">Dhuniya Products</span>
            <span className="hidden sm:block text-[9px] font-bold uppercase tracking-[0.2em] text-amber-400">Eastern Traditional Sweet</span>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <a href="#sweets" className="hidden sm:inline-block text-xs font-semibold text-slate-300 hover:text-amber-300">
            Sweet Catalog
          </a>
          <a href="#contact" className="hidden sm:inline-block text-xs font-semibold text-slate-300 hover:text-amber-300">
            Contact
          </a>
          <Link
            href="/login"
            className="flex items-center gap-1.5 rounded-full border border-amber-500/40 bg-amber-500/10 px-3 py-1 sm:px-4 sm:py-1.5 text-[11px] sm:text-xs font-bold text-amber-300 hover:bg-amber-500 hover:text-black"
          >
            <Lock className="size-3" />
            <span>Admin Login</span>
          </Link>
        </div>
      </nav>

      <HeroSection />

      {/* Sweet Catalog Section */}
      <section id="sweets" className="py-10 sm:py-28 px-3 sm:px-6 relative bg-[#0a0600]">
        <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-amber-500/30 to-transparent" />

        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-6 sm:mb-10">
            <span className="text-xs font-bold uppercase tracking-[0.3em] text-amber-400">
              Freshly Prepared Catalog
            </span>

            <h2 className="mt-2 sm:mt-3 text-2xl sm:text-5xl font-black text-white tracking-tight">
              Our Traditional Sweets
            </h2>

            <p className="mt-2 sm:mt-4 text-slate-400 text-xs sm:text-base max-w-xl mx-auto">
              Prepared to order with pure ghee, whole milk, and eastern culinary traditions. Tap any sweet to see full details and photos.
            </p>

            {products.length > 0 && (
              <div className="flex items-center justify-center gap-1.5 mt-4 text-[11px] sm:text-xs font-bold text-slate-400">
                <span className="size-2 rounded-full bg-emerald-400" />
                <span>{products.length} Traditional Sweet{products.length !== 1 ? "s" : ""}</span>
              </div>
            )}
          </div>

          {loading && products.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <div className="size-10 rounded-full border-2 border-amber-500/20 border-t-amber-500 animate-spin" />
              <p className="text-sm text-slate-400 font-medium">Loading sweet catalog…</p>
            </div>
          ) : products.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
              <div className="size-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mb-4">
                <Sparkle className="size-7" />
              </div>
              <h3 className="text-base sm:text-lg font-bold text-white mb-1.5">
                {loadError ? "Connection / Coverage Issue" : "Catalog Empty"}
              </h3>
              <p className="text-xs sm:text-sm text-slate-400 max-w-sm mb-5 leading-relaxed">
                {loadError
                  ? "Unable to connect to the catalog right now. Please check your mobile data / Wi-Fi coverage."
                  : "No traditional sweets are currently active in the catalog."}
              </p>
              {loadError && (
                <button
                  type="button"
                  onClick={() => loadProducts()}
                  className="rounded-full bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-2.5 text-xs font-bold text-white shadow-lg cursor-pointer"
                >
                  Tap to Retry
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2.5 sm:gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {products.map((product, i) => (
                <ProductCard key={product.id} product={product} index={i} />
              ))}
            </div>
          )}
        </div>
      </section>

      <ContactSection />
      <Footer />
    </div>
  );
}
