"use client";

import { useState, useEffect, use } from "react";
import { useParams, useRouter } from "next/navigation";
import { getSupabase } from "@/lib/supabase";
import { optimizeImageUrl } from "@/lib/cloudinary";
import {
  ArrowLeft,
  Phone,
  MessageCircle,
  Star,
  Award,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Clock,
  Heart,
  Lock,
  Maximize2,
  X,
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

export default function SweetDetailPage() {
  const params = useParams();
  const router = useRouter();
  const productId = Number(params?.id);

  const [product, setProduct] = useState<Product | null>(null);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedImgIdx, setSelectedImgIdx] = useState(0);
  const [imgErr, setImgErr] = useState<Record<number, boolean>>({});
  const [isZoomed, setIsZoomed] = useState(false);

  const loadData = async () => {
    setLoading(true);

    // Purge legacy cache keys if any exist in the browser
    try {
      localStorage.removeItem("dhuniya_products");
      localStorage.removeItem("dhuniya_orders");
      localStorage.removeItem("dhuniya_customers");
      localStorage.removeItem("dhuniya_customers_v2");
    } catch {}

    // Fetch live data directly from Supabase
    try {
      const client = getSupabase();
      if (client) {
        const { data, error } = await client
          .from("products")
          .select("id,name,name_tamil,name_sinhala,unit,price,active,image_url,images,description,contents")
          .eq("active", true)
          .order("id", { ascending: true });

        if (!error && data && data.length > 0) {
          const mapped: Product[] = data.map((p: any) => ({
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
          setAllProducts(mapped);

          const found = mapped.find((p) => p.id === productId);
          if (found) {
            setProduct(found);
          } else {
            setProduct(null);
          }
        } else {
          setProduct(null);
        }
      }
    } catch (err) {
      console.error("Error loading sweet details from database:", err);
      setProduct(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (productId) {
      loadData();
    }
  }, [productId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0600] flex flex-col items-center justify-center text-white">
        <div className="size-12 rounded-full border-4 border-amber-500/20 border-t-amber-500 animate-spin mb-4" />
        <p className="text-sm font-semibold text-slate-400">Loading sweet details…</p>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-[#0a0600] flex flex-col items-center justify-center text-white px-4 text-center">
        <h2 className="text-2xl font-bold mb-2">Sweet Unavailable</h2>
        <p className="text-sm text-slate-400 mb-6 max-w-sm">
          Unable to load this sweet. If you are experiencing network coverage issues, please reconnect and try again.
        </p>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => loadData()}
            className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-2.5 text-sm font-bold text-white shadow-lg cursor-pointer"
          >
            <span>Try Again</span>
          </button>
          <Link
            href="/#sweets"
            className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-6 py-2.5 text-sm font-bold text-slate-300 hover:bg-white/10"
          >
            <ArrowLeft className="size-4" />
            <span>Back to Catalog</span>
          </Link>
        </div>
      </div>
    );
  }

  const gallery = [product.imageUrl, ...(product.images ?? [])].filter(Boolean) as string[];
  const currentImg = gallery[selectedImgIdx] ? optimizeImageUrl(gallery[selectedImgIdx], 1000) : "";
  const initials = product.name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();

  const otherSweets = allProducts.filter((p) => p.id !== product.id).slice(0, 4);

  return (
    <div className="min-h-screen bg-[#0a0600] text-white selection:bg-amber-500 selection:text-black">
      {/* Top Navbar */}
      <nav className="sticky top-0 z-40 flex items-center justify-between px-3 sm:px-8 py-3 bg-black/85 backdrop-blur-xl border-b border-white/10">
        <button
          onClick={() => router.push("/#sweets")}
          className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3.5 py-1.5 text-xs font-bold text-slate-200 hover:bg-white/10 hover:border-amber-400 hover:text-amber-300 transition-all cursor-pointer"
        >
          <ArrowLeft className="size-3.5" />
          <span>Back to Catalog</span>
        </button>

        <Link href="/" className="flex items-center gap-2">
          <div className="flex size-7 items-center justify-center rounded-lg overflow-hidden bg-white/10 p-0.5 border border-white/15">
            <img src="/logo.jpg" alt="Dhuniya" className="size-full object-cover rounded-md" />
          </div>
          <span className="font-extrabold text-sm text-white hidden sm:inline">Dhuniya Products</span>
        </Link>

        <a
          href="tel:0756656135"
          className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 px-3.5 py-1.5 text-xs font-bold text-white shadow-sm hover:scale-105 transition-all"
        >
          <Phone className="size-3" />
          <span>0756656135</span>
        </a>
      </nav>

      {/* Main Sweet Details Container */}
      <main className="max-w-4xl mx-auto px-3 sm:px-6 py-6 sm:py-12">
        <div className="rounded-2xl sm:rounded-3xl border border-white/15 bg-gradient-to-b from-[#180d01] via-[#120800] to-[#0a0600] overflow-hidden shadow-2xl shadow-black/80">
          {/* Main Visual Showcase / Gallery */}
          <div className="relative h-[360px] sm:h-[480px] w-full bg-[#050300] overflow-hidden flex items-center justify-center group/img">
            {currentImg && !imgErr[selectedImgIdx] ? (
              <>
                {/* Ambient glow matching image */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                  <img
                    src={currentImg}
                    alt=""
                    className="w-full h-full object-cover blur-2xl opacity-25 scale-110"
                    aria-hidden="true"
                  />
                </div>

                {/* Uncropped, full image */}
                <img
                  src={currentImg}
                  alt={product.name}
                  onClick={() => setIsZoomed(true)}
                  className="relative z-10 w-full h-full object-contain cursor-zoom-in transition-transform duration-300 hover:scale-[1.01]"
                  onError={() => setImgErr((prev) => ({ ...prev, [selectedImgIdx]: true }))}
                />

                {/* Tap to View Full Screen Indicator */}
                <button
                  type="button"
                  onClick={() => setIsZoomed(true)}
                  className="absolute bottom-3 right-3 z-20 flex items-center gap-1.5 rounded-full bg-black/75 border border-white/20 px-3 py-1.5 text-xs font-bold text-white backdrop-blur-md hover:bg-black/90 hover:border-amber-400 transition-all cursor-pointer shadow-lg"
                >
                  <Maximize2 className="size-3.5 text-amber-400" />
                  <span>Full View</span>
                </button>
              </>
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center">
                <div className="size-24 rounded-3xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/30 flex items-center justify-center mb-3">
                  <span className="text-4xl font-black text-amber-300">{initials}</span>
                </div>
                <p className="text-xs font-semibold uppercase tracking-wider text-amber-400/80">Dhuniya Products</p>
              </div>
            )}

            {/* Price Badge */}
            <div className="absolute bottom-3 left-3 sm:bottom-5 sm:left-5 z-20 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 px-3.5 sm:px-5 py-1 sm:py-1.5 text-sm sm:text-base font-black text-white shadow-xl shadow-black/60">
              {money(product.price)} <span className="text-xs sm:text-sm font-normal text-amber-100">/ {product.unit}</span>
            </div>

            {/* Image Counter & Nav */}
            {gallery.length > 1 && (
              <>
                <div className="absolute top-3 right-3 z-20 rounded-full bg-black/75 border border-white/20 px-2.5 py-1 text-[11px] font-bold text-amber-300 backdrop-blur-md">
                  {selectedImgIdx + 1} / {gallery.length} photos
                </div>

                <button
                  onClick={() => setSelectedImgIdx((i) => (i - 1 + gallery.length) % gallery.length)}
                  className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 z-20 flex size-9 sm:size-11 items-center justify-center rounded-full bg-black/60 border border-white/20 text-white hover:bg-black/85 transition-colors cursor-pointer"
                  title="Previous image"
                >
                  <ChevronLeft className="size-5" />
                </button>

                <button
                  onClick={() => setSelectedImgIdx((i) => (i + 1) % gallery.length)}
                  className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 z-20 flex size-9 sm:size-11 items-center justify-center rounded-full bg-black/60 border border-white/20 text-white hover:bg-black/85 transition-colors cursor-pointer"
                  title="Next image"
                >
                  <ChevronRight className="size-5" />
                </button>
              </>
            )}
          </div>

          {/* Gallery Thumbnails Strip (if multiple images) */}
          {gallery.length > 1 && (
            <div className="flex gap-2 p-3 sm:p-4 bg-black/40 border-b border-white/10 overflow-x-auto">
              {gallery.map((url, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setSelectedImgIdx(i)}
                  className={`relative size-14 sm:size-16 rounded-xl overflow-hidden border-2 transition-all shrink-0 cursor-pointer ${
                    i === selectedImgIdx
                      ? "border-amber-400 scale-105 shadow-md shadow-amber-500/30"
                      : "border-white/20 opacity-60 hover:opacity-100"
                  }`}
                >
                  <img src={optimizeImageUrl(url, 120)} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}

          {/* Sweet Details Body */}
          <div className="p-5 sm:p-8 space-y-6">
            {/* Title & 3 Languages */}
            <div>
              <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight leading-tight">
                {product.name}
              </h1>

              {/* Tamil & Sinhala translations right under the name */}
              {(product.nameTamil || product.nameSinhala) && (
                <div className="flex items-center gap-3 sm:gap-5 mt-2 flex-wrap">
                  {product.nameTamil && (
                    <span className="text-sm sm:text-base font-bold text-amber-400">
                      {product.nameTamil}
                    </span>
                  )}
                  {product.nameSinhala && (
                    <span className="text-sm sm:text-base font-semibold text-orange-300">
                      {product.nameSinhala}
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* About This Sweet Section */}
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-amber-500 mb-2">
                ABOUT THIS SWEET
              </p>
              <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
                {product.description?.trim() ||
                  "Authentic eastern recipe prepared fresh with pure ghee, whole milk, and time-honoured culinary artistry in Maruthamunai."}
              </p>
            </div>

            {/* Ingredients & Contents Box */}
            {product.contents && (
              <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 sm:p-5">
                <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-amber-400 mb-2.5">
                  INGREDIENTS &amp; CONTENTS
                </p>
                <div className="text-xs sm:text-sm text-slate-200 leading-relaxed">
                  {product.contents.includes("\n") ? (
                    <ul className="space-y-1 list-disc list-inside">
                      {product.contents.split("\n").map((line, idx) => (
                        <li key={idx}>{line.replace(/^[-•*]\s*/, "")}</li>
                      ))}
                    </ul>
                  ) : (
                    <p>{product.contents}</p>
                  )}
                </div>
              </div>
            )}

            {/* Quality & Ratings Row */}
            <div className="flex items-center justify-between pt-3 border-t border-white/10 text-xs sm:text-sm">
              <div className="flex items-center gap-1.5">
                <div className="flex items-center gap-0.5">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star key={s} className="size-3.5 sm:size-4 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <span className="font-bold text-slate-300 ml-1">5.0 · Heritage Recipe</span>
              </div>
              <span className="font-extrabold uppercase tracking-widest text-[10px] sm:text-xs text-amber-400/90 bg-amber-500/15 border border-amber-500/30 px-2.5 py-1 rounded-full">
                FRESH DAILY
              </span>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <a
                href="tel:0756656135"
                className="flex-1 flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-600 to-orange-500 py-4 px-6 text-sm sm:text-base font-extrabold text-white shadow-xl shadow-amber-500/25 hover:shadow-amber-500/40 hover:scale-[1.02] transition-all cursor-pointer text-center"
              >
                <Phone className="size-4 sm:size-5" />
                <span>Order this Sweet · 0756656135</span>
              </a>

              <a
                href={`https://wa.me/94756656135?text=${encodeURIComponent(`Hello Dhuniya Products, I would like to order ${product.name} (${money(product.price)} / ${product.unit}).`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 rounded-2xl border border-emerald-500/40 bg-emerald-500/15 py-4 px-6 text-sm sm:text-base font-bold text-emerald-300 hover:bg-emerald-500/25 hover:border-emerald-400 transition-all cursor-pointer text-center"
              >
                <MessageCircle className="size-4 sm:size-5 text-emerald-400" />
                <span>WhatsApp Order</span>
              </a>
            </div>
          </div>
        </div>

        {/* More Sweets Catalog Suggestion */}
        {otherSweets.length > 0 && (
          <div className="mt-14 sm:mt-20">
            <div className="flex items-center justify-between mb-6">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-amber-400">Discover More</p>
                <h3 className="text-xl sm:text-2xl font-bold text-white mt-0.5">Other Traditional Sweets</h3>
              </div>
              <Link href="/#sweets" className="text-xs font-bold text-amber-400 hover:underline">
                View All →
              </Link>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
              {otherSweets.map((s) => (
                <Link
                  key={s.id}
                  href={`/sweets/${s.id}`}
                  className="group rounded-2xl border border-white/10 bg-white/5 p-3 hover:border-amber-400/50 hover:bg-white/10 transition-all"
                >
                  <div className="aspect-square rounded-xl overflow-hidden bg-black/40 mb-2.5">
                    {s.imageUrl ? (
                      <img
                        src={optimizeImageUrl(s.imageUrl, 200)}
                        alt={s.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-amber-400 font-black">
                        {s.name.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <h4 className="font-bold text-xs sm:text-sm text-white group-hover:text-amber-300 truncate">
                    {s.name}
                  </h4>
                  <p className="text-[11px] font-semibold text-amber-400 mt-1">
                    {money(s.price)} / {s.unit}
                  </p>
                </Link>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Fullscreen Zoom Lightbox Modal */}
      {isZoomed && currentImg && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/95 backdrop-blur-2xl flex flex-col items-center justify-between p-3 sm:p-6 animate-fade-in-up"
          onClick={() => setIsZoomed(false)}
        >
          {/* Top Bar with counter & close */}
          <div
            className="w-full flex items-center justify-between z-10 max-w-5xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-white">{product.name}</span>
              {gallery.length > 1 && (
                <span className="text-xs text-amber-400 font-semibold">
                  ({selectedImgIdx + 1} of {gallery.length})
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={() => setIsZoomed(false)}
              className="flex size-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors cursor-pointer"
              aria-label="Close Fullscreen View"
            >
              <X className="size-5" />
            </button>
          </div>

          {/* Centered 100% Uncropped Image */}
          <div
            className="relative flex-1 flex items-center justify-center w-full max-w-5xl my-2 overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={gallery[selectedImgIdx]}
              alt={product.name}
              className="max-h-[82vh] max-w-full object-contain rounded-xl shadow-2xl"
            />

            {/* Prev / Next within modal if multiple */}
            {gallery.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={() => setSelectedImgIdx((i) => (i - 1 + gallery.length) % gallery.length)}
                  className="absolute left-2 top-1/2 -translate-y-1/2 flex size-11 items-center justify-center rounded-full bg-black/70 border border-white/20 text-white hover:bg-black/90 cursor-pointer"
                >
                  <ChevronLeft className="size-6" />
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedImgIdx((i) => (i + 1) % gallery.length)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 flex size-11 items-center justify-center rounded-full bg-black/70 border border-white/20 text-white hover:bg-black/90 cursor-pointer"
                >
                  <ChevronRight className="size-6" />
                </button>
              </>
            )}
          </div>

          {/* Bottom hint */}
          <p className="text-xs text-slate-400">
            Tap anywhere to close · Full resolution preview
          </p>
        </div>
      )}

      {/* Footer */}
      <footer className="mt-16 border-t border-white/10 bg-black px-4 py-8 text-center text-xs text-slate-500">
        <p className="text-slate-400">Dhuniya Products · Eastern Traditional Sweet · Maruthamunai</p>
        <p className="mt-1">Direct Orders: 0756656135</p>
      </footer>
    </div>
  );
}
