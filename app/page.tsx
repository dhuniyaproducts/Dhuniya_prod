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

const SHOWCASE_SWEETS: Product[] = [
  {
    id: 1,
    name: "Ghee Musket",
    nameTamil: "நெய் மஸ்கட்",
    nameSinhala: "ගී මැස්කැට්",
    unit: "kg",
    price: 1200,
    active: true,
    imageUrl: "https://images.unsplash.com/photo-1599785209707-a456fc1337bb?w=800&auto=format&fit=crop&q=80",
    description: "Traditional Ghee Musket with a rich, sweet flavour, soft chewy texture, and colourful sprinkles. A delightful treat to enjoy and share with family and friends.",
    contents: "Wheat flour · Pure Ghee (clarified butter) · Sugar · Water · Cashew nuts · Cardamom · Sprinkles",
  },
  {
    id: 2,
    name: "Golden Milk Toffee",
    nameTamil: "பால் டோபி",
    nameSinhala: "කිරි ටොෆි",
    unit: "kg",
    price: 1450,
    active: true,
    imageUrl: "https://images.unsplash.com/photo-1582293041079-7814c2f12063?w=800&auto=format&fit=crop&q=80",
    description: "Melt-in-your-mouth milk toffee crafted from pure condensed milk, golden caramel notes, and premium crunchy cashews.",
    contents: "Pure condensed milk · Sugar · Butter · Roasted cashew nuts · Cardamom essence",
  },
  {
    id: 3,
    name: "Authentic Kalu Dodol",
    nameTamil: "களு தொதொல்",
    nameSinhala: "කළු දොදොල්",
    unit: "kg",
    price: 1100,
    active: true,
    imageUrl: "https://images.unsplash.com/photo-1541781774459-bb2af2f05b55?w=800&auto=format&fit=crop&q=80",
    description: "Traditional dark kalu dodol stirred by hand for hours with thick coconut milk, kithul treacle, and roasted cashews.",
    contents: "Rice flour · Thick coconut milk · Kithul jaggery / treacle · Roasted cashews · Cardamom",
  },
];

// ── Product Card (Opens Dedicated Sweet Detail Page) ───────────────────────────
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
  const optimizedSrc = product.imageUrl ? optimizeImageUrl(product.imageUrl, 600) : "";

  return (
    <Link
      href={`/sweets/${product.id}`}
      className="group relative flex flex-col rounded-2xl sm:rounded-3xl overflow-hidden border border-white/10 bg-gradient-to-b from-white/10 via-white/5 to-transparent backdrop-blur-md hover:border-amber-400/60 hover:shadow-2xl hover:shadow-amber-500/20 transition-all duration-300 text-left w-full"
    >
      <div className="relative aspect-[4/3] sm:h-56 md:h-60 overflow-hidden bg-gradient-to-br from-amber-950/80 to-[#120800]">
        {optimizedSrc && !imgErr ? (
          <img
            src={optimizedSrc}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-108 transition-transform duration-500 ease-out"
            onError={() => setImgErr(true)}
            loading={index < 4 ? "eager" : "lazy"}
            decoding="async"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center p-3 sm:p-6 text-center">
            <div className="size-12 sm:size-20 rounded-xl sm:rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/30 flex items-center justify-center mb-2 sm:mb-3 group-hover:scale-110 transition-transform">
              <span className="text-lg sm:text-3xl font-black text-amber-300">{initials}</span>
            </div>
            <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-amber-400/80">Dhuniya</p>
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent pointer-events-none" />

        {/* Price */}
        <div className="absolute bottom-2 left-2 sm:bottom-3 sm:left-3 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 px-2.5 sm:px-3.5 py-0.5 sm:py-1 text-[11px] sm:text-xs font-black text-white shadow-md shadow-black/50">
          {money(product.price)} <span className="font-normal text-[9px] sm:text-[11px] text-amber-100">/ {product.unit}</span>
        </div>

        {/* Top right: multi-image count badge or Fresh */}
        <div className="absolute top-2 right-2 sm:top-3 sm:right-3 flex gap-1">
          {hasMultiple && (
            <div className="rounded-full bg-black/75 border border-amber-400/40 px-2 py-0.5 text-[9px] font-bold text-amber-300 backdrop-blur-md flex items-center gap-1">
              <ZoomIn className="size-2.5" /> {allImages.length}
            </div>
          )}
          <div className="rounded-full bg-black/70 border border-white/15 px-2 py-0.5 text-[9px] sm:text-[10px] font-bold text-amber-300 backdrop-blur-md">
            Fresh
          </div>
        </div>

        {/* View Details hover overlay */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <div className="bg-black/60 backdrop-blur-md rounded-full px-4 py-2 text-xs font-bold text-white border border-white/20 flex items-center gap-1.5 shadow-xl">
            <ZoomIn className="size-3.5 text-amber-400" /> View Details &amp; Photos
          </div>
        </div>
      </div>

      <div className="flex flex-col flex-1 p-3.5 sm:p-5">
        {/* Sweet Name in English */}
        <h3 className="text-sm sm:text-lg font-bold text-white group-hover:text-amber-300 transition-colors leading-snug line-clamp-1">
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
          <span className="text-amber-400 font-bold text-[10px] sm:text-xs flex items-center gap-0.5 group-hover:translate-x-1 transition-transform">
            View Sweet →
          </span>
        </div>
      </div>
    </Link>
  );
}

// ── Hero Section (Clean Headings Without Tri-Language) ─────────────────────────
function HeroSection() {
  return (
    <section className="relative min-h-[75vh] sm:min-h-[90vh] flex items-center justify-center overflow-hidden bg-[#0a0600] pt-16 pb-10 sm:pt-28 sm:pb-20">
      <div className="absolute inset-0 bg-gradient-to-b from-[#180d01] via-[#0f0700] to-[#0a0600]" />
      <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[700px] h-[700px] bg-gradient-to-br from-amber-500/20 via-orange-600/15 to-transparent rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-96 h-96 bg-amber-600/10 rounded-full blur-[100px] pointer-events-none" />

      <div
        className="absolute inset-0 opacity-[0.04] pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, #f59e0b 1px, transparent 0)`,
          backgroundSize: "36px 36px",
        }}
      />

      <div className="relative z-10 text-center px-4 max-w-5xl mx-auto hero-fade-in">
        <div className="inline-flex items-center gap-1.5 sm:gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 sm:px-4 sm:py-1.5 text-[10px] sm:text-xs font-bold uppercase tracking-wider sm:tracking-[0.2em] text-amber-300 mb-4 sm:mb-8 backdrop-blur-md">
          <Sparkles className="size-3 sm:size-3.5 text-amber-400" />
          <span>Authentic Eastern Heritage · Maruthamunai</span>
        </div>

        <h1 className="text-3xl sm:text-6xl md:text-8xl font-black tracking-tight text-white leading-[1.08] sm:leading-[1.02] mb-3 sm:mb-6">
          <span>Dhuniya</span>{" "}
          <span className="bg-gradient-to-r from-amber-300 via-amber-500 to-orange-400 bg-clip-text text-transparent">
            Products
          </span>
        </h1>

        {/* Clean subtitle without tri-language clutter */}
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
            className="group flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-2.5 sm:px-8 sm:py-3.5 text-xs sm:text-sm font-bold text-white shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 hover:scale-105 transition-all duration-300 w-full sm:w-auto"
          >
            <span>Explore Sweet Catalog</span>
            <ArrowRight className="size-3.5 sm:size-4 group-hover:translate-x-1 transition-transform" />
          </a>
          <a
            href="tel:0756656135"
            className="flex items-center justify-center gap-2 rounded-full border border-amber-500/40 bg-white/5 px-6 py-2.5 sm:px-8 sm:py-3.5 text-xs sm:text-sm font-bold text-amber-300 hover:bg-white/10 hover:border-amber-400 transition-all duration-300 backdrop-blur-sm w-full sm:w-auto"
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
              className="flex items-center justify-center gap-1.5 sm:gap-2 rounded-xl sm:rounded-2xl border border-white/10 bg-white/5 py-2 px-2 sm:py-3 sm:px-3 backdrop-blur-sm"
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
    <section id="contact" className="py-12 sm:py-28 px-2.5 sm:px-4 bg-gradient-to-b from-[#0a0600] to-[#120800] relative">
      <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-amber-500/30 to-transparent" />

      <div className="max-w-5xl mx-auto text-center">
        <span className="text-[10px] sm:text-xs font-bold uppercase tracking-[0.25em] sm:tracking-[0.3em] text-amber-400">Authentic Taste</span>
        <h2 className="mt-1.5 sm:mt-3 text-2xl sm:text-4xl md:text-5xl font-black text-white mb-2 sm:mb-4">
          Visit Us or Place Orders
        </h2>
        <p className="text-slate-400 text-xs sm:text-base max-w-xl mx-auto mb-8 sm:mb-14 px-2 sm:px-0">
          We cater for weddings, functions, and everyday celebrations. Contact us directly for bulk sweets and custom orders.
        </p>

        <div className="grid grid-cols-3 gap-2 sm:gap-6 max-w-4xl mx-auto text-left">
          <a
            href="tel:0756656135"
            className="group rounded-2xl sm:rounded-3xl border border-white/10 bg-white/5 p-2.5 sm:p-6 hover:border-amber-400/50 hover:bg-white/10 transition-all duration-300 flex flex-col justify-between"
          >
            <div>
              <div className="size-8 sm:size-12 rounded-xl sm:rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-2 sm:mb-4 group-hover:scale-110 transition-transform">
                <Phone className="size-4 sm:size-5" />
              </div>
              <p className="text-[9px] sm:text-xs font-bold uppercase tracking-wider text-slate-400 truncate">Direct Mobile</p>
              <p className="text-xs sm:text-xl font-bold sm:font-black text-white mt-0.5 sm:mt-1 group-hover:text-amber-300 transition-colors truncate">
                0756656135
              </p>
            </div>
            <p className="text-[8px] sm:text-xs text-amber-400/90 font-semibold mt-2 sm:mt-4 truncate">Tap to Call →</p>
          </a>

          <div className="rounded-2xl sm:rounded-3xl border border-white/10 bg-white/5 p-2.5 sm:p-6 flex flex-col justify-between">
            <div>
              <div className="size-8 sm:size-12 rounded-xl sm:rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-2 sm:mb-4">
                <MapPin className="size-4 sm:size-5" />
              </div>
              <p className="text-[9px] sm:text-xs font-bold uppercase tracking-wider text-slate-400 truncate">Kitchen Address</p>
              <p className="text-xs sm:text-lg font-bold text-white mt-0.5 sm:mt-1 leading-snug truncate">138, France City</p>
              <p className="text-[9px] sm:text-sm text-slate-300 truncate">Maruthamunai</p>
            </div>
            <p className="text-[8px] sm:text-xs text-slate-500 mt-2 sm:mt-4 truncate">Daily fresh</p>
          </div>

          <div className="rounded-2xl sm:rounded-3xl border border-white/10 bg-white/5 p-2.5 sm:p-6 flex flex-col justify-between">
            <div>
              <div className="size-8 sm:size-12 rounded-xl sm:rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-2 sm:mb-4">
                <Award className="size-4 sm:size-5" />
              </div>
              <p className="text-[9px] sm:text-xs font-bold uppercase tracking-wider text-slate-400 truncate">Craftsmanship</p>
              <p className="text-xs sm:text-lg font-bold text-white mt-0.5 sm:mt-1 truncate">100% Traditional</p>
              <p className="text-[9px] sm:text-xs text-slate-400 mt-0.5 sm:mt-1 line-clamp-1 sm:line-clamp-none">Pure ghee &amp; nuts</p>
            </div>
            <p className="text-[8px] sm:text-xs text-slate-500 mt-2 sm:mt-4 truncate">Fresh Batches</p>
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
          className="flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-5 py-2 text-xs font-bold text-slate-300 hover:border-amber-400 hover:text-amber-300 hover:bg-white/10 transition-all duration-200"
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
  const [products, setProducts] = useState<Product[]>(SHOWCASE_SWEETS);

  useEffect(() => {
    async function loadProducts() {
      try {
        const client = getSupabase();
        if (!client) return;

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

          // Deduplicate by name
          const mapByName = new Map<string, Product>();
          for (const item of raw) {
            const key = item.name.trim().toLowerCase();
            const existing = mapByName.get(key);
            if (!existing) {
              mapByName.set(key, item);
            } else if ((!existing.imageUrl && item.imageUrl) || (!existing.description && item.description)) {
              mapByName.set(key, { ...existing, ...item });
            }
          }
          setProducts(Array.from(mapByName.values()));
        }
      } catch (err) {
        console.error("Failed to load products:", err);
      }
    }
    loadProducts();
  }, []);

  return (
    <div className="bg-[#0a0600] text-white min-h-screen selection:bg-amber-500 selection:text-black">
      {/* Fixed Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-3 sm:px-8 py-2.5 sm:py-4 bg-black/80 backdrop-blur-xl border-b border-white/10">
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
          <a href="#sweets" className="hidden sm:inline-block text-xs font-semibold text-slate-300 hover:text-amber-300 transition-colors">
            Sweet Catalog
          </a>
          <a href="#contact" className="hidden sm:inline-block text-xs font-semibold text-slate-300 hover:text-amber-300 transition-colors">
            Contact
          </a>
          <Link
            href="/login"
            className="flex items-center gap-1.5 rounded-full border border-amber-500/40 bg-amber-500/10 px-3 py-1 sm:px-4 sm:py-1.5 text-[11px] sm:text-xs font-bold text-amber-300 hover:bg-amber-500 hover:text-black transition-all duration-200"
          >
            <Lock className="size-3" />
            <span>Admin Login</span>
          </Link>
        </div>
      </nav>

      <HeroSection />

      {/* Sweet Catalog Section */}
      <section id="sweets" className="py-14 sm:py-28 px-3 sm:px-6 relative bg-[#0a0600]">
        <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-amber-500/30 to-transparent" />

        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-10 sm:mb-16">
            <span className="text-xs font-bold uppercase tracking-[0.3em] text-amber-400">
              Freshly Prepared Catalog
            </span>

            {/* Clean Section Heading */}
            <h2 className="mt-2 sm:mt-3 text-2xl sm:text-5xl font-black text-white tracking-tight">
              Our Traditional Sweets
            </h2>

            <p className="mt-2 sm:mt-4 text-slate-400 text-xs sm:text-base max-w-xl mx-auto">
              Prepared to order with pure ghee, whole milk, and eastern culinary traditions. Tap any sweet to see full details and photos.
            </p>
          </div>

          {products.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <div className="size-12 rounded-full border-4 border-amber-500/20 border-t-amber-500 animate-spin" />
              <p className="text-sm text-slate-400 font-medium">Loading sweet catalog…</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {products.map((product, i) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  index={i}
                />
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
