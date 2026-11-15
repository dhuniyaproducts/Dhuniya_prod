"use client";

import { useState, useEffect } from "react";
import { getSupabase } from "@/lib/supabase";
import {
  Sparkles,
  MapPin,
  Phone,
  FileText,
  ArrowRight,
  Star,
  Shield,
  Leaf,
  ChevronDown,
  Lock,
  Award,
  Heart,
  Clock,
  Sparkle,
} from "lucide-react";
import Link from "next/link";

type Product = {
  id: number;
  name: string;
  unit: string;
  price: number;
  active: boolean;
  imageUrl?: string;
  description?: string;
};

const money = (v: number) => `Rs. ${v.toLocaleString("en-LK")}`;

const SHOWCASE_SWEETS: Product[] = [
  {
    id: 1,
    name: "Musket Halwa",
    unit: "kg",
    price: 1200,
    active: true,
    imageUrl: "https://images.unsplash.com/photo-1599785209707-a456fc1337bb?w=800&auto=format&fit=crop&q=80",
    description: "Rich, slow-cooked musket halwa prepared with pure ghee, whole milk, and fragrant spices in authentic eastern tradition.",
  },
  {
    id: 2,
    name: "Golden Milk Toffee",
    unit: "kg",
    price: 1450,
    active: true,
    imageUrl: "https://images.unsplash.com/photo-1582293041079-7814c2f12063?w=800&auto=format&fit=crop&q=80",
    description: "Melt-in-your-mouth milk toffee crafted from pure condensed milk, golden caramel notes, and premium crunchy cashews.",
  },
  {
    id: 3,
    name: "Authentic Kalu Dodol",
    unit: "kg",
    price: 1100,
    active: true,
    imageUrl: "https://images.unsplash.com/photo-1541781774459-bb2af2f05b55?w=800&auto=format&fit=crop&q=80",
    description: "Traditional dark kalu dodol stirred by hand for hours with thick coconut milk, kithul treacle, and roasted cashews.",
  },
  {
    id: 4,
    name: "Royal Cashew Peda",
    unit: "kg",
    price: 1650,
    active: true,
    imageUrl: "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=800&auto=format&fit=crop&q=80",
    description: "Delicate royal peda infused with aromatic cardamom and garnished with hand-selected jumbo cashews.",
  },
];

function HeroSection() {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 100);
    return () => clearTimeout(t);
  }, []);

  return (
    <section className="relative min-h-[92vh] flex items-center justify-center overflow-hidden bg-[#0a0600] pt-20 pb-16">
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

      <div className="relative z-10 text-center px-4 max-w-5xl mx-auto">
        <div
          className={`inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.2em] text-amber-300 mb-8 backdrop-blur-md transition-all duration-700 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            }`}
        >
          <Sparkles className="size-3.5 text-amber-400" />
          <span>Authentic Eastern Heritage · Maruthamunai</span>
        </div>

        <h1
          className={`text-5xl sm:text-7xl md:text-8xl font-black tracking-tight text-white leading-[1.02] mb-6 transition-all duration-700 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
            }`}
          style={{ transitionDelay: "100ms" }}
        >
          <span>Dhuniya</span>{" "}
          <span className="bg-gradient-to-r from-amber-300 via-amber-500 to-orange-400 bg-clip-text text-transparent">
            Products
          </span>
        </h1>

        <div
          className={`inline-block mb-5 transition-all duration-700 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
            }`}
          style={{ transitionDelay: "200ms" }}
        >
          <p className="text-lg sm:text-2xl md:text-3xl font-extrabold uppercase tracking-[0.25em] text-amber-200">
            Eastern Traditional Sweet
          </p>
          <div className="h-0.5 w-28 bg-gradient-to-r from-amber-400 to-orange-500 mx-auto mt-3 rounded-full" />
        </div>

        <p
          className={`text-slate-300 text-sm sm:text-base md:text-lg max-w-2xl mx-auto leading-relaxed mb-10 transition-all duration-700 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
            }`}
          style={{ transitionDelay: "300ms" }}
        >
          Experience handcrafted heritage sweets made with authentic eastern Sri Lankan recipes,
          pure ingredients, and time-honoured artistry.
        </p>

        <div
          className={`flex flex-col sm:flex-row items-center justify-center gap-4 mb-16 transition-all duration-700 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
            }`}
          style={{ transitionDelay: "400ms" }}
        >
          <a
            href="#sweets"
            className="group flex items-center gap-2 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 px-8 py-3.5 text-sm font-bold text-white shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 hover:scale-105 transition-all duration-300"
          >
            <span>Explore Sweet Catalog</span>
            <ArrowRight className="size-4 group-hover:translate-x-1 transition-transform" />
          </a>
          <a
            href="tel:0756656135"
            className="flex items-center gap-2 rounded-full border border-amber-500/40 bg-white/5 px-8 py-3.5 text-sm font-bold text-amber-300 hover:bg-white/10 hover:border-amber-400 transition-all duration-300 backdrop-blur-sm"
          >
            <Phone className="size-4" />
            <span>Order by Phone: 0756656135</span>
          </a>
        </div>

        <div
          className={`grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 max-w-3xl mx-auto transition-all duration-700 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
            }`}
          style={{ transitionDelay: "500ms" }}
        >
          {[
            { label: "100% Pure Recipe", icon: Award },
            { label: "Handcrafted Daily", icon: Heart },
            { label: "Eastern Tradition", icon: Sparkle },
            { label: "Fresh Handover", icon: Clock },
          ].map(({ label, icon: Icon }) => (
            <div
              key={label}
              className="flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 py-3 px-3 backdrop-blur-sm"
            >
              <Icon className="size-4 text-amber-400 shrink-0" />
              <span className="text-xs font-semibold text-slate-300">{label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function ProductCard({ product, index }: { product: Product; index: number }) {
  const [visible, setVisible] = useState(false);
  const [imgErr, setImgErr] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), index * 60);
    return () => clearTimeout(t);
  }, [index]);

  const initials = product.name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div
      className={`group relative flex flex-col rounded-2xl sm:rounded-3xl overflow-hidden border border-white/10 bg-gradient-to-b from-white/10 via-white/5 to-transparent backdrop-blur-md hover:border-amber-400/50 hover:shadow-2xl hover:shadow-amber-500/15 transition-all duration-500 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
        }`}
    >
      <div className="relative aspect-[4/3] sm:aspect-auto sm:h-56 md:h-60 overflow-hidden bg-gradient-to-br from-amber-950/80 to-[#120800]">
        {product.imageUrl && !imgErr ? (
          <img
            src={product.imageUrl}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-108 transition-transform duration-700 ease-out"
            onError={() => setImgErr(true)}
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center p-3 sm:p-6 text-center">
            <div className="size-12 sm:size-20 rounded-xl sm:rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/30 flex items-center justify-center mb-2 sm:mb-3 group-hover:scale-110 transition-transform">
              <span className="text-lg sm:text-3xl font-black text-amber-300">{initials}</span>
            </div>
            <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-amber-400/80">Dhuniya</p>
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent pointer-events-none" />

        <div className="absolute bottom-2 left-2 sm:bottom-3 sm:left-3 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 px-2.5 sm:px-3.5 py-0.5 sm:py-1 text-[11px] sm:text-xs font-black text-white shadow-md shadow-black/50">
          {money(product.price)} <span className="font-normal text-[9px] sm:text-[11px] text-amber-100">/ {product.unit}</span>
        </div>

        <div className="absolute top-2 right-2 sm:top-3 sm:right-3 rounded-full bg-black/70 border border-white/15 px-2 py-0.5 text-[9px] sm:text-[10px] font-bold text-amber-300 backdrop-blur-md">
          Fresh
        </div>
      </div>

      <div className="flex flex-col flex-1 p-3 sm:p-5 md:p-6">
        <h3 className="text-sm sm:text-lg md:text-xl font-bold text-white group-hover:text-amber-300 transition-colors leading-snug line-clamp-1 sm:line-clamp-none">
          {product.name}
        </h3>
        <p className="mt-1 sm:mt-2 text-[11px] sm:text-xs md:text-sm text-slate-300/80 leading-relaxed flex-1 line-clamp-2 sm:line-clamp-3">
          {product.description?.trim() || "Authentic eastern recipe made fresh with premium ingredients in Maruthamunai."}
        </p>

        <div className="mt-2.5 sm:mt-4 pt-2.5 sm:pt-3.5 border-t border-white/10 flex items-center justify-between text-xs">
          <div className="flex items-center gap-0.5 sm:gap-1">
            {[1, 2, 3, 4, 5].map((s) => (
              <Star key={s} className="size-2.5 sm:size-3.5 fill-amber-400 text-amber-400" />
            ))}
          </div>
          <span className="text-amber-400 font-semibold text-[9px] sm:text-[11px] uppercase tracking-wider truncate max-w-[80px] sm:max-w-none">
            Heritage
          </span>
        </div>
      </div>
    </div>
  );
}

function ContactSection() {
  return (
    <section id="contact" className="py-20 sm:py-28 px-4 bg-gradient-to-b from-[#0a0600] to-[#120800] relative">
      <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-amber-500/30 to-transparent" />

      <div className="max-w-5xl mx-auto text-center">
        <span className="text-xs font-bold uppercase tracking-[0.3em] text-amber-400">Authentic Taste</span>
        <h2 className="mt-3 text-3xl sm:text-4xl md:text-5xl font-black text-white mb-4">
          Visit Us or Place Orders
        </h2>
        <p className="text-slate-400 text-sm sm:text-base max-w-xl mx-auto mb-14">
          We cater for weddings, functions, and everyday celebrations. Contact us directly for bulk sweets and custom orders.
        </p>

        <div className="grid gap-6 sm:grid-cols-3 max-w-3xl mx-auto text-left">
          <a
            href="tel:0756656135"
            className="group rounded-3xl border border-white/10 bg-white/5 p-6 hover:border-amber-400/50 hover:bg-white/10 transition-all duration-300 flex flex-col justify-between"
          >
            <div>
              <div className="size-12 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-4 group-hover:scale-110 transition-transform">
                <Phone className="size-5" />
              </div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Direct Mobile</p>
              <p className="text-xl font-black text-white mt-1 group-hover:text-amber-300 transition-colors">
                0756656135
              </p>
            </div>
            <p className="text-xs text-amber-400/90 font-semibold mt-4">Tap to Call Us →</p>
          </a>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-6 flex flex-col justify-between">
            <div>
              <div className="size-12 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-4">
                <MapPin className="size-5" />
              </div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Kitchen Address</p>
              <p className="text-lg font-bold text-white mt-1 leading-snug">
                138, France City
              </p>
              <p className="text-sm text-slate-300">Maruthamunai, Eastern Province</p>
            </div>
            <p className="text-xs text-slate-500 mt-4">Fresh daily production</p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-6 flex flex-col justify-between">
            <div>
              <div className="size-12 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-4">
                <Award className="size-5" />
              </div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Pure Craftsmanship</p>
              <p className="text-lg font-bold text-white mt-1">
                100% Traditional Recipe
              </p>
              <p className="text-xs text-slate-400 mt-1">Prepared daily with pure ghee, whole milk & nuts</p>
            </div>
            <p className="text-xs text-slate-500 mt-4">Fresh Batch Every Day</p>
          </div>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-white/10 bg-black px-4 py-12">
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-2xl overflow-hidden bg-white/10 p-0.5 border border-white/15 shrink-0">
            <img src="/logo.jpg" alt="Dhuniya Products Logo" className="size-full object-cover rounded-xl" />
          </div>
          <div>
            <p className="font-black text-white text-base">Dhuniya Products</p>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-400">
              Eastern Traditional Sweet
            </p>
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

export default function PublicPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadProducts() {
      try {
        const client = getSupabase();
        if (!client) {
          setProducts(SHOWCASE_SWEETS);
          setLoading(false);
          return;
        }

        const { data, error } = await client
          .from("products")
          .select("*")
          .eq("active", true)
          .order("id", { ascending: true });

        if (error) throw error;
        if (data && data.length > 0) {
          const raw = data.map((p: any) => ({
            id: Number(p.id),
            name: p.name,
            unit: p.unit,
            price: Number(p.price),
            active: Boolean(p.active),
            imageUrl: p.image_url || undefined,
            description: p.description || undefined,
          }));

          // Deduplicate products by lowercase name so duplicate entries never show up
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
        } else {
          setProducts(SHOWCASE_SWEETS);
        }
      } catch (err) {
        console.error("Failed to load products:", err);
        setProducts(SHOWCASE_SWEETS);
      } finally {
        setLoading(false);
      }
    }
    loadProducts();
  }, []);

  return (
    <div className="bg-[#0a0600] text-white min-h-screen selection:bg-amber-500 selection:text-black">
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 sm:px-8 py-4 bg-black/75 backdrop-blur-xl border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl overflow-hidden bg-white/10 p-0.5 border border-white/15 shadow-md shadow-amber-500/20 shrink-0">
            <img src="/logo.jpg" alt="Dhuniya Products Logo" className="size-full object-cover rounded-lg" />
          </div>
          <div>
            <span className="font-black text-white text-sm sm:text-base tracking-tight">Dhuniya Products</span>
            <span className="hidden sm:block text-[9px] font-bold uppercase tracking-[0.2em] text-amber-400">Eastern Traditional Sweet</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <a
            href="#sweets"
            className="hidden sm:inline-block text-xs font-semibold text-slate-300 hover:text-amber-300 transition-colors"
          >
            Sweet Catalog
          </a>
          <a
            href="#contact"
            className="hidden sm:inline-block text-xs font-semibold text-slate-300 hover:text-amber-300 transition-colors"
          >
            Contact
          </a>
          <Link
            href="/login"
            className="flex items-center gap-1.5 rounded-full border border-amber-500/40 bg-amber-500/10 px-4 py-1.5 text-xs font-bold text-amber-300 hover:bg-amber-500 hover:text-black transition-all duration-200"
          >
            <Lock className="size-3" />
            <span>Admin Login</span>
          </Link>
        </div>
      </nav>

      <HeroSection />

      <section id="sweets" className="py-14 sm:py-28 px-3 sm:px-6 relative bg-[#0a0600]">
        <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-amber-500/30 to-transparent" />

        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-10 sm:mb-16">
            <span className="text-xs font-bold uppercase tracking-[0.3em] text-amber-400">
              Freshly Prepared Catalog
            </span>
            <h2 className="mt-2 sm:mt-3 text-2xl sm:text-5xl font-black text-white tracking-tight">
              Our Traditional Sweets
            </h2>
            <p className="mt-2 sm:mt-4 text-slate-400 text-xs sm:text-base max-w-xl mx-auto">
              Prepared to order with pure ghee, whole milk, and eastern culinary traditions.
            </p>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <div className="size-12 rounded-full border-4 border-amber-500/20 border-t-amber-500 animate-spin" />
              <p className="text-sm text-slate-400 font-medium">Loading sweet catalog…</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:gap-6 sm:grid-cols-2 lg:grid-cols-3">
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
