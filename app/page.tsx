"use client";

import { useState, useEffect, useRef } from "react";
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

// ── Interactive Golden Ember Particles (Hero Background) ──────────────────────
function GoldenEmberCanvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    let animId: number;
    let isVisible = true;

    // Resize canvas
    const handleResize = () => {
      if (!canvas) return;
      canvas.width = canvas.parentElement?.clientWidth || window.innerWidth;
      canvas.height = canvas.parentElement?.clientHeight || window.innerHeight;
    };
    handleResize();
    window.addEventListener("resize", handleResize);

    interface Particle {
      x: number;
      y: number;
      size: number;
      speedY: number;
      speedX: number;
      opacity: number;
      color: string;
      wobble: number;
      wobbleSpeed: number;
    }

    const colors = [
      "251, 191, 36", // amber-400
      "245, 158, 11", // amber-500
      "253, 230, 138", // amber-200
      "249, 115, 22", // orange-500
    ];

    // High performance particle count: 12 on mobile, 25 on desktop
    const isMobile = typeof window !== "undefined" && window.innerWidth < 640;
    const particleCount = isMobile ? 12 : 25;
    const particles: Particle[] = [];

    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: Math.random() * 2 + 0.8,
        speedY: Math.random() * 0.5 + 0.2,
        speedX: (Math.random() - 0.5) * 0.3,
        opacity: Math.random() * 0.6 + 0.2,
        color: colors[Math.floor(Math.random() * colors.length)],
        wobble: Math.random() * Math.PI * 2,
        wobbleSpeed: Math.random() * 0.02 + 0.01,
      });
    }

    // Intersection observer stops loop when hero is scrolled out of view
    const observer = new IntersectionObserver(
      ([entry]) => {
        isVisible = entry.isIntersecting;
        if (isVisible) render();
      },
      { threshold: 0.05 }
    );
    observer.observe(canvas);

    // 60 FPS GPU-accelerated loop with ZERO software blur
    const render = () => {
      if (!isVisible) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (let p of particles) {
        p.y -= p.speedY;
        p.wobble += p.wobbleSpeed;
        p.x += Math.sin(p.wobble) * 0.4 + p.speedX;

        // Wrap around top
        if (p.y < -10) {
          p.y = canvas.height + 10;
          p.x = Math.random() * canvas.width;
        }
        if (p.x < -10) p.x = canvas.width + 10;
        if (p.x > canvas.width + 10) p.x = -10;

        // Fast GPU-friendly double-pass glow (no CPU shadowBlur)
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * 2.2, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${p.color}, ${p.opacity * 0.25})`;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${p.color}, ${p.opacity})`;
        ctx.fill();
      }

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", handleResize);
      observer.disconnect();
    };
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none z-1" />;
}

// ── High Performance Product Card Component ──────────────────────────────────
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
      style={{
        animationDelay: `${Math.min(index * 0.05, 0.35)}s`,
      }}
      className="animate-fade-in-up group relative flex flex-col rounded-2xl sm:rounded-3xl overflow-hidden border border-white/10 bg-gradient-to-b from-white/10 via-white/5 to-transparent backdrop-blur-md hover:border-amber-400/60 hover:shadow-2xl hover:shadow-amber-500/20 hover:-translate-y-1.5 text-left w-full cursor-pointer transition-all duration-300 ease-out will-change-transform"
    >
      <div className="relative h-28 sm:h-56 md:h-60 overflow-hidden bg-gradient-to-br from-amber-950/80 to-[#120800]">
        {optimizedSrc && !imgErr ? (
          <img
            src={optimizedSrc}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out will-change-transform"
            onError={() => setImgErr(true)}
            loading={index < 4 ? "eager" : "lazy"}
            decoding="async"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center p-3 sm:p-6 text-center">
            <div className="size-12 sm:size-20 rounded-xl sm:rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/30 flex items-center justify-center mb-2 sm:mb-3 group-hover:scale-105 transition-transform duration-300">
              <span className="text-lg sm:text-3xl font-black text-amber-300">{initials}</span>
            </div>
            <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-amber-400/80">Dhuniya</p>
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent pointer-events-none" />

        {/* Price badge */}
        <div className="absolute bottom-2 left-2 sm:bottom-3 sm:left-3 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 px-2.5 sm:px-3.5 py-0.5 sm:py-1 text-[11px] sm:text-xs font-black text-white shadow-md shadow-black/50 group-hover:scale-105 transition-transform duration-300">
          {money(product.price)} <span className="font-normal text-[9px] sm:text-[11px] text-amber-100">/ {product.unit}</span>
        </div>

        {/* Top badges */}
        <div className="absolute top-2 right-2 sm:top-3 sm:right-3 flex gap-1 z-10">
          {hasMultiple && (
            <div className="rounded-full bg-black/75 border border-amber-400/40 px-2 py-0.5 text-[9px] font-bold text-amber-300 backdrop-blur-md flex items-center gap-1 shadow-sm">
              <ZoomIn className="size-2.5" /> {allImages.length}
            </div>
          )}
          <div className="rounded-full bg-black/70 border border-white/15 px-2 py-0.5 text-[9px] sm:text-[10px] font-bold text-amber-300 backdrop-blur-md">
            Fresh
          </div>
        </div>

        {/* View Details hover indicator */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 scale-95 group-hover:scale-100 transition-all duration-300 z-10 pointer-events-none">
          <div className="bg-black/75 backdrop-blur-md rounded-full px-4 py-2 text-xs font-bold text-white border border-amber-400/40 flex items-center gap-1.5 shadow-2xl">
            <ZoomIn className="size-3.5 text-amber-400" /> View Details &amp; Photos
          </div>
        </div>
      </div>

      <div className="flex flex-col flex-1 p-2.5 sm:p-5">
        {/* Sweet Name in English */}
        <h3 className="text-xs sm:text-lg font-bold text-white group-hover:text-amber-300 transition-colors duration-300 leading-snug line-clamp-1">
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
          <span className="text-amber-400 font-bold text-[10px] sm:text-xs flex items-center gap-0.5 group-hover:translate-x-1.5 transition-transform duration-300">
            View Sweet →
          </span>
        </div>
      </div>
    </Link>
  );
}

// ── Scroll-Triggered Slide In Component (Mobile & Desktop) ─────────────────────
function SlideInView({
  children,
  className = "",
  direction = "up",
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  direction?: "up" | "left" | "right";
  delay?: number;
}) {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(el);
        }
      },
      { threshold: 0.1, rootMargin: "0px 0px -20px 0px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const getTransform = () => {
    if (isVisible) return "translate-x-0 translate-y-0 opacity-100";
    if (direction === "left") return "-translate-x-4 opacity-0";
    if (direction === "right") return "translate-x-4 opacity-0";
    return "translate-y-4 opacity-0";
  };

  return (
    <div
      ref={ref}
      style={{ transitionDelay: `${delay}ms` }}
      className={`transition-[opacity,transform] duration-500 ease-out will-change-[opacity,transform] ${getTransform()} ${className}`}
    >
      {children}
    </div>
  );
}

// ── Hero Section ───────────────────────────────────────────────────────────────
function HeroSection() {
  return (
    <section className="relative min-h-[75vh] sm:min-h-[90vh] flex items-center justify-center overflow-hidden bg-[#0a0600] pt-16 pb-10 sm:pt-28 sm:pb-20">
      <div className="absolute inset-0 bg-gradient-to-b from-[#180d01] via-[#0f0700] to-[#0a0600]" />
      <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[700px] h-[700px] bg-gradient-to-br from-amber-500/20 via-orange-600/15 to-transparent rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-96 h-96 bg-amber-600/10 rounded-full blur-[100px] pointer-events-none" />

      {/* Floating Golden Embers Interactive Canvas */}
      <GoldenEmberCanvas />

      <div
        className="absolute inset-0 opacity-[0.04] pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, #f59e0b 1px, transparent 0)`,
          backgroundSize: "36px 36px",
        }}
      />

      <div className="relative z-10 text-center px-4 max-w-5xl mx-auto">
        <div
          style={{ animationDelay: "0.1s" }}
          className="animate-fade-in-up inline-flex items-center gap-1.5 sm:gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 sm:px-4 sm:py-1.5 text-[10px] sm:text-xs font-bold uppercase tracking-wider sm:tracking-[0.2em] text-amber-300 mb-4 sm:mb-8 backdrop-blur-md animate-float-gentle"
        >
          <Sparkles className="size-3 sm:size-3.5 text-amber-400" />
          <span>Authentic Eastern Heritage · Maruthamunai</span>
        </div>

        <h1
          style={{ animationDelay: "0.2s" }}
          className="animate-fade-in-up text-3xl sm:text-6xl md:text-8xl font-black tracking-tight text-white leading-[1.08] sm:leading-[1.02] mb-3 sm:mb-6"
        >
          <span>Dhuniya</span>{" "}
          <span className="gold-shimmer-text">
            Products
          </span>
        </h1>

        {/* Clean subtitle */}
        <div
          style={{ animationDelay: "0.3s" }}
          className="animate-fade-in-up inline-block mb-3 sm:mb-5"
        >
          <p className="text-xs sm:text-2xl md:text-3xl font-extrabold uppercase tracking-[0.16em] sm:tracking-[0.25em] text-amber-200">
            Eastern Traditional Sweet
          </p>
          <div className="h-0.5 w-16 sm:w-28 bg-gradient-to-r from-amber-400 to-orange-500 mx-auto mt-2 sm:mt-3 rounded-full" />
        </div>

        <p
          style={{ animationDelay: "0.4s" }}
          className="animate-fade-in-up text-slate-300 text-xs sm:text-base md:text-lg max-w-2xl mx-auto leading-relaxed mb-6 sm:mb-10 px-2 sm:px-0"
        >
          Experience handcrafted heritage sweets made with authentic eastern Sri Lankan recipes,
          pure ingredients, and time-honoured artistry.
        </p>

        <div
          style={{ animationDelay: "0.5s" }}
          className="animate-fade-in-up flex flex-col sm:flex-row items-center justify-center gap-2.5 sm:gap-4 mb-8 sm:mb-16"
        >
          <a
            href="#sweets"
            className="group flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-2.5 sm:px-8 sm:py-3.5 text-xs sm:text-sm font-bold text-white shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 hover:scale-105 active:scale-95 transition-all duration-300 animate-pulse-glow w-full sm:w-auto"
          >
            <span>Explore Sweet Catalog</span>
            <ArrowRight className="size-3.5 sm:size-4 group-hover:translate-x-1.5 transition-transform duration-300" />
          </a>
          <a
            href="tel:0756656135"
            className="flex items-center justify-center gap-2 rounded-full border border-amber-500/40 bg-white/5 px-6 py-2.5 sm:px-8 sm:py-3.5 text-xs sm:text-sm font-bold text-amber-300 hover:bg-white/10 hover:border-amber-400 hover:text-amber-200 hover:scale-105 active:scale-95 transition-all duration-300 backdrop-blur-sm w-full sm:w-auto"
          >
            <Phone className="size-3.5 sm:size-4" />
            <span>Order by Phone: 0756656135</span>
          </a>
        </div>

        <div
          style={{ animationDelay: "0.6s" }}
          className="animate-fade-in-up grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4 max-w-3xl mx-auto"
        >
          {[
            { label: "100% Pure Recipe", icon: Award },
            { label: "Handcrafted Daily", icon: Heart },
            { label: "Eastern Tradition", icon: Sparkle },
            { label: "Fresh Handover", icon: Clock },
          ].map(({ label, icon: Icon }) => (
            <div
              key={label}
              className="group flex items-center justify-center gap-1.5 sm:gap-2 rounded-xl sm:rounded-2xl border border-white/10 bg-white/5 py-2 px-2 sm:py-3 sm:px-3 backdrop-blur-sm hover:border-amber-400/40 hover:bg-white/10 hover:-translate-y-1 transition-all duration-300"
            >
              <Icon className="size-3.5 sm:size-4 text-amber-400 shrink-0 group-hover:scale-110 transition-transform duration-300" />
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

      <SlideInView direction="up">
        <div className="max-w-4xl mx-auto text-center">
          <span className="text-[10px] sm:text-xs font-bold uppercase tracking-[0.25em] text-amber-400">Authentic Taste</span>
          <h2 className="mt-1 sm:mt-2 text-xl sm:text-3xl md:text-4xl font-black text-white mb-1 sm:mb-2">
            Visit Us or Place Orders
          </h2>
          <p className="text-slate-400 text-xs sm:text-sm max-w-md mx-auto mb-5 sm:mb-8 px-2 sm:px-0">
            Handcrafted for celebrations and bulk orders. Contact us directly or visit our Maruthamunai kitchen.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-5 text-left">
            <SlideInView direction="up" delay={80}>
              <a
                href="tel:0756656135"
                className="group flex sm:flex-col items-center sm:items-start justify-between rounded-xl sm:rounded-2xl border border-white/10 bg-white/5 p-3 sm:p-5 hover:border-amber-400/60 hover:bg-white/10 hover:-translate-y-1 active:scale-98 transition-all duration-300 h-full"
              >
                <div className="flex sm:flex-col items-center sm:items-start gap-2.5 sm:gap-3 min-w-0">
                  <div className="size-8 sm:size-10 rounded-lg sm:rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0 group-hover:scale-105 transition-transform">
                    <Phone className="size-4 sm:size-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-slate-400 truncate">Direct Mobile</p>
                    <p className="text-xs sm:text-lg font-black text-white group-hover:text-amber-300 transition-colors truncate">
                      0756656135
                    </p>
                  </div>
                </div>
                <span className="text-[10px] sm:text-xs text-amber-400 font-bold flex items-center gap-1 group-hover:translate-x-1 transition-transform shrink-0 ml-2 sm:ml-0 sm:mt-3">
                  <span>Call Now</span>
                  <ArrowRight className="size-3" />
                </span>
              </a>
            </SlideInView>

            <SlideInView direction="up" delay={160}>
              <div className="group flex sm:flex-col items-center sm:items-start justify-between rounded-xl sm:rounded-2xl border border-white/10 bg-white/5 p-3 sm:p-5 hover:border-amber-400/40 hover:bg-white/10 transition-all duration-300 h-full">
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
            </SlideInView>

            <SlideInView direction="up" delay={240}>
              <div className="group flex sm:flex-col items-center sm:items-start justify-between rounded-xl sm:rounded-2xl border border-white/10 bg-white/5 p-3 sm:p-5 hover:border-amber-400/40 hover:bg-white/10 transition-all duration-300 h-full">
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
            </SlideInView>
          </div>
        </div>
      </SlideInView>
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
      <section id="sweets" className="py-10 sm:py-28 px-3 sm:px-6 relative bg-[#0a0600]">
        <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-amber-500/30 to-transparent" />

        <div className="max-w-6xl mx-auto">
          <SlideInView direction="up">
            <div className="text-center mb-6 sm:mb-10">
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

              {/* Count badge */}
              {products.length > 0 && (
                <div className="flex items-center justify-center gap-1.5 mt-4 text-[11px] sm:text-xs font-bold text-slate-400">
                  <span className="size-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>{products.length} Traditional Sweet{products.length !== 1 ? "s" : ""}</span>
                </div>
              )}
            </div>
          </SlideInView>

          {loading && products.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <div className="size-12 rounded-full border-4 border-amber-500/20 border-t-amber-500 animate-spin" />
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
                  className="rounded-full bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-2.5 text-xs font-bold text-white shadow-lg hover:scale-105 active:scale-95 transition-all cursor-pointer"
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
