"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { getSupabase } from "@/lib/supabase";
import CloudinaryUpload from "@/components/CloudinaryUpload";
import { deleteCloudinaryImage, optimizeImageUrl } from "@/lib/cloudinary";
import {
  ArrowRight,
  Bell,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  Download,
  Edit2,
  Factory,
  FileText,
  Image as ImageIcon,
  LayoutDashboard,
  LogOut,
  MapPin,
  Menu,
  Package,
  PackagePlus,
  Phone,
  Plus,
  Printer,
  Search,
  Share2,
  Sparkles,
  Trash2,
  User,
  Users,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";

// --- Types ---
export type Product = {
  id: number;
  name: string;
  nameTamil?: string;
  nameSinhala?: string;
  unit: string;
  price: number;
  active: boolean;
  imageUrl?: string;
  images?: string[];        // extra gallery images for public page
  description?: string;
  contents?: string;        // ingredients / contents shown on public page
};

export type Customer = {
  id?: number | string;
  name: string;
  phone?: string;
  address?: string;
  notes?: string;
  createdAt?: string;
};

export type CustomerFormData = {
  name: string;
  phone: string;
  address: string;
  notes: string;
};

export type OrderItem = {
  productId: number;
  qty: number;
  rate?: number;
};

export type Order = {
  id: string;
  date: string;
  deliveryDate: string;
  customer: string;
  items: OrderItem[];
  // Keep legacy fields optional for backwards compatibility
  productId?: number;
  qty?: number;
  rate?: number;
  status: string;
  notes?: string;
  phone?: string;
  address?: string;
  amountPaid?: number;
  paymentStatus?: "Unpaid" | "Partial" | "Paid";
};

// --- Constants ---

export const consolidateOrderItems = (raw: OrderItem[]): OrderItem[] => {
  if (!Array.isArray(raw) || raw.length <= 1) return raw || [];
  const map = new Map<number, OrderItem>();
  for (const it of raw) {
    const pid = Number(it.productId);
    if (!pid) continue;
    const existing = map.get(pid);
    if (existing) {
      existing.qty = (Number(existing.qty) || 0) + (Number(it.qty) || 0);
      if (it.rate != null && existing.rate == null) {
        existing.rate = it.rate;
      }
    } else {
      map.set(pid, { ...it, productId: pid, qty: Number(it.qty) || 0 });
    }
  }
  return Array.from(map.values());
};

export const getOrderItems = (o: Order): OrderItem[] => {
  let raw: OrderItem[] = [];
  if (Array.isArray(o.items) && o.items.length > 0) raw = o.items;
  else if (o.productId) raw = [{ productId: o.productId, qty: o.qty ?? 0, rate: o.rate }];
  return consolidateOrderItems(raw);
};

export const getOrderTotal = (o: Order, products: Product[]): number => {
  const items = getOrderItems(o);
  return items.reduce((sum, item) => {
    const prod = products.find((p) => p.id === item.productId);
    const r = item.rate ?? prod?.price ?? 0;
    return sum + (item.qty * r);
  }, 0);
};

export const isWholeNumberUnit = (unit?: string): boolean => {
  if (!unit) return false;
  const u = unit.trim().toLowerCase();
  return ["pcs", "box", "piece", "pieces", "boxes"].includes(u);
};

export const getOrderTotalKg = (o: Order, products?: Product[]): number => {
  const items = getOrderItems(o);
  return items.reduce((sum, item) => {
    if (products) {
      const prod = products.find((p) => p.id === item.productId);
      if (prod && isWholeNumberUnit(prod.unit)) return sum;
      if (prod && prod.unit && prod.unit.toLowerCase() !== "kg") return sum;
    }
    return sum + (Number(item.qty) || 0);
  }, 0);
};

export const getOrderTotalPcs = (o: Order, products?: Product[]): number => {
  const items = getOrderItems(o);
  return items.reduce((sum, item) => {
    if (products) {
      const prod = products.find((p) => p.id === item.productId);
      if (prod && isWholeNumberUnit(prod.unit)) {
        return sum + Math.round(Number(item.qty) || 0);
      }
    }
    return sum;
  }, 0);
};

// Tag used to embed rich order metadata (multi-items, payments) into order notes
// if the Supabase table doesn't have dedicated columns yet.
const DHUNIYA_TAG_REGEX = /<!--DHUNIYA_DATA:([\s\S]*?)-->/;

export const encodeDhuniyaData = (meta: { items?: OrderItem[]; amountPaid?: number; paymentStatus?: string }): string => {
  return `<!--DHUNIYA_DATA:${JSON.stringify(meta)}-->`;
};

export const parseDhuniyaData = (notes?: string | null): { cleanNotes?: string; hasTag: boolean; items?: OrderItem[]; amountPaid?: number; paymentStatus?: "Unpaid" | "Partial" | "Paid" } => {
  if (!notes) return { hasTag: false };
  const match = notes.match(DHUNIYA_TAG_REGEX);
  if (!match) return { cleanNotes: notes.trim() || undefined, hasTag: false };
  const cleanNotes = notes.replace(DHUNIYA_TAG_REGEX, "").trim() || undefined;
  try {
    const parsed = JSON.parse(match[1]);
    return {
      cleanNotes,
      hasTag: true,
      items: parsed.items,
      amountPaid: parsed.amountPaid != null ? Number(parsed.amountPaid) : undefined,
      paymentStatus: parsed.paymentStatus,
    };
  } catch {
    return { cleanNotes, hasTag: true };
  }
};


export const STATUS_OPTIONS = [
  "Pending",
  "Confirmed",
  "In Production",
  "Ready to Bill",
  "Completed",
  "Cancelled",
] as const;

export type Status = (typeof STATUS_OPTIONS)[number];

export const STATUS_STYLES: Record<Status, { bg: string; text: string; dot: string; border: string }> = {
  Pending: { bg: "bg-slate-100", text: "text-slate-700", dot: "bg-slate-400", border: "border-slate-200" },
  Confirmed: { bg: "bg-blue-50", text: "text-blue-700", dot: "bg-blue-600", border: "border-blue-200" },
  "In Production": { bg: "bg-amber-50", text: "text-amber-800", dot: "bg-amber-500", border: "border-amber-200" },
  "Ready to Bill": { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-600", border: "border-emerald-200" },
  Completed: { bg: "bg-teal-50", text: "text-teal-800", dot: "bg-teal-600", border: "border-teal-200" },
  Cancelled: { bg: "bg-rose-50", text: "text-rose-700", dot: "bg-rose-500", border: "border-rose-200" },
};

type Toast = {
  id: string;
  type: "success" | "error" | "info";
  message: string;
};

function ToastContainer({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: string) => void }) {
  if (toasts.length === 0) return null;
  return (
    <div className="print-hide fixed bottom-20 sm:bottom-6 right-4 z-[70] flex flex-col gap-2 max-w-sm w-full pointer-events-none px-3 sm:px-0">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`pointer-events-auto flex items-center justify-between gap-3 p-3.5 rounded-xl shadow-lg border text-xs font-semibold animate-in slide-in-from-bottom-2 transition-all ${t.type === "success"
            ? "bg-emerald-600 text-white border-emerald-700"
            : t.type === "error"
              ? "bg-rose-600 text-white border-rose-700"
              : "bg-slate-900 text-white border-slate-800"
            }`}
        >
          <div className="flex items-center gap-2">
            {t.type === "success" && <CheckCircle2 className="size-4 shrink-0 text-emerald-200" />}
            {t.type === "error" && <X className="size-4 shrink-0 text-rose-200" />}
            <span>{t.message}</span>
          </div>
          <button onClick={() => onDismiss(t.id)} className="opacity-70 hover:opacity-100 p-0.5">
            <X className="size-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const money = (v: number) => `Rs. ${v.toLocaleString("en-LK")}`;
const dateLabel = (v: string) => {
  if (!v) return "";
  const parts = v.split("-");
  if (parts.length === 3) {
    const day = parseInt(parts[2], 10);
    const m = parseInt(parts[1], 10);
    const month = MONTHS[m - 1] ?? parts[1];
    return `${day} ${month} ${parts[0]}`;
  }
  return v;
};

const getTodayStr = () => {
  if (typeof window !== "undefined") {
    try {
      const d = new Date();
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${y}-${m}-${day}`;
    } catch { }
  }
  return "2026-11-14";
};

const genOrderId = (existingOrders: Order[]) => {
  let maxNum = 1000;
  for (const o of existingOrders) {
    const match = o.id.match(/^ORD-(\d+)$/);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num > maxNum) maxNum = num;
    }
  }
  return `ORD-${maxNum + 1}`;
};

const getHandoverBadge = (deliveryDateStr: string) => {
  if (!deliveryDateStr) return null;
  const today = getTodayStr();
  if (deliveryDateStr === today) {
    return { label: "Handover Today", style: "bg-rose-50 text-rose-700 border-rose-200" };
  }
  try {
    const todayDate = new Date(today);
    const delDate = new Date(deliveryDateStr);
    const diffTime = delDate.getTime() - todayDate.getTime();
    const diffDays = Math.round(diffTime / (1000 * 3600 * 24));
    if (diffDays === 1) {
      return { label: "Tomorrow", style: "bg-amber-50 text-amber-700 border-amber-200" };
    } else if (diffDays < 0) {
      return { label: `${Math.abs(diffDays)}d Overdue`, style: "bg-red-50 text-red-700 border-red-200 font-bold" };
    } else if (diffDays <= 3) {
      return { label: `In ${diffDays} days`, style: "bg-blue-50 text-blue-700 border-blue-200" };
    }
  } catch { }
  return null;
};

function Badge({ status }: { status: string }) {
  const s = STATUS_STYLES[status as Status] ?? STATUS_STYLES.Pending;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold border ${s.bg} ${s.text} ${s.border}`}>
      <span className={`size-1.5 rounded-full ${s.dot}`} />
      {status}
    </span>
  );
}

function PaymentBadge({ amountPaid = 0, total }: { amountPaid?: number; total: number }) {
  if (total <= 0) return null;
  if (amountPaid >= total) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
        <CheckCircle2 className="size-3" /> PAID
      </span>
    );
  }
  if (amountPaid > 0) {
    const bal = total - amountPaid;
    return (
      <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
        Rs.{bal.toLocaleString("en-LK")} Due
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold bg-slate-100 text-slate-500 border border-slate-200">
      Unpaid
    </span>
  );
}

function StatusDropdown({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const s = STATUS_STYLES[value as Status] ?? STATUS_STYLES.Pending;
  return (
    <div className="relative inline-flex items-center">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`appearance-none cursor-pointer rounded-full pl-3 pr-7 py-1 text-[11px] font-semibold border outline-none focus:ring-2 focus:ring-amber-500/30 transition-all ${s.bg} ${s.text} ${s.border}`}
      >
        {STATUS_OPTIONS.map((opt) => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
      <ChevronDown className={`pointer-events-none absolute right-2 size-3 ${s.text}`} />
    </div>
  );
}

function PageHeader({ title, onMenu, action }: { title: string; onMenu?: () => void; action?: React.ReactNode }) {
  const [headerDate, setHeaderDate] = useState("");

  useEffect(() => {
    try {
      const now = new Date();
      setHeaderDate(
        new Intl.DateTimeFormat("en-LK", {
          weekday: "short",
          day: "numeric",
          month: "short",
          year: "numeric",
        }).format(now)
      );
    } catch { }
  }, []);

  return (
    <header className="flex min-h-[62px] sm:min-h-[72px] items-center justify-between border-b border-slate-200/80 bg-white/95 backdrop-blur-md px-4 sm:px-8 lg:px-10 sticky top-0 z-20 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
      <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
        <button
          className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 lg:hidden transition-colors active:scale-95"
          onClick={onMenu}
          aria-label="Open navigation"
        >
          <Menu className="size-5" />
        </button>
        <div className="min-w-0">
          {headerDate && <p className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-slate-400 truncate">{headerDate}</p>}
          <h1 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 truncate leading-tight">{title}</h1>
        </div>
      </div>
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        <div className="hidden sm:flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-600">
          <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="font-medium">Dhuniya Live</span>
        </div>
        <button
          className="relative flex size-9 items-center justify-center rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors active:scale-95"
          aria-label="Notifications"
        >
          <Bell className="size-[17px]" />
          <span className="absolute right-2 top-2 size-2 rounded-full bg-amber-500 ring-2 ring-white" />
        </button>
        {action}
      </div>
    </header>
  );
}

function useModalBackHandler(isOpen: boolean, onClose: () => void) {
  useEffect(() => {
    if (!isOpen) return;

    const modalStateKey = "modal_" + Math.random().toString(36).substring(2, 9);
    try {
      window.history.pushState({ [modalStateKey]: true }, "");
    } catch {}

    const handlePopState = () => {
      onClose();
    };

    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("popstate", handlePopState);
      try {
        if (window.history.state && window.history.state[modalStateKey]) {
          window.history.back();
        }
      } catch {}
    };
  }, [isOpen, onClose]);
}

function ConfirmDialog({ title, message, onConfirm, onCancel }: { title: string; message: string; onConfirm: () => void; onCancel: () => void }) {
  useModalBackHandler(true, onCancel);
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/50 backdrop-blur-xs p-4">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
        <div className="flex size-12 items-center justify-center rounded-full bg-rose-50 border border-rose-100 mx-auto">
          <Trash2 className="size-5 text-rose-600" />
        </div>
        <h3 className="mt-4 text-center text-lg font-bold text-slate-900">{title}</h3>
        <p className="mt-1.5 text-center text-sm text-slate-500">{message}</p>
        <div className="mt-6 flex gap-3">
          <button onClick={onCancel} className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors">
            Cancel
          </button>
          <button onClick={onConfirm} className="flex-1 rounded-xl bg-rose-600 py-2.5 text-sm font-semibold text-white hover:bg-rose-700 transition-colors shadow-xs">
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

function Sidebar({ active, setActive, open, setOpen, orderCount, customerCount = 0, onLogout }: {
  active: string; setActive: (v: string) => void; open: boolean; setOpen: (v: boolean) => void; orderCount: number; customerCount?: number; onLogout: () => void;
}) {
  const items = [
    { label: "Dashboard", Icon: LayoutDashboard, path: "/dashboard" },
    { label: "Orders", Icon: ClipboardList, path: "/orders" },
    { label: "Products", Icon: Package, path: "/products" },
    { label: "Customers", Icon: Users, path: "/customers" },
  ] as const;

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-xs lg:hidden transition-opacity"
          onClick={() => setOpen(false)}
        />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[280px] sm:w-[260px] flex-col border-r border-slate-800 bg-[#0f172a] text-slate-200 px-5 py-6 transition-transform duration-200 lg:translate-x-0 ${open ? "translate-x-0" : "-translate-x-full"
          }`}
      >
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-xl overflow-hidden bg-white/10 p-0.5 border border-white/15 shrink-0">
              <img src="/logo.jpg" alt="Dhuniya Products" className="size-full object-cover rounded-lg" />
            </div>
            <div>
              <p className="text-[17px] font-bold tracking-tight text-white leading-tight">Dhuniya Products</p>
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-amber-400">Eastern Traditional Sweets</p>
            </div>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="flex size-8 items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 lg:hidden transition-colors"
            aria-label="Close navigation"
          >
            <X className="size-5" />
          </button>
        </div>

        <p className="mt-8 px-2 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Workspace</p>

        <nav className="mt-3 flex flex-col gap-1.5">
          {items.map(({ label, Icon }) => {
            const isActive = active === label;
            return (
              <button
                key={label}
                onClick={() => { setActive(label); setOpen(false); }}
                className={`flex h-11 items-center gap-3 rounded-xl px-3.5 text-sm font-semibold transition-all ${isActive
                  ? "bg-amber-600 text-white shadow-md shadow-amber-600/30"
                  : "text-slate-400 hover:text-white hover:bg-slate-800/70"
                  }`}
              >
                <Icon className={`size-[18px] ${isActive ? "text-white" : "text-slate-400"}`} />
                <span>{label}</span>
                {label === "Orders" && (
                  <span
                    className={`ml-auto rounded-full px-2 py-0.5 text-[11px] font-bold ${isActive
                      ? "bg-amber-700 text-white"
                      : "bg-slate-800 text-amber-300 border border-slate-700"
                      }`}
                  >
                    {orderCount}
                  </span>
                )}
                {label === "Customers" && customerCount > 0 && (
                  <span
                    className={`ml-auto rounded-full px-2 py-0.5 text-[11px] font-bold ${isActive
                      ? "bg-amber-700 text-white"
                      : "bg-slate-800 text-slate-300 border border-slate-700"
                      }`}
                  >
                    {customerCount}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="mt-auto space-y-3">
          <button
            onClick={onLogout}
            className="flex w-full h-10 items-center gap-3 rounded-xl px-3.5 text-sm font-semibold text-slate-400 hover:text-rose-400 hover:bg-rose-900/20 transition-all"
          >
            <LogOut className="size-[18px]" />
            <span>Sign Out</span>
          </button>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-4">
            <div className="flex items-center gap-2 text-amber-400">
              <Factory className="size-4" />
              <span className="text-xs font-bold uppercase tracking-wider">Dhuniya Products</span>
            </div>
            <p className="mt-1 text-xs text-slate-400">Eastern Traditional Sweets · KDS/1597</p>
            <p className="mt-1 text-[11px] text-slate-500">138, France City, Maruthamunai</p>
          </div>
        </div>
      </aside>
    </>
  );
}

async function generateBillImage(order: Order, products: Product[]): Promise<{ blob: Blob; dataUrl: string }> {
  const items = getOrderItems(order);
  const rawLineItems = items.map((item) => {
    const prod = products.find((p) => p.id === item.productId);
    const unitPrice = item.rate ?? prod?.price ?? 0;
    const amount = item.qty * unitPrice;
    const isWhole = isWholeNumberUnit(prod?.unit);
    const displayQty = isWhole ? Math.round(Number(item.qty)) : item.qty;
    return {
      productId: item.productId,
      name: prod?.name ?? "Sweet Item",
      unit: prod?.unit ?? "kg",
      qty: displayQty as number,
      rate: unitPrice,
      amount,
    };
  });
  // Merge duplicate products (same productId) by summing qty & amount
  const lineItems = rawLineItems.reduce((acc, item) => {
    const existing = acc.find(i => i.productId === item.productId && i.name === item.name);
    if (existing) {
      existing.qty = existing.qty + item.qty;
      existing.amount += item.amount;
    } else {
      acc.push({ ...item });
    }
    return acc;
  }, [] as typeof rawLineItems);
  const total = lineItems.reduce((sum, item) => sum + item.amount, 0);
  const amtPaid = order.amountPaid ?? 0;
  const balance = Math.max(0, total - amtPaid);
  const isFullyPaid = amtPaid >= total && total > 0;
  const cleanNotes = parseDhuniyaData(order.notes).cleanNotes;

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas context unavailable");

  const width = 900;
  const rowHeight = 44;
  const baseHeight = 440;
  const notesHeight = cleanNotes ? 44 : 0;
  const totalHeight = baseHeight + (lineItems.length * rowHeight) + notesHeight;

  canvas.width = width;
  canvas.height = totalHeight;

  // Background
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, totalHeight);

  // Top Amber Header Stripe
  const topGrad = ctx.createLinearGradient(0, 0, width, 0);
  topGrad.addColorStop(0, "#d97706");
  topGrad.addColorStop(1, "#b45309");
  ctx.fillStyle = topGrad;
  ctx.fillRect(0, 0, width, 8);

  // Dhuniya Products Official Branding
  ctx.fillStyle = "#78350f";
  ctx.font = "bold 34px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  ctx.fillText("DHUNIYA PRODUCTS", 48, 62);

  ctx.fillStyle = "#b45309";
  ctx.font = "bold 14px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  ctx.fillText("EASTERN TRADITIONAL SWEETS · REG: KDS/1597", 48, 88);

  ctx.fillStyle = "#64748b";
  ctx.font = "14px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  ctx.fillText("Mobile: 0756656135 · 138, France City, Maruthamunai", 48, 112);

  // Bill Badge on top right
  ctx.fillStyle = "#fef3c7";
  ctx.beginPath();
  ctx.roundRect(width - 240, 36, 192, 34, 8);
  ctx.fill();
  ctx.strokeStyle = "#fde68a";
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.fillStyle = "#92400e";
  ctx.font = "bold 13px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("CUSTOMER INVOICE", width - 240 + 96, 58);
  ctx.textAlign = "left";

  // Divider
  ctx.strokeStyle = "#e2e8f0";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(48, 134);
  ctx.lineTo(width - 48, 134);
  ctx.stroke();

  // Customer & Bill Date (Only customer name & today's date)
  ctx.fillStyle = "#94a3b8";
  ctx.font = "bold 12px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  ctx.fillText("CUSTOMER NAME", 48, 162);
  ctx.fillText("BILL DATE", width - 240, 162);

  ctx.fillStyle = "#0f172a";
  ctx.font = "bold 24px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  ctx.fillText(order.customer, 48, 192);

  ctx.font = "bold 18px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  ctx.fillText(dateLabel(getTodayStr()), width - 240, 192);

  let currentY = 216;
  if (cleanNotes) {
    ctx.fillStyle = "#fffbeb";
    ctx.beginPath();
    ctx.roundRect(48, currentY, width - 96, 32, 6);
    ctx.fill();
    ctx.strokeStyle = "#fef3c7";
    ctx.stroke();

    ctx.fillStyle = "#92400e";
    ctx.font = "12px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    ctx.fillText(`Special Note: ${cleanNotes}`, 58, currentY + 21);
    currentY += 44;
  }

  // Items Table Header
  currentY += 10;
  ctx.fillStyle = "#f1f5f9";
  ctx.beginPath();
  ctx.roundRect(48, currentY, width - 96, 36, 6);
  ctx.fill();

  ctx.fillStyle = "#475569";
  ctx.font = "bold 12px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  ctx.fillText("#", 64, currentY + 23);
  ctx.fillText("SWEET PRODUCT", 110, currentY + 23);

  ctx.textAlign = "right";
  ctx.fillText("QUANTITY", width - 320, currentY + 23);
  ctx.fillText("RATE", width - 180, currentY + 23);
  ctx.fillText("AMOUNT", width - 68, currentY + 23);
  ctx.textAlign = "left";

  currentY += 36;

  // Items Rows
  lineItems.forEach((item, idx) => {
    if (idx % 2 === 1) {
      ctx.fillStyle = "#f8fafc";
      ctx.fillRect(48, currentY, width - 96, rowHeight);
    }

    ctx.strokeStyle = "#f1f5f9";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(48, currentY + rowHeight);
    ctx.lineTo(width - 48, currentY + rowHeight);
    ctx.stroke();

    ctx.fillStyle = "#64748b";
    ctx.font = "bold 13px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    ctx.fillText(String(idx + 1), 64, currentY + 27);

    ctx.fillStyle = "#0f172a";
    ctx.font = "bold 15px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    ctx.fillText(item.name, 110, currentY + 27);

    ctx.textAlign = "right";
    ctx.fillStyle = "#334155";
    ctx.font = "bold 14px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    ctx.fillText(`${item.qty} ${item.unit}`, width - 320, currentY + 27);

    ctx.fillStyle = "#64748b";
    ctx.font = "14px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    ctx.fillText(money(item.rate), width - 180, currentY + 27);

    ctx.fillStyle = "#0f172a";
    ctx.font = "bold 15px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    ctx.fillText(money(item.amount), width - 68, currentY + 27);
    ctx.textAlign = "left";

    currentY += rowHeight;
  });

  // Grand Total & Payment Summary
  currentY += 20;
  ctx.strokeStyle = "#0f172a";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(width - 360, currentY);
  ctx.lineTo(width - 48, currentY);
  ctx.stroke();

  currentY += 28;
  ctx.fillStyle = "#0f172a";
  ctx.font = "bold 16px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  ctx.fillText("Grand Total:", width - 360, currentY);

  ctx.textAlign = "right";
  ctx.fillStyle = "#b45309";
  ctx.font = "bold 26px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  ctx.fillText(money(total), width - 48, currentY + 2);
  ctx.textAlign = "left";

  if (isFullyPaid) {
    currentY += 34;
    ctx.fillStyle = "#ecfdf5";
    ctx.beginPath();
    ctx.roundRect(width - 360, currentY - 18, 312, 34, 6);
    ctx.fill();
    ctx.strokeStyle = "#a7f3d0";
    ctx.stroke();

    ctx.textAlign = "center";
    ctx.fillStyle = "#047857";
    ctx.font = "bold 14px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    ctx.fillText("✓ PAID IN FULL", width - 360 + 156, currentY + 4);
    ctx.textAlign = "left";
  } else if (amtPaid > 0) {
    currentY += 28;
    ctx.fillStyle = "#64748b";
    ctx.font = "14px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    ctx.fillText("Advance Paid:", width - 360, currentY);

    ctx.textAlign = "right";
    ctx.fillStyle = "#059669";
    ctx.font = "bold 14px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    ctx.fillText(money(amtPaid), width - 48, currentY);
    ctx.textAlign = "left";

    currentY += 26;
    ctx.fillStyle = "#be123c";
    ctx.font = "bold 14px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    ctx.fillText("Balance Due:", width - 360, currentY);

    ctx.textAlign = "right";
    ctx.fillText(money(balance), width - 48, currentY);
    ctx.textAlign = "left";
  } else {
    currentY += 26;
    ctx.textAlign = "right";
    ctx.fillStyle = "#64748b";
    ctx.font = "italic 13px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    ctx.fillText("Payment Due on Receipt", width - 48, currentY);
    ctx.textAlign = "left";
  }

  // Footer Note
  const footerY = totalHeight - 26;
  ctx.strokeStyle = "#e2e8f0";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(48, footerY - 18);
  ctx.lineTo(width - 48, footerY - 18);
  ctx.stroke();

  ctx.textAlign = "center";
  ctx.fillStyle = "#94a3b8";
  ctx.font = "italic 13px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  ctx.fillText("Thank you for choosing Dhuniya Products! Sweetening your special moments.", width / 2, footerY);
  ctx.textAlign = "left";

  const dataUrl = canvas.toDataURL("image/png");
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Canvas blob failed"))), "image/png");
  });

  return { blob, dataUrl };
}

function Invoice({ order, products, onClose }: {
  order: Order; products: Product[]; onClose: () => void;
}) {
  useModalBackHandler(true, onClose);
  const [isGenerating, setIsGenerating] = useState(false);
  const items = getOrderItems(order);
  const rawLineItems = items.map((item) => {
    const prod = products.find((p) => p.id === item.productId);
    const unitPrice = item.rate ?? prod?.price ?? 0;
    const amount = item.qty * unitPrice;
    const isWhole = isWholeNumberUnit(prod?.unit);
    const displayQty = isWhole ? Math.round(Number(item.qty)) : item.qty;
    return {
      product: prod,
      productId: item.productId,
      name: prod?.name ?? "Sweet Item",
      unit: prod?.unit ?? "kg",
      qty: displayQty as number,
      rate: unitPrice,
      amount,
    };
  });
  // Merge duplicate products (same productId) by summing qty & amount
  const lineItems = rawLineItems.reduce((acc, item) => {
    const existing = acc.find(i => i.productId === item.productId && i.name === item.name);
    if (existing) {
      existing.qty = existing.qty + item.qty;
      existing.amount += item.amount;
    } else {
      acc.push({ ...item });
    }
    return acc;
  }, [] as typeof rawLineItems);
  const total = lineItems.reduce((sum, item) => sum + item.amount, 0);

  const handleSaveImage = async () => {
    setIsGenerating(true);
    try {
      const { dataUrl } = await generateBillImage(order, products);
      const safeName = order.customer.trim().replace(/[^a-zA-Z0-9]/g, "_");
      const fileName = `Dhuniya-Bill-${safeName}.png`;
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err) {
      console.error("Failed to generate bill image:", err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleShareBill = async () => {
    setIsGenerating(true);
    try {
      const { blob, dataUrl } = await generateBillImage(order, products);
      const safeName = order.customer.trim().replace(/[^a-zA-Z0-9]/g, "_");
      const fileName = `Dhuniya-Bill-${safeName}.png`;
      const file = new File([blob], fileName, { type: "image/png" });

      if (typeof navigator !== "undefined" && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: `Dhuniya Bill - ${order.customer}`,
          text: `Customer Bill for ${order.customer} · Total: ${money(total)}`,
          files: [file],
        });
      } else {
        const a = document.createElement("a");
        a.href = dataUrl;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
    } catch (err: any) {
      if (err.name !== "AbortError") {
        console.error("Failed to share bill image:", err);
      }
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="invoice-modal-overlay fixed inset-0 z-50 overflow-y-auto bg-slate-950/60 p-2.5 sm:p-4 backdrop-blur-xs flex items-center justify-center" onClick={onClose}>
      <div className="invoice-card my-auto w-full max-w-[680px] max-h-[92vh] flex flex-col rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
        {/* Fully Responsive Header Bar */}
        <div className="shrink-0 border-b border-slate-200 p-3.5 sm:px-6 sm:py-4 bg-slate-50 space-y-2.5 sm:space-y-0">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0 flex-1">
              <p className="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-amber-600">Customer Bill</p>
              <h2 className="text-base sm:text-lg font-black text-slate-900 truncate leading-tight">{order.customer}</h2>
            </div>

            {/* Desktop Action Buttons + Close */}
            <div className="hidden sm:flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={isGenerating}
                onClick={handleShareBill}
                className="border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 text-xs font-bold h-8 px-3 gap-1.5 transition-colors"
                title="Share bill image to WhatsApp or other apps"
              >
                <Share2 className="size-3.5 text-emerald-700" />
                <span>Share Bill</span>
              </Button>
              <Button
                size="sm"
                disabled={isGenerating}
                onClick={handleSaveImage}
                className="bg-amber-600 text-white hover:bg-amber-700 text-xs font-bold h-8 px-3 gap-1.5 shadow-xs transition-colors"
                title="Download bill image (PNG)"
              >
                <ImageIcon className="size-3.5" />
                <span>{isGenerating ? "Saving..." : "Save Image"}</span>
              </Button>
              <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition-colors" aria-label="Close bill">
                <X className="size-4" />
              </button>
            </div>

            {/* Mobile Close Button (top-right) */}
            <button onClick={onClose} className="sm:hidden rounded-lg p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition-colors" aria-label="Close bill">
              <X className="size-4" />
            </button>
          </div>

          {/* Mobile Action Buttons (Two full-width responsive buttons, never overflows) */}
          <div className="flex sm:hidden items-center gap-2 pt-0.5">
            <Button
              size="sm"
              variant="outline"
              disabled={isGenerating}
              onClick={handleShareBill}
              className="flex-1 border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 text-xs font-bold h-8.5 px-2 gap-1.5 justify-center shadow-2xs"
            >
              <Share2 className="size-3.5 text-emerald-700" />
              <span>Share Bill</span>
            </Button>
            <Button
              size="sm"
              disabled={isGenerating}
              onClick={handleSaveImage}
              className="flex-1 bg-amber-600 text-white hover:bg-amber-700 text-xs font-bold h-8.5 px-2 gap-1.5 shadow-2xs justify-center"
            >
              <ImageIcon className="size-3.5" />
              <span>{isGenerating ? "Saving..." : "Save Image"}</span>
            </Button>
          </div>
        </div>

        {/* Clean Bill Content (Only Customer Name, Today's Date, Sweets Table, and Bill Total) */}
        <article className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {/* Customer & Date Line (NO phone, NO address, NO handover schedule, NO status) */}
          <div className="flex items-center justify-between gap-3 border-b border-slate-200 pb-3">
            <div className="min-w-0">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Customer Name</span>
              <h3 className="text-lg sm:text-xl font-black text-slate-900 truncate leading-tight">{order.customer}</h3>
              {order.notes && parseDhuniyaData(order.notes).cleanNotes && (
                <p className="mt-1 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-0.5 inline-block">
                  Note: {parseDhuniyaData(order.notes).cleanNotes}
                </p>
              )}
            </div>

            <div className="text-right shrink-0">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Date</span>
              <p className="text-sm sm:text-base font-extrabold text-slate-900">{dateLabel(getTodayStr())}</p>
            </div>
          </div>

          {/* Mobile Ordered Products Card View */}
          <div className="sm:hidden space-y-2">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Ordered Sweets ({lineItems.length})</p>
            {lineItems.map((item, idx) => (
              <div key={idx} className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 space-y-1.5">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-bold text-slate-900">{item.name}</p>
                  <p className="text-sm font-extrabold text-slate-900">{money(item.amount)}</p>
                </div>
                <div className="flex items-center justify-between text-xs text-slate-600 font-medium">
                  <span>Quantity: <strong className="text-slate-900">{item.qty} {item.unit}</strong></span>
                  <span>Rate: <strong className="text-slate-900">{money(item.rate)}</strong> / {item.unit}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop Table View */}
          <div className="hidden sm:block">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">Ordered Sweets ({lineItems.length})</p>
            <div className="overflow-hidden rounded-xl border border-slate-200">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-3.5 py-2.5">Sweet Product</th>
                    <th className="px-3.5 py-2.5 text-right">Quantity</th>
                    <th className="px-3.5 py-2.5 text-right">Rate</th>
                    <th className="px-3.5 py-2.5 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {lineItems.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50">
                      <td className="px-3.5 py-2.5 font-bold text-slate-900">{item.name}</td>
                      <td className="px-3.5 py-2.5 text-right font-medium text-slate-700">{item.qty} {item.unit}</td>
                      <td className="px-3.5 py-2.5 text-right text-slate-600">{money(item.rate)}</td>
                      <td className="px-3.5 py-2.5 text-right font-black text-slate-900">{money(item.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Grand Total & Payment Summary */}
          <div className="flex justify-end pt-2">
            <div className="w-full sm:max-w-[300px] rounded-xl border border-slate-200 bg-slate-50/80 p-3.5 space-y-2">
              <div className="flex items-center justify-between text-sm sm:text-base font-bold text-slate-900">
                <span>Grand Total:</span>
                <span className="text-xl sm:text-2xl font-black text-amber-600">{money(total)}</span>
              </div>
              {(() => {
                const amtPaid = order.amountPaid ?? 0;
                const balance = Math.max(0, total - amtPaid);
                const isFullyPaid = amtPaid >= total && total > 0;
                return isFullyPaid ? (
                  <div className="rounded-lg bg-emerald-100/70 border border-emerald-300 px-3 py-1.5 text-center">
                    <p className="text-xs font-black text-emerald-800 tracking-wider">✓ PAID IN FULL</p>
                  </div>
                ) : amtPaid > 0 ? (
                  <>
                    <div className="flex items-center justify-between text-xs text-slate-600 pt-1 border-t border-slate-200/80">
                      <span>Advance Paid:</span>
                      <span className="font-bold text-emerald-700">{money(amtPaid)}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs font-bold border-t border-slate-200/80 pt-1">
                      <span className="text-rose-700">Balance Due:</span>
                      <span className="text-rose-700 text-sm font-black">{money(balance)}</span>
                    </div>
                  </>
                ) : (
                  <p className="text-xs text-slate-500 text-right pt-1 border-t border-slate-200/80">Payment Due on Receipt</p>
                );
              })()}
            </div>
          </div>
        </article>
      </div>
    </div>
  );
}

// --- Product Modal with Cloudinary Upload ---
type ProductFormData = {
  name: string;
  nameTamil?: string;
  nameSinhala?: string;
  unit: string;
  price: string;
  active: boolean;
  imageUrl?: string;
  images?: string[];
  description?: string;
  contents?: string;
};

function ProductModal({ initial, onSave, onClose }: {
  initial?: Product;
  onSave: (data: ProductFormData) => void;
  onClose: () => void;
}) {
  useModalBackHandler(true, onClose);
  const [form, setForm] = useState<ProductFormData>({
    name: initial?.name ?? "",
    nameTamil: initial?.nameTamil ?? "",
    nameSinhala: initial?.nameSinhala ?? "",
    unit: initial?.unit ?? "kg",
    price: initial?.price?.toString() ?? "",
    active: initial?.active ?? true,
    imageUrl: initial?.imageUrl ?? "",
    images: initial?.images ?? [],
    description: initial?.description ?? "",
    contents: initial?.contents ?? "",
  });
  const [errors, setErrors] = useState<Partial<ProductFormData>>({});

  // Multi-image gallery upload state
  const [galleryUploading, setGalleryUploading] = useState<{ name: string; progress: "uploading" | "done" | "error" }[]>([]);
  const [galleryDragOver, setGalleryDragOver] = useState(false);
  const galleryInputRef = useRef<HTMLInputElement | null>(null);

  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

  const uploadFilesToGallery = async (files: File[]) => {
    if (!cloudName || !uploadPreset) return;
    const validFiles = files.filter((f) => f.type.startsWith("image/") && f.size <= 10 * 1024 * 1024);
    if (validFiles.length === 0) return;

    // Add placeholders immediately
    setGalleryUploading((prev) => [
      ...prev,
      ...validFiles.map((f) => ({ name: f.name, progress: "uploading" as const })),
    ]);

    // Upload all in parallel
    await Promise.all(
      validFiles.map(async (file) => {
        try {
          const fd = new FormData();
          fd.append("file", file);
          fd.append("upload_preset", uploadPreset);
          fd.append("folder", "dhuniya-products");
          const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
            method: "POST", body: fd,
          });
          if (!res.ok) throw new Error();
          const data = await res.json();
          // Add to form images
          setForm((prev) => ({ ...prev, images: [...(prev.images ?? []), data.secure_url as string] }));
          setGalleryUploading((prev) =>
            prev.map((p) => p.name === file.name && p.progress === "uploading" ? { ...p, progress: "done" } : p)
          );
        } catch {
          setGalleryUploading((prev) =>
            prev.map((p) => p.name === file.name && p.progress === "uploading" ? { ...p, progress: "error" } : p)
          );
        }
      })
    );

    // Clean up completed placeholders after a short delay
    setTimeout(() => {
      setGalleryUploading((prev) => prev.filter((p) => p.progress !== "done"));
    }, 1500);
  };

  const validate = () => {
    const e: Partial<ProductFormData> = {};
    if (!form.name.trim()) e.name = "Name is required";
    if (!form.price || isNaN(Number(form.price)) || Number(form.price) <= 0) e.price = "Valid price required";
    return e;
  };

  const submit = () => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    onSave(form);
  };

  const removeGalleryImage = (idx: number) => {
    setForm((prev) => ({ ...prev, images: (prev.images ?? []).filter((_, i) => i !== idx) }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 backdrop-blur-xs p-3 sm:p-4">
      <div className="my-auto w-full max-w-md max-h-[92vh] flex flex-col rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden">
        <div className="shrink-0 flex items-center justify-between border-b border-slate-200 px-4 py-3.5 sm:px-6 sm:py-5 bg-slate-50">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-amber-600">{initial ? "Edit" : "New"} Sweet</p>
            <h3 className="mt-0.5 text-base sm:text-lg font-bold text-slate-900">{initial ? "Update Sweet Details" : "Add Sweet to Catalog"}</h3>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200"><X className="size-4" /></button>
        </div>
        <div className="flex-1 overflow-y-auto space-y-4 px-4 py-5 sm:px-6 sm:py-6">

          {/* Core Fields */}
          <div>
            <label className="mb-1.5 block text-xs font-bold text-slate-700">Sweet Name (English) *</label>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Musket Halwa"
              className={`w-full rounded-xl border px-3.5 py-2.5 text-sm outline-none focus:border-amber-600 focus:ring-2 focus:ring-amber-500/20 transition-all ${errors.name ? "border-rose-400 bg-rose-50/30" : "border-slate-300"}`}
            />
            {errors.name && <p className="mt-1 text-xs text-rose-600">{errors.name}</p>}
          </div>

          {/* Multilanguage names — public page only */}
          <div className="rounded-xl border border-amber-100 bg-amber-50/50 p-3 space-y-3">
            <p className="text-[11px] font-bold uppercase tracking-wider text-amber-700">Public Page · Multilanguage Names</p>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">Tamil Name <span className="font-normal text-slate-400">(optional)</span></label>
              <input
                value={form.nameTamil}
                onChange={(e) => setForm({ ...form, nameTamil: e.target.value })}
                placeholder="e.g. ககோதம்"
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm outline-none focus:border-amber-600 focus:ring-2 focus:ring-amber-500/20"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">Sinhala Name <span className="font-normal text-slate-400">(optional)</span></label>
              <input
                value={form.nameSinhala}
                onChange={(e) => setForm({ ...form, nameSinhala: e.target.value })}
                placeholder="e.g. ගෝදම්"
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm outline-none focus:border-amber-600 focus:ring-2 focus:ring-amber-500/20"
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-bold text-slate-700">Unit of Measurement</label>
            <select
              value={form.unit}
              onChange={(e) => setForm({ ...form, unit: e.target.value })}
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm outline-none focus:border-amber-600 focus:ring-2 focus:ring-amber-500/20"
            >
              <option value="kg">kg (Kilogram)</option>
              <option value="g">g (Gram)</option>
              <option value="pcs">pcs (Pieces)</option>
              <option value="box">box (Standard Box)</option>
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-bold text-slate-700">Selling Price (Rs. per {form.unit}) *</label>
            <input
              type="number"
              value={form.price}
              onChange={(e) => setForm({ ...form, price: e.target.value })}
              placeholder="1200"
              className={`w-full rounded-xl border px-3.5 py-2.5 text-sm outline-none focus:border-amber-600 focus:ring-2 focus:ring-amber-500/20 transition-all ${errors.price ? "border-rose-400 bg-rose-50/30" : "border-slate-300"}`}
            />
            {errors.price && <p className="mt-1 text-xs text-rose-600">{errors.price}</p>}
          </div>

          {/* Public page details */}
          <div className="rounded-xl border border-blue-100 bg-blue-50/40 p-3 space-y-3">
            <p className="text-[11px] font-bold uppercase tracking-wider text-blue-700">Public Page · Details (customers see these)</p>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">Description</label>
              <textarea
                rows={3}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="e.g. Traditional slow-cooked musket halwa prepared with pure ghee, cashews, and aromatic spices."
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm outline-none focus:border-amber-600 focus:ring-2 focus:ring-amber-500/20 resize-none placeholder:text-slate-400"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">Ingredients / Contents</label>
              <textarea
                rows={2}
                value={form.contents}
                onChange={(e) => setForm({ ...form, contents: e.target.value })}
                placeholder="e.g. Pure ghee, whole milk, sugar, cashews, cardamom, food colour."
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm outline-none focus:border-amber-600 focus:ring-2 focus:ring-amber-500/20 resize-none placeholder:text-slate-400"
              />
            </div>
          </div>

          {/* Main image */}
          <div>
            <label className="mb-1.5 block text-xs font-bold text-slate-700">Main Product Image</label>
            <CloudinaryUpload
              value={form.imageUrl}
              onChange={(url) => setForm({ ...form, imageUrl: url })}
              onClear={() => setForm({ ...form, imageUrl: "" })}
            />
          </div>

          {/* Extra gallery images with multi-upload support */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-slate-700">
                Extra Gallery Images <span className="font-normal text-slate-400">({(form.images ?? []).length} added)</span>
              </label>
              {(form.images ?? []).length > 0 && (
                <button
                  type="button"
                  onClick={() => setForm((prev) => ({ ...prev, images: [] }))}
                  className="text-[11px] font-semibold text-rose-600 hover:underline"
                >
                  Clear all
                </button>
              )}
            </div>

            {(form.images ?? []).length > 0 && (
              <div className="mb-2.5 grid grid-cols-3 sm:grid-cols-4 gap-2">
                {(form.images ?? []).map((url, i) => (
                  <div key={i} className="group relative rounded-xl overflow-hidden border border-slate-200 aspect-square bg-slate-50">
                    <img src={url} alt="" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removeGalleryImage(i)}
                      className="absolute top-1 right-1 flex size-6 items-center justify-center rounded-full bg-rose-600 text-white hover:bg-rose-700 shadow-sm transition-colors"
                      title="Remove image"
                    >
                      <X className="size-3.5" />
                    </button>
                    <span className="absolute bottom-1 left-1 rounded bg-black/60 px-1 text-[9px] font-bold text-white">
                      #{i + 1}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Active uploading progress list */}
            {galleryUploading.length > 0 && (
              <div className="mb-2.5 space-y-1.5">
                {galleryUploading.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between gap-2 rounded-lg bg-amber-50 border border-amber-200/80 px-3 py-1.5 text-xs">
                    <span className="truncate text-slate-700 font-medium">{item.name}</span>
                    <span className="shrink-0 font-bold text-amber-700">
                      {item.progress === "uploading" ? "Uploading…" : item.progress === "done" ? "✓ Done" : "✕ Failed"}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Drag & drop multi-file picker */}
            <div
              onClick={() => galleryInputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setGalleryDragOver(true); }}
              onDragLeave={() => setGalleryDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setGalleryDragOver(false);
                if (e.dataTransfer.files?.length) {
                  uploadFilesToGallery(Array.from(e.dataTransfer.files));
                }
              }}
              className={`flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-5 cursor-pointer transition-all duration-200 ${
                galleryDragOver
                  ? "border-amber-500 bg-amber-50"
                  : "border-slate-300 hover:border-amber-400 hover:bg-amber-50/40"
              }`}
            >
              <div className="flex size-10 items-center justify-center rounded-xl bg-amber-100 text-amber-800">
                <PackagePlus className="size-5" />
              </div>
              <div className="text-center">
                <p className="text-xs font-bold text-slate-700">
                  Click to select multiple images or drag &amp; drop
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">Select multiple photos at once (PNG, JPG, WebP)</p>
              </div>
              <input
                ref={galleryInputRef}
                type="file"
                multiple
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files?.length) {
                    uploadFilesToGallery(Array.from(e.target.files));
                    e.target.value = "";
                  }
                }}
              />
            </div>
          </div>

          {/* Active Status */}
          <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-3.5 sm:p-4">
            <div>
              <p className="text-sm font-bold text-slate-800">Active Status</p>
              <p className="text-xs text-slate-500">Enable this sweet in new order dropdowns</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={form.active}
              onClick={() => setForm({ ...form, active: !form.active })}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 ${form.active ? "bg-amber-600" : "bg-slate-300"}`}
            >
              <span className={`pointer-events-none inline-block size-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${form.active ? "translate-x-5" : "translate-x-0"}`} />
            </button>
          </div>
        </div>
        <div className="shrink-0 flex gap-3 border-t border-slate-200 px-4 py-3.5 sm:px-6 sm:py-4 bg-slate-50">
          <button onClick={onClose} className="flex-1 rounded-xl border border-slate-300 py-2.5 text-sm font-semibold text-slate-700 hover:bg-white transition-colors">Cancel</button>
          <button onClick={submit} className="flex-1 rounded-xl bg-amber-600 py-2.5 text-sm font-semibold text-white hover:bg-amber-700 shadow-xs transition-colors">
            {initial ? "Update Sweet" : "Add Sweet"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ProductsPage({ products, orders, onAdd, onEdit, onDelete, onViewProductOrders, onOpenSidebar }: {
  products: Product[];
  orders: Order[];
  onAdd: (data: ProductFormData) => void;
  onEdit: (id: number, data: ProductFormData) => void;
  onDelete: (id: number) => void;
  onViewProductOrders: (productId: number) => void;
  onOpenSidebar?: () => void;
}) {
  const [showModal, setShowModal] = useState(false);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [query, setQuery] = useState("");

  const sortedProducts = useMemo(() => {
    let list = [...products].sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
    );

    if (query.trim()) {
      const q = query.toLowerCase().trim();
      list = list.filter((p) =>
        p.name.toLowerCase().includes(q) || (p.description && p.description.toLowerCase().includes(q))
      );
    }
    return list;
  }, [products, query]);

  return (
    <>
      <PageHeader
        title="Products"
        onMenu={onOpenSidebar}
        action={
          <Button
            onClick={() => setShowModal(true)}
            className="bg-amber-600 text-white hover:bg-amber-700 gap-1.5 shadow-sm text-xs sm:text-sm h-9 sm:h-10 px-3 sm:px-4"
          >
            <Plus className="size-4" /> <span className="hidden xs:inline">New Sweet</span><span className="xs:hidden">Add</span>
          </Button>
        }
      />
      <div className="mx-auto max-w-[1250px] px-3.5 py-4 sm:px-6 sm:py-6 lg:px-10">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 border-b border-slate-200/80 pb-4">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-amber-600">Sweet Catalog</span>
            <h2 className="mt-0.5 text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900">Products & Production Demand</h2>
            <p className="mt-0.5 text-xs text-slate-500">Manage sweet catalog, standard rates, and live customer orders in production.</p>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <span className="inline-flex items-center gap-1 rounded-lg bg-amber-50 border border-amber-200/80 px-2.5 py-1 text-xs font-bold text-amber-800">
              A → Z Alphabetical
            </span>
            <span className="text-xs font-semibold text-slate-500">
              {sortedProducts.length} product{sortedProducts.length !== 1 ? "s" : ""}
            </span>
          </div>
        </div>

        {/* Search Toolbar */}
        <div className="mt-3.5 flex items-center gap-2">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-slate-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search sweet name or description..."
              className="w-full rounded-xl border border-slate-200 bg-white pl-9 pr-8 py-2 text-xs sm:text-sm font-medium outline-none focus:border-amber-600 focus:ring-2 focus:ring-amber-500/20 shadow-2xs"
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>
        </div>

        {products.length === 0 ? (
          <div className="mt-6 flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-white py-14 text-center p-4">
            <PackagePlus className="size-10 text-amber-600" />
            <p className="mt-3 text-base font-bold text-slate-800">No sweet products in catalog</p>
            <p className="mt-1 text-xs text-slate-500">Add your first sweet to start taking orders.</p>
            <button onClick={() => setShowModal(true)} className="mt-4 rounded-xl bg-amber-600 px-4 py-2 text-xs font-semibold text-white hover:bg-amber-700 shadow-sm">
              Add Sweet Product
            </button>
          </div>
        ) : sortedProducts.length === 0 ? (
          <div className="mt-6 flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white py-12 text-center p-4">
            <p className="text-sm font-bold text-slate-800">No sweets matching &ldquo;{query}&rdquo;</p>
            <button onClick={() => setQuery("")} className="mt-2 text-xs font-semibold text-amber-700 hover:underline">
              Clear search filter
            </button>
          </div>
        ) : (
          <div className="mt-4">
            {/* Mobile Line-by-Line List View */}
            <div className="block sm:hidden space-y-2">
              {sortedProducts.map((p) => {
                const activeOrders = orders.filter((o) => getOrderItems(o).some((it) => it.productId === p.id) && !["Completed", "Cancelled"].includes(o.status));
                const isWhole = isWholeNumberUnit(p.unit);
                const totalOrdered = activeOrders.reduce((sum, o) => {
                  const it = getOrderItems(o).find((i) => i.productId === p.id);
                  return sum + (Number(it?.qty) || 0);
                }, 0);
                const displayDemand = isWhole ? Math.round(totalOrdered) : totalOrdered.toFixed(1);

                return (
                  <div key={p.id} className="rounded-xl border border-slate-200 bg-white p-2.5 shadow-2xs hover:border-amber-300 transition-all flex items-center justify-between gap-2.5">
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      {p.imageUrl ? (
                        <img src={optimizeImageUrl(p.imageUrl, 80)} alt={p.name} loading="lazy" decoding="async" className="size-11 shrink-0 rounded-lg object-cover border border-amber-300/40" />
                      ) : (
                        <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-amber-100 to-amber-200 text-amber-900 font-bold text-xs border border-amber-300/40">
                          {p.name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-bold text-slate-900 text-sm truncate leading-tight">{p.name}</span>
                          <span className={`inline-flex items-center rounded-md px-1.5 py-0.2 text-[9px] font-bold border ${p.active ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-slate-100 text-slate-500 border-slate-200"}`}>
                            {p.active ? "Active" : "Archived"}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5 text-xs flex-wrap">
                          <span className="font-bold text-amber-700">{money(p.price)} <span className="font-normal text-slate-400">/ {p.unit}</span></span>
                          {activeOrders.length > 0 ? (
                            <button
                              onClick={() => onViewProductOrders(p.id)}
                              className="inline-flex items-center gap-0.5 text-[11px] font-bold text-amber-600 hover:text-amber-800 hover:underline"
                            >
                              <span>• {displayDemand} {p.unit} ({activeOrders.length} ord)</span>
                              <ChevronRight className="size-3" />
                            </button>
                          ) : (
                            <span className="text-[11px] text-slate-400">• 0 demand</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => setEditProduct(p)}
                        className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
                        title="Edit sweet"
                      >
                        <Edit2 className="size-3.5" />
                      </button>
                      <button
                        onClick={() => setDeleteId(p.id)}
                        className="p-1.5 rounded-lg border border-slate-200 text-slate-400 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 transition-colors"
                        title="Delete sweet"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop Line-by-Line Table View */}
            <div className="hidden sm:block overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Sweet Product (A → Z)</th>
                      <th className="px-4 py-3">Standard Rate</th>
                      <th className="px-4 py-3">Active Production Demand</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {sortedProducts.map((p) => {
                      const activeOrders = orders.filter((o) => getOrderItems(o).some((it) => it.productId === p.id) && !["Completed", "Cancelled"].includes(o.status));
                      const isWhole = isWholeNumberUnit(p.unit);
                      const totalOrdered = activeOrders.reduce((sum, o) => {
                        const it = getOrderItems(o).find((i) => i.productId === p.id);
                        return sum + (Number(it?.qty) || 0);
                      }, 0);
                      const displayDemand = isWhole ? Math.round(totalOrdered) : totalOrdered.toFixed(2);

                      return (
                        <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="px-4 py-2.5">
                            <div className="flex items-center gap-3">
                              {p.imageUrl ? (
                                <img src={optimizeImageUrl(p.imageUrl, 80)} alt={p.name} loading="lazy" decoding="async" className="size-9 shrink-0 rounded-lg object-cover border border-amber-300/40" />
                              ) : (
                                <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-800 font-bold text-xs">
                                  {p.name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()}
                                </div>
                              )}
                              <div className="min-w-0 max-w-xs">
                                <span className="font-bold text-slate-900 block truncate text-sm">{p.name}</span>
                                {p.description && (
                                  <span className="text-[11px] text-slate-400 block truncate">{p.description}</span>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-2.5 font-bold text-slate-900 text-sm whitespace-nowrap">
                            {money(p.price)}
                            <span className="ml-1 text-[11px] font-normal text-slate-400">/ {p.unit}</span>
                          </td>
                          <td className="px-4 py-2.5 whitespace-nowrap">
                            {activeOrders.length > 0 ? (
                              <div>
                                <p className="font-bold text-slate-900 text-xs">{displayDemand} {p.unit}</p>
                                <button onClick={() => onViewProductOrders(p.id)} className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-amber-600 hover:text-amber-800 hover:underline">
                                  <span>{activeOrders.length} order{activeOrders.length !== 1 ? "s" : ""}</span>
                                  <ChevronRight className="size-3" />
                                </button>
                              </div>
                            ) : (
                              <span className="text-xs text-slate-400">No active orders</span>
                            )}
                          </td>
                          <td className="px-4 py-2.5 whitespace-nowrap">
                            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold border ${p.active ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-slate-100 text-slate-500 border-slate-200"}`}>
                              <span className={`size-1.5 rounded-full ${p.active ? "bg-emerald-500" : "bg-slate-400"}`} />
                              {p.active ? "Active" : "Archived"}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1.5">
                              <button onClick={() => setEditProduct(p)} className="rounded-lg border border-slate-200 p-1.5 text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors" title="Edit sweet">
                                <Edit2 className="size-3.5" />
                              </button>
                              <button onClick={() => setDeleteId(p.id)} className="rounded-lg border border-slate-200 p-1.5 text-slate-600 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 transition-colors" title="Delete sweet">
                                <Trash2 className="size-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      {(showModal || editProduct) && (
        <ProductModal
          initial={editProduct ?? undefined}
          onSave={(data) => {
            if (editProduct) { onEdit(editProduct.id, data); setEditProduct(null); }
            else { onAdd(data); setShowModal(false); }
          }}
          onClose={() => { setShowModal(false); setEditProduct(null); }}
        />
      )}
      {deleteId !== null && (
        <ConfirmDialog
          title="Delete Sweet Product?"
          message="This product will be removed from your catalog. Previous orders will remain intact."
          onConfirm={() => { onDelete(deleteId); setDeleteId(null); }}
          onCancel={() => setDeleteId(null)}
        />
      )}
    </>
  );
}

export type OrderItemFormData = {
  productId: string;
  qty: string;
  rate: string;
};

export type OrderFormData = {
  customer: string;
  items: OrderItemFormData[];
  deliveryDate: string;
  notes: string;
  phone?: string;
  address?: string;
  // Legacy fields optional
  productId?: string;
  qty?: string;
  rate?: string;
};


function ProductItemDialog({
  initial,
  products,
  existingProductIds = [],
  onSave,
  onClose,
}: {
  initial?: OrderItemFormData;
  products: Product[];
  existingProductIds?: string[];
  onSave: (item: OrderItemFormData) => void;
  onClose: () => void;
}) {
  useModalBackHandler(true, onClose);
  const activeProducts = products.filter((p) => p.active);

  // Filter out sweets already in the order (unless editing this specific sweet)
  const availableProducts = useMemo(() => {
    return products.filter((p) => {
      if (initial && String(initial.productId) === String(p.id)) return true;
      return !existingProductIds.includes(String(p.id));
    });
  }, [products, existingProductIds, initial]);

  const defaultProd = availableProducts.find((p) => p.active) ?? availableProducts[0] ?? products[0];

  const [productId, setProductId] = useState<string>(
    initial?.productId && availableProducts.some((p) => String(p.id) === String(initial.productId))
      ? String(initial.productId)
      : String(defaultProd?.id ?? "")
  );

  const selectedProd = products.find((p) => p.id === Number(productId)) ?? defaultProd;
  const isWhole = isWholeNumberUnit(selectedProd?.unit);

  const [qty, setQty] = useState<string>(initial?.qty ? String(initial.qty) : "");
  const [rate, setRate] = useState<string>(initial?.rate ? String(initial.rate) : "");
  const [error, setError] = useState<string>("");

  const handleProductChange = (newId: string) => {
    setProductId(newId);
    const p = products.find((prod) => prod.id === Number(newId));
    if (p) {
      const whole = isWholeNumberUnit(p.unit);
      if (whole && qty && !Number.isInteger(Number(qty))) {
        setQty(String(Math.max(1, Math.round(Number(qty)))));
      }
    }
  };

  const handleQtyChange = (val: string) => {
    // Strip minus signs and negatives completely
    let clean = val.replace(/-/g, "");
    if (isWhole) {
      // Whole numbers only for pcs / box
      clean = clean.replace(/[^0-9]/g, "");
    } else {
      // Decimals allowed for kg/g
      clean = clean.replace(/[^0-9.]/g, "");
      const parts = clean.split(".");
      if (parts.length > 2) clean = parts[0] + "." + parts.slice(1).join("");
    }
    setQty(clean);
    if (error) setError("");
  };

  const handleRateChange = (val: string) => {
    const clean = val.replace(/-/g, "").replace(/[^0-9.]/g, "");
    setRate(clean);
  };

  const standardPrice = selectedProd?.price ?? 0;
  const effectiveRate = Number(rate) > 0 ? Number(rate) : standardPrice;
  const numQty = Number(qty) || 0;
  const subtotal = numQty * effectiveRate;

  const handleSubmit = () => {
    if (!productId || availableProducts.length === 0) {
      setError("Please select a valid sweet product");
      return;
    }
    if (!qty || Number(qty) <= 0) {
      setError("Please enter a valid positive quantity greater than 0");
      return;
    }
    if (isWhole && (!Number.isInteger(Number(qty)) || Number(qty) < 1)) {
      setError(`For ${selectedProd?.unit ?? "pieces/boxes"}, only whole numbers are allowed (1, 2, 3...).`);
      return;
    }
    onSave({
      productId,
      qty,
      rate: rate.trim() || "",
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] overflow-y-auto bg-slate-950/60 backdrop-blur-xs p-3 sm:p-4 flex items-center justify-center">
      <div className="my-auto w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3.5 bg-slate-50">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600">
              {initial ? "Edit Sweet Item" : "Add Sweet Product"}
            </span>
            <h3 className="text-base font-bold text-slate-900">
              {initial ? "Modify Sweet Item" : "Select Sweet & Quantity"}
            </h3>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200 transition-colors">
            <X className="size-4" />
          </button>
        </div>

        <div className="p-4 sm:p-5 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Sweet Product *
            </label>
            {availableProducts.length === 0 ? (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 font-semibold">
                All sweet products from your catalog are already added to this order.
              </div>
            ) : (
              <select
                value={productId}
                onChange={(e) => handleProductChange(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-900 outline-none focus:border-amber-600 focus:ring-2 focus:ring-amber-500/20"
              >
                {availableProducts.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} — {money(p.price)} / {p.unit}
                  </option>
                ))}
              </select>
            )}
            <p className="mt-1 text-[11px] text-slate-500">
              Standard Rate: <strong className="text-slate-800">{money(selectedProd?.price ?? 0)}</strong> / <strong>{selectedProd?.unit ?? "kg"}</strong>
            </p>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-slate-700">
                Quantity ({selectedProd?.unit ?? "kg"}) *
              </label>
              {isWhole ? (
                <span className="text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full">
                  Whole numbers only (1, 2, 3...)
                </span>
              ) : (
                <span className="text-[10px] font-medium text-slate-500">
                  Decimals allowed (e.g. 0.5, 2.25)
                </span>
              )}
            </div>
            <input
              type="text"
              inputMode={isWhole ? "numeric" : "decimal"}
              value={qty}
              onChange={(e) => handleQtyChange(e.target.value)}
              placeholder={isWhole ? "e.g. 5" : "e.g. 2.5"}
              className={`w-full rounded-xl border px-3.5 py-2.5 text-sm font-semibold outline-none focus:border-amber-600 focus:ring-2 focus:ring-amber-500/20 ${
                error ? "border-rose-400 bg-rose-50/40 text-rose-900" : "border-slate-300 text-slate-900"
              }`}
            />
            {error && <p className="mt-1 text-xs font-semibold text-rose-600">{error}</p>}
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Rate per {selectedProd?.unit ?? "kg"} (Rs.) <span className="font-normal text-slate-400">Optional custom rate</span>
            </label>
            <input
              type="text"
              inputMode="decimal"
              value={rate}
              onChange={(e) => handleRateChange(e.target.value)}
              placeholder={`Standard: ${selectedProd?.price ?? 0}`}
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-xs sm:text-sm outline-none focus:border-amber-600 focus:ring-2 focus:ring-amber-500/20"
            />
          </div>

          <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-amber-800">Item Subtotal</p>
              <p className="text-xs text-amber-700 font-medium">
                {numQty > 0 ? `${numQty} ${selectedProd?.unit ?? "kg"} × ${money(effectiveRate)}` : "Enter quantity to calculate"}
              </p>
            </div>
            <p className="text-lg font-black text-amber-950">
              {money(subtotal)}
            </p>
          </div>
        </div>

        <div className="flex gap-2.5 border-t border-slate-200 px-4 py-3 bg-slate-50">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl border border-slate-300 py-2.5 text-xs font-semibold text-slate-700 hover:bg-white transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="flex-1 rounded-xl bg-amber-600 py-2.5 text-xs font-bold text-white hover:bg-amber-700 transition-colors shadow-xs"
          >
            {initial ? "Update Item" : "Add to Order"}
          </button>
        </div>
      </div>
    </div>
  );
}

function PaymentModal({
  order,
  products,
  onSave,
  onClose,
}: {
  order: Order;
  products: Product[];
  onSave: (orderId: string, amountPaid: number) => void;
  onClose: () => void;
}) {
  useModalBackHandler(true, onClose);
  const total = getOrderTotal(order, products);
  const [amountPaid, setAmountPaid] = useState<string>(
    order.amountPaid !== undefined ? String(order.amountPaid) : ""
  );

  const numPaid = Math.max(0, Number(amountPaid) || 0);
  const balance = Math.max(0, total - numPaid);
  const isFullyPaid = numPaid >= total && total > 0;

  const handleSave = () => {
    onSave(order.id, numPaid);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/60 backdrop-blur-xs p-3 sm:p-4 flex items-center justify-center">
      <div className="my-auto w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3.5 bg-slate-50">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600">Manage Order Payment</span>
            <h3 className="text-base font-bold text-slate-900 truncate">{order.customer}</h3>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200 transition-colors">
            <X className="size-4" />
          </button>
        </div>

        <div className="p-4 sm:p-5 space-y-4">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-500">Total Order Amount:</span>
              <span className="text-base font-black text-slate-900">{money(total)}</span>
            </div>
            <div className="flex justify-between items-center text-xs pt-1 border-t border-slate-200/80">
              <span className="text-slate-500">Current Payment:</span>
              <PaymentBadge amountPaid={order.amountPaid ?? 0} total={total} />
            </div>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setAmountPaid(String(total))}
              className="flex-1 rounded-xl bg-emerald-50 border border-emerald-300 py-2 text-xs font-bold text-emerald-800 hover:bg-emerald-100 transition-colors shadow-2xs"
            >
              ✓ Mark Fully Paid ({money(total)})
            </button>
            <button
              type="button"
              onClick={() => setAmountPaid("0")}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
            >
              Reset
            </button>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Advance Paid by Customer (Rs.)
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">Rs.</span>
              <input
                type="number"
                min="0"
                step="50"
                value={amountPaid}
                onChange={(e) => {
                  const val = e.target.value.replace(/-/g, "");
                  setAmountPaid(val);
                }}
                placeholder="0"
                className="w-full rounded-xl border border-slate-300 pl-10 pr-3.5 py-2.5 text-base font-bold text-slate-900 outline-none focus:border-amber-600 focus:ring-2 focus:ring-amber-500/20"
              />
            </div>
          </div>

          <div className={`rounded-xl border p-3 flex items-center justify-between transition-colors ${
            isFullyPaid
              ? "bg-emerald-50 border-emerald-200"
              : numPaid > 0
              ? "bg-amber-50 border-amber-200"
              : "bg-slate-50 border-slate-200"
          }`}>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                {isFullyPaid ? "Payment Status" : "Remaining Balance Due"}
              </p>
              <p className={`text-sm font-black ${isFullyPaid ? "text-emerald-700" : "text-amber-800"}`}>
                {isFullyPaid ? "✓ PAID IN FULL" : money(balance)}
              </p>
            </div>
            {isFullyPaid && <CheckCircle2 className="size-5 text-emerald-600" />}
          </div>
        </div>

        <div className="flex gap-2.5 border-t border-slate-200 px-4 py-3 bg-slate-50">
          <button
            onClick={onClose}
            className="flex-1 rounded-xl border border-slate-300 py-2.5 text-xs font-semibold text-slate-700 hover:bg-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex-1 rounded-xl bg-amber-600 py-2.5 text-xs font-bold text-white hover:bg-amber-700 transition-colors shadow-xs"
          >
            Save Payment
          </button>
        </div>
      </div>
    </div>
  );
}

function CustomerDropdown({ value, customers, onChange, hasError }: {
  value: string;
  customers: Array<{ name: string; phone?: string; address?: string }>;
  onChange: (name: string, phone?: string, address?: string) => void;
  hasError?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const filtered = customers.filter((c) =>
    !value || c.name.toLowerCase().includes(value.toLowerCase()) || (c.phone && c.phone.includes(value))
  );

  return (
    <div className="relative">
      <div className="relative flex items-center">
        <input
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 200)}
          placeholder="Type customer name or choose existing..."
          autoComplete="off"
          className={`w-full rounded-xl border px-3.5 py-2.5 pr-10 text-sm font-semibold outline-none focus:border-amber-600 focus:ring-2 focus:ring-amber-500/20 transition-all ${
            hasError ? "border-rose-400 bg-rose-50/30 text-rose-900" : "border-slate-300 text-slate-900 bg-white"
          }`}
        />
        <button
          type="button"
          tabIndex={-1}
          onClick={() => setOpen((prev) => !prev)}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-slate-600 transition-colors"
        >
          <ChevronDown className={`size-4 transition-transform duration-200 ${open ? "rotate-180 text-amber-600" : ""}`} />
        </button>
      </div>

      {open && (
        <div className="absolute top-full left-0 right-0 z-[60] mt-1.5 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl ring-1 ring-slate-900/5 max-h-60 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="px-4 py-3 text-xs text-slate-500 bg-slate-50/60">
              No existing customer matches &ldquo;{value}&rdquo; — will save as new customer.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filtered.map((c) => {
                const isSelected = value.trim().toLowerCase() === c.name.toLowerCase();
                return (
                  <button
                    key={c.name}
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      onChange(c.name, c.phone, c.address);
                      setOpen(false);
                    }}
                    className={`w-full text-left px-3.5 py-2.5 flex items-center justify-between gap-2 transition-colors ${
                      isSelected ? "bg-amber-50 text-amber-900" : "hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-800 font-bold text-xs">
                        {c.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-slate-900 truncate leading-tight">{c.name}</p>
                        {c.address && <p className="text-[11px] text-slate-400 truncate mt-0.5">{c.address}</p>}
                      </div>
                    </div>
                    {c.phone ? (
                      <span className="shrink-0 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200/80 px-2 py-0.5 rounded-md flex items-center gap-1">
                        <Phone className="size-2.5" />
                        {c.phone}
                      </span>
                    ) : (
                      <span className="shrink-0 text-[10px] text-slate-400 italic">Saved</span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function OrderModal({ initial, products, customers = [], initialCustomer, onSave, onClose }: {
  initial?: Order; products: Product[]; customers?: (Customer | string)[]; initialCustomer?: string | null; onSave: (data: OrderFormData) => void; onClose: () => void;
}) {
  useModalBackHandler(true, onClose);
  const activeProducts = products.filter((p) => p.active);
  const normalizedCustomers = useMemo(() => {
    return customers.map((c) => (typeof c === "string" ? { name: c, phone: undefined, address: undefined } : c));
  }, [customers]);

  const targetInitialCustomer = initial?.customer ?? (initialCustomer ?? "");
  const matchedInitial = targetInitialCustomer
    ? normalizedCustomers.find((c) => c.name.toLowerCase() === targetInitialCustomer.toLowerCase())
    : null;

  const initialItems: OrderItemFormData[] = useMemo(() => {
    if (initial) {
      const existingItems = getOrderItems(initial);
      if (existingItems.length > 0) {
        return existingItems.map((it) => ({
          productId: it.productId ? String(it.productId) : (activeProducts[0]?.id ? String(activeProducts[0].id) : ""),
          qty: it.qty ? String(it.qty) : "",
          rate: it.rate ? String(it.rate) : "",
        }));
      }
    }
    return [];
  }, [initial, activeProducts]);

  const [customer, setCustomer] = useState(targetInitialCustomer);
  const [phone, setPhone] = useState(initial?.phone ?? (matchedInitial?.phone ?? ""));
  const [address, setAddress] = useState(initial?.address ?? (matchedInitial?.address ?? ""));
  const [showContactFields, setShowContactFields] = useState<boolean>(false);
  const [deliveryDate, setDeliveryDate] = useState(initial?.deliveryDate ?? getTodayStr());
  const [notes, setNotes] = useState(initial?.notes ? (parseDhuniyaData(initial.notes).cleanNotes ?? "") : "");
  const [items, setItems] = useState<OrderItemFormData[]>(initialItems);
  const [editingItemIdx, setEditingItemIdx] = useState<number | null>(null);
  const [showItemDialog, setShowItemDialog] = useState<boolean>(false);
  const [errors, setErrors] = useState<{ customer?: string; deliveryDate?: string; items?: string }>({});

  const selectCustomer = (name: string) => {
    const matched = normalizedCustomers.find((c) => c.name.toLowerCase() === name.trim().toLowerCase());
    setCustomer(name);
    if (matched?.phone) setPhone(matched.phone);
    if (matched?.address) setAddress(matched.address);
    if (errors.customer) setErrors((prev) => ({ ...prev, customer: undefined }));
  };

  const removeItem = (idx: number) => {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const validate = () => {
    const e: { customer?: string; deliveryDate?: string; items?: string } = {};
    if (!customer.trim()) e.customer = "Customer name is required";
    if (!deliveryDate) e.deliveryDate = "Delivery / handover date required";

    if (items.length === 0) {
      e.items = "Please add at least one sweet product using the '+ Add Product' button";
    } else {
      const invalid = items.some((it) => {
        const prod = products.find((p) => p.id === Number(it.productId));
        const whole = isWholeNumberUnit(prod?.unit);
        const q = Number(it.qty);
        if (!it.productId || isNaN(q) || q <= 0) return true;
        if (whole && (!Number.isInteger(q) || q < 1)) return true;
        return false;
      });
      if (invalid) e.items = "Please ensure all product quantities are valid positive numbers";
    }
    return e;
  };

  const submit = () => {
    const e = validate();
    if (Object.keys(e).length) {
      setErrors(e);
      return;
    }
    // Consolidate duplicates by productId before saving
    const consolidatedMap = new Map<string, OrderItemFormData>();
    for (const it of items) {
      if (!it.productId) continue;
      const key = String(it.productId);
      const existing = consolidatedMap.get(key);
      if (existing) {
        existing.qty = String((Number(existing.qty) || 0) + (Number(it.qty) || 0));
        if (it.rate && !existing.rate) existing.rate = it.rate;
      } else {
        consolidatedMap.set(key, { ...it });
      }
    }
    const finalItems = Array.from(consolidatedMap.values());
    onSave({
      customer: customer.trim(),
      phone: phone.trim() || undefined,
      address: address.trim() || undefined,
      deliveryDate,
      notes: notes.trim(),
      items: finalItems.map((it) => ({
        productId: it.productId,
        qty: it.qty,
        rate: it.rate,
      })),
    });
  };

  const grandTotal = items.reduce((sum, it) => {
    const p = products.find((prod) => prod.id === Number(it.productId));
    const r = Number(it.rate) > 0 ? Number(it.rate) : (p?.price ?? 0);
    const q = Number(it.qty) || 0;
    return sum + (q * r);
  }, 0);

  const totalKg = items.reduce((sum, it) => {
    const p = products.find((prod) => prod.id === Number(it.productId));
    return p?.unit === "kg" ? sum + (Number(it.qty) || 0) : sum;
  }, 0);

  return (
    <>
      <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/50 backdrop-blur-xs p-3 sm:p-4 flex items-center justify-center">
        <div className="my-auto w-full max-w-2xl max-h-[92vh] flex flex-col rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden">
          <div className="shrink-0 flex items-center justify-between border-b border-slate-200 px-4 py-3.5 sm:px-6 sm:py-5 bg-slate-50">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-amber-600">{initial ? "Edit" : "New"} Order</p>
              <h3 className="mt-0.5 text-base sm:text-lg font-bold text-slate-900">{initial ? "Update Customer Order" : "Place New Customer Order"}</h3>
            </div>
            <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200"><X className="size-4" /></button>
          </div>

          <div className="flex-1 overflow-y-auto space-y-4 px-4 py-5 sm:px-6 sm:py-6">
            {/* Customer Name */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-slate-700">Customer Name *</label>
                {normalizedCustomers.length > 0 && (
                  <span className="text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                    {normalizedCustomers.length} saved customer{normalizedCustomers.length !== 1 ? "s" : ""}
                  </span>
                )}
              </div>

              <CustomerDropdown
                value={customer}
                customers={normalizedCustomers}
                onChange={(name, phone, address) => {
                  setCustomer(name);
                  if (phone) setPhone(phone);
                  if (address) setAddress(address);
                  if (errors.customer) setErrors((prev) => ({ ...prev, customer: undefined }));
                }}
                hasError={!!errors.customer}
              />
              {errors.customer && <p className="mt-1 text-xs text-rose-600">{errors.customer}</p>}

              {/* Toggle for contact details (hidden by default) */}
              <button
                type="button"
                onClick={() => setShowContactFields((v) => !v)}
                className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-amber-700 hover:text-amber-800 transition-colors"
              >
                <ChevronDown className={`size-3.5 transition-transform duration-200 ${showContactFields ? "rotate-180" : ""}`} />
                {showContactFields ? "Hide contact details" : (phone || address ? "Show contact details" : "+ Add mobile / address")}
              </button>
              {showContactFields && (
                <div className="mt-2 grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Mobile Number <span className="font-normal text-slate-400">(Optional)</span>
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-slate-400" />
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="e.g. 0756656135"
                        className="w-full rounded-xl border border-slate-300 pl-9 pr-3.5 py-2 text-xs sm:text-sm outline-none focus:border-amber-600 focus:ring-2 focus:ring-amber-500/20"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Delivery Address <span className="font-normal text-slate-400">(Optional)</span>
                    </label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-slate-400" />
                      <input
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        placeholder="e.g. 138 France City"
                        className="w-full rounded-xl border border-slate-300 pl-9 pr-3.5 py-2 text-xs sm:text-sm outline-none focus:border-amber-600 focus:ring-2 focus:ring-amber-500/20"
                      />
                    </div>
                  </div>
                </div>
              )}</div>

            {/* Handover Date */}
            <div>
              <label className="mb-1.5 block text-xs font-bold text-slate-700">Handover / Delivery Date *</label>
              <input
                type="date"
                value={deliveryDate}
                onChange={(e) => setDeliveryDate(e.target.value)}
                className={`w-full rounded-xl border px-3.5 py-2.5 text-sm outline-none focus:border-amber-600 focus:ring-2 focus:ring-amber-500/20 transition-all ${errors.deliveryDate ? "border-rose-400 bg-rose-50/30" : "border-slate-300"}`}
              />
              {errors.deliveryDate && <p className="mt-1 text-xs text-rose-600">{errors.deliveryDate}</p>}
            </div>

            {/* Product Line Items */}
            <div className="space-y-3 pt-2 border-t border-slate-200">
              <div className="flex items-center justify-between">
                <div>
                  <label className="block text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Order Items ({items.length})
                  </label>
                  <p className="text-[11px] text-slate-500">Add all sweets included in this customer order</p>
                </div>
                {(() => {
                  const allSweetsAdded = items.length >= activeProducts.length && activeProducts.length > 0;
                  return (
                    <button
                      type="button"
                      disabled={allSweetsAdded}
                      onClick={() => {
                        setEditingItemIdx(null);
                        setShowItemDialog(true);
                      }}
                      className={`inline-flex shrink-0 items-center gap-1 rounded-lg border px-2.5 py-1 text-xs font-bold transition-colors whitespace-nowrap ${
                        allSweetsAdded
                          ? "border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed"
                          : "border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100"
                      }`}
                      title={allSweetsAdded ? "All catalog sweets already added" : "Add sweet product"}
                    >
                      <Plus className="size-3" />
                      <span>{allSweetsAdded ? "All Sweets Added" : "Add Product"}</span>
                    </button>
                  );
                })()}
              </div>

              {errors.items && <p className="text-xs text-rose-600 font-semibold">{errors.items}</p>}

              {items.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-300 p-6 text-center bg-slate-50/60">
                  <Package className="size-8 text-slate-400 mx-auto mb-1.5" />
                  <p className="text-xs font-bold text-slate-700">No sweet products added yet</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">Click &ldquo;+ Add Product&rdquo; above to select sweets for this order.</p>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingItemIdx(null);
                      setShowItemDialog(true);
                    }}
                    className="mt-3 inline-flex items-center gap-1 rounded-lg bg-amber-50 border border-amber-300 px-3 py-1.5 text-xs font-bold text-amber-800 hover:bg-amber-100"
                  >
                    <Plus className="size-3.5" />
                    <span>Add Product</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  {items.map((item, idx) => {
                    const prod = products.find((p) => p.id === Number(item.productId));
                    const itemRate = Number(item.rate) > 0 ? Number(item.rate) : (prod?.price ?? 0);
                    const itemSubtotal = (Number(item.qty) || 0) * itemRate;

                    return (
                      <div key={idx} className="rounded-xl border border-slate-200 bg-white p-3 flex items-center justify-between gap-3 shadow-2xs hover:border-amber-300 transition-colors">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="size-6 rounded-lg bg-amber-100 text-amber-800 text-xs font-bold flex items-center justify-center shrink-0">
                            {idx + 1}
                          </span>
                          <div className="min-w-0">
                            <p className="font-bold text-slate-900 text-sm truncate">{prod?.name ?? "Sweet Item"}</p>
                            <p className="text-xs text-slate-500">
                              <strong className="text-slate-800">{item.qty} {prod?.unit ?? "kg"}</strong> × {money(itemRate)} = <strong className="text-amber-700 font-extrabold">{money(itemSubtotal)}</strong>
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingItemIdx(idx);
                              setShowItemDialog(true);
                            }}
                            className="rounded-lg border border-slate-200 p-1.5 text-slate-600 hover:bg-slate-100 transition-colors"
                            title="Edit this sweet item"
                          >
                            <Edit2 className="size-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => removeItem(idx)}
                            className="rounded-lg border border-slate-200 p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 transition-colors"
                            title="Remove this sweet item"
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Special Notes */}
            <div>
              <label className="mb-1.5 block text-xs font-bold text-slate-700">Special Notes (optional)</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Extra saffron, wedding gift packaging, morning handover…"
                rows={2}
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm outline-none focus:border-amber-600 focus:ring-2 focus:ring-amber-500/20 resize-none"
              />
            </div>

            {/* Order Total Box */}
            {items.length > 0 && (
              <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-3 sm:p-4 flex items-center justify-between">
                <div>
                  <p className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-amber-800">Order Total</p>
                  <p className="text-xs text-amber-700 font-medium">
                    {items.length} product{items.length !== 1 ? "s" : ""} {totalKg > 0 ? `· ${totalKg.toFixed(2)} kg total` : ""}
                  </p>
                </div>
                <p className="text-xl sm:text-2xl font-black text-amber-950">
                  {money(grandTotal)}
                </p>
              </div>
            )}
          </div>

          <div className="shrink-0 flex gap-3 border-t border-slate-200 px-4 py-3.5 sm:px-6 sm:py-4 bg-slate-50">
            <button onClick={onClose} className="flex-1 rounded-xl border border-slate-300 py-2.5 text-sm font-semibold text-slate-700 hover:bg-white transition-colors">Cancel</button>
            <button onClick={submit} className="flex-1 rounded-xl bg-amber-600 py-2.5 text-sm font-semibold text-white hover:bg-amber-700 shadow-xs font-bold">
              {initial ? "Update Order" : "Place Order"}
            </button>
          </div>
        </div>
      </div>

      {showItemDialog && (
        <ProductItemDialog
          initial={editingItemIdx !== null ? items[editingItemIdx] : undefined}
          products={products}
          existingProductIds={items
            .filter((_, idx) => idx !== editingItemIdx)
            .map((it) => String(it.productId))}
          onSave={(savedItem) => {
            const targetId = String(savedItem.productId);
            if (editingItemIdx !== null) {
              const duplicateIdx = items.findIndex((it, idx) => idx !== editingItemIdx && String(it.productId) === targetId);
              if (duplicateIdx !== -1) {
                // If they changed sweet to one already in the list, merge the quantities
                setItems((prev) => prev.map((it, idx) => {
                  if (idx === duplicateIdx) {
                    return {
                      ...it,
                      qty: String(Number(it.qty) + Number(savedItem.qty)),
                      rate: savedItem.rate || it.rate,
                    };
                  }
                  return it;
                }).filter((_, idx) => idx !== editingItemIdx));
              } else {
                setItems((prev) => prev.map((it, i) => (i === editingItemIdx ? savedItem : it)));
              }
            } else {
              const existingIdx = items.findIndex((it) => String(it.productId) === targetId);
              if (existingIdx !== -1) {
                // Merge quantity into existing item
                setItems((prev) => prev.map((it, idx) => {
                  if (idx === existingIdx) {
                    return {
                      ...it,
                      qty: String(Number(it.qty) + Number(savedItem.qty)),
                      rate: savedItem.rate || it.rate,
                    };
                  }
                  return it;
                }));
              } else {
                setItems((prev) => [...prev, savedItem]);
              }
            }
            setShowItemDialog(false);
            setEditingItemIdx(null);
            if (errors.items) setErrors((prev) => ({ ...prev, items: undefined }));
          }}
          onClose={() => {
            setShowItemDialog(false);
            setEditingItemIdx(null);
          }}
        />
      )}
    </>
  );
}

function OrderItemsModal({ order, products, customerLookup, onClose }: {
  order: Order;
  products: Product[];
  customerLookup?: Map<string, Customer>;
  onClose: () => void;
}) {
  useModalBackHandler(true, onClose);
  const items = getOrderItems(order);
  const total = getOrderTotal(order, products);
  const info = customerLookup?.get(order.customer.trim().toLowerCase());
  const phone = order.phone || info?.phone;
  const address = info?.address;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-3 sm:p-4" onClick={onClose}>
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150" onClick={(e) => e.stopPropagation()}>
        <div className="border-b border-slate-200 px-4 py-3 bg-slate-50">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <p className="text-[10px] font-bold uppercase tracking-wider text-amber-600">Ordered Sweets ({items.length})</p>
                <span className="text-[10px] text-slate-400">· {dateLabel(order.deliveryDate)}</span>
              </div>
              <h3 className="text-sm font-bold text-slate-900 truncate mt-0.5">{order.customer}</h3>
              {phone ? (
                <div className="mt-1 flex items-center gap-2 text-xs text-slate-600 flex-wrap">
                  <a href={`tel:${phone}`} className="inline-flex items-center gap-1 font-bold text-amber-700 hover:underline">
                    <Phone className="size-3 text-amber-600" /> {phone}
                  </a>
                  {address && <span className="text-[11px] text-slate-400 truncate">· {address}</span>}
                </div>
              ) : address ? (
                <p className="text-[11px] text-slate-400 truncate mt-0.5">{address}</p>
              ) : null}
            </div>
            <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200 transition-colors shrink-0">
              <X className="size-4" />
            </button>
          </div>
        </div>
        <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto">
          {items.map((item, idx) => {
            const prod = products.find((p) => p.id === item.productId);
            const r = item.rate ?? prod?.price ?? 0;
            const isWhole = isWholeNumberUnit(prod?.unit);
            const displayQty = isWhole ? Math.round(Number(item.qty)) : item.qty;
            return (
              <div key={idx} className="flex items-center justify-between gap-3 px-4 py-2.5 hover:bg-slate-50/50">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="size-5 rounded-md bg-amber-100 text-amber-800 text-[10px] font-bold flex items-center justify-center shrink-0">
                    {idx + 1}
                  </span>
                  <span className="text-xs font-bold text-slate-900 truncate">{prod?.name ?? "Sweet"}</span>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-xs font-bold text-amber-700">{displayQty} {prod?.unit ?? "kg"}</span>
                  <span className="text-[11px] text-slate-400 block">{money(item.qty * r)}</span>
                </div>
              </div>
            );
          })}
        </div>
        <div className="border-t border-slate-200 px-4 py-3 flex items-center justify-between bg-amber-50/60">
          <span className="text-xs font-bold uppercase tracking-wider text-amber-800">Total Bill</span>
          <span className="text-base font-black text-amber-950">{money(total)}</span>
        </div>
      </div>
    </div>
  );
}

function OrderCard({ order, products, customerLookup, onStatusChange, onGenerate, onEdit, onDelete, onManagePayment, onViewItems }: {
  order: Order;
  products: Product[];
  customerLookup?: Map<string, Customer>;
  onStatusChange: (id: string, s: string) => void;
  onGenerate: (o: Order) => void;
  onEdit: (o: Order) => void;
  onDelete: (id: string) => void;
  onManagePayment: (o: Order) => void;
  onViewItems: (o: Order) => void;
}) {
  const items = getOrderItems(order);
  const total = getOrderTotal(order, products);
  const badge = getHandoverBadge(order.deliveryDate);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-2xs hover:border-amber-300 transition-all space-y-3">
      {/* Row 1: Avatar + Customer info on Left; Status Dropdown on Top Right (above price) */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-100 to-amber-200 text-amber-900 font-extrabold text-sm border border-amber-300/40">
            {order.customer.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h4 className="font-extrabold text-slate-900 text-sm truncate leading-tight">{order.customer}</h4>
              {badge && (
                <span className={`inline-flex items-center rounded-md border px-1.5 py-0.2 text-[9px] font-bold ${badge.style}`}>
                  {badge.label}
                </span>
              )}
            </div>
            <p className="mt-0.5 text-[11px] font-medium text-slate-500">
              {dateLabel(order.deliveryDate)}
            </p>
          </div>
        </div>

        {/* Status Dropdown at top right directly above price */}
        <div className="shrink-0">
          <StatusDropdown value={order.status} onChange={(v) => onStatusChange(order.id, v)} />
        </div>
      </div>

      {/* Row 2: Ordered Sweets button on Left; Price & Payment Badge on Right */}
      <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
        <button
          type="button"
          onClick={() => onViewItems(order)}
          className="inline-flex items-center gap-1.5 rounded-lg bg-amber-50 border border-amber-200/80 px-2.5 py-1 text-xs font-bold text-amber-800 hover:bg-amber-100 active:bg-amber-200 transition-colors shrink-0"
        >
          <Package className="size-3.5 text-amber-600" />
          <span>{items.length} {items.length === 1 ? "item" : "items"}</span>
          <ChevronDown className="size-3 text-amber-600/70" />
        </button>

        <div className="flex items-center gap-2 shrink-0">
          <PaymentBadge amountPaid={order.amountPaid ?? 0} total={total} />
          <span className="text-sm sm:text-base font-black text-slate-900 leading-tight">{money(total)}</span>
        </div>
      </div>

      {/* Row 3: Action Buttons */}
      <div className="flex items-center justify-end gap-1.5 pt-2 border-t border-slate-100">
        <button
          type="button"
          onClick={() => onManagePayment(order)}
          className="h-7.5 rounded-lg border border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100 active:bg-amber-200 text-xs font-bold px-2.5 flex items-center gap-1 transition-colors whitespace-nowrap"
          title="Manage payment"
        >
          💳 Pay
        </button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => onGenerate(order)}
          className="h-7.5 border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold px-2.5 gap-1 whitespace-nowrap"
        >
          <FileText className="size-3" /> Bill
        </Button>
        <button
          type="button"
          onClick={() => onEdit(order)}
          className="flex h-7.5 w-7.5 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
          title="Edit order"
        >
          <Edit2 className="size-3" />
        </button>
        <button
          type="button"
          onClick={() => onDelete(order.id)}
          className="flex h-7.5 w-7.5 items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 transition-colors"
          title="Delete order"
        >
          <Trash2 className="size-3.5" />
        </button>
      </div>
    </div>
  );
}

function OrdersTable({ orders, products, customerLookup, onStatusChange, onGenerate, onEdit, onDelete, onManagePayment, onViewItems }: {
  orders: Order[];
  products: Product[];
  customerLookup?: Map<string, Customer>;
  onStatusChange: (id: string, s: string) => void;
  onGenerate: (o: Order) => void;
  onEdit: (o: Order) => void;
  onDelete: (id: string) => void;
  onManagePayment: (o: Order) => void;
  onViewItems: (o: Order) => void;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-3.5 py-3">Customer</th>
              <th className="px-3 py-3">Ordered Sweets</th>
              <th className="px-3 py-3">Handover</th>
              <th className="px-3 py-3">Amount</th>
              <th className="px-3 py-3">Payment</th>
              <th className="px-3 py-3">Status</th>
              <th className="px-3.5 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {orders.map((order) => {
              const items = getOrderItems(order);
              const total = getOrderTotal(order, products);
              const badge = getHandoverBadge(order.deliveryDate);
              const info = customerLookup?.get(order.customer.trim().toLowerCase());
              const phone = order.phone || info?.phone;

              return (
                <tr key={order.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-3.5 py-2.5">
                    <div className="flex items-center gap-2.5">
                      <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-800 font-bold text-xs">
                        {order.customer.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-slate-900 text-sm leading-tight truncate">{order.customer}</p>
                        {phone && (
                          <a href={`tel:${phone}`} className="inline-flex items-center gap-0.5 font-semibold text-amber-700 hover:underline text-[11px] mt-0.5">
                            <Phone className="size-2.5" />{phone}
                          </a>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-2.5">
                    <button
                      type="button"
                      onClick={() => onViewItems(order)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-amber-200/80 bg-amber-50/70 px-2.5 py-1 text-xs font-bold text-amber-800 hover:bg-amber-100 hover:border-amber-300 transition-colors whitespace-nowrap"
                    >
                      <Package className="size-3.5 text-amber-600" />
                      <span>{items.length} sweet{items.length !== 1 ? "s" : ""}</span>
                      <ChevronDown className="size-3 text-amber-600/70" />
                    </button>
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex flex-col gap-0.5">
                      <div className="flex items-center gap-1">
                        <Calendar className="size-3 text-amber-600 shrink-0" />
                        <span className="font-bold text-xs text-slate-900 whitespace-nowrap">{dateLabel(order.deliveryDate)}</span>
                      </div>
                      {badge && <span className={`inline-flex items-center rounded-md border px-1.5 py-0.2 text-[9px] font-bold ${badge.style}`}>{badge.label}</span>}
                    </div>
                  </td>
                  <td className="px-3 py-2.5 font-bold text-sm text-slate-900 whitespace-nowrap">{money(total)}</td>
                  <td className="px-3 py-2.5">
                    <PaymentBadge amountPaid={order.amountPaid ?? 0} total={total} />
                  </td>
                  <td className="px-3 py-2.5">
                    <StatusDropdown value={order.status} onChange={(v) => onStatusChange(order.id, v)} />
                  </td>
                  <td className="px-3.5 py-2.5 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => onManagePayment(order)}
                        className="rounded-lg border border-amber-300 bg-amber-50 px-2 py-1 text-xs font-bold text-amber-800 hover:bg-amber-100 transition-colors whitespace-nowrap"
                        title="Manage payment"
                      >
                        💳 Pay
                      </button>
                      <Button size="sm" variant="outline" onClick={() => onGenerate(order)} className="h-7 border-amber-200 bg-amber-50/70 text-amber-800 hover:bg-amber-100 font-semibold text-xs px-2 whitespace-nowrap">
                        <FileText className="size-3" /> Bill
                      </Button>
                      <button onClick={() => onEdit(order)} className="rounded-lg border border-slate-200 p-1.5 text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors" title="Edit">
                        <Edit2 className="size-3.5" />
                      </button>
                      <button onClick={() => onDelete(order.id)} className="rounded-lg border border-slate-200 p-1.5 text-slate-600 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 transition-colors" title="Delete">
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function getGroupHeaderStyle(key: string) {
  if (key === "today") {
    return {
      bar: "bg-gradient-to-r from-rose-100/90 via-rose-50/70 to-amber-50/40 border-rose-300/80 text-rose-950 shadow-2xs",
      badge: "bg-rose-600 text-white border-rose-600",
      pill: "bg-rose-600 text-white",
      totalKg: "text-rose-700",
    };
  }
  if (key === "tomorrow") {
    return {
      bar: "bg-gradient-to-r from-amber-100/90 via-orange-50/70 to-amber-50/40 border-amber-300/80 text-amber-950 shadow-2xs",
      badge: "bg-amber-600 text-white border-amber-600",
      pill: "bg-amber-600 text-white",
      totalKg: "text-amber-700",
    };
  }
  if (key === "upcoming") {
    return {
      bar: "bg-gradient-to-r from-blue-100/90 via-sky-50/70 to-indigo-50/40 border-blue-300/80 text-blue-950 shadow-2xs",
      badge: "bg-blue-600 text-white border-blue-600",
      pill: "bg-blue-600 text-white",
      totalKg: "text-blue-700",
    };
  }
  if (key === "past" || key === "status-Completed") {
    return {
      bar: "bg-slate-100/90 border-slate-300/80 text-slate-800 shadow-2xs",
      badge: "bg-slate-600 text-white border-slate-600",
      pill: "bg-slate-500 text-white",
      totalKg: "text-slate-600",
    };
  }
  return {
    bar: "bg-slate-50 border-slate-200/90 text-slate-900 shadow-2xs",
    badge: "bg-amber-600 text-white border-amber-600",
    pill: "bg-amber-600 text-white",
    totalKg: "text-amber-700",
  };
}

function OrdersPage({ orders, products, customers = [], initialCustomer = null, onClearInitialCustomer, onAdd, onEdit, onDelete, onStatusChange, onGenerate, onUpdatePayment, initialProductFilter = null, onClearProductFilter, onOpenSidebar }: {
  orders: Order[]; products: Product[]; customers?: (Customer | string)[]; initialCustomer?: string | null; onClearInitialCustomer?: () => void; onAdd: (data: OrderFormData) => void; onEdit: (id: string, data: OrderFormData) => void;
  onDelete: (id: string) => void; onStatusChange: (id: string, status: string) => void; onGenerate: (order: Order) => void; onUpdatePayment: (orderId: string, amount: number) => void;
  initialProductFilter?: number | null; onClearProductFilter?: () => void; onOpenSidebar?: () => void;
}) {
  const [showModal, setShowModal] = useState(false);
  const [editOrder, setEditOrder] = useState<Order | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [paymentOrder, setPaymentOrder] = useState<Order | null>(null);
  const [viewingItemsOrder, setViewingItemsOrder] = useState<Order | null>(null);
  const [selectedCustomerForNewOrder, setSelectedCustomerForNewOrder] = useState<string | null>(initialCustomer);
  const [query, setQuery] = useState("");
  const [filterProductId, setFilterProductId] = useState<string>(initialProductFilter ? String(initialProductFilter) : "All");
  const [filterStatus, setFilterStatus] = useState("All");
  const [filterDate, setFilterDate] = useState("");
  const [quickTab, setQuickTab] = useState<"all" | "today" | "ready" | "kitchen" | "completed">("all");
  const [groupBy, setGroupBy] = useState<"date" | "product" | "status" | "none">("date");
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({
    past: true,
    "status-Completed": true,
  });

  const toggleGroup = (key: string, currentlyCollapsed: boolean) => {
    setCollapsedGroups((prev) => ({
      ...prev,
      [key]: !currentlyCollapsed,
    }));
  };
  const todayStr = getTodayStr();

  // Combine customers passed in with all distinct customer names currently in orders
  const allCustomers = useMemo(() => {
    const list = customers.map((c) => (typeof c === "string" ? { name: c } : c));
    const fromOrders = orders.map((o) => o.customer?.trim()).filter(Boolean);
    const existing = new Set(list.map((c) => c.name.toLowerCase()));
    for (const name of fromOrders) {
      if (!existing.has(name.toLowerCase())) {
        existing.add(name.toLowerCase());
        list.push({ id: name, name });
      }
    }
    return list.sort((a, b) => a.name.localeCompare(b.name));
  }, [customers, orders]);

  const customerLookup = useMemo(() => {
    const map = new Map<string, Customer>();
    for (const c of customers) {
      if (typeof c === "object" && c.name) {
        map.set(c.name.trim().toLowerCase(), c);
      }
    }
    return map;
  }, [customers]);

  useEffect(() => {
    if (initialCustomer) {
      setEditOrder(null);
      setSelectedCustomerForNewOrder(initialCustomer);
      setShowModal(true);
      onClearInitialCustomer?.();
    }
  }, [initialCustomer, onClearInitialCustomer]);

  useEffect(() => {
    if (initialProductFilter !== null && initialProductFilter !== undefined) {
      setFilterProductId(String(initialProductFilter));
    }
  }, [initialProductFilter]);

  const activeFilteredProduct = useMemo(() => (filterProductId !== "All" ? products.find((p) => p.id === Number(filterProductId)) : null), [filterProductId, products]);

  const filtered = useMemo(() => orders.filter((o) => {
    const items = getOrderItems(o);
    const matchProduct = filterProductId === "All" || items.some((it) => it.productId === Number(filterProductId));
    const matchQuery =
      o.customer.toLowerCase().includes(query.toLowerCase()) ||
      (o.notes && o.notes.toLowerCase().includes(query.toLowerCase())) ||
      items.some((it) => {
        const p = products.find((prod) => prod.id === it.productId);
        return (p?.name ?? "").toLowerCase().includes(query.toLowerCase());
      });
    const matchStatus = filterStatus === "All" || o.status === filterStatus;
    const matchDate = !filterDate || o.date === filterDate || o.deliveryDate === filterDate;
    return matchProduct && matchQuery && matchStatus && matchDate;
  }), [orders, products, filterProductId, query, filterStatus, filterDate]);

  const quickTabs = useMemo(() => [
    { id: "all", label: "All Orders", count: orders.length },
    { id: "today", label: "Handover Today", count: orders.filter((o) => o.deliveryDate === todayStr && o.status !== "Cancelled").length },
    { id: "ready", label: "Ready to Bill", count: orders.filter((o) => o.status === "Ready to Bill").length },
    { id: "kitchen", label: "In Kitchen", count: orders.filter((o) => o.status === "In Production").length },
    { id: "completed", label: "Completed", count: orders.filter((o) => o.status === "Completed").length },
  ], [orders, todayStr]);

  const displayedOrders = useMemo(() => filtered.filter((o) => {
    if (quickTab === "today") return o.deliveryDate === todayStr && o.status !== "Cancelled";
    if (quickTab === "ready") return o.status === "Ready to Bill";
    if (quickTab === "kitchen") return o.status === "In Production";
    if (quickTab === "completed") return o.status === "Completed";
    return true;
  }), [filtered, quickTab, todayStr]);

  const totalFilteredKg = useMemo(() => displayedOrders.reduce((sum, o) => sum + getOrderTotalKg(o, products), 0), [displayedOrders, products]);
  const totalFilteredPcs = useMemo(() => displayedOrders.reduce((sum, o) => sum + getOrderTotalPcs(o, products), 0), [displayedOrders, products]);
  const getProduct = (id: number) => products.find((p) => p.id === id);

  const groupedOrders = useMemo(() => {
    if (groupBy === "none") return [{ key: "all", title: "All Orders", orders: displayedOrders }];
    if (groupBy === "date") {
      const todayOrders: Order[] = [], tomorrowOrders: Order[] = [], upcomingOrders: Order[] = [], pastOrders: Order[] = [];
      displayedOrders.forEach((o) => {
        const badge = getHandoverBadge(o.deliveryDate);
        if (badge?.label === "Handover Today" || badge?.label === "Today" || o.deliveryDate === todayStr) todayOrders.push(o);
        else if (badge?.label === "Tomorrow") tomorrowOrders.push(o);
        else if (badge?.label?.startsWith("In") || o.deliveryDate > todayStr) upcomingOrders.push(o);
        else pastOrders.push(o);
      });

      // Sort upcoming orders chronologically by handover date ascending (earliest handover first)
      upcomingOrders.sort((a, b) => {
        const dateA = a.deliveryDate || "";
        const dateB = b.deliveryDate || "";
        const diff = dateA.localeCompare(dateB);
        if (diff !== 0) return diff;
        return (a.id || "").localeCompare(b.id || "");
      });

      // Sort past orders by handover date descending (most recent past date first)
      pastOrders.sort((a, b) => {
        const dateA = a.deliveryDate || "";
        const dateB = b.deliveryDate || "";
        const diff = dateB.localeCompare(dateA);
        if (diff !== 0) return diff;
        return (b.id || "").localeCompare(a.id || "");
      });

      const groups: { key: string; title: string; badge?: string; orders: Order[] }[] = [];
      if (todayOrders.length > 0) groups.push({ key: "today", title: "Handover Today", badge: "Today", orders: todayOrders });
      if (tomorrowOrders.length > 0) groups.push({ key: "tomorrow", title: "Handover Tomorrow", badge: "Tomorrow", orders: tomorrowOrders });
      if (upcomingOrders.length > 0) groups.push({ key: "upcoming", title: "Upcoming Handover Schedule", orders: upcomingOrders });
      if (pastOrders.length > 0) groups.push({ key: "past", title: "Completed & Past Orders", orders: pastOrders });
      return groups;
    }
    if (groupBy === "product") {
      const map = new Map<number, Order[]>();
      displayedOrders.forEach((o) => {
        const items = getOrderItems(o);
        items.forEach((it) => {
          const list = map.get(it.productId) ?? [];
          if (!list.some((existing) => existing.id === o.id)) {
            list.push(o);
          }
          map.set(it.productId, list);
        });
      });
      return Array.from(map.entries()).map(([productId, ords]) => {
        const prod = products.find((p) => p.id === productId);
        return { key: `prod-${productId}`, title: prod?.name ?? `Product #${productId}`, orders: ords };
      });
    }
    if (groupBy === "status") {
      const map = new Map<string, Order[]>();
      STATUS_OPTIONS.forEach((s) => map.set(s, []));
      displayedOrders.forEach((o) => { const list = map.get(o.status) ?? []; list.push(o); map.set(o.status, list); });
      return Array.from(map.entries()).filter(([_, ords]) => ords.length > 0).map(([status, ords]) => ({ key: `status-${status}`, title: status, orders: ords }));
    }
    return [{ key: "all", title: "All Orders", orders: displayedOrders }];
  }, [displayedOrders, groupBy, todayStr, products]);

  return (
    <>
      <PageHeader title="Orders" onMenu={onOpenSidebar}
        action={<Button onClick={() => setShowModal(true)} className="bg-amber-600 text-white hover:bg-amber-700 gap-1.5 shadow-sm text-xs sm:text-sm h-9 sm:h-10 px-3 sm:px-4"><Plus className="size-4" /> <span className="hidden xs:inline">New Order</span><span className="xs:hidden">Add</span></Button>}
      />
      <div className="mx-auto max-w-[1250px] px-3.5 py-5 sm:px-6 sm:py-8 lg:px-10">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-amber-600">Order Management</span>
          <h2 className="mt-1 text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">Customer Orders & Dispatch</h2>
          <p className="mt-1 text-xs sm:text-sm text-slate-500">Track and manage every customer order separately with timeline stages.</p>
        </div>

        <div className="mt-4 sm:mt-5 flex items-center gap-2 overflow-x-auto pb-1.5">
          {quickTabs.map((tab) => {
            const isActive = quickTab === tab.id;
            return (
              <button key={tab.id} onClick={() => setQuickTab(tab.id as typeof quickTab)}
                className={`flex items-center gap-1.5 shrink-0 rounded-full px-3 sm:px-3.5 py-1.5 text-xs font-bold transition-all ${isActive ? "bg-amber-600 text-white shadow-sm shadow-amber-600/30" : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 hover:border-slate-300"}`}>
                <span>{tab.label}</span>
                <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-extrabold ${isActive ? "bg-amber-700 text-white" : "bg-slate-100 text-slate-600"}`}>{tab.count}</span>
              </button>
            );
          })}
        </div>

        {activeFilteredProduct && (
          <div className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border-2 border-amber-500 bg-gradient-to-r from-amber-50 via-amber-50/60 to-white p-4 sm:p-5 shadow-sm">
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-amber-600 text-white shadow-md shadow-amber-600/20"><Package className="size-5 sm:size-6" /></div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                  <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-amber-700">Filtered Sweet</span>
                  <span className="rounded-full bg-amber-200/70 px-2 py-0.5 text-[10px] font-bold text-amber-900">{displayedOrders.length} order{displayedOrders.length !== 1 ? "s" : ""}</span>
                </div>
                <h3 className="text-lg sm:text-2xl font-bold text-slate-900 truncate">{activeFilteredProduct.name}</h3>
              </div>
            </div>
            <div className="flex items-center justify-between sm:justify-end gap-4 border-t sm:border-t-0 pt-3 sm:pt-0 border-amber-200/60">
              <div className="text-left sm:text-right">
                <p className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-500">Total Demand</p>
                <p className="text-xl sm:text-2xl font-black text-amber-600">{totalFilteredKg.toFixed(2)} <span className="text-xs font-normal text-slate-600">{activeFilteredProduct.unit}</span></p>
              </div>
              <button onClick={() => { setFilterProductId("All"); onClearProductFilter?.(); }} className="flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors shadow-xs">
                <X className="size-3.5" /> Show All
              </button>
            </div>
          </div>
        )}

        <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-3.5 sm:p-4 shadow-sm">
          <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2.5 sm:gap-3">
            <label className="flex flex-1 min-w-[200px] items-center gap-2 rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-1.5 sm:py-0">
              <Search className="size-4 shrink-0 text-slate-400" />
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search customer, order ID, notes…" className="w-full bg-transparent py-2 text-sm text-slate-900 outline-none" />
            </label>
            <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2">
              <select value={filterProductId} onChange={(e) => { setFilterProductId(e.target.value); if (e.target.value === "All") onClearProductFilter?.(); }} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs sm:text-sm font-semibold text-slate-700 outline-none focus:border-amber-600">
                <option value="All">All Sweets ({products.length})</option>
                {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs sm:text-sm font-medium text-slate-700 outline-none focus:border-amber-600">
                <option value="All">All Statuses</option>
                {STATUS_OPTIONS.map((s) => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <input type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} className="flex-1 sm:flex-none rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs sm:text-sm text-slate-700 outline-none focus:border-amber-600" />
              {(query || filterProductId !== "All" || filterStatus !== "All" || filterDate) && (
                <button onClick={() => { setQuery(""); setFilterProductId("All"); setFilterStatus("All"); setFilterDate(""); onClearProductFilter?.(); }} className="rounded-xl border border-slate-200 px-3 py-2 text-xs sm:text-sm font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-900 shrink-0">
                  Clear
                </button>
              )}
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-500">Organize:</span>
              <div className="inline-flex rounded-xl bg-slate-100 p-0.5 border border-slate-200">
                {(["date", "product", "status", "none"] as const).map((mode) => (
                  <button key={mode} onClick={() => setGroupBy(mode)} className={`rounded-lg px-2.5 py-1 text-xs font-bold capitalize transition-all ${groupBy === mode ? "bg-white text-amber-700 shadow-2xs" : "text-slate-500 hover:text-slate-800"}`}>
                    {mode === "date" ? "By Date" : mode === "product" ? "By Sweet" : mode === "status" ? "By Status" : "Individual"}
                  </button>
                ))}
              </div>
            </div>
            <span className="text-xs font-bold text-slate-400">Showing {displayedOrders.length} order{displayedOrders.length !== 1 ? "s" : ""}</span>
          </div>
        </div>

        {displayedOrders.length === 0 ? (
          <div className="mt-6 flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-white py-16 sm:py-20 text-center p-4">
            <ClipboardList className="size-12 text-amber-600" />
            <p className="mt-4 text-base sm:text-lg font-bold text-slate-800">No orders in this view</p>
            <p className="mt-1 text-xs sm:text-sm text-slate-500">{quickTab !== "all" ? `No orders matching "${quickTabs.find((t) => t.id === quickTab)?.label}". Try switching tabs.` : "Create your first order to get started."}</p>
          </div>
        ) : (
          <div className="mt-6 space-y-7">
            {groupedOrders.map((group) => {
              const groupKg = group.orders.reduce((sum, o) => sum + getOrderTotalKg(o, products), 0);
              const groupPcs = group.orders.reduce((sum, o) => sum + getOrderTotalPcs(o, products), 0);
              const isPastOrCompleted = group.key === "past" || group.key === "status-Completed";
              const isCollapsed = quickTab === "completed" ? false : (collapsedGroups[group.key] ?? isPastOrCompleted);
              const style = getGroupHeaderStyle(group.key);

              return (
                <section key={group.key} className="space-y-3">
                  {groupBy !== "none" && (
                    <button
                      type="button"
                      onClick={() => toggleGroup(group.key, isCollapsed)}
                      className={`w-full flex flex-wrap items-center justify-between gap-2.5 rounded-xl border px-3.5 py-2.5 sm:px-4 sm:py-3 transition-all hover:brightness-98 text-left ${style.bar}`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={`flex size-6 shrink-0 items-center justify-center rounded-lg text-xs font-black shadow-2xs ${style.pill}`}>
                          {group.orders.length}
                        </span>
                        <h3 className="text-sm sm:text-base font-extrabold truncate">{group.title}</h3>
                        {(group as any).badge && (
                          <span className={`rounded-md border px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide ${style.badge}`}>
                            {(group as any).badge}
                          </span>
                        )}
                        {isCollapsed && (
                          <span className="rounded-md bg-white/70 border border-slate-300/60 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                            Hidden · Tap to view
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3 shrink-0 ml-auto">
                        <span className="text-xs font-bold text-slate-500">
                          Total:{" "}
                          {groupKg > 0 && (
                            <strong className={`font-extrabold mr-1.5 ${style.totalKg}`}>{groupKg.toFixed(2)} kg</strong>
                          )}
                          {groupPcs > 0 && (
                            <strong className="text-blue-700 font-extrabold">{groupPcs} pcs</strong>
                          )}
                          {groupKg === 0 && groupPcs === 0 && (
                            <strong className="text-slate-400 font-semibold">0 kg</strong>
                          )}
                        </span>
                        <div className="flex items-center justify-center size-6 rounded-lg bg-white/60 border border-slate-300/40 text-slate-700">
                          <ChevronDown className={`size-4 transition-transform duration-200 ${isCollapsed ? "-rotate-90" : "rotate-0"}`} />
                        </div>
                      </div>
                    </button>
                  )}

                  {!isCollapsed && (
                    <>
                      <div className="block sm:hidden space-y-3.5">
                        {group.orders.map((order) => {
                          return (
                            <OrderCard
                              key={order.id}
                              order={order}
                              products={products}
                              customerLookup={customerLookup}
                              onStatusChange={onStatusChange}
                              onGenerate={onGenerate}
                              onEdit={setEditOrder}
                              onDelete={setDeleteId}
                              onManagePayment={setPaymentOrder}
                              onViewItems={setViewingItemsOrder}
                            />
                          );
                        })}
                      </div>
                      <div className="hidden sm:block">
                        <OrdersTable
                          orders={group.orders}
                          products={products}
                          customerLookup={customerLookup}
                          onStatusChange={onStatusChange}
                          onGenerate={onGenerate}
                          onEdit={setEditOrder}
                          onDelete={setDeleteId}
                          onManagePayment={setPaymentOrder}
                          onViewItems={setViewingItemsOrder}
                        />
                      </div>
                    </>
                  )}
                </section>
              );
            })}
          </div>
        )}
      </div>

      {viewingItemsOrder !== null && (
        <OrderItemsModal
          order={viewingItemsOrder}
          products={products}
          customerLookup={customerLookup}
          onClose={() => setViewingItemsOrder(null)}
        />
      )}

      {(showModal || editOrder) && (
        <OrderModal
          key={editOrder ? `edit-${editOrder.id}` : (selectedCustomerForNewOrder ? `new-${selectedCustomerForNewOrder}` : "new-order")}
          initial={editOrder ?? undefined}
          products={products}
          customers={allCustomers}
          initialCustomer={selectedCustomerForNewOrder}
          onSave={(data) => {
            if (editOrder) {
              onEdit(editOrder.id, data);
              setEditOrder(null);
            } else {
              onAdd(data);
              setShowModal(false);
              setSelectedCustomerForNewOrder(null);
            }
          }}
          onClose={() => {
            setShowModal(false);
            setEditOrder(null);
            setSelectedCustomerForNewOrder(null);
          }}
        />
      )}
      {deleteId !== null && (
        <ConfirmDialog title="Delete Customer Order?" message="This customer order will be permanently removed."
          onConfirm={() => { onDelete(deleteId); setDeleteId(null); }} onCancel={() => setDeleteId(null)}
        />
      )}
      {paymentOrder !== null && (
        <PaymentModal
          order={paymentOrder}
          products={products}
          onSave={(orderId, amount) => {
            onUpdatePayment(orderId, amount);
            setPaymentOrder(null);
          }}
          onClose={() => setPaymentOrder(null)}
        />
      )}
    </>
  );
}

function Dashboard({ orders, products, customers: allCustomersList = [], setActive, onViewProductOrders, onOpenSidebar }: {
  orders: Order[]; products: Product[]; customers?: Customer[]; setActive: (v: string) => void; onViewProductOrders: (productId: number) => void; onOpenSidebar?: () => void;
}) {
  const [expandCustomers, setExpandCustomers] = useState(false);
  const [expandedProductId, setExpandedProductId] = useState<number | null>(null);
  const activeOrders = orders.filter((o) => !["Completed", "Cancelled"].includes(o.status));
  const totalKg = activeOrders.reduce((sum, o) => sum + getOrderTotalKg(o, products), 0);
  const totalPcs = activeOrders.reduce((sum, o) => sum + getOrderTotalPcs(o, products), 0);
  const activeProductCount = products.filter((p) => p.active).length;

  const productBreakdown = products.map((p) => {
    const orderList = activeOrders
      .filter((o) => getOrderItems(o).some((it) => it.productId === p.id))
      .sort((a, b) => a.deliveryDate.localeCompare(b.deliveryDate));
    const kg = orderList.reduce((sum, o) => {
      const it = getOrderItems(o).find((i) => i.productId === p.id);
      return sum + (Number(it?.qty) || 0);
    }, 0);
    return { product: p, kg, count: orderList.length, orders: orderList };
  }).filter((b) => b.count > 0);

  const statusCounts = STATUS_OPTIONS.reduce((acc, s) => { acc[s] = orders.filter((o) => o.status === s).length; return acc; }, {} as Record<string, number>);

  const customerMap = new Map<string, { orders: number; kg: number }>();
  activeOrders.forEach((o) => {
    const existing = customerMap.get(o.customer) ?? { orders: 0, kg: 0 };
    customerMap.set(o.customer, { orders: existing.orders + 1, kg: existing.kg + getOrderTotalKg(o, products) });
  });
  const customers = Array.from(customerMap.entries());
  const totalCustomerCount = Math.max(allCustomersList.length, customerMap.size);

  return (
    <>
      <PageHeader title="Dashboard" onMenu={onOpenSidebar} />
      <div className="mx-auto max-w-[1250px] px-3.5 py-5 sm:px-6 sm:py-8 lg:px-10">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-amber-600"><Factory className="size-4" /> Production Desk</div>
          <h2 className="mt-1 text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">Today&apos;s Sweet Production & Orders</h2>
          <p className="mt-1 text-xs sm:text-sm text-slate-500">Monitor daily production output, customer orders, and upcoming handovers.</p>
        </div>

        <div className="mt-5 sm:mt-6 grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
          <div className="rounded-xl sm:rounded-2xl border border-amber-200/80 bg-gradient-to-br from-white to-amber-50/40 p-3 sm:p-5 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between gap-1">
              <p className="text-[9px] sm:text-[11px] font-bold uppercase tracking-wider text-amber-700 truncate">Total Demand</p>
              <div className="size-6 sm:size-8 rounded-lg bg-amber-100 flex items-center justify-center text-amber-700 shrink-0"><Factory className="size-3.5 sm:size-4" /></div>
            </div>
            <div className="mt-2 sm:mt-2.5 flex items-baseline gap-1.5 flex-wrap">
              <span className="text-xl sm:text-3xl font-black text-slate-900">{totalKg.toFixed(2)}</span>
              <span className="text-[10px] sm:text-xs font-bold text-amber-600">kg active</span>
              {totalPcs > 0 && (
                <span className="text-xs sm:text-sm font-bold text-slate-500">
                  + {totalPcs} pcs
                </span>
              )}
            </div>
            <p className="mt-1 sm:mt-1.5 text-[10px] sm:text-xs text-slate-500 truncate">{activeOrders.length} orders in pipeline</p>
          </div>

          <div className="rounded-xl sm:rounded-2xl border border-blue-200/80 bg-gradient-to-br from-white to-blue-50/40 p-3 sm:p-5 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between gap-1">
              <p className="text-[9px] sm:text-[11px] font-bold uppercase tracking-wider text-blue-700 truncate">Sweet Products</p>
              <div className="size-6 sm:size-8 rounded-lg bg-blue-100 flex items-center justify-center text-blue-700 shrink-0"><Package className="size-3.5 sm:size-4" /></div>
            </div>
            <div className="mt-2 sm:mt-2.5 flex items-baseline gap-1">
              <span className="text-xl sm:text-3xl font-black text-slate-900">{activeProductCount}</span>
              <span className="text-[10px] sm:text-xs font-bold text-blue-600">catalog items</span>
            </div>
            <p className="mt-1 sm:mt-1.5 text-[10px] sm:text-xs text-slate-500 truncate">{productBreakdown.length} currently ordered</p>
          </div>

          <div className="rounded-xl sm:rounded-2xl border border-emerald-200/80 bg-gradient-to-br from-white to-emerald-50/40 p-3 sm:p-5 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between gap-1">
              <p className="text-[9px] sm:text-[11px] font-bold uppercase tracking-wider text-emerald-700 truncate">Kitchen Orders</p>
              <div className="size-6 sm:size-8 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-700 shrink-0"><ClipboardList className="size-3.5 sm:size-4" /></div>
            </div>
            <div className="mt-2 sm:mt-2.5 flex items-baseline gap-1">
              <span className="text-xl sm:text-3xl font-black text-slate-900">{activeOrders.length}</span>
              <span className="text-[10px] sm:text-xs font-bold text-emerald-600">orders</span>
            </div>
            <p className="mt-1 sm:mt-1.5 text-[10px] sm:text-xs text-slate-500 truncate">{customers.length} waiting for delivery</p>
          </div>

          <div
            onClick={() => setActive("Customers")}
            className="group cursor-pointer rounded-xl sm:rounded-2xl border border-violet-200/80 bg-gradient-to-br from-white to-violet-50/50 p-3 sm:p-5 shadow-xs hover:border-violet-400 hover:shadow-md hover:scale-[1.01] active:scale-[0.99] transition-all flex flex-col justify-between"
          >
            <div className="flex items-center justify-between gap-1">
              <p className="text-[9px] sm:text-[11px] font-bold uppercase tracking-wider text-violet-700 truncate">Saved Customers</p>
              <div className="size-6 sm:size-8 rounded-lg bg-violet-100 flex items-center justify-center text-violet-700 shrink-0 group-hover:scale-110 transition-transform"><Users className="size-3.5 sm:size-4" /></div>
            </div>
            <div className="mt-2 sm:mt-2.5 flex items-baseline gap-1">
              <span className="text-xl sm:text-3xl font-black text-slate-900">{totalCustomerCount}</span>
              <span className="text-[10px] sm:text-xs font-bold text-violet-600">registered</span>
            </div>
            <p className="mt-1 sm:mt-1.5 text-[10px] sm:text-xs font-semibold text-violet-700 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
              <span>View & Manage →</span>
            </p>
          </div>
        </div>

        {productBreakdown.length > 0 && (
          <div className="mt-7 sm:mt-8">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h3 className="text-base sm:text-xl font-bold text-slate-900">Production Breakdown by Sweet</h3>
                <p className="text-xs sm:text-sm text-slate-500">Tap any sweet to see customers, order notes, and handover deadlines.</p>
              </div>
            </div>
            <div className="mt-3.5 sm:mt-4 overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm divide-y divide-slate-100">
              {productBreakdown.map(({ product, kg, count, orders: productOrders }) => {
                const isExpanded = expandedProductId === product.id;
                return (
                  <div key={product.id} className="transition-colors">
                    <button onClick={() => setExpandedProductId(isExpanded ? null : product.id)}
                      className={`flex w-full items-center justify-between gap-2.5 p-3.5 sm:px-6 sm:py-4 text-left transition-colors hover:bg-slate-50/80 ${isExpanded ? "bg-amber-50/40" : ""}`}>
                      <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
                        <div className="flex size-10 sm:size-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-100 to-amber-200 border border-amber-300/40 text-amber-900 font-bold text-xs sm:text-sm shadow-2xs">
                          {product.name.split(" ").map((w) => w[0]).join("").slice(0, 2)}
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-slate-900 text-sm sm:text-base truncate">{product.name}</p>
                          <p className="text-xs text-slate-500 truncate">
                            <span className="font-semibold text-slate-700">{count} order{count !== 1 ? "s" : ""}</span>
                            <span className="hidden sm:inline"> · {isExpanded ? "Hide breakdown" : "Click to view customers & schedule"}</span>
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                        <div className="text-right">
                          <p className="text-base sm:text-xl font-extrabold text-slate-950">
                            {isWholeNumberUnit(product.unit) ? Math.round(kg) : kg.toFixed(2)}
                          </p>
                          <p className="text-[10px] sm:text-xs font-semibold text-slate-400 uppercase">{product.unit}</p>
                        </div>
                        <button onClick={(e) => { e.stopPropagation(); onViewProductOrders(product.id); }}
                          className="rounded-lg border border-amber-200 bg-amber-50/80 px-2 sm:px-2.5 py-1 text-xs font-bold text-amber-700 hover:bg-amber-100 hover:border-amber-300 transition-colors shadow-2xs" title="Open filtered Orders">
                          Orders →
                        </button>
                        <div className={`text-slate-400 transition-transform ${isExpanded ? "rotate-90" : ""}`}><ChevronRight className="size-4" /></div>
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="border-t border-slate-200/90 bg-slate-50/50">
                        <div className="block sm:hidden p-3 space-y-2.5">
                          {productOrders.map((o) => {
                            const badge = getHandoverBadge(o.deliveryDate);
                            const rawQty = getOrderItems(o).find(it => it.productId === product.id)?.qty ?? o.qty ?? 0;
                            const displayQty = isWholeNumberUnit(product.unit) ? Math.round(Number(rawQty)) : rawQty;
                            return (
                              <div key={o.id} className="rounded-xl border border-slate-200 bg-white p-3 shadow-2xs space-y-2">
                                <div className="flex items-center justify-between gap-2">
                                  <div className="flex items-center gap-2 min-w-0">
                                    <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-amber-100 text-[11px] font-bold text-amber-800">{o.customer.charAt(0).toUpperCase()}</div>
                                    <div className="min-w-0">
                                      <p className="text-sm font-bold text-slate-900 truncate">{o.customer}</p>

                                    </div>
                                  </div>
                                  <Badge status={o.status} />
                                </div>
                                {o.notes && (<div className="rounded-lg bg-amber-50/70 border border-amber-200/50 px-2.5 py-1 text-xs text-amber-900 italic">&ldquo;{o.notes}&rdquo;</div>)}
                                <div className="flex items-center justify-between border-t border-slate-100 pt-2 text-xs">
                                  <div className="flex items-center gap-1.5 text-slate-600">
                                    <Calendar className="size-3.5 text-amber-600" />
                                    <span className="font-semibold text-slate-800">{dateLabel(o.deliveryDate)}</span>
                                    {badge && (<span className={`inline-flex items-center rounded-md border px-1.5 py-0.5 text-[9px] font-bold ${badge.style}`}>{badge.label}</span>)}
                                  </div>
                                  <span className="text-sm font-extrabold text-amber-700">{displayQty} {product.unit}</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        <div className="hidden sm:block">
                          <div className="grid grid-cols-[1fr_90px_140px_110px] gap-2 px-6 py-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200 bg-slate-100/60">
                            <span>Customer</span><span className="text-right">Quantity</span><span className="text-right">Handover Date</span><span className="text-right">Status</span>
                          </div>
                          <div className="divide-y divide-slate-100">
                            {productOrders.map((o) => {
                              const badge = getHandoverBadge(o.deliveryDate);
                              const rawQty = getOrderItems(o).find(it => it.productId === product.id)?.qty ?? o.qty ?? 0;
                              const displayQty = isWholeNumberUnit(product.unit) ? Math.round(Number(rawQty)) : rawQty;
                              return (
                                <div key={o.id} className="grid grid-cols-[1fr_90px_140px_110px] gap-2 items-center px-6 py-3 hover:bg-amber-50/40 transition-colors">
                                  <div className="flex items-center gap-2.5 min-w-0">
                                    <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-amber-100 text-[10px] font-bold text-amber-800">{o.customer.charAt(0).toUpperCase()}</div>
                                    <div className="min-w-0">
                                      <p className="text-sm font-bold truncate text-slate-900">{o.customer}</p>
                                      <p className="text-[11px] text-slate-400 truncate">{o.notes ? `"${o.notes}"` : ""}</p>
                                    </div>
                                  </div>
                                  <p className="text-sm font-bold text-right text-amber-600">{displayQty} {product.unit}</p>
                                  <div className="text-right">
                                    <div className="inline-flex items-center gap-1 text-sm justify-end"><Calendar className="size-3 text-amber-600" /><span className="font-bold text-slate-800">{dateLabel(o.deliveryDate)}</span></div>
                                    {badge && (<div className="mt-0.5"><span className={`inline-flex items-center rounded-md border px-1.5 py-0.5 text-[9px] font-bold ${badge.style}`}>{badge.label}</span></div>)}
                                  </div>
                                  <div className="text-right"><Badge status={o.status} /></div>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-t border-slate-200 bg-white p-3.5 sm:px-6 sm:py-3">
                          <p className="text-xs text-slate-600 text-center sm:text-left">
                            Total for {product.name}: <strong className="text-slate-900 font-bold">{isWholeNumberUnit(product.unit) ? Math.round(kg) : kg.toFixed(2)} {product.unit}</strong> across {count} customer order{count !== 1 ? "s" : ""}
                          </p>
                          <button onClick={(e) => { e.stopPropagation(); onViewProductOrders(product.id); }}
                            className="flex items-center justify-center gap-1.5 rounded-xl bg-amber-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-amber-700 transition-colors shadow-sm">
                            Open in Orders <ArrowRight className="size-3.5" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Status Summary */}
        <div className="mt-7 sm:mt-8">
          <h3 className="text-base sm:text-xl font-bold text-slate-900 mb-3.5">Order Status Summary</h3>
          <div className="grid gap-2 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
            {STATUS_OPTIONS.map((s) => {
              const style = STATUS_STYLES[s];
              const count = statusCounts[s] ?? 0;
              return (
                <div key={s} className={`rounded-xl border p-3.5 ${style.bg} ${style.border}`}>
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <span className={`size-2 rounded-full ${style.dot}`} />
                    <p className={`text-[10px] font-bold uppercase tracking-wider ${style.text}`}>{s}</p>
                  </div>
                  <p className={`text-2xl font-black ${style.text}`}>{count}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Customers */}
        {customers.length > 0 && (
          <div className="mt-7 sm:mt-8">
            <div className="flex items-center justify-between mb-3.5">
              <h3 className="text-base sm:text-xl font-bold text-slate-900">Active Customers ({customers.length})</h3>
              {customers.length > 5 && (
                <button onClick={() => setExpandCustomers(!expandCustomers)} className="text-xs font-bold text-amber-600 hover:text-amber-700">
                  {expandCustomers ? "Show less" : `Show all ${customers.length}`}
                </button>
              )}
            </div>
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm divide-y divide-slate-100">
              {(expandCustomers ? customers : customers.slice(0, 5)).map(([name, data]) => (
                <div key={name} className="flex items-center justify-between gap-3 p-4 sm:px-6 sm:py-4 hover:bg-slate-50/80 transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-900 font-bold text-sm">{name.charAt(0).toUpperCase()}</div>
                    <p className="font-bold text-slate-900 truncate">{name}</p>
                  </div>
                  <div className="flex items-center gap-4 shrink-0 text-right">
                    <div>
                      <p className="text-xs font-bold text-slate-900">{data.orders} order{data.orders !== 1 ? "s" : ""}</p>
                      <p className="text-[10px] text-slate-400">{data.kg.toFixed(2)} kg total</p>
                    </div>
                    <button onClick={() => setActive("Orders")} className="text-xs font-bold text-amber-600 hover:text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-lg">
                      View →
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {orders.length === 0 && (
          <div className="mt-8 flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-white py-16 text-center p-4">
            <ClipboardList className="size-12 text-amber-600" />
            <p className="mt-4 text-lg font-bold text-slate-800">No orders yet</p>
            <p className="mt-1 text-sm text-slate-500">Head to Orders to place your first customer order.</p>
            <button onClick={() => setActive("Orders")} className="mt-5 rounded-xl bg-amber-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-amber-700 shadow-sm">
              Go to Orders
            </button>
          </div>
        )}
      </div>
    </>
  );
}

function CustomerModal({ initial, onSave, onClose }: {
  initial?: Customer;
  onSave: (data: CustomerFormData) => void;
  onClose: () => void;
}) {
  useModalBackHandler(true, onClose);
  const [form, setForm] = useState<CustomerFormData>({
    name: initial?.name ?? "",
    phone: initial?.phone ?? "",
    address: initial?.address ?? "",
    notes: initial?.notes ?? "",
  });
  const [errors, setErrors] = useState<Partial<CustomerFormData>>({});

  const validate = () => {
    const e: Partial<CustomerFormData> = {};
    if (!form.name.trim()) e.name = "Customer name is required";
    return e;
  };

  const submit = () => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    onSave(form);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/50 backdrop-blur-xs p-3 sm:p-4 flex items-center justify-center">
      <div className="my-auto w-full max-w-md max-h-[92vh] flex flex-col rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden">
        <div className="shrink-0 flex items-center justify-between border-b border-slate-200 px-4 py-3.5 sm:px-6 sm:py-5 bg-slate-50">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-amber-600">{initial ? "Edit" : "New"} Customer</p>
            <h3 className="mt-0.5 text-base sm:text-lg font-bold text-slate-900">{initial ? "Update Customer Details" : "Add New Customer"}</h3>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200"><X className="size-4" /></button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-4 px-4 py-5 sm:px-6 sm:py-6">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">Customer Name *</label>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Grand Banquets, Deen Sweets"
              className={`w-full rounded-xl border px-3.5 py-2.5 text-sm outline-none focus:border-amber-600 focus:ring-2 focus:ring-amber-500/20 transition-all ${errors.name ? "border-rose-400 bg-rose-50/30" : "border-slate-300"}`}
            />
            {errors.name && <p className="mt-1 text-xs text-rose-600">{errors.name}</p>}
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">Phone Number</label>
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="e.g. 0756656135"
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm outline-none focus:border-amber-600 focus:ring-2 focus:ring-amber-500/20 transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">Address / Location</label>
            <input
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              placeholder="e.g. 138 France City, Maruthamunai"
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm outline-none focus:border-amber-600 focus:ring-2 focus:ring-amber-500/20 transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">Customer Notes / Preferences</label>
            <textarea
              rows={2}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="e.g. Regular wholesale buyer, prefers delivery in mornings"
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm outline-none focus:border-amber-600 focus:ring-2 focus:ring-amber-500/20 transition-all"
            />
          </div>
        </div>

        <div className="shrink-0 flex items-center justify-end gap-3 border-t border-slate-200 px-4 py-3 sm:px-6 sm:py-4 bg-slate-50">
          <button onClick={onClose} className="rounded-xl border border-slate-300 px-4 py-2 text-xs sm:text-sm font-semibold text-slate-700 hover:bg-slate-100 transition-colors">
            Cancel
          </button>
          <button onClick={submit} className="rounded-xl bg-amber-600 px-5 py-2 text-xs sm:text-sm font-semibold text-white hover:bg-amber-700 shadow-sm transition-colors">
            {initial ? "Save Changes" : "Add Customer"}
          </button>
        </div>
      </div>
    </div>
  );
}

function CustomerDetailsModal({ customer, stats, onCreateOrder, onEdit, onClose }: {
  customer: Customer;
  stats?: { totalOrders: number; activeOrders: number; totalKg: number; lastDate: string };
  onCreateOrder: (name: string) => void;
  onEdit: (c: Customer) => void;
  onClose: () => void;
}) {
  useModalBackHandler(true, onClose);
  const initials = customer.name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/60 backdrop-blur-xs p-3 sm:p-4 flex items-center justify-center" onClick={onClose}>
      <div className="my-auto w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3.5 bg-slate-50">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-100 to-amber-100 text-amber-900 font-bold text-xs border border-amber-300/40">
              {initials}
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 block">Customer Profile</span>
              <h3 className="text-base font-bold text-slate-900 truncate leading-tight">{customer.name}</h3>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200 transition-colors">
            <X className="size-4" />
          </button>
        </div>

        <div className="p-4 sm:p-5 space-y-3.5">
          {/* Contact & Location Info */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3.5 space-y-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Mobile Phone</p>
              {customer.phone ? (
                <a href={`tel:${customer.phone}`} className="inline-flex items-center gap-1.5 text-sm font-bold text-amber-700 hover:underline mt-0.5">
                  <Phone className="size-3.5 text-amber-600" />
                  <span>{customer.phone}</span>
                </a>
              ) : (
                <p className="text-xs text-slate-400 italic mt-0.5">No phone number recorded</p>
              )}
            </div>

            <div className="pt-2 border-t border-slate-200/70">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Delivery Address / Location</p>
              {customer.address ? (
                <p className="text-xs font-semibold text-slate-700 flex items-start gap-1.5 mt-0.5">
                  <MapPin className="size-3.5 text-amber-600 mt-0.5 shrink-0" />
                  <span>{customer.address}</span>
                </p>
              ) : (
                <p className="text-xs text-slate-400 italic mt-0.5">No location recorded</p>
              )}
            </div>

            {customer.notes && (
              <div className="pt-2 border-t border-slate-200/70">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Notes & Preferences</p>
                <p className="text-xs text-slate-600 italic bg-amber-50/70 border border-amber-200/60 rounded-lg p-2.5 mt-1">
                  &ldquo;{customer.notes}&rdquo;
                </p>
              </div>
            )}
          </div>

          {/* Stats summary */}
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-xl border border-slate-200 bg-white p-3 text-center shadow-2xs">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Orders</p>
              <p className="text-xl font-black text-slate-900 mt-0.5">{stats?.totalOrders ?? 0}</p>
              <p className="text-[10px] text-slate-400">{stats?.activeOrders ? `${stats.activeOrders} active` : "all delivered"}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-3 text-center shadow-2xs">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Volume</p>
              <p className="text-xl font-black text-amber-700 mt-0.5">{(stats?.totalKg ?? 0).toFixed(1)} <span className="text-xs font-bold">kg</span></p>
              <p className="text-[10px] text-slate-400">{stats?.lastDate ? `Last: ${dateLabel(stats.lastDate)}` : "No orders"}</p>
            </div>
          </div>
        </div>

        <div className="flex gap-2.5 border-t border-slate-200 px-4 py-3 bg-slate-50">
          <button
            onClick={() => {
              onClose();
              onCreateOrder(customer.name);
            }}
            className="flex-1 rounded-xl bg-amber-600 py-2.5 text-xs font-bold text-white hover:bg-amber-700 transition-colors shadow-2xs flex items-center justify-center gap-1.5"
          >
            <Plus className="size-3.5" />
            <span>Place Order</span>
          </button>
          <button
            onClick={() => {
              onClose();
              onEdit(customer);
            }}
            className="rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors flex items-center gap-1.5"
          >
            <Edit2 className="size-3.5" />
            <span>Edit</span>
          </button>
        </div>
      </div>
    </div>
  );
}

function CustomersPage({
  customers,
  orders,
  products,
  onAdd,
  onEdit,
  onDelete,
  onCreateOrder,
  onOpenSidebar,
}: {
  customers: Customer[];
  orders: Order[];
  products?: Product[];
  onAdd: (data: CustomerFormData) => void;
  onEdit: (id: number | string, data: CustomerFormData) => void;
  onDelete: (id: number | string, name: string) => void;
  onCreateOrder: (customerName: string) => void;
  onOpenSidebar?: () => void;
}) {
  const [showModal, setShowModal] = useState(false);
  const [editCustomer, setEditCustomer] = useState<Customer | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Customer | null>(null);
  const [detailsCustomer, setDetailsCustomer] = useState<Customer | null>(null);
  const [query, setQuery] = useState("");

  // Customer order stats
  const customerStats = useMemo(() => {
    const map = new Map<string, { totalOrders: number; activeOrders: number; totalKg: number; lastDate: string }>();
    for (const o of orders) {
      const name = o.customer?.trim();
      if (!name) continue;
      const cur = map.get(name) ?? { totalOrders: 0, activeOrders: 0, totalKg: 0, lastDate: "" };
      cur.totalOrders += 1;
      if (!["Completed", "Cancelled"].includes(o.status)) {
        cur.activeOrders += 1;
      }
      cur.totalKg += getOrderTotalKg(o, products);
      if (!cur.lastDate || o.date > cur.lastDate) {
        cur.lastDate = o.date;
      }
      map.set(name, cur);
    }
    return map;
  }, [orders, products]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.phone && c.phone.toLowerCase().includes(q)) ||
        (c.address && c.address.toLowerCase().includes(q)) ||
        (c.notes && c.notes.toLowerCase().includes(q))
    );
  }, [customers, query]);

  const totalActiveCustomers = Array.from(customerStats.values()).filter((s) => s.activeOrders > 0).length;

  return (
    <>
      <PageHeader
        title="Customers"
        onMenu={onOpenSidebar}
        action={
          <button
            onClick={() => { setEditCustomer(null); setShowModal(true); }}
            className="flex items-center gap-1.5 rounded-xl bg-amber-600 px-3.5 py-2 text-xs font-bold text-white shadow-sm hover:bg-amber-700 transition-colors"
          >
            <Plus className="size-4" />
            <span>Add Customer</span>
          </button>
        }
      />

      <div className="mx-auto max-w-[1250px] px-3.5 py-5 sm:px-6 sm:py-8 lg:px-10">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-amber-600">
              <Users className="size-4" /> Customer Directory
            </div>
            <h2 className="mt-1 text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
              Customer Accounts & Contacts
            </h2>
            <p className="mt-1 text-xs sm:text-sm text-slate-500">
              Manage saved customer profiles, phone numbers, delivery locations, and order history.
            </p>
          </div>

          <button
            onClick={() => { setEditCustomer(null); setShowModal(true); }}
            className="hidden sm:inline-flex items-center gap-2 rounded-xl bg-amber-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-amber-700 hover:shadow-md transition-all self-start sm:self-auto"
          >
            <Plus className="size-4" />
            <span>Add Customer</span>
          </button>
        </div>

        {/* Stats Row */}
        <div className="mt-5 grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-4">
          <div className="rounded-xl sm:rounded-2xl border border-slate-200/90 bg-white p-3 sm:p-4 shadow-xs">
            <p className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-400">Total Registered</p>
            <p className="text-xl sm:text-2xl font-black text-slate-900 mt-1">{customers.length}</p>
            <p className="text-[10px] sm:text-xs text-slate-500 mt-0.5">Saved in database</p>
          </div>
          <div className="rounded-xl sm:rounded-2xl border border-emerald-200/90 bg-emerald-50/40 p-3 sm:p-4 shadow-xs">
            <p className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-emerald-700">Active Buyers</p>
            <p className="text-xl sm:text-2xl font-black text-slate-900 mt-1">{totalActiveCustomers}</p>
            <p className="text-[10px] sm:text-xs text-slate-500 mt-0.5">Waiting for sweet orders</p>
          </div>
          <div className="col-span-2 sm:col-span-1 rounded-xl sm:rounded-2xl border border-amber-200/90 bg-amber-50/40 p-3 sm:p-4 shadow-xs">
            <p className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-amber-700">Order Reuse</p>
            <p className="text-xl sm:text-2xl font-black text-slate-900 mt-1">100%</p>
            <p className="text-[10px] sm:text-xs text-slate-500 mt-0.5">Auto-suggests in order form</p>
          </div>
        </div>

        {/* Search */}
        <div className="mt-5 sm:mt-6">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search customers by name, phone, or location..."
              className="w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 py-2.5 text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 outline-none focus:border-amber-600 focus:ring-2 focus:ring-amber-500/20 shadow-xs"
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400 hover:text-slate-600"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Customer Cards & Table */}
        {filtered.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center sm:p-12">
            <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
              <Users className="size-6" />
            </div>
            <h3 className="mt-4 text-base font-bold text-slate-900">
              {query ? "No matching customers found" : "No customers yet"}
            </h3>
            <p className="mt-1 text-xs sm:text-sm text-slate-500 max-w-sm mx-auto">
              {query ? "Try clearing your search query" : "Add your first customer to quickly pick them whenever placing sweet production orders."}
            </p>
            {!query && (
              <button
                onClick={() => { setEditCustomer(null); setShowModal(true); }}
                className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-amber-600 px-4 py-2 text-xs font-bold text-white hover:bg-amber-700"
              >
                <Plus className="size-4" /> Add First Customer
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Mobile Line-by-Line List View */}
            <div className="mt-4 block sm:hidden overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-xs divide-y divide-slate-100">
              {filtered.map((c) => {
                const stats = customerStats.get(c.name.trim());
                const initials = c.name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
                return (
                  <div key={c.id ?? c.name} className="flex items-center justify-between gap-2.5 px-3.5 py-2.5 hover:bg-slate-50/80 transition-colors">
                    <button
                      type="button"
                      onClick={() => setDetailsCustomer(c)}
                      className="flex items-center gap-2.5 min-w-0 flex-1 text-left group"
                    >
                      <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-100 to-amber-100 text-amber-900 font-bold text-xs border border-amber-300/40">
                        {initials}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-slate-900 text-sm truncate leading-tight group-hover:text-amber-700 transition-colors">{c.name}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          {stats && stats.totalOrders > 0 ? (
                            <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200/80 px-1.5 py-0.2 rounded-md">
                              {stats.totalOrders} order{stats.totalOrders !== 1 ? "s" : ""}
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-400 italic">New Customer</span>
                          )}
                          <span className="text-[10px] text-slate-400 group-hover:text-amber-600">· Details ↗</span>
                        </div>
                      </div>
                    </button>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => onCreateOrder(c.name)}
                        className="rounded-lg bg-amber-50 border border-amber-200 px-2.5 py-1 text-xs font-bold text-amber-700 hover:bg-amber-100 transition-colors whitespace-nowrap"
                        title="Place order"
                      >
                        + Order
                      </button>
                      <button
                        onClick={() => { setEditCustomer(c); setShowModal(true); }}
                        className="rounded-lg border border-slate-200 p-1.5 text-slate-500 hover:text-amber-700 hover:bg-slate-100 transition-colors"
                        title="Edit Customer"
                      >
                        <Edit2 className="size-3.5" />
                      </button>
                      <button
                        onClick={() => setDeleteTarget(c)}
                        className="rounded-lg border border-slate-200 p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                        title="Delete Customer"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop / Tablet Line-by-Line Table View */}
            <div className="mt-4 hidden sm:block overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-xs">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="border-b border-slate-200 bg-slate-50/75 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-5 py-3">Customer</th>
                    <th className="px-5 py-3">Order Activity</th>
                    <th className="px-5 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map((c) => {
                    const stats = customerStats.get(c.name.trim());
                    const initials = c.name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
                    return (
                      <tr key={c.id ?? c.name} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-5 py-3">
                          <button
                            type="button"
                            onClick={() => setDetailsCustomer(c)}
                            className="flex items-center gap-3 text-left group"
                          >
                            <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-100 to-amber-100 text-amber-900 font-bold text-xs border border-amber-300/40">
                              {initials}
                            </div>
                            <div className="min-w-0">
                              <span className="font-bold text-slate-900 block truncate group-hover:text-amber-700 transition-colors text-sm">{c.name}</span>
                              <span className="text-[11px] text-slate-400 group-hover:text-amber-600 transition-colors flex items-center gap-1">
                                <span>Click to view details</span>
                                <ArrowRight className="size-2.5" />
                              </span>
                            </div>
                          </button>
                        </td>
                        <td className="px-5 py-3">
                          {stats && stats.totalOrders > 0 ? (
                            <div>
                              <span className="font-bold text-slate-900">{stats.totalOrders} order{stats.totalOrders !== 1 ? "s" : ""}</span>
                              <span className="text-xs text-slate-500 block">({stats.totalKg.toFixed(1)} kg total)</span>
                            </div>
                          ) : (
                            <span className="text-xs font-medium text-slate-400">No orders yet</span>
                          )}
                        </td>
                        <td className="px-5 py-3 text-right">
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              onClick={() => onCreateOrder(c.name)}
                              className="rounded-lg bg-amber-50 border border-amber-200 px-2.5 py-1 text-xs font-bold text-amber-700 hover:bg-amber-100 transition-colors whitespace-nowrap"
                              title="Create order for this customer"
                            >
                              + Order
                            </button>
                            <button
                              onClick={() => { setEditCustomer(c); setShowModal(true); }}
                              className="rounded-lg border border-slate-200 p-1.5 text-slate-500 hover:text-amber-700 hover:bg-slate-100 transition-colors"
                              title="Edit Customer"
                            >
                              <Edit2 className="size-3.5" />
                            </button>
                            <button
                              onClick={() => setDeleteTarget(c)}
                              className="rounded-lg border border-slate-200 p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                              title="Delete Customer"
                            >
                              <Trash2 className="size-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {detailsCustomer && (
        <CustomerDetailsModal
          customer={detailsCustomer}
          stats={customerStats.get(detailsCustomer.name.trim())}
          onCreateOrder={onCreateOrder}
          onEdit={(c) => {
            setEditCustomer(c);
            setShowModal(true);
          }}
          onClose={() => setDetailsCustomer(null)}
        />
      )}

      {showModal && (
        <CustomerModal
          initial={editCustomer ?? undefined}
          onSave={(data) => {
            if (editCustomer && editCustomer.id !== undefined) {
              onEdit(editCustomer.id, data);
            } else {
              onAdd(data);
            }
            setShowModal(false);
            setEditCustomer(null);
          }}
          onClose={() => { setShowModal(false); setEditCustomer(null); }}
        />
      )}

      {deleteTarget && (
        <ConfirmDialog
          title="Delete Customer?"
          message={`Are you sure you want to delete "${deleteTarget.name}"? This removes them from your saved directory.`}
          onConfirm={() => {
            if (deleteTarget.id !== undefined) {
              onDelete(deleteTarget.id, deleteTarget.name);
            }
            setDeleteTarget(null);
          }}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </>
  );
}

// ============================================================
// ADMIN WORKSPACE COMPONENT
// ============================================================
export default function AdminWorkspace({ initialTab = "Dashboard" }: { initialTab?: "Dashboard" | "Orders" | "Products" | "Customers" }) {
  const router = useRouter();
  const [active, setActiveState] = useState<"Dashboard" | "Orders" | "Products" | "Customers">(initialTab);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [newOrderInitialCustomer, setNewOrderInitialCustomer] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [invoiceOrder, setInvoiceOrder] = useState<Order | null>(null);
  const [initialProductFilter, setInitialProductFilter] = useState<number | null>(null);

  // Sync tab changes with URL
  const setActive = (tab: "Dashboard" | "Orders" | "Products" | "Customers" | string) => {
    const validTab = tab as "Dashboard" | "Orders" | "Products" | "Customers";
    setActiveState(validTab);
    const targetPath = validTab === "Dashboard" ? "/dashboard" : validTab === "Orders" ? "/orders" : validTab === "Products" ? "/products" : "/customers";
    if (typeof window !== "undefined" && window.location.pathname !== targetPath) {
      window.history.pushState(null, "", targetPath);
    }
  };

  const addToast = (type: "success" | "error" | "info", message: string) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => { setToasts((prev) => prev.filter((t) => t.id !== id)); }, 4000);
  };

  const dismissToast = (id: string) => { setToasts((prev) => prev.filter((t) => t.id !== id)); };

  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      const client = getSupabase();
      if (!client) {
        router.replace("/login");
        setIsLoading(false);
        return;
      }

      // Purge any legacy localStorage cache keys so only live Supabase data is ever used
      try {
        localStorage.removeItem("dhuniya_orders");
        localStorage.removeItem("dhuniya_products");
        localStorage.removeItem("dhuniya_customers");
        localStorage.removeItem("dhuniya_customers_v2");
      } catch { }

      // Strictly verify authentication before querying business data
      try {
        const {
          data: { session },
        } = await client.auth.getSession();

        if (!session?.user) {
          router.replace("/login");
          setIsLoading(false);
          return;
        }
      } catch {
        router.replace("/login");
        setIsLoading(false);
        return;
      }
      try {
        const { data: prodData, error: prodErr } = await client
          .from("products")
          .select("id,name,name_tamil,name_sinhala,unit,price,active,image_url,images,description,contents")
          .order("id", { ascending: true });
        if (prodErr) throw prodErr;
        if (prodData && prodData.length > 0) {
          const loadedProducts: Product[] = prodData.map((p: any) => ({
            id: Number(p.id),
            name: p.name,
            nameTamil: p.name_tamil || undefined,
            nameSinhala: p.name_sinhala || undefined,
            unit: p.unit,
            price: Number(p.price),
            active: Boolean(p.active),
            imageUrl: p.image_url || undefined,
            images: Array.isArray(p.images) ? p.images : (p.images ? (() => { try { return JSON.parse(p.images); } catch { return []; } })() : []),
            description: p.description || undefined,
            contents: p.contents || undefined,
          }));

          // Deduplicate products by lowercase name so duplicates in database never double up
          const mapByName = new Map<string, Product>();
          for (const p of loadedProducts) {
            const key = p.name.trim().toLowerCase();
            const existing = mapByName.get(key);
            if (!existing) {
              mapByName.set(key, p);
            } else {
              mapByName.set(key, {
                ...existing,
                ...p,
                imageUrl: p.imageUrl || existing.imageUrl,
                images: (p.images && p.images.length > 0) ? p.images : existing.images,
                description: p.description || existing.description,
                contents: p.contents || existing.contents,
                nameTamil: p.nameTamil || existing.nameTamil,
                nameSinhala: p.nameSinhala || existing.nameSinhala,
              });
            }
          }
          const deduplicatedProducts = Array.from(mapByName.values()).sort((a, b) =>
            a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
          );
          setProducts(deduplicatedProducts);
        } else {
          setProducts([]);
        }
        const { data: ordData, error: ordErr } = await client.from("orders").select("*").order("created_at", { ascending: false });
        if (ordErr) throw ordErr;
        let loadedOrders: Order[] = [];
        if (ordData && ordData.length > 0) {
          loadedOrders = ordData.map((o: any) => {
            const parsedMeta = parseDhuniyaData(o.notes);
            let parsedItems: OrderItem[] = [];

            // 1. Dedicated o.items column
            if (o.items) {
              try {
                const raw = typeof o.items === "string" ? JSON.parse(o.items) : o.items;
                if (Array.isArray(raw)) {
                  parsedItems = raw.map((it: any) => ({
                    productId: Number(it.productId ?? it.product_id),
                    qty: Number(it.qty),
                    rate: it.rate ? Number(it.rate) : undefined,
                  })).filter((it: OrderItem) => Boolean(it.productId && it.qty));
                }
              } catch {}
            }

            // 2. Embedded items in notes
            if (parsedItems.length === 0 && parsedMeta.items && Array.isArray(parsedMeta.items)) {
              parsedItems = parsedMeta.items.map((it: any) => ({
                productId: Number(it.productId ?? it.product_id),
                qty: Number(it.qty),
                rate: it.rate ? Number(it.rate) : undefined,
              })).filter((it: OrderItem) => Boolean(it.productId && it.qty));
            }

            // 3. Legacy single product fallback
            if (parsedItems.length === 0 && o.product_id) {
              parsedItems = [{
                productId: Number(o.product_id),
                qty: Number(o.qty ?? 0),
                rate: o.rate ? Number(o.rate) : undefined,
              }];
            }

            const amountPaid = o.amount_paid != null
              ? Number(o.amount_paid)
              : (parsedMeta.amountPaid != null ? Number(parsedMeta.amountPaid) : 0);

            const paymentStatus = (o.payment_status
              || parsedMeta.paymentStatus
              || (amountPaid > 0 ? "Partial" : "Unpaid")) as Order["paymentStatus"];

            const consolidatedItems = consolidateOrderItems(parsedItems);

            return {
              id: o.id,
              date: o.date,
              deliveryDate: o.delivery_date,
              customer: o.customer,
              items: consolidatedItems,
              productId: consolidatedItems[0]?.productId ?? Number(o.product_id),
              qty: consolidatedItems.reduce((s, it) => s + it.qty, 0),
              rate: consolidatedItems[0]?.rate ?? (o.rate ? Number(o.rate) : undefined),
              status: o.status,
              notes: parsedMeta.cleanNotes,
              phone: o.phone || undefined,
              address: o.address || undefined,
              amountPaid,
              paymentStatus,
            };
          });
        }

        setOrders(loadedOrders);

        // Load customers from Supabase only
        let remoteCust: Customer[] = [];
        try {
          const { data: cData } = await client.from("customers").select("id,name,phone,address,notes,created_at").order("name");
          if (cData && cData.length > 0) {
            remoteCust = cData.map((c: any) => ({
              id: c.id,
              name: c.name?.trim(),
              phone: c.phone || undefined,
              address: c.address || undefined,
              notes: c.notes || undefined,
              createdAt: c.created_at || undefined,
            })).filter((c: Customer) => Boolean(c.name));
          }
        } catch {
          try {
            const { data: minData } = await client.from("customers").select("id,name,phone").order("name");
            if (minData) {
              remoteCust = minData.map((c: any) => ({
                id: c.id,
                name: c.name?.trim(),
                phone: c.phone || undefined,
              })).filter((c: Customer) => Boolean(c.name));
            }
          } catch { }
        }

        setCustomers(remoteCust.sort((a, b) => a.name.localeCompare(b.name)));
      } catch (err: any) {
        console.error("Error loading Supabase data:", err);
        addToast("error", `Failed to load data from database: ${err.message || "Check your connection"}`);
      } finally { setIsLoading(false); }
    }
    loadData();
  }, []);

  const handleLogout = async () => {
    const client = getSupabase();
    if (client) {
      await client.auth.signOut();
    }
    router.push("/login");
  };

  const viewProductOrders = (productId: number) => { setInitialProductFilter(productId); setActive("Orders"); };

  const addProduct = async (data: ProductFormData) => {
    const tempId = Date.now();
    const newProduct: Product = {
      id: tempId,
      name: data.name.trim(),
      nameTamil: data.nameTamil?.trim() || undefined,
      nameSinhala: data.nameSinhala?.trim() || undefined,
      unit: data.unit,
      price: Number(data.price),
      active: data.active,
      imageUrl: data.imageUrl?.trim() || undefined,
      images: data.images ?? [],
      description: data.description?.trim() || undefined,
      contents: data.contents?.trim() || undefined,
    };
    setProducts((prev) => [...prev, newProduct]);
    addToast("success", `Sweet "${data.name}" added`);
    const client = getSupabase();
    if (client) {
      try {
        let { data: inserted, error } = await client.from("products").insert({
          name: data.name.trim(),
          name_tamil: data.nameTamil?.trim() || null,
          name_sinhala: data.nameSinhala?.trim() || null,
          unit: data.unit,
          price: Number(data.price),
          active: data.active,
          image_url: data.imageUrl?.trim() || null,
          images: data.images && data.images.length > 0 ? data.images : null,
          description: data.description?.trim() || null,
          contents: data.contents?.trim() || null,
        }).select().single();

        // Fallback: save with only core columns if new columns don't exist yet
        if (error && (error.message?.includes("column") || error.code === "PGRST204")) {
          const fallback = await client.from("products").insert({
            name: data.name.trim(),
            unit: data.unit,
            price: Number(data.price),
            active: data.active,
            image_url: data.imageUrl?.trim() || null,
            description: data.description?.trim() || null,
          }).select().single();
          inserted = fallback.data;
          error = fallback.error;
        }

        if (error) throw error;
        if (inserted) { setProducts((prev) => prev.map((p) => (p.id === tempId ? { ...p, id: Number(inserted.id) } : p))); }
      } catch (err: any) { addToast("error", `Failed to save product: ${err.message}`); setProducts((prev) => prev.filter((p) => p.id !== tempId)); }
    }
  };

  const editProduct = async (id: number, data: ProductFormData) => {
    const prevProducts = [...products];
    const current = products.find((p) => p.id === id);

    // If existing image changed or was cleared, delete the old image from Cloudinary
    if (current?.imageUrl && current.imageUrl !== data.imageUrl) {
      deleteCloudinaryImage(current.imageUrl);
    }

    const updatedProduct: Product = {
      id,
      name: data.name.trim(),
      nameTamil: data.nameTamil?.trim() || undefined,
      nameSinhala: data.nameSinhala?.trim() || undefined,
      unit: data.unit,
      price: Number(data.price),
      active: data.active,
      imageUrl: data.imageUrl?.trim() || undefined,
      images: data.images ?? [],
      description: data.description?.trim() || undefined,
      contents: data.contents?.trim() || undefined,
    };
    setProducts((prev) => prev.map((p) => (p.id === id ? updatedProduct : p)));
    addToast("success", `Sweet "${data.name}" updated`);
    const client = getSupabase();
    if (client) {
      try {
        let { error } = await client.from("products").update({
          name: data.name.trim(),
          name_tamil: data.nameTamil?.trim() || null,
          name_sinhala: data.nameSinhala?.trim() || null,
          unit: data.unit,
          price: Number(data.price),
          active: data.active,
          image_url: data.imageUrl?.trim() || null,
          images: data.images && data.images.length > 0 ? data.images : null,
          description: data.description?.trim() || null,
          contents: data.contents?.trim() || null,
        }).eq("id", id);

        // Fallback: update with only core columns if new columns don't exist yet
        if (error && (error.message?.includes("column") || error.code === "PGRST204")) {
          const fallback = await client.from("products").update({
            name: data.name.trim(),
            unit: data.unit,
            price: Number(data.price),
            active: data.active,
            image_url: data.imageUrl?.trim() || null,
            description: data.description?.trim() || null,
          }).eq("id", id);
          error = fallback.error;
        }

        if (error) throw error;
      } catch (err: any) { addToast("error", `Supabase update failed: ${err.message}`); setProducts(prevProducts); }
    }
  };

  const deleteProduct = async (id: number) => {
    const prevProducts = [...products];
    const target = products.find((p) => p.id === id);

    // Delete image from Cloudinary storage to save quota
    if (target?.imageUrl) {
      deleteCloudinaryImage(target.imageUrl);
    }

    setProducts((prev) => prev.filter((p) => p.id !== id));
    addToast("info", `Deleted "${target?.name ?? "Sweet"}"`);
    const client = getSupabase();
    if (client) {
      try { const { error } = await client.from("products").delete().eq("id", id); if (error) throw error; }
      catch (err: any) { addToast("error", `Supabase delete failed: ${err.message}`); setProducts(prevProducts); }
    }
  };

  const addOrder = async (data: OrderFormData) => {
    const newOrderId = genOrderId(orders);
    const parsedItems: OrderItem[] = consolidateOrderItems((data.items && data.items.length > 0)
      ? data.items.map((it) => ({
        productId: Number(it.productId),
        qty: Number(it.qty),
        rate: it.rate ? Number(it.rate) : undefined,
      }))
      : (data.productId ? [{ productId: Number(data.productId), qty: Number(data.qty), rate: data.rate ? Number(data.rate) : undefined }] : []));

    const primaryItem = parsedItems[0];
    const totalQty = parsedItems.reduce((sum, it) => sum + it.qty, 0);

    const cleanUserNotes = parseDhuniyaData(data.notes).cleanNotes;
    const newOrder: Order = {
      id: newOrderId,
      date: getTodayStr(),
      deliveryDate: data.deliveryDate,
      customer: data.customer.trim(),
      items: parsedItems,
      productId: primaryItem?.productId ?? 0,
      qty: totalQty,
      rate: primaryItem?.rate,
      status: "Pending",
      notes: cleanUserNotes,
      phone: data.phone?.trim() || undefined,
      address: data.address?.trim() || undefined,
      amountPaid: 0,
      paymentStatus: "Unpaid",
    };
    setOrders((prev) => [newOrder, ...prev]);

    // Auto-save customer name, phone, address for dropdown & directory reuse
    const custName = data.customer.trim();
    const custPhone = data.phone?.trim() || undefined;
    const custAddress = data.address?.trim() || undefined;

    if (custName) {
      setCustomers((prev) => {
        const existing = prev.find((c) => c.name.toLowerCase() === custName.toLowerCase());
        let updated: Customer[];
        if (existing) {
          updated = prev.map((c) =>
            c.name.toLowerCase() === custName.toLowerCase()
              ? {
                ...c,
                phone: custPhone || c.phone,
                address: custAddress || c.address,
              }
              : c
          );
        } else {
          const newC: Customer = {
            id: Date.now(),
            name: custName,
            phone: custPhone,
            address: custAddress,
          };
          updated = [...prev, newC].sort((a, b) => a.name.localeCompare(b.name));
        }
        return updated;
      });

      const client = getSupabase();
      if (client) {
        client.from("customers").upsert(
          {
            name: custName,
            phone: custPhone || null,
            address: custAddress || null,
          },
          { onConflict: "name" }
        ).then(() => { }, () => {
          client.from("customers").insert({ name: custName, phone: custPhone || null }).then(() => { }, () => { });
        });
      }
    }

    addToast("success", `Order placed for ${newOrder.customer}`);
    const client = getSupabase();
    if (client) {
      try {
        const metaTag = encodeDhuniyaData({
          items: newOrder.items,
          amountPaid: newOrder.amountPaid ?? 0,
          paymentStatus: newOrder.paymentStatus ?? "Unpaid",
        });
        const combinedNotes = newOrder.notes ? `${newOrder.notes}\n${metaTag}` : metaTag;

        // Try inserting with items, amount_paid, payment_status
        let { error } = await client.from("orders").insert({
          id: newOrder.id,
          date: newOrder.date,
          delivery_date: newOrder.deliveryDate,
          customer: newOrder.customer,
          items: newOrder.items,
          product_id: newOrder.productId || null,
          qty: newOrder.qty,
          rate: newOrder.rate ?? null,
          status: newOrder.status,
          notes: combinedNotes,
          phone: newOrder.phone ?? null,
          address: newOrder.address ?? null,
          amount_paid: newOrder.amountPaid ?? 0,
          payment_status: newOrder.paymentStatus ?? "Unpaid",
        });

        // Fallback: table might not have dedicated items/payment columns yet, so notes holds them safely
        if (error) {
          console.warn("Supabase direct insert notice, attempting schema fallback:", error.message);
          const fbPayload: any = {
            id: newOrder.id,
            date: newOrder.date,
            delivery_date: newOrder.deliveryDate,
            customer: newOrder.customer,
            product_id: newOrder.productId || null,
            qty: newOrder.qty,
            rate: newOrder.rate ?? null,
            status: newOrder.status,
            notes: combinedNotes,
            phone: newOrder.phone ?? null,
            address: newOrder.address ?? null,
          };
          const fb = await client.from("orders").insert(fbPayload);
          error = fb.error;

          if (error) {
            delete fbPayload.phone;
            delete fbPayload.address;
            const fb2 = await client.from("orders").insert(fbPayload);
            error = fb2.error;
          }
        }

        if (error) {
          console.warn("Supabase order insert note:", error.message);
        }
      } catch (err: any) {
        console.warn("Supabase network error:", err.message);
      }
    }
  };

  const editOrder = async (id: string, data: OrderFormData) => {
    const prevOrders = [...orders];
    const current = orders.find((o) => o.id === id);
    const parsedItems: OrderItem[] = consolidateOrderItems((data.items && data.items.length > 0)
      ? data.items.map((it) => ({
        productId: Number(it.productId),
        qty: Number(it.qty),
        rate: it.rate ? Number(it.rate) : undefined,
      }))
      : (data.productId ? [{ productId: Number(data.productId), qty: Number(data.qty), rate: data.rate ? Number(data.rate) : undefined }] : []));

    const primaryItem = parsedItems[0];
    const totalQty = parsedItems.reduce((sum, it) => sum + it.qty, 0);

    const prevAmountPaid = current?.amountPaid ?? 0;
    const newTotal = parsedItems.reduce((sum, it) => {
      const prod = products.find((p) => p.id === it.productId);
      const r = it.rate ?? prod?.price ?? 0;
      return sum + (it.qty * r);
    }, 0);

    const newPaymentStatus: Order["paymentStatus"] =
      prevAmountPaid >= newTotal && newTotal > 0
        ? "Paid"
        : prevAmountPaid > 0
        ? "Partial"
        : "Unpaid";

    const cleanUserNotes = parseDhuniyaData(data.notes).cleanNotes;

    const updatedOrder: Order = {
      id,
      date: current?.date ?? getTodayStr(),
      customer: data.customer.trim(),
      items: parsedItems,
      productId: primaryItem?.productId ?? current?.productId ?? 0,
      qty: totalQty,
      rate: primaryItem?.rate,
      deliveryDate: data.deliveryDate,
      notes: cleanUserNotes,
      phone: data.phone?.trim() || current?.phone || undefined,
      address: data.address?.trim() || current?.address || undefined,
      status: current?.status ?? "Pending",
      amountPaid: prevAmountPaid,
      paymentStatus: newPaymentStatus,
    };
    setOrders((prev) => prev.map((o) => (o.id === id ? updatedOrder : o)));

    // Auto-save customer name, phone, address for dropdown reuse
    const custName = data.customer.trim();
    const custPhone = data.phone?.trim() || undefined;
    const custAddress = data.address?.trim() || undefined;

    if (custName) {
      setCustomers((prev) => {
        const existing = prev.find((c) => c.name.toLowerCase() === custName.toLowerCase());
        let updated: Customer[];
        if (existing) {
          updated = prev.map((c) =>
            c.name.toLowerCase() === custName.toLowerCase()
              ? {
                ...c,
                phone: custPhone || c.phone,
                address: custAddress || c.address,
              }
              : c
          );
        } else {
          const newC: Customer = {
            id: Date.now(),
            name: custName,
            phone: custPhone,
            address: custAddress,
          };
          updated = [...prev, newC].sort((a, b) => a.name.localeCompare(b.name));
        }
        return updated;
      });

      const client = getSupabase();
      if (client) {
        client.from("customers").upsert(
          {
            name: custName,
            phone: custPhone || null,
            address: custAddress || null,
          },
          { onConflict: "name" }
        ).then(() => { }, () => {
          client.from("customers").insert({ name: custName, phone: custPhone || null }).then(() => { }, () => { });
        });
      }
    }

    addToast("success", `Order updated`);
    const client = getSupabase();
    if (client) {
      try {
        const cleanExistingNote = parseDhuniyaData(data.notes).cleanNotes || "";
        const metaTag = encodeDhuniyaData({
          items: updatedOrder.items,
          amountPaid: updatedOrder.amountPaid ?? 0,
          paymentStatus: updatedOrder.paymentStatus ?? "Unpaid",
        });
        const combinedNotes = cleanExistingNote ? `${cleanExistingNote}\n${metaTag}` : metaTag;

        let { error } = await client.from("orders").update({
          customer: data.customer.trim(),
          items: updatedOrder.items,
          product_id: updatedOrder.productId || null,
          qty: updatedOrder.qty,
          rate: updatedOrder.rate ?? null,
          delivery_date: data.deliveryDate,
          notes: combinedNotes,
          phone: updatedOrder.phone ?? null,
          address: updatedOrder.address ?? null,
          amount_paid: updatedOrder.amountPaid ?? 0,
          payment_status: updatedOrder.paymentStatus ?? "Unpaid",
        }).eq("id", id);

        if (error) {
          const fbPayload: any = {
            customer: data.customer.trim(),
            product_id: updatedOrder.productId || null,
            qty: updatedOrder.qty,
            rate: updatedOrder.rate ?? null,
            delivery_date: data.deliveryDate,
            notes: combinedNotes,
            phone: updatedOrder.phone ?? null,
            address: updatedOrder.address ?? null,
          };
          const fb = await client.from("orders").update(fbPayload).eq("id", id);
          error = fb.error;

          if (error) {
            delete fbPayload.phone;
            delete fbPayload.address;
            const fb2 = await client.from("orders").update(fbPayload).eq("id", id);
            error = fb2.error;
          }
        }
      } catch (err: any) {
        console.warn("Supabase update notice:", err.message);
      }
    }
  };

  const addCustomer = async (data: CustomerFormData) => {
    const trimmed = data.name.trim();
    if (!trimmed) return;
    if (customers.some((c) => c.name.toLowerCase() === trimmed.toLowerCase())) {
      addToast("error", `Customer "${trimmed}" already exists`);
      return;
    }

    let insertedId: any = Date.now();
    const client = getSupabase();
    if (client) {
      try {
        let { data: ins, error } = await client.from("customers").insert({
          name: trimmed,
          phone: data.phone.trim() || null,
          address: data.address.trim() || null,
          notes: data.notes.trim() || null,
        }).select();

        if (error) {
          const fb = await client.from("customers").insert({
            name: trimmed,
            phone: data.phone.trim() || null,
          }).select();
          if (fb.data?.[0]?.id) insertedId = fb.data[0].id;
        } else if (ins?.[0]?.id) {
          insertedId = ins[0].id;
        }
      } catch (err: any) {
        console.warn("Supabase customer insert warning:", err);
      }
    }

    const newCustomer: Customer = {
      id: insertedId,
      name: trimmed,
      phone: data.phone.trim() || undefined,
      address: data.address.trim() || undefined,
      notes: data.notes.trim() || undefined,
      createdAt: new Date().toISOString(),
    };

    setCustomers((prev) => {
      const updated = [...prev, newCustomer].sort((a, b) => a.name.localeCompare(b.name));
      return updated;
    });
    addToast("success", `Customer "${trimmed}" saved`);
  };

  const editCustomer = async (id: number | string, data: CustomerFormData) => {
    const trimmed = data.name.trim();
    if (!trimmed) return;

    const client = getSupabase();
    if (client) {
      try {
        let { error } = await client.from("customers").update({
          name: trimmed,
          phone: data.phone.trim() || null,
          address: data.address.trim() || null,
          notes: data.notes.trim() || null,
        }).eq("id", id);

        if (error) {
          await client.from("customers").update({
            name: trimmed,
            phone: data.phone.trim() || null,
          }).eq("id", id);
        }
      } catch (err: any) {
        console.warn("Supabase customer update error:", err);
      }
    }

    setCustomers((prev) => {
      const updated = prev.map((c) =>
        c.id === id || c.name.toLowerCase() === trimmed.toLowerCase()
          ? {
            ...c,
            name: trimmed,
            phone: data.phone.trim() || undefined,
            address: data.address.trim() || undefined,
            notes: data.notes.trim() || undefined,
          }
          : c
      ).sort((a, b) => a.name.localeCompare(b.name));
      return updated;
    });
    addToast("success", `Customer "${trimmed}" updated`);
  };

  const deleteCustomer = async (id: number | string, name: string) => {
    const prevCustomers = [...customers];
    setCustomers((prev) => prev.filter((c) => c.id !== id && c.name !== name));

    const client = getSupabase();
    if (client) {
      try {
        const { error } = await client.from("customers").delete().or(`id.eq.${id},name.eq.${name}`);
        if (error) throw error;
        addToast("info", `Customer "${name}" deleted`);
      } catch (err: any) {
        console.error("Failed to delete customer from Supabase:", err);
        setCustomers(prevCustomers);
        addToast("error", `Failed to delete customer: ${err.message}`);
      }
    } else {
      addToast("info", `Customer "${name}" deleted`);
    }
  };

  const deleteOrder = async (id: string) => {
    const prevOrders = [...orders];
    setOrders((prev) => prev.filter((o) => o.id !== id));
    addToast("info", "Order deleted");
    const client = getSupabase();
    if (client) {
      try { const { error } = await client.from("orders").delete().eq("id", id); if (error) throw error; }
      catch (err: any) { addToast("error", `Supabase delete failed: ${err.message}`); setOrders(prevOrders); }
    }
  };

  const updateStatus = async (id: string, status: string) => {
    const prevOrders = [...orders];
    setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, status } : o)));
    addToast("success", `Order ${id} status set to "${status}"`);
    const client = getSupabase();
    if (client) {
      try { const { error } = await client.from("orders").update({ status }).eq("id", id); if (error) throw error; }
      catch (err: any) { addToast("error", `Status update failed: ${err.message}`); setOrders(prevOrders); }
    }
  };

  const updatePayment = async (id: string, amountPaid: number) => {
    const target = orders.find((o) => o.id === id);
    if (!target) return;
    const total = getOrderTotal(target, products);
    const paymentStatus: Order["paymentStatus"] =
      amountPaid >= total && total > 0 ? "Paid" : amountPaid > 0 ? "Partial" : "Unpaid";

    const updatedOrders = orders.map((o) =>
      o.id === id ? { ...o, amountPaid, paymentStatus } : o
    );
    setOrders(updatedOrders);

    addToast("success", `Payment of ${money(amountPaid)} recorded for ${target.customer}`);

    const client = getSupabase();
    if (client) {
      try {
        // 1. Try updating direct columns in Supabase
        const { error } = await client
          .from("orders")
          .update({
            amount_paid: amountPaid,
            payment_status: paymentStatus,
          })
          .eq("id", id);

        // 2. Fallback: if columns don't exist yet, save payment info in notes
        if (error) {
          const cleanNote = parseDhuniyaData(target.notes).cleanNotes || "";
          const metaTag = encodeDhuniyaData({
            items: target.items,
            amountPaid,
            paymentStatus,
          });
          const combinedNotes = cleanNote ? `${cleanNote}\n${metaTag}` : metaTag;
          await client.from("orders").update({ notes: combinedNotes }).eq("id", id);
        }
      } catch (err: any) {
        console.warn("Supabase payment update note:", err.message);
      }
    }
  };

  const generateInvoice = (order: Order) => setInvoiceOrder(order);

  const activeOrderCount = orders.filter((o) => !["Completed", "Cancelled"].includes(o.status)).length;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 antialiased font-sans">
      <Sidebar active={active} setActive={setActive} open={sidebarOpen} setOpen={setSidebarOpen} orderCount={activeOrderCount} customerCount={customers.length} onLogout={handleLogout} />
      <main className="min-h-screen lg:ml-[260px] pb-24 lg:pb-16">
        {isLoading && (
          <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2 text-center text-xs font-semibold text-amber-800 flex items-center justify-center gap-2">
            <span className="size-2 rounded-full bg-amber-600 animate-ping" />
            Connecting and syncing with Supabase...
          </div>
        )}
        {active === "Dashboard" && (<Dashboard orders={orders} products={products} customers={customers} setActive={setActive} onViewProductOrders={viewProductOrders} onOpenSidebar={() => setSidebarOpen(true)} />)}
        {active === "Orders" && (<OrdersPage orders={orders} products={products} customers={customers} initialCustomer={newOrderInitialCustomer} onClearInitialCustomer={() => setNewOrderInitialCustomer(null)} onAdd={addOrder} onEdit={editOrder} onDelete={deleteOrder} onStatusChange={updateStatus} onGenerate={generateInvoice} onUpdatePayment={updatePayment} initialProductFilter={initialProductFilter} onClearProductFilter={() => setInitialProductFilter(null)} onOpenSidebar={() => setSidebarOpen(true)} />)}
        {active === "Products" && (<ProductsPage products={products} orders={orders} onAdd={addProduct} onEdit={editProduct} onDelete={deleteProduct} onViewProductOrders={viewProductOrders} onOpenSidebar={() => setSidebarOpen(true)} />)}
        {active === "Customers" && (<CustomersPage customers={customers} orders={orders} products={products} onAdd={addCustomer} onEdit={editCustomer} onDelete={deleteCustomer} onCreateOrder={(name) => { setNewOrderInitialCustomer(name); setActive("Orders"); }} onOpenSidebar={() => setSidebarOpen(true)} />)}
      </main>

      {/* Mobile Bottom Nav */}
      <nav className="fixed bottom-0 inset-x-0 z-30 flex h-16 items-center justify-around border-t border-slate-200/90 bg-white/95 backdrop-blur-md px-1 sm:px-2 lg:hidden shadow-[0_-2px_10px_rgba(0,0,0,0.03)]">
        <button onClick={() => setActive("Dashboard")} className={`flex flex-col items-center justify-center flex-1 py-1 transition-colors ${active === "Dashboard" ? "text-amber-600 font-bold" : "text-slate-400 hover:text-slate-700"}`}>
          <LayoutDashboard className="size-5" />
          <span className="text-[10px] mt-1 font-semibold">Dashboard</span>
        </button>
        <button onClick={() => setActive("Orders")} className={`relative flex flex-col items-center justify-center flex-1 py-1 transition-colors ${active === "Orders" ? "text-amber-600 font-bold" : "text-slate-400 hover:text-slate-700"}`}>
          <div className="relative">
            <ClipboardList className="size-5" />
            {activeOrderCount > 0 && (<span className="absolute -top-1 -right-2.5 flex size-4 items-center justify-center rounded-full bg-amber-600 text-[9px] font-bold text-white shadow-2xs">{activeOrderCount}</span>)}
          </div>
          <span className="text-[10px] mt-1 font-semibold">Orders</span>
        </button>
        <button onClick={() => setActive("Products")} className={`flex flex-col items-center justify-center flex-1 py-1 transition-colors ${active === "Products" ? "text-amber-600 font-bold" : "text-slate-400 hover:text-slate-700"}`}>
          <Package className="size-5" />
          <span className="text-[10px] mt-1 font-semibold">Products</span>
        </button>
        <button onClick={() => setActive("Customers")} className={`flex flex-col items-center justify-center flex-1 py-1 transition-colors ${active === "Customers" ? "text-amber-600 font-bold" : "text-slate-400 hover:text-slate-700"}`}>
          <Users className="size-5" />
          <span className="text-[10px] mt-1 font-semibold">Customers</span>
        </button>
        <button onClick={() => setSidebarOpen(true)} className="flex flex-col items-center justify-center flex-1 py-1 text-slate-400 hover:text-slate-700 transition-colors">
          <Menu className="size-5" />
          <span className="text-[10px] mt-1 font-semibold">Menu</span>
        </button>
      </nav>

      {invoiceOrder && (<Invoice order={invoiceOrder} products={products} onClose={() => setInvoiceOrder(null)} />)}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}

