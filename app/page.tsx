"use client";

<<<<<<< Updated upstream
import { useState, useMemo, useEffect } from "react";
=======
import { useState, useEffect } from "react";
<<<<<<< Updated upstream
>>>>>>> Stashed changes
import { getSupabase } from "@/lib/supabase";
=======
import { getSupabase } from "@/lib/supabase";
>>>>>>> Stashed changes
>>>>>>> Stashed changes
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
};

<<<<<<< Updated upstream
type Order = {
  id: string;
  date: string;
  deliveryDate: string;
  customer: string;
  productId: number;
  qty: number;
  rate?: number;
  status: string;
  notes?: string;
};

// --- Constants ---
const STATUS_OPTIONS = [
  "Pending",
  "Confirmed",
  "In Production",
  "Ready to Bill",
  "Completed",
  "Cancelled",
] as const;

type Status = (typeof STATUS_OPTIONS)[number];

const STATUS_STYLES: Record<Status, { bg: string; text: string; dot: string; border: string }> = {
  Pending: { bg: "bg-slate-100", text: "text-slate-700", dot: "bg-slate-400", border: "border-slate-200" },
  Confirmed: { bg: "bg-blue-50", text: "text-blue-700", dot: "bg-blue-600", border: "border-blue-200" },
  "In Production": { bg: "bg-amber-50", text: "text-amber-800", dot: "bg-amber-500", border: "border-amber-200" },
  "Ready to Bill": { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-600", border: "border-emerald-200" },
  Completed: { bg: "bg-teal-50", text: "text-teal-800", dot: "bg-teal-600", border: "border-teal-200" },
  Cancelled: { bg: "bg-rose-50", text: "text-rose-700", dot: "bg-rose-500", border: "border-rose-200" },
};

// --- Toast Notification Types ---
type Toast = {
  id: string;
  type: "success" | "error" | "info";
  message: string;
};

function ToastContainer({
  toasts,
  onDismiss,
}: {
  toasts: Toast[];
  onDismiss: (id: string) => void;
}) {
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

// --- Helpers ---
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
=======
>>>>>>> Stashed changes
const money = (v: number) => `Rs. ${v.toLocaleString("en-LK")}`;

<<<<<<< Updated upstream
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
  return "2026-10-30";
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

// --- Shared UI ---
function Badge({ status }: { status: string }) {
  const s = STATUS_STYLES[status as Status] ?? STATUS_STYLES.Pending;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold border ${s.bg} ${s.text} ${s.border}`}>
      <span className={`size-1.5 rounded-full ${s.dot}`} />
      {status}
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
  const [headerDate, setHeaderDate] = useState("Fri, 30 Oct 2026");
=======
<<<<<<< Updated upstream
// Fallback seed products for immediate gorgeous showcase if offline or loading
=======
>>>>>>> Stashed changes
const SHOWCASE_SWEETS: Product[] = [
  {
    id: 1,
    name: "Musket Halwa",
    unit: "kg",
    price: 1200,
    active: true,
    imageUrl: "https://images.unsplash.com/photo-1599785209707-a456fc1337bb?w=800&auto=format&fit=crop&q=80",
  },
  {
    id: 2,
    name: "Golden Milk Toffee",
    unit: "kg",
    price: 1450,
    active: true,
    imageUrl: "https://images.unsplash.com/photo-1582293041079-7814c2f12063?w=800&auto=format&fit=crop&q=80",
  },
  {
    id: 3,
    name: "Authentic Kalu Dodol",
    unit: "kg",
    price: 1100,
    active: true,
    imageUrl: "https://images.unsplash.com/photo-1541781774459-bb2af2f05b55?w=800&auto=format&fit=crop&q=80",
  },
  {
    id: 4,
    name: "Royal Cashew Peda",
    unit: "kg",
    price: 1650,
    active: true,
    imageUrl: "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=800&auto=format&fit=crop&q=80",
  },
];
>>>>>>> Stashed changes

function HeroSection() {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
<<<<<<< Updated upstream
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
=======
    const t = setTimeout(() => setVisible(true), 100);
    return () => clearTimeout(t);
>>>>>>> Stashed changes
  }, []);

  return (
    <section className="relative min-h-[92vh] flex items-center justify-center overflow-hidden bg-[#0a0600] pt-20 pb-16">
      {/* Background radiant glows */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#180d01] via-[#0f0700] to-[#0a0600]" />
      <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[700px] h-[700px] bg-gradient-to-br from-amber-500/20 via-orange-600/15 to-transparent rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-96 h-96 bg-amber-600/10 rounded-full blur-[100px] pointer-events-none" />

<<<<<<< Updated upstream
function ConfirmDialog({ title, message, onConfirm, onCancel }: { title: string; message: string; onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/50 backdrop-blur-xs p-4">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
        <div className="flex size-12 items-center justify-center rounded-full bg-rose-50 border border-rose-100 mx-auto">
          <Trash2 className="size-5 text-rose-600" />
        </div>
        <h3 className="mt-4 text-center text-lg font-bold text-slate-900">{title}</h3>
        <p className="mt-1.5 text-center text-sm text-slate-500">{message}</p>
        <div className="mt-6 flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 rounded-xl bg-rose-600 py-2.5 text-sm font-semibold text-white hover:bg-rose-700 transition-colors shadow-xs"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

function Sidebar({ active, setActive, open, setOpen, orderCount }: {
  active: string; setActive: (v: string) => void; open: boolean; setOpen: (v: boolean) => void; orderCount: number;
}) {
  const items = [
    { label: "Dashboard", Icon: LayoutDashboard },
    { label: "Orders", Icon: ClipboardList },
    { label: "Products", Icon: Package },
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
        {/* Brand with close button on mobile */}
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 text-white shadow-lg shadow-amber-500/20">
              <Sparkles className="size-5" />
            </div>
            <div>
              <p className="text-[18px] font-bold tracking-tight text-white leading-tight">Dhuniya Products</p>
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

        {/* Section title */}
        <p className="mt-8 px-2 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Workspace</p>

        {/* Navigation */}
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
              </button>
            );
          })}
        </nav>

        {/* Bottom card */}
        <div className="mt-auto rounded-2xl border border-slate-800 bg-slate-900/90 p-4">
          <div className="flex items-center gap-2 text-amber-400">
            <Factory className="size-4" />
            <span className="text-xs font-bold uppercase tracking-wider">Dhuniya Products</span>
          </div>
          <p className="mt-1 text-xs text-slate-400">
            Eastern Traditional Sweets · KDS/1597
          </p>
          <p className="mt-1 text-[11px] text-slate-500">
            138, France City, Maruthamunai
          </p>
        </div>
      </aside>
    </>
  );
}

// --- Invoice ---
function Invoice({ order, product, rate, onClose }: {
  order: Order; product?: Product | null; rate: number; onClose: () => void;
}) {
  const total = order.qty * rate;
  const productName = product?.name ?? "Sweet Item";
  const productUnit = product?.unit ?? "kg";
  return (
    <div className="invoice-modal-overlay fixed inset-0 z-50 overflow-y-auto bg-slate-950/60 p-3 sm:p-4 backdrop-blur-xs flex items-center justify-center">
      <style dangerouslySetInnerHTML={{
        __html: `
        @media print {
          @page {
            size: portrait;
            margin: 10mm;
          }
          html, body {
            background: #ffffff !important;
            color: #0f172a !important;
            margin: 0 !important;
            padding: 0 !important;
            height: auto !important;
            min-height: 0 !important;
            overflow: visible !important;
          }
          aside, header, main, nav, .print-hide, .toast-container {
            display: none !important;
          }
          .invoice-modal-overlay {
            position: static !important;
            display: block !important;
            padding: 0 !important;
            margin: 0 !important;
            background: transparent !important;
            overflow: visible !important;
            height: auto !important;
            min-height: 0 !important;
          }
          .invoice-card {
            border: none !important;
            box-shadow: none !important;
            margin: 0 !important;
            padding: 0 !important;
            max-width: 100% !important;
            border-radius: 0 !important;
            overflow: visible !important;
            height: auto !important;
          }
          #printable-invoice {
            position: static !important;
            display: block !important;
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            border: none !important;
            box-shadow: none !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            page-break-after: avoid !important;
            break-after: avoid !important;
          }
        }
      ` }} />
      <div className="invoice-card my-5 w-full max-w-[760px] rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden">
        <div className="border-b border-slate-200 px-4 py-3.5 sm:px-6 sm:py-4 bg-slate-50 flex items-center justify-between print:hidden gap-2">
          <div>
            <p className="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-amber-600">Official Bill</p>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 truncate">Invoice {order.id}</h2>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <Button variant="outline" size="sm" onClick={() => window.print()} className="border-slate-300 text-slate-700 text-xs h-8 px-2.5 sm:px-3">
              <Printer className="size-3.5" /> <span className="hidden sm:inline">Print Bill</span>
            </Button>
            <Button size="sm" onClick={() => window.print()} className="bg-amber-600 text-white hover:bg-amber-700 text-xs h-8 px-2.5 sm:px-3">
              <Download className="size-3.5" /> <span className="hidden sm:inline">Download PDF</span>
            </Button>
            <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700" aria-label="Close invoice">
              <X className="size-4" />
            </button>
          </div>
        </div>
        <article id="printable-invoice" className="p-6 sm:p-8 print:p-0">
          {/* Header */}
          <div className="flex flex-col justify-between gap-3 border-b border-slate-200 pb-4 print:pb-3 sm:flex-row">
            <div>
              <div className="flex items-center gap-2 text-amber-600">
                <Sparkles className="size-5 sm:size-6" />
                <span className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">Dhuniya Products</span>
              </div>
              <p className="mt-0.5 text-xs font-semibold uppercase tracking-wider text-amber-700">Eastern Traditional Sweets</p>
              <p className="mt-1 text-xs text-slate-500 leading-relaxed">
                Registration: KDS/1597 · Mobile: 0756656135<br />
                138, France City, Maruthamunai
              </p>
            </div>
            <div className="text-left sm:text-right">
              <span className="inline-block rounded-md bg-amber-50 border border-amber-200 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-amber-800">
                Customer Invoice
              </span>
              <p className="mt-1 text-xl sm:text-2xl font-mono font-bold text-slate-900">{order.id}</p>
              <p className="mt-0.5 text-xs text-slate-500">Date: {dateLabel(order.date)}</p>
            </div>
          </div>

          {/* Details */}
          <div className="grid gap-3 sm:gap-6 border-b border-slate-200 py-4 print:py-3 sm:grid-cols-2">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Billed To</p>
              <p className="mt-0.5 text-base sm:text-lg font-bold text-slate-900">{order.customer}</p>
              <p className="text-xs text-slate-600">Order ID: {order.id}</p>
              {order.notes && <p className="mt-1 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-2 inline-block">Note: {order.notes}</p>}
            </div>
            <div className="sm:text-right">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Handover Schedule</p>
              <p className="mt-0.5 text-base sm:text-lg font-bold text-slate-900">{dateLabel(order.deliveryDate)}</p>
              <p className="text-xs text-slate-500">Order Status: <span className="font-semibold text-slate-800">{order.status}</span></p>
              <p className="text-xs text-slate-400">Payment Due on Receipt</p>
            </div>
          </div>

          {/* Table */}
          <div className="mt-4 print:mt-3 overflow-x-auto">
            <table className="w-full min-w-[360px] text-left text-sm">
              <thead className="border-b border-slate-200 text-xs font-bold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="pb-2.5">Sweet Product</th>
                  <th className="pb-2.5 text-right">Quantity</th>
                  <th className="pb-2.5 text-right">Rate</th>
                  <th className="pb-2.5 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-slate-100">
                  <td className="py-2.5 font-semibold text-slate-900">{productName}</td>
                  <td className="py-2.5 text-right font-medium text-slate-700">{order.qty} {productUnit}</td>
                  <td className="py-2.5 text-right text-slate-700">{money(rate)}</td>
                  <td className="py-2.5 text-right font-bold text-slate-900">{money(total)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Total */}
          <div className="mt-4 print:mt-3 flex justify-end">
            <div className="w-full max-w-[240px] border-t-2 border-slate-900 pt-2.5">
              <div className="flex items-center justify-between text-sm sm:text-base font-bold text-slate-900">
                <span>Grand Total:</span>
                <span className="text-xl sm:text-2xl text-amber-600">{money(total)}</span>
              </div>
            </div>
          </div>

          <p className="mt-6 print:mt-4 border-t border-slate-200 pt-3 text-center text-xs text-slate-400">
            Thank you for choosing Dhuniya Products. We take pride in authentic eastern sweets.
          </p>
        </article>
      </div>
    </div>
  );
}

// --- Product Modal ---
type ProductFormData = { name: string; unit: string; price: string; active: boolean; imageUrl?: string };

function ProductModal({
  initial,
  onSave,
  onClose,
}: {
  initial?: Product;
  onSave: (data: ProductFormData) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState<ProductFormData>({
    name: initial?.name ?? "",
    unit: initial?.unit ?? "kg",
    price: initial?.price?.toString() ?? "",
    active: initial?.active ?? true,
    imageUrl: initial?.imageUrl ?? "",
  });
  const [errors, setErrors] = useState<Partial<ProductFormData>>({});

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 backdrop-blur-xs p-3 sm:p-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-4 sm:px-6 sm:py-5 bg-slate-50">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-amber-600">{initial ? "Edit" : "New"} Sweet</p>
            <h3 className="mt-0.5 text-base sm:text-lg font-bold text-slate-900">{initial ? "Update Sweet Details" : "Add Sweet to Catalog"}</h3>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200"><X className="size-4" /></button>
        </div>
        <div className="space-y-4 px-4 py-5 sm:px-6 sm:py-6">
          <div>
            <label className="mb-1.5 block text-xs font-bold text-slate-700">Sweet Name *</label>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Musket Halwa"
              className={`w-full rounded-xl border px-3.5 py-2.5 text-sm outline-none focus:border-amber-600 focus:ring-2 focus:ring-amber-500/20 transition-all ${errors.name ? "border-rose-400 bg-rose-50/30" : "border-slate-300"
                }`}
            />
            {errors.name && <p className="mt-1 text-xs text-rose-600">{errors.name}</p>}
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
              className={`w-full rounded-xl border px-3.5 py-2.5 text-sm outline-none focus:border-amber-600 focus:ring-2 focus:ring-amber-500/20 transition-all ${errors.price ? "border-rose-400 bg-rose-50/30" : "border-slate-300"
                }`}
            />
            {errors.price && <p className="mt-1 text-xs text-rose-600">{errors.price}</p>}
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-bold text-slate-700">Image URL (Cloudflare Images / CDN)</label>
            <input
              type="url"
              value={form.imageUrl ?? ""}
              onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
              placeholder="https://imagedelivery.net/... (optional)"
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm outline-none focus:border-amber-600 focus:ring-2 focus:ring-amber-500/20 transition-all"
            />
          </div>
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
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 ${form.active ? "bg-amber-600" : "bg-slate-300"
                }`}
            >
              <span
                className={`pointer-events-none inline-block size-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${form.active ? "translate-x-5" : "translate-x-0"
                  }`}
              />
            </button>
          </div>
        </div>
        <div className="flex gap-3 border-t border-slate-200 px-4 py-3.5 sm:px-6 sm:py-4 bg-slate-50">
          <button onClick={onClose} className="flex-1 rounded-xl border border-slate-300 py-2.5 text-sm font-semibold text-slate-700 hover:bg-white transition-colors">Cancel</button>
          <button onClick={submit} className="flex-1 rounded-xl bg-amber-600 py-2.5 text-sm font-semibold text-white hover:bg-amber-700 shadow-xs transition-colors">
            {initial ? "Update Sweet" : "Add Sweet"}
          </button>
        </div>
      </div>
    </div>
  );
}

// --- Products Page ---
function ProductsPage({
  products,
  orders,
  onAdd,
  onEdit,
  onDelete,
  onViewProductOrders,
  onOpenSidebar,
}: {
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
=======
      {/* Decorative subtle grid */}
      <div
        className="absolute inset-0 opacity-[0.04] pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, #f59e0b 1px, transparent 0)`,
          backgroundSize: "36px 36px",
        }}
>>>>>>> Stashed changes
      />

      <div className="relative z-10 text-center px-4 max-w-5xl mx-auto">
        {/* Registration pill */}
        <div
          className={`inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.2em] text-amber-300 mb-8 backdrop-blur-md transition-all duration-700 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            }`}
        >
          <Sparkles className="size-3.5 text-amber-400" />
          <span>Reg: KDS/1597 · Maruthamunai</span>
        </div>

        {/* Brand Headline */}
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

<<<<<<< Updated upstream
                return (
                  <div key={p.id} className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-sm hover:border-amber-300 transition-all space-y-3">
                    <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-3">
                      <div className="flex items-center gap-3 min-w-0">
                        {p.imageUrl ? (
                          <img src={p.imageUrl} alt={p.name} className="size-10 shrink-0 rounded-xl object-cover border border-amber-300/40 shadow-2xs" />
                        ) : (
                          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-100 to-amber-200 text-amber-900 font-bold text-xs border border-amber-300/40 shadow-2xs">
                            {p.name.split(" ").map((w) => w[0]).join("").slice(0, 2)}
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="font-bold text-slate-900 text-base truncate">{p.name}</p>
                          <p className="text-xs font-semibold text-amber-700">{money(p.price)} / {p.unit}</p>
                        </div>
                      </div>
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold border ${p.active ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-slate-100 text-slate-600 border-slate-200"
                          }`}
                      >
                        <span className={`size-1.5 rounded-full ${p.active ? "bg-emerald-500" : "bg-slate-400"}`} />
                        {p.active ? "Active" : "Archived"}
                      </span>
                    </div>

                    {/* Demand info */}
                    <div className="rounded-xl bg-slate-50 border border-slate-100 p-3 flex items-center justify-between">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Production Demand</p>
                        {activeOrders.length > 0 ? (
                          <p className="text-sm font-extrabold text-slate-900 mt-0.5">
                            {totalOrderedKg.toFixed(2)} {p.unit}{" "}
                            <span className="text-xs font-normal text-slate-500">({activeOrders.length} orders)</span>
                          </p>
                        ) : (
                          <p className="text-xs text-slate-400 mt-0.5">No active orders</p>
                        )}
                      </div>
                      {activeOrders.length > 0 && (
                        <button
                          onClick={() => onViewProductOrders(p.id)}
                          className="text-xs font-bold text-amber-600 hover:text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-lg"
                        >
                          View orders →
                        </button>
                      )}
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-1">
                      <button
                        onClick={() => setEditProduct(p)}
                        className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
                      >
                        <Edit2 className="size-3.5" /> Edit
                      </button>
                      <button
                        onClick={() => setDeleteId(p.id)}
                        className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 hover:border-rose-200 transition-colors"
                      >
                        <Trash2 className="size-3.5" /> Delete
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop Table View (>= sm) */}
            <div className="hidden sm:block overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] text-left text-sm">
                  <thead className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="px-6 py-4">Sweet Product</th>
                      <th className="px-6 py-4">Unit</th>
                      <th className="px-6 py-4">Standard Rate</th>
                      <th className="px-6 py-4">Active Production Demand</th>
                      <th className="px-6 py-4">Catalog Status</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {products.map((p) => {
                      const activeOrders = orders.filter(
                        (o) => o.productId === p.id && !["Completed", "Cancelled"].includes(o.status)
                      );
                      const totalOrderedKg = activeOrders.reduce((sum, o) => sum + o.qty, 0);

                      return (
                        <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              {p.imageUrl ? (
                                <img src={p.imageUrl} alt={p.name} className="size-10 shrink-0 rounded-xl object-cover border border-amber-300/40" />
                              ) : (
                                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-800 font-bold text-xs">
                                  {p.name.split(" ").map((w) => w[0]).join("").slice(0, 2)}
                                </div>
                              )}
                              <span className="font-bold text-slate-900">{p.name}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 font-medium text-slate-600">{p.unit}</td>
                          <td className="px-6 py-4 font-bold text-slate-900">
                            {money(p.price)}
                            <span className="ml-1 text-xs font-normal text-slate-400">/ {p.unit}</span>
                          </td>
                          <td className="px-6 py-4">
                            {activeOrders.length > 0 ? (
                              <div>
                                <p className="font-bold text-slate-900">
                                  {totalOrderedKg.toFixed(2)} {p.unit}
                                </p>
                                <button
                                  onClick={() => onViewProductOrders(p.id)}
                                  className="mt-0.5 inline-flex items-center gap-1 text-xs font-semibold text-amber-600 hover:text-amber-700 hover:underline"
                                >
                                  {activeOrders.length} order{activeOrders.length !== 1 ? "s" : ""} · See who ordered & handover →
                                </button>
                              </div>
                            ) : (
                              <span className="text-xs text-slate-400">No active orders</span>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold border ${p.active ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-slate-100 text-slate-600 border-slate-200"
                              }`}>
                              <span className={`size-1.5 rounded-full ${p.active ? "bg-emerald-500" : "bg-slate-400"}`} />
                              {p.active ? "Active" : "Inactive"}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => setEditProduct(p)}
                                className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
                                title="Edit sweet"
                              >
                                <Edit2 className="size-3.5" />
                              </button>
                              <button
                                onClick={() => setDeleteId(p.id)}
                                className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 transition-colors"
                                title="Delete sweet"
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

// --- Order Form Modal ---
type OrderFormData = {
  customer: string;
  productId: string;
  qty: string;
  deliveryDate: string;
  rate: string;
  notes: string;
};

function OrderModal({
  initial,
  products,
  onSave,
  onClose,
}: {
  initial?: Order;
  products: Product[];
  onSave: (data: OrderFormData) => void;
  onClose: () => void;
}) {
  const activeProducts = products.filter((p) => p.active);
  const [form, setForm] = useState<OrderFormData>({
    customer: initial?.customer ?? "",
    productId: initial?.productId?.toString() ?? (activeProducts[0]?.id?.toString() ?? ""),
    qty: initial?.qty?.toString() ?? "",
    deliveryDate: initial?.deliveryDate ?? getTodayStr(),
    rate: initial?.rate?.toString() ?? "",
    notes: initial?.notes ?? "",
  });
  const [errors, setErrors] = useState<Partial<OrderFormData>>({});

  const validate = () => {
    const e: Partial<OrderFormData> = {};
    if (!form.customer.trim()) e.customer = "Customer name is required";
    if (!form.productId) e.productId = "Please select a sweet product";
    if (!form.qty || isNaN(Number(form.qty)) || Number(form.qty) <= 0) e.qty = "Valid quantity is required";
    if (!form.deliveryDate) e.deliveryDate = "Delivery / handover date required";
    return e;
  };

  const submit = () => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    onSave(form);
  };

  const selectedProduct = products.find((p) => p.id === Number(form.productId));

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/50 backdrop-blur-xs p-3 sm:p-4 flex items-center justify-center">
      <div className="my-5 w-full max-w-lg rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-4 sm:px-6 sm:py-5 bg-slate-50">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-amber-600">{initial ? "Edit" : "New"} Order</p>
            <h3 className="mt-0.5 text-base sm:text-lg font-bold text-slate-900">{initial ? "Update Customer Order" : "Place New Customer Order"}</h3>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200"><X className="size-4" /></button>
        </div>
        <div className="space-y-4 px-4 py-5 sm:px-6 sm:py-6">
          <div>
            <label className="mb-1.5 block text-xs font-bold text-slate-700">Customer Name *</label>
            <input
              value={form.customer}
              onChange={(e) => setForm({ ...form, customer: e.target.value })}
              placeholder="e.g. Sharma Sweets, Grand Banquets"
              className={`w-full rounded-xl border px-3.5 py-2.5 text-sm outline-none focus:border-amber-600 focus:ring-2 focus:ring-amber-500/20 transition-all ${errors.customer ? "border-rose-400 bg-rose-50/30" : "border-slate-300"
                }`}
            />
            {errors.customer && <p className="mt-1 text-xs text-rose-600">{errors.customer}</p>}
          </div>
          <div className="grid gap-3 sm:gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-bold text-slate-700">Sweet Product *</label>
              <select
                value={form.productId}
                onChange={(e) => setForm({ ...form, productId: e.target.value })}
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm outline-none focus:border-amber-600 focus:ring-2 focus:ring-amber-500/20"
              >
                {activeProducts.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({money(p.price)}/{p.unit})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-bold text-slate-700">
                Quantity ({selectedProduct?.unit ?? "kg"}) *
              </label>
              <input
                type="number"
                step="0.25"
                value={form.qty}
                onChange={(e) => setForm({ ...form, qty: e.target.value })}
                placeholder="e.g. 10"
                className={`w-full rounded-xl border px-3.5 py-2.5 text-sm outline-none focus:border-amber-600 focus:ring-2 focus:ring-amber-500/20 transition-all ${errors.qty ? "border-rose-400 bg-rose-50/30" : "border-slate-300"
                  }`}
              />
              {errors.qty && <p className="mt-1 text-xs text-rose-600">{errors.qty}</p>}
            </div>
          </div>
          <div className="grid gap-3 sm:gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-bold text-slate-700">Handover / Delivery Date *</label>
              <input
                type="date"
                value={form.deliveryDate}
                onChange={(e) => setForm({ ...form, deliveryDate: e.target.value })}
                className={`w-full rounded-xl border px-3.5 py-2.5 text-sm outline-none focus:border-amber-600 focus:ring-2 focus:ring-amber-500/20 transition-all ${errors.deliveryDate ? "border-rose-400 bg-rose-50/30" : "border-slate-300"
                  }`}
              />
              {errors.deliveryDate && <p className="mt-1 text-xs text-rose-600">{errors.deliveryDate}</p>}
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-bold text-slate-700">Custom Rate (optional)</label>
              <input
                type="number"
                value={form.rate}
                onChange={(e) => setForm({ ...form, rate: e.target.value })}
                placeholder={`Default: Rs. ${selectedProduct?.price ?? 0}`}
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm outline-none focus:border-amber-600 focus:ring-2 focus:ring-amber-500/20"
              />
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-bold text-slate-700">Special Notes (optional)</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="e.g. Extra saffron, wedding gift boxes, morning handover…"
              rows={2}
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm outline-none focus:border-amber-600 focus:ring-2 focus:ring-amber-500/20 resize-none"
            />
          </div>
          {form.productId && form.qty && (
            <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-3 sm:p-4 flex items-center justify-between">
              <div>
                <p className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-amber-800">Estimated Total Amount</p>
                <p className="text-xs text-amber-700">Based on {form.qty} {selectedProduct?.unit ?? "kg"}</p>
              </div>
              <p className="text-xl sm:text-2xl font-bold text-amber-900">
                {money((Number(form.rate) || selectedProduct?.price || 0) * Number(form.qty))}
              </p>
            </div>
          )}
        </div>
        <div className="flex gap-3 border-t border-slate-200 px-4 py-3.5 sm:px-6 sm:py-4 bg-slate-50">
          <button onClick={onClose} className="flex-1 rounded-xl border border-slate-300 py-2.5 text-sm font-semibold text-slate-700 hover:bg-white transition-colors">Cancel</button>
          <button onClick={submit} className="flex-1 rounded-xl bg-amber-600 py-2.5 text-sm font-semibold text-white hover:bg-amber-700 shadow-xs">
            {initial ? "Update Order" : "Place Order"}
          </button>
        </div>
      </div>
    </div>
  );
}

// Sub-component for individual, standalone Order Card on Mobile
function OrderCard({
  order,
  product,
  onStatusChange,
  onGenerate,
  onEdit,
  onDelete,
}: {
  order: Order;
  product?: Product;
  onStatusChange: (id: string, s: string) => void;
  onGenerate: (o: Order) => void;
  onEdit: (o: Order) => void;
  onDelete: (id: string) => void;
}) {
  const rate = order.rate ?? product?.price ?? 0;
  const total = order.qty * rate;
  const badge = getHandoverBadge(order.deliveryDate);

  return (
    <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-sm hover:border-amber-300 transition-all space-y-3">
      {/* Top: Customer & Status */}
      <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-100 to-amber-200 text-amber-900 font-bold text-sm border border-amber-300/40 shadow-2xs">
            {order.customer.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <h4 className="font-bold text-slate-900 text-base truncate leading-tight">{order.customer}</h4>
            <span className="text-xs font-mono font-medium text-slate-400">{order.id}</span>
          </div>
        </div>
        <div className="shrink-0">
          <StatusDropdown value={order.status} onChange={(v) => onStatusChange(order.id, v)} />
        </div>
      </div>

      {/* Middle: Sweet info & price */}
      <div className="flex items-center justify-between gap-3 bg-amber-50/50 rounded-xl p-3 border border-amber-100/70">
        <div className="min-w-0">
          <p className="text-sm font-bold text-slate-900 truncate">{product?.name ?? "—"}</p>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            {money(rate)} per {product?.unit ?? "kg"}
=======
<<<<<<< Updated upstream
        {/* Subtitle tag */}
=======
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
          <span>Reg: KDS/1597 · Maruthamunai</span>
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

>>>>>>> Stashed changes
        <div
          className={`inline-block mb-5 transition-all duration-700 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
            }`}
          style={{ transitionDelay: "200ms" }}
        >
          <p className="text-lg sm:text-2xl md:text-3xl font-extrabold uppercase tracking-[0.25em] text-amber-200">
            Eastern Traditional Sweet
>>>>>>> Stashed changes
          </p>
          <div className="h-0.5 w-28 bg-gradient-to-r from-amber-400 to-orange-500 mx-auto mt-3 rounded-full" />
        </div>
<<<<<<< Updated upstream
=======
<<<<<<< Updated upstream
        <div className="text-right shrink-0">
          <div className="flex items-baseline justify-end gap-1">
            <span className="text-lg font-black text-amber-600">{order.qty}</span>
            <span className="text-xs font-bold text-slate-500">{product?.unit ?? "kg"}</span>
          </div>
          <p className="text-xs font-black text-slate-900">{money(total)}</p>
=======
>>>>>>> Stashed changes

        <p
          className={`text-slate-300 text-sm sm:text-base md:text-lg max-w-2xl mx-auto leading-relaxed mb-10 transition-all duration-700 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
            }`}
          style={{ transitionDelay: "300ms" }}
        >
          Experience handcrafted heritage sweets made with authentic eastern Sri Lankan recipes,
          pure ingredients, and time-honoured artistry.
        </p>

<<<<<<< Updated upstream
        {/* Action Buttons */}
=======
>>>>>>> Stashed changes
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

<<<<<<< Updated upstream
        {/* Feature Badges */}
=======
>>>>>>> Stashed changes
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
<<<<<<< Updated upstream
=======
>>>>>>> Stashed changes
>>>>>>> Stashed changes
        </div>
      </div>
    </section>
  );
}

function ProductCard({ product, index }: { product: Product; index: number }) {
  const [visible, setVisible] = useState(false);
  const [imgErr, setImgErr] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), index * 80);
    return () => clearTimeout(t);
  }, [index]);

  const initials = product.name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
<<<<<<< Updated upstream
    <>
      <PageHeader
        title="Orders"
        onMenu={onOpenSidebar}
        action={
          <Button onClick={() => setShowModal(true)} className="bg-amber-600 text-white hover:bg-amber-700 gap-1.5 shadow-sm text-xs sm:text-sm h-9 sm:h-10 px-3 sm:px-4">
            <Plus className="size-4" /> <span className="hidden xs:inline">New Order</span><span className="xs:hidden">Add</span>
          </Button>
        }
      />
      <div className="mx-auto max-w-[1250px] px-3.5 py-5 sm:px-6 sm:py-8 lg:px-10">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-amber-600">Order Management</span>
          <h2 className="mt-1 text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">Customer Orders & Dispatch</h2>
          <p className="mt-1 text-xs sm:text-sm text-slate-500">Track and manage every customer order separately with timeline stages.</p>
        </div>

        {/* Quick View Tabs - One Tap to View Separately */}
        <div className="mt-4 sm:mt-5 flex items-center gap-2 overflow-x-auto pb-1.5">
          {quickTabs.map((tab) => {
            const isActive = quickTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setQuickTab(tab.id as typeof quickTab)}
                className={`flex items-center gap-1.5 shrink-0 rounded-full px-3 sm:px-3.5 py-1.5 text-xs font-bold transition-all ${isActive
                  ? "bg-amber-600 text-white shadow-sm shadow-amber-600/30"
                  : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 hover:border-slate-300"
                  }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`rounded-full px-1.5 py-0.2 text-[10px] font-extrabold ${isActive ? "bg-amber-700 text-white" : "bg-slate-100 text-slate-600"
                    }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Highlighted Banner when filtered by Product */}
        {activeFilteredProduct && (
          <div className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border-2 border-amber-500 bg-gradient-to-r from-amber-50 via-amber-50/60 to-white p-4 sm:p-5 shadow-sm">
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-amber-600 text-white shadow-md shadow-amber-600/20">
                <Package className="size-5 sm:size-6" />
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                  <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-amber-700">Filtered Sweet</span>
                  <span className="rounded-full bg-amber-200/70 px-2 py-0.2 text-[10px] font-bold text-amber-900">
                    {displayedOrders.length} order{displayedOrders.length !== 1 ? "s" : ""}
                  </span>
                </div>
                <h3 className="text-lg sm:text-2xl font-bold text-slate-900 truncate">{activeFilteredProduct.name}</h3>
                <p className="text-xs text-slate-600 line-clamp-1">
                  Customer orders and handover schedule.
                </p>
              </div>
            </div>
            <div className="flex items-center justify-between sm:justify-end gap-4 border-t sm:border-t-0 pt-3 sm:pt-0 border-amber-200/60">
              <div className="text-left sm:text-right">
                <p className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-500">Total Demand</p>
                <p className="text-xl sm:text-2xl font-black text-amber-600">
                  {totalFilteredKg.toFixed(2)} <span className="text-xs font-normal text-slate-600">{activeFilteredProduct.unit}</span>
                </p>
              </div>
              <button
                onClick={() => {
                  setFilterProductId("All");
                  onClearProductFilter?.();
                }}
                className="flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors shadow-xs"
              >
                <X className="size-3.5" /> Show All
              </button>
            </div>
          </div>
        )}

        {/* Filters and Grouping Controls */}
        <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-3.5 sm:p-4 shadow-sm">
          {/* Top row: Search and Selects */}
          <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2.5 sm:gap-3">
            <label className="flex flex-1 min-w-[200px] items-center gap-2 rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-1.5 sm:py-0">
              <Search className="size-4 shrink-0 text-slate-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search customer, order ID, notes…"
                className="w-full bg-transparent py-2 text-sm text-slate-900 outline-none"
              />
            </label>
            <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2">
              <select
                value={filterProductId}
                onChange={(e) => {
                  setFilterProductId(e.target.value);
                  if (e.target.value === "All") onClearProductFilter?.();
                }}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs sm:text-sm font-semibold text-slate-700 outline-none focus:border-amber-600 truncate"
              >
                <option value="All">All Sweets ({products.length})</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs sm:text-sm font-medium text-slate-700 outline-none focus:border-amber-600 truncate"
              >
                <option value="All">All Statuses</option>
                {STATUS_OPTIONS.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                className="flex-1 sm:flex-none rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs sm:text-sm text-slate-700 outline-none focus:border-amber-600"
                title="Filter by delivery or order date"
              />
              {(query || filterProductId !== "All" || filterStatus !== "All" || filterDate) && (
                <button
                  onClick={() => {
                    setQuery("");
                    setFilterProductId("All");
                    setFilterStatus("All");
                    setFilterDate("");
                    onClearProductFilter?.();
                  }}
                  className="rounded-xl border border-slate-200 px-3 py-2 text-xs sm:text-sm font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-900 shrink-0"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Bottom row: Group By / Separate mode selector */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-500">Organize:</span>
              <div className="inline-flex rounded-xl bg-slate-100 p-0.5 border border-slate-200">
                {(["date", "product", "status", "none"] as const).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setGroupBy(mode)}
                    className={`rounded-lg px-2.5 py-1 text-xs font-bold capitalize transition-all ${groupBy === mode ? "bg-white text-amber-700 shadow-2xs" : "text-slate-500 hover:text-slate-800"
                      }`}
                  >
                    {mode === "date" ? "By Date" : mode === "product" ? "By Sweet" : mode === "status" ? "By Status" : "Individual"}
                  </button>
                ))}
              </div>
            </div>
            <span className="text-xs font-bold text-slate-400">
              Showing {displayedOrders.length} order{displayedOrders.length !== 1 ? "s" : ""}
            </span>
          </div>
        </div>

        {/* Orders Content */}
        {displayedOrders.length === 0 ? (
          <div className="mt-6 flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-white py-16 sm:py-20 text-center p-4">
            <ClipboardList className="size-12 text-amber-600" />
            <p className="mt-4 text-base sm:text-lg font-bold text-slate-800">No orders in this view</p>
            <p className="mt-1 text-xs sm:text-sm text-slate-500">
              {quickTab !== "all"
                ? `No orders matching "${quickTabs.find((t) => t.id === quickTab)?.label}". Try switching tabs.`
                : "Create your first order to get started."}
            </p>
          </div>
        ) : (
          <div className="mt-6 space-y-7">
            {groupedOrders.map((group) => {
              const groupKg = group.orders.reduce((sum, o) => sum + o.qty, 0);

              return (
                <section key={group.key} className="space-y-3">
                  {groupBy !== "none" && (
                    <div className="flex items-center justify-between px-1">
                      <div className="flex items-center gap-2">
                        <span className="flex size-6 items-center justify-center rounded-lg bg-amber-100 text-amber-800 text-xs font-extrabold shadow-2xs">
                          {group.orders.length}
                        </span>
                        <h3 className="text-sm sm:text-base font-extrabold text-slate-900">{group.title}</h3>
                        {group.badge && (
                          <span className="rounded-md bg-amber-100 border border-amber-300/60 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                            {group.badge}
                          </span>
                        )}
                      </div>
                      <span className="text-xs font-bold text-slate-500">
                        Total: <strong className="text-amber-600 font-extrabold">{groupKg.toFixed(2)} kg</strong>
                      </span>
                    </div>
                  )}

                  {/* Mobile: Standalone Separated Cards */}
                  <div className="block sm:hidden space-y-3.5">
                    {group.orders.map((order) => {
                      const prod = getProduct(order.productId);
                      return (
                        <OrderCard
                          key={order.id}
                          order={order}
                          product={prod}
                          onStatusChange={onStatusChange}
                          onGenerate={onGenerate}
                          onEdit={setEditOrder}
                          onDelete={setDeleteId}
                        />
                      );
                    })}
                  </div>

                  {/* Desktop: Table View */}
                  <div className="hidden sm:block">
                    <OrdersTable
                      orders={group.orders}
                      getProduct={getProduct}
                      onStatusChange={onStatusChange}
                      onGenerate={onGenerate}
                      onEdit={setEditOrder}
                      onDelete={setDeleteId}
                    />
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </div>

      {(showModal || editOrder) && (
        <OrderModal
          initial={editOrder ?? undefined}
          products={products}
          onSave={(data) => {
            if (editOrder) { onEdit(editOrder.id, data); setEditOrder(null); }
            else { onAdd(data); setShowModal(false); }
          }}
          onClose={() => { setShowModal(false); setEditOrder(null); }}
        />
      )}
      {deleteId !== null && (
        <ConfirmDialog
          title="Delete Customer Order?"
          message={`Order ${deleteId} will be permanently removed.`}
          onConfirm={() => { onDelete(deleteId); setDeleteId(null); }}
          onCancel={() => setDeleteId(null)}
        />
      )}
    </>
  );
}

// --- Dashboard ---
function Dashboard({ orders, products, setActive, onViewProductOrders, onOpenSidebar }: {
  orders: Order[]; products: Product[]; setActive: (v: string) => void;
  onViewProductOrders: (productId: number) => void;
  onOpenSidebar?: () => void;
}) {
  const [expandCustomers, setExpandCustomers] = useState(false);
  const [expandedProductId, setExpandedProductId] = useState<number | null>(null);

  const activeOrders = orders.filter((o) => !["Completed", "Cancelled"].includes(o.status));

  const totalKg = activeOrders.reduce((sum, o) => sum + o.qty, 0);
  const activeProductCount = products.filter((p) => p.active).length;

  // Per-product breakdown with full order list
  const productBreakdown = products.map((p) => {
    const orderList = activeOrders
      .filter((o) => o.productId === p.id)
      .sort((a, b) => a.deliveryDate.localeCompare(b.deliveryDate));
    const kg = orderList.reduce((sum, o) => sum + o.qty, 0);
    return { product: p, kg, count: orderList.length, orders: orderList };
  }).filter((b) => b.count > 0);

  // Status summary
  const statusCounts = STATUS_OPTIONS.reduce((acc, s) => {
    acc[s] = orders.filter((o) => o.status === s).length;
    return acc;
  }, {} as Record<string, number>);

  // Unique customers with pending/active orders
  const customerMap = new Map<string, { orders: number; kg: number }>();
  activeOrders.forEach((o) => {
    const existing = customerMap.get(o.customer) ?? { orders: 0, kg: 0 };
    customerMap.set(o.customer, { orders: existing.orders + 1, kg: existing.kg + o.qty });
  });
  const customers = Array.from(customerMap.entries());

  return (
    <>
      <PageHeader title="Dashboard" onMenu={onOpenSidebar} />
      <div className="mx-auto max-w-[1250px] px-3.5 py-5 sm:px-6 sm:py-8 lg:px-10">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-amber-600">
            <Factory className="size-4" /> Production Desk
          </div>
          <h2 className="mt-1 text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">Today&apos;s Sweet Production & Orders</h2>
          <p className="mt-1 text-xs sm:text-sm text-slate-500">Monitor daily production output, customer orders, and upcoming handovers.</p>
        </div>

        {/* Executive Stats Cards */}
        <div className="mt-5 sm:mt-6 grid gap-3 sm:gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-amber-200/80 bg-gradient-to-br from-white to-amber-50/40 p-4 sm:p-5 shadow-xs relative overflow-hidden">
            <div className="flex items-center justify-between">
              <p className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-amber-700">Total Production Demand</p>
              <div className="size-8 rounded-lg bg-amber-100 flex items-center justify-center text-amber-700">
                <Factory className="size-4" />
              </div>
            </div>
            <div className="mt-2.5 flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-black text-slate-900">{totalKg.toFixed(2)}</span>
              <span className="text-xs sm:text-sm font-bold text-amber-600">kg active</span>
            </div>
            <p className="mt-1.5 text-xs text-slate-500">Across {activeOrders.length} customer orders in pipeline</p>
          </div>

          <div className="rounded-2xl border border-blue-200/80 bg-gradient-to-br from-white to-blue-50/40 p-4 sm:p-5 shadow-xs relative overflow-hidden">
            <div className="flex items-center justify-between">
              <p className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-blue-700">Active Sweet Products</p>
              <div className="size-8 rounded-lg bg-blue-100 flex items-center justify-center text-blue-700">
                <Package className="size-4" />
              </div>
            </div>
            <div className="mt-2.5 flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-black text-slate-900">{activeProductCount}</span>
              <span className="text-xs sm:text-sm font-bold text-blue-600">catalog items</span>
            </div>
            <p className="mt-1.5 text-xs text-slate-500">{productBreakdown.length} sweets currently ordered</p>
          </div>

          <div className="rounded-2xl border border-emerald-200/80 bg-gradient-to-br from-white to-emerald-50/40 p-4 sm:p-5 shadow-xs relative overflow-hidden">
            <div className="flex items-center justify-between">
              <p className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-emerald-700">Kitchen Pipeline</p>
              <div className="size-8 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-700">
                <ClipboardList className="size-4" />
              </div>
            </div>
            <div className="mt-2.5 flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-black text-slate-900">{activeOrders.length}</span>
              <span className="text-xs sm:text-sm font-bold text-emerald-600">orders</span>
            </div>
            <p className="mt-1.5 text-xs text-slate-500">{customers.length} unique customers waiting for delivery</p>
          </div>
        </div>

        {/* Product breakdown — Clickable drill-down */}
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
                    {/* Clickable sweet row */}
                    <button
                      onClick={() => setExpandedProductId(isExpanded ? null : product.id)}
                      className={`flex w-full items-center justify-between gap-2.5 p-3.5 sm:px-6 sm:py-4 text-left transition-colors hover:bg-slate-50/80 ${isExpanded ? "bg-amber-50/40" : ""
                        }`}
                    >
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
                          <p className="text-base sm:text-xl font-extrabold text-slate-950">{kg.toFixed(2)}</p>
                          <p className="text-[10px] sm:text-xs font-semibold text-slate-400 uppercase">{product.unit}</p>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onViewProductOrders(product.id);
                          }}
                          className="rounded-lg border border-amber-200 bg-amber-50/80 px-2 sm:px-2.5 py-1 text-xs font-bold text-amber-700 hover:bg-amber-100 hover:border-amber-300 transition-colors shadow-2xs"
                          title="Open filtered Orders"
                        >
                          Orders →
                        </button>
                        <div className={`text-slate-400 transition-transform ${isExpanded ? "rotate-90" : ""}`}>
                          <ChevronRight className="size-4" />
                        </div>
                      </div>
                    </button>

                    {/* Expanded order details */}
                    {isExpanded && (
                      <div className="border-t border-slate-200/90 bg-slate-50/50">
                        {/* Mobile Cards View (< sm) */}
                        <div className="block sm:hidden p-3 space-y-2.5">
                          {productOrders.map((o) => {
                            const badge = getHandoverBadge(o.deliveryDate);
                            return (
                              <div
                                key={o.id}
                                className="rounded-xl border border-slate-200 bg-white p-3 shadow-2xs space-y-2"
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <div className="flex items-center gap-2 min-w-0">
                                    <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-amber-100 text-[11px] font-bold text-amber-800">
                                      {o.customer.charAt(0).toUpperCase()}
                                    </div>
                                    <div className="min-w-0">
                                      <p className="text-sm font-bold text-slate-900 truncate">{o.customer}</p>
                                      <p className="text-[11px] font-mono text-slate-400">{o.id}</p>
                                    </div>
                                  </div>
                                  <Badge status={o.status} />
                                </div>

                                {o.notes && (
                                  <div className="rounded-lg bg-amber-50/70 border border-amber-200/50 px-2.5 py-1 text-xs text-amber-900 italic">
                                    &ldquo;{o.notes}&rdquo;
                                  </div>
                                )}

                                <div className="flex items-center justify-between border-t border-slate-100 pt-2 text-xs">
                                  <div className="flex items-center gap-1.5 text-slate-600">
                                    <Calendar className="size-3.5 text-amber-600" />
                                    <span className="font-semibold text-slate-800">{dateLabel(o.deliveryDate)}</span>
                                    {badge && (
                                      <span className={`inline-flex items-center rounded-md border px-1.5 py-0.2 text-[9px] font-bold ${badge.style}`}>
                                        {badge.label}
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-right">
                                    <span className="text-sm font-extrabold text-amber-700">{o.qty} {product.unit}</span>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {/* Desktop Table View (>= sm) */}
                        <div className="hidden sm:block">
                          <div className="grid grid-cols-[1fr_90px_140px_110px] gap-2 px-6 py-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200 bg-slate-100/60">
                            <span>Customer (Who Ordered)</span>
                            <span className="text-right">Quantity</span>
                            <span className="text-right">Handover Date</span>
                            <span className="text-right">Status</span>
                          </div>
                          <div className="divide-y divide-slate-100">
                            {productOrders.map((o) => {
                              const badge = getHandoverBadge(o.deliveryDate);
                              return (
                                <div
                                  key={o.id}
                                  className="grid grid-cols-[1fr_90px_140px_110px] gap-2 items-center px-6 py-3 hover:bg-amber-50/40 transition-colors"
                                >
                                  <div className="flex items-center gap-2.5 min-w-0">
                                    <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-amber-100 text-[10px] font-bold text-amber-800">
                                      {o.customer.charAt(0).toUpperCase()}
                                    </div>
                                    <div className="min-w-0">
                                      <p className="text-sm font-bold truncate text-slate-900">{o.customer}</p>
                                      <p className="text-[11px] text-slate-400 font-mono truncate">{o.id}{o.notes ? ` · "${o.notes}"` : ""}</p>
                                    </div>
                                  </div>
                                  <p className="text-sm font-bold text-right text-amber-600">{o.qty} {product.unit}</p>
                                  <div className="text-right">
                                    <div className="inline-flex items-center gap-1 text-sm justify-end">
                                      <Calendar className="size-3 text-amber-600" />
                                      <span className="font-bold text-slate-800">{dateLabel(o.deliveryDate)}</span>
                                    </div>
                                    {badge && (
                                      <div className="mt-0.5">
                                        <span className={`inline-flex items-center rounded-md border px-1.5 py-0.2 text-[9px] font-bold ${badge.style}`}>
                                          {badge.label}
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                  <div className="text-right">
                                    <Badge status={o.status} />
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* Footer with action */}
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-t border-slate-200 bg-white p-3.5 sm:px-6 sm:py-3">
                          <p className="text-xs text-slate-600 text-center sm:text-left">
                            Total for {product.name}: <strong className="text-slate-900 font-bold">{kg.toFixed(2)} {product.unit}</strong> across {count} customer order{count !== 1 ? "s" : ""}
                          </p>
                          <button
                            onClick={(e) => { e.stopPropagation(); onViewProductOrders(product.id); }}
                            className="flex items-center justify-center gap-1.5 rounded-xl bg-amber-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-amber-700 transition-colors shadow-xs active:scale-[0.98]"
                          >
                            View all in Orders <ArrowRight className="size-3.5" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
=======
    <div
      className={`group relative flex flex-col rounded-3xl overflow-hidden border border-white/10 bg-gradient-to-b from-white/10 via-white/5 to-transparent backdrop-blur-md hover:border-amber-400/50 hover:shadow-2xl hover:shadow-amber-500/10 transition-all duration-500 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
        }`}
    >
      {/* Product Image */}
      <div className="relative h-60 overflow-hidden bg-gradient-to-br from-amber-950/80 to-[#120800]">
        {product.imageUrl && !imgErr ? (
          <img
            src={product.imageUrl}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-108 transition-transform duration-700 ease-out"
            onError={() => setImgErr(true)}
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center">
            <div className="size-20 rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/30 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
              <span className="text-3xl font-black text-amber-300">{initials}</span>
>>>>>>> Stashed changes
            </div>
            <p className="text-xs font-semibold uppercase tracking-wider text-amber-400/80">Dhuniya Special</p>
          </div>
        )}

<<<<<<< Updated upstream
        {productBreakdown.length === 0 && (
          <div className="mt-7 sm:mt-8 rounded-2xl border border-dashed border-slate-200 bg-white p-8 sm:p-10 text-center">
            <div className="mx-auto flex size-12 items-center justify-center rounded-xl bg-amber-50 text-amber-600 mb-3">
              <Package className="size-6" />
            </div>
            <h4 className="text-sm sm:text-base font-bold text-slate-900">No Active Production Demand</h4>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Add sweets to your catalog and register customer orders to see live kitchen breakdown and delivery schedules here.
            </p>
            <div className="mt-5 flex items-center justify-center gap-2.5">
              <Button size="sm" onClick={() => setActive("Products")} className="bg-amber-600 text-white hover:bg-amber-700 text-xs">
                Manage Products
              </Button>
              <Button size="sm" variant="outline" onClick={() => setActive("Orders")} className="border-slate-300 text-xs text-slate-700">
                View Orders
              </Button>
            </div>
          </div>
        )}

        {/* Order Status Summary */}
        <div className="mt-8">
          <h3 className="text-base sm:text-xl font-bold text-slate-900">Order Pipeline Status</h3>
          <div className="mt-3 grid gap-2.5 sm:gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
            {STATUS_OPTIONS.map((s) => {
              const count = statusCounts[s] ?? 0;
              const style = STATUS_STYLES[s];
              return (
                <div key={s} className="rounded-xl border border-slate-200 bg-white p-3 sm:p-3.5 shadow-2xs hover:border-slate-300 transition-colors">
                  <div className="flex items-center justify-between">
                    <span className={`size-2.5 rounded-full ${style.dot}`} />
                    <span className="text-lg sm:text-xl font-bold text-slate-900">{count}</span>
                  </div>
                  <p className="mt-1.5 text-xs font-semibold text-slate-600 line-clamp-1">{s}</p>
                </div>
              );
            })}
          </div>
=======
        {/* Ambient shadow gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none" />

        {/* Price Tag Pill */}
        <div className="absolute bottom-3 left-3 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 px-3.5 py-1 text-xs font-black text-white shadow-lg shadow-black/40">
          {money(product.price)} <span className="font-normal text-[11px] text-amber-100">/ {product.unit}</span>
>>>>>>> Stashed changes
        </div>

<<<<<<< Updated upstream
        {/* Active Badge */}
        <div className="absolute top-3 right-3 rounded-full bg-black/60 border border-white/15 px-2.5 py-0.5 text-[10px] font-bold text-amber-300 backdrop-blur-md">
          Available Fresh
=======
        {/* Active Customers */}
        {customers.length > 0 && (
          <div className="mt-8">
            <button
              onClick={() => setExpandCustomers(!expandCustomers)}
              className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-white p-3.5 sm:p-4 shadow-xs hover:bg-slate-50 transition-colors"
            >
              <div className="text-left min-w-0 pr-2">
                <h3 className="text-sm sm:text-base font-bold text-slate-900 truncate">Active Customer Orders ({customers.length})</h3>
                <p className="text-xs text-slate-500 truncate">View customer list with active sweet requirements</p>
              </div>
              <ChevronRight className={`size-5 text-slate-400 shrink-0 transition-transform ${expandCustomers ? "rotate-90" : ""}`} />
            </button>
            {expandCustomers && (
              <div className="mt-3 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm divide-y divide-slate-100">
                {customers.map(([name, { orders: cnt, kg }]) => (
                  <div key={name} className="flex items-center justify-between p-3 sm:px-6 sm:py-3.5 hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                      <div className="flex size-8 sm:size-9 shrink-0 items-center justify-center rounded-full bg-amber-100 text-xs font-bold text-amber-800">
                        {name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-slate-900 text-sm truncate">{name}</p>
                        <p className="text-xs text-slate-500">{cnt} order{cnt !== 1 ? "s" : ""}</p>
                      </div>
                    </div>
                    <p className="font-bold text-amber-600 text-sm sm:text-base shrink-0">{kg.toFixed(2)} kg</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Quick Actions */}
        <div className="mt-8 sm:mt-10">
          <div className="flex items-center justify-between">
            <h3 className="text-base sm:text-lg font-bold text-slate-900">Quick Navigation</h3>
            <button onClick={() => setActive("Orders")} className="text-xs font-bold text-amber-600 hover:text-amber-700">
              Go to Orders →
            </button>
          </div>
          <div className="mt-3 grid gap-3 sm:gap-4 sm:grid-cols-2">
            <button
              onClick={() => setActive("Orders")}
              className="group rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 text-left hover:border-amber-500 hover:shadow-sm transition-all"
            >
              <div className="flex size-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                <ClipboardList className="size-5" />
              </div>
              <p className="mt-3 font-bold text-slate-900">Manage Customer Orders</p>
              <p className="mt-1 text-xs text-slate-500">Track delivery deadlines, customer orders, and print bills.</p>
              <div className="mt-3 flex items-center gap-1 text-xs font-bold text-amber-600 opacity-0 group-hover:opacity-100 transition-opacity">
                Open Orders Page <ChevronRight className="size-3" />
              </div>
            </button>

            <button
              onClick={() => setActive("Products")}
              className="group rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 text-left hover:border-amber-500 hover:shadow-sm transition-all"
            >
              <div className="flex size-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                <Package className="size-5" />
              </div>
              <p className="mt-3 font-bold text-slate-900">Manage Sweet Catalog</p>
              <p className="mt-1 text-xs text-slate-500">Update sweets, pricing per kg, and catalog availability.</p>
              <div className="mt-3 flex items-center gap-1 text-xs font-bold text-amber-600 opacity-0 group-hover:opacity-100 transition-opacity">
                Open Sweet Products <ChevronRight className="size-3" />
              </div>
            </button>
          </div>
=======
    <div
      className={`group relative flex flex-col rounded-3xl overflow-hidden border border-white/10 bg-gradient-to-b from-white/10 via-white/5 to-transparent backdrop-blur-md hover:border-amber-400/50 hover:shadow-2xl hover:shadow-amber-500/10 transition-all duration-500 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
        }`}
    >
      <div className="relative h-60 overflow-hidden bg-gradient-to-br from-amber-950/80 to-[#120800]">
        {product.imageUrl && !imgErr ? (
          <img
            src={product.imageUrl}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-108 transition-transform duration-700 ease-out"
            onError={() => setImgErr(true)}
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center">
            <div className="size-20 rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/30 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
              <span className="text-3xl font-black text-amber-300">{initials}</span>
            </div>
            <p className="text-xs font-semibold uppercase tracking-wider text-amber-400/80">Dhuniya Special</p>
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none" />

        <div className="absolute bottom-3 left-3 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 px-3.5 py-1 text-xs font-black text-white shadow-lg shadow-black/40">
          {money(product.price)} <span className="font-normal text-[11px] text-amber-100">/ {product.unit}</span>
        </div>

        <div className="absolute top-3 right-3 rounded-full bg-black/60 border border-white/15 px-2.5 py-0.5 text-[10px] font-bold text-amber-300 backdrop-blur-md">
          Available Fresh
>>>>>>> Stashed changes
>>>>>>> Stashed changes
        </div>
      </div>

<<<<<<< Updated upstream
// --- Root Component ---
const VALID_TABS = ["Dashboard", "Orders", "Products"] as const;
type TabType = (typeof VALID_TABS)[number];

const normalizeTab = (raw: string | null | undefined): TabType => {
  if (!raw) return "Dashboard";
  const clean = raw.replace(/^[#?]/, "").trim().toLowerCase();
  if (clean === "orders" || clean.includes("orders")) return "Orders";
  if (clean === "products" || clean.includes("products")) return "Products";
  return "Dashboard";
};

const getInitialTab = (): TabType => {
  if (typeof window === "undefined") return "Dashboard";
  try {
    // 1. Check URL query search param (?tab=orders)
    const searchParams = new URLSearchParams(window.location.search);
    const tabParam = searchParams.get("tab");
    if (tabParam) {
      const normalized = normalizeTab(tabParam);
      if (normalized !== "Dashboard") return normalized;
    }

    // 2. Check URL hash (#orders)
    if (window.location.hash) {
      const normalized = normalizeTab(window.location.hash);
      if (normalized !== "Dashboard") return normalized;
    }

    // 3. Check persistent localStorage
    const saved = localStorage.getItem("dhuniya_active_tab");
    if (saved) {
      const normalized = normalizeTab(saved);
      if (normalized !== "Dashboard") return normalized;
    }
  } catch { }
  return "Dashboard";
};

export default function Home() {
  const [active, setActiveState] = useState<TabType>("Dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [invoiceOrder, setInvoiceOrder] = useState<Order | null>(null);
  const [initialProductFilter, setInitialProductFilter] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const setActive = (tab: string) => {
    const nextTab = normalizeTab(tab);
    setActiveState(nextTab);
    try {
      localStorage.setItem("dhuniya_active_tab", nextTab);
      const url = new URL(window.location.href);
      if (nextTab === "Dashboard") {
        url.searchParams.delete("tab");
        url.hash = "";
      } else {
        url.searchParams.set("tab", nextTab.toLowerCase());
        url.hash = nextTab.toLowerCase();
      }
      window.history.replaceState(null, "", url.toString());
    } catch { }
  };

  useEffect(() => {
    try {
      const targetTab = getInitialTab();
      if (targetTab !== "Dashboard") {
        setActiveState(targetTab);
      }
      const url = new URL(window.location.href);
      if (targetTab !== "Dashboard") {
        url.searchParams.set("tab", targetTab.toLowerCase());
        url.hash = targetTab.toLowerCase();
        window.history.replaceState(null, "", url.toString());
      }
    } catch { }

    const handleLocationChange = () => {
      try {
        const currentTab = getInitialTab();
        setActiveState(currentTab);
      } catch { }
    };

    window.addEventListener("hashchange", handleLocationChange);
    window.addEventListener("popstate", handleLocationChange);
    return () => {
      window.removeEventListener("hashchange", handleLocationChange);
      window.removeEventListener("popstate", handleLocationChange);
    };
  }, []);

  const addToast = (type: "success" | "error" | "info", message: string) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Load from Supabase on mount
  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      const client = getSupabase();
      if (!client) {
        // Fallback to local offline cache
        try {
          const lp = localStorage.getItem("dhuniya_products");
          if (lp) setProducts(JSON.parse(lp));
          const lo = localStorage.getItem("dhuniya_orders");
          if (lo) setOrders(JSON.parse(lo));
        } catch { }
        setIsLoading(false);
        return;
      }

      try {
        // Fetch products from Supabase
        const { data: prodData, error: prodErr } = await client
          .from("products")
          .select("*")
          .order("id", { ascending: true });

        if (prodErr) throw prodErr;

        if (prodData && prodData.length > 0) {
          const loadedProducts: Product[] = prodData.map((p: any) => ({
            id: Number(p.id),
            name: p.name,
            unit: p.unit,
            price: Number(p.price),
            active: Boolean(p.active),
            imageUrl: p.image_url || undefined,
          }));
          setProducts(loadedProducts);
          try { localStorage.setItem("dhuniya_products", JSON.stringify(loadedProducts)); } catch { }
        } else {
          // If Supabase table is empty, check localStorage
          try {
            const lp = localStorage.getItem("dhuniya_products");
            if (lp) setProducts(JSON.parse(lp));
          } catch { }
        }

        // Fetch orders from Supabase
        const { data: ordData, error: ordErr } = await client
          .from("orders")
          .select("*")
          .order("created_at", { ascending: false });

        if (ordErr) throw ordErr;

        if (ordData && ordData.length > 0) {
          const loadedOrders: Order[] = ordData.map((o: any) => ({
            id: o.id,
            date: o.date,
            deliveryDate: o.delivery_date,
            customer: o.customer,
            productId: Number(o.product_id),
            qty: Number(o.qty),
            rate: o.rate ? Number(o.rate) : undefined,
            status: o.status,
            notes: o.notes || undefined,
          }));
          setOrders(loadedOrders);
          try { localStorage.setItem("dhuniya_orders", JSON.stringify(loadedOrders)); } catch { }
        } else {
          try {
            const lo = localStorage.getItem("dhuniya_orders");
            if (lo) setOrders(JSON.parse(lo));
          } catch { }
        }
      } catch (err: any) {
        console.error("Error loading Supabase data:", err);
        addToast("error", `Supabase connection note: ${err.message || "Using local storage"}`);
        try {
          const lp = localStorage.getItem("dhuniya_products");
          if (lp) setProducts(JSON.parse(lp));
          const lo = localStorage.getItem("dhuniya_orders");
          if (lo) setOrders(JSON.parse(lo));
        } catch { }
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, []);

  // Navigate to Orders filtered by a specific sweet
  const viewProductOrders = (productId: number) => {
    setInitialProductFilter(productId);
    setActive("Orders");
  };

  // Product CRUD with Optimistic UI + Supabase sync + Rollback
  const addProduct = async (data: ProductFormData) => {
    const tempId = Date.now();
    const newProduct: Product = {
      id: tempId,
      name: data.name.trim(),
      unit: data.unit,
      price: Number(data.price),
      active: data.active,
      imageUrl: data.imageUrl?.trim() || undefined,
    };

    setProducts((prev) => {
      const updated = [...prev, newProduct];
      try { localStorage.setItem("dhuniya_products", JSON.stringify(updated)); } catch { }
      return updated;
    });
    addToast("success", `Sweet "${data.name}" added`);

    const client = getSupabase();
    if (client) {
      try {
        const { data: inserted, error } = await client
          .from("products")
          .insert({
            name: data.name.trim(),
            unit: data.unit,
            price: Number(data.price),
            active: data.active,
            image_url: data.imageUrl?.trim() || null,
          })
          .select()
          .single();

        if (error) throw error;
        if (inserted) {
          setProducts((prev) =>
            prev.map((p) => (p.id === tempId ? { ...p, id: Number(inserted.id) } : p))
          );
        }
      } catch (err: any) {
        console.error("Supabase insert product error:", err);
        addToast("error", `Failed to save product in Supabase: ${err.message}`);
        setProducts((prev) => prev.filter((p) => p.id !== tempId));
      }
    }
  };

  const editProduct = async (id: number, data: ProductFormData) => {
    const prevProducts = [...products];
    const updatedProduct: Product = {
      id,
      name: data.name.trim(),
      unit: data.unit,
      price: Number(data.price),
      active: data.active,
      imageUrl: data.imageUrl?.trim() || undefined,
    };

    setProducts((prev) => {
      const updated = prev.map((p) => (p.id === id ? updatedProduct : p));
      try { localStorage.setItem("dhuniya_products", JSON.stringify(updated)); } catch { }
      return updated;
    });
    addToast("success", `Sweet "${data.name}" updated`);

    const client = getSupabase();
    if (client) {
      try {
        const { error } = await client
          .from("products")
          .update({
            name: data.name.trim(),
            unit: data.unit,
            price: Number(data.price),
            active: data.active,
            image_url: data.imageUrl?.trim() || null,
          })
          .eq("id", id);

        if (error) throw error;
      } catch (err: any) {
        console.error("Supabase update product error:", err);
        addToast("error", `Supabase update failed: ${err.message}`);
        setProducts(prevProducts);
      }
    }
  };

  const deleteProduct = async (id: number) => {
    const prevProducts = [...products];
    const target = products.find((p) => p.id === id);

    setProducts((prev) => {
      const updated = prev.filter((p) => p.id !== id);
      try { localStorage.setItem("dhuniya_products", JSON.stringify(updated)); } catch { }
      return updated;
    });
    addToast("info", `Deleted "${target?.name ?? "Sweet"}"`);

    const client = getSupabase();
    if (client) {
      try {
        const { error } = await client.from("products").delete().eq("id", id);
        if (error) throw error;
      } catch (err: any) {
        console.error("Supabase delete product error:", err);
        addToast("error", `Supabase delete failed: ${err.message}`);
        setProducts(prevProducts);
      }
    }
  };

  // Order CRUD with Optimistic UI + Supabase sync + Rollback
  const addOrder = async (data: OrderFormData) => {
    const newOrderId = genOrderId(orders);
    const newOrder: Order = {
      id: newOrderId,
      date: getTodayStr(),
      deliveryDate: data.deliveryDate,
      customer: data.customer.trim(),
      productId: Number(data.productId),
      qty: Number(data.qty),
      rate: data.rate ? Number(data.rate) : undefined,
      status: "Pending",
      notes: data.notes?.trim() || undefined,
    };

    setOrders((prev) => {
      const updated = [newOrder, ...prev];
      try { localStorage.setItem("dhuniya_orders", JSON.stringify(updated)); } catch { }
      return updated;
    });
    addToast("success", `Order ${newOrderId} created for ${newOrder.customer}`);

    const client = getSupabase();
    if (client) {
      try {
        const { error } = await client.from("orders").insert({
          id: newOrder.id,
          date: newOrder.date,
          delivery_date: newOrder.deliveryDate,
          customer: newOrder.customer,
          product_id: newOrder.productId,
          qty: newOrder.qty,
          rate: newOrder.rate ?? null,
          status: newOrder.status,
          notes: newOrder.notes ?? null,
        });

        if (error) throw error;
      } catch (err: any) {
        console.error("Supabase insert order error:", err);
        addToast("error", `Supabase error: ${err.message}`);
        setOrders((prev) => prev.filter((o) => o.id !== newOrderId));
      }
    }
  };

  const editOrder = async (id: string, data: OrderFormData) => {
    const prevOrders = [...orders];
    const current = orders.find((o) => o.id === id);
    const updatedOrder: Order = {
      id,
      date: current?.date ?? getTodayStr(),
      customer: data.customer.trim(),
      productId: Number(data.productId),
      qty: Number(data.qty),
      rate: data.rate ? Number(data.rate) : undefined,
      deliveryDate: data.deliveryDate,
      notes: data.notes?.trim() || undefined,
      status: current?.status ?? "Pending",
    };

    setOrders((prev) => {
      const updated = prev.map((o) => (o.id === id ? updatedOrder : o));
      try { localStorage.setItem("dhuniya_orders", JSON.stringify(updated)); } catch { }
      return updated;
    });
    addToast("success", `Order ${id} updated`);

    const client = getSupabase();
    if (client) {
      try {
        const { error } = await client
          .from("orders")
          .update({
            customer: data.customer.trim(),
            product_id: Number(data.productId),
            qty: Number(data.qty),
            rate: data.rate ? Number(data.rate) : null,
            delivery_date: data.deliveryDate,
            notes: data.notes?.trim() || null,
          })
          .eq("id", id);

        if (error) throw error;
      } catch (err: any) {
        console.error("Supabase update order error:", err);
        addToast("error", `Supabase update failed: ${err.message}`);
        setOrders(prevOrders);
      }
    }
  };

  const deleteOrder = async (id: string) => {
    const prevOrders = [...orders];

    setOrders((prev) => {
      const updated = prev.filter((o) => o.id !== id);
      try { localStorage.setItem("dhuniya_orders", JSON.stringify(updated)); } catch { }
      return updated;
    });
    addToast("info", `Deleted order ${id}`);

    const client = getSupabase();
    if (client) {
      try {
        const { error } = await client.from("orders").delete().eq("id", id);
        if (error) throw error;
      } catch (err: any) {
        console.error("Supabase delete order error:", err);
        addToast("error", `Supabase delete failed: ${err.message}`);
        setOrders(prevOrders);
      }
    }
  };

  const updateStatus = async (id: string, status: string) => {
    const prevOrders = [...orders];

    setOrders((prev) => {
      const updated = prev.map((o) => (o.id === id ? { ...o, status } : o));
      try { localStorage.setItem("dhuniya_orders", JSON.stringify(updated)); } catch { }
      return updated;
    });
    addToast("success", `Order ${id} status set to "${status}"`);

    const client = getSupabase();
    if (client) {
      try {
        const { error } = await client.from("orders").update({ status }).eq("id", id);
        if (error) throw error;
      } catch (err: any) {
        console.error("Supabase status update error:", err);
        addToast("error", `Status update failed: ${err.message}`);
        setOrders(prevOrders);
      }
    }
  };

  const generateInvoice = (order: Order) => setInvoiceOrder(order);

  const invoiceProduct = invoiceOrder
    ? (products.find((p) => p.id === invoiceOrder.productId) ?? {
        id: invoiceOrder.productId,
        name: "Sweet Item",
        unit: "kg",
        price: invoiceOrder.rate ?? 0,
        active: true,
      })
    : null;
  const invoiceRate = invoiceOrder ? (invoiceOrder.rate ?? invoiceProduct?.price ?? 0) : 0;
  const activeOrderCount = orders.filter((o) => !["Completed", "Cancelled"].includes(o.status)).length;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 antialiased font-sans">
      <Sidebar
        active={active}
        setActive={setActive}
        open={sidebarOpen}
        setOpen={setSidebarOpen}
        orderCount={activeOrderCount}
      />
      <main className="min-h-screen lg:ml-[260px] pb-24 lg:pb-16">
        {isLoading && (
          <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2 text-center text-xs font-semibold text-amber-800 flex items-center justify-center gap-2">
            <span className="size-2 rounded-full bg-amber-600 animate-ping" />
            Connecting and syncing with Supabase...
          </div>
        )}
        {active === "Dashboard" && (
          <Dashboard
            orders={orders}
            products={products}
            setActive={setActive}
            onViewProductOrders={viewProductOrders}
            onOpenSidebar={() => setSidebarOpen(true)}
          />
        )}
        {active === "Orders" && (
          <OrdersPage
            orders={orders}
            products={products}
            onAdd={addOrder}
            onEdit={editOrder}
            onDelete={deleteOrder}
            onStatusChange={updateStatus}
            onGenerate={generateInvoice}
            initialProductFilter={initialProductFilter}
            onClearProductFilter={() => setInitialProductFilter(null)}
            onOpenSidebar={() => setSidebarOpen(true)}
          />
        )}
        {active === "Products" && (
          <ProductsPage
            products={products}
            orders={orders}
            onAdd={addProduct}
            onEdit={editProduct}
            onDelete={deleteProduct}
            onViewProductOrders={viewProductOrders}
            onOpenSidebar={() => setSidebarOpen(true)}
          />
        )}
      </main>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="fixed bottom-0 inset-x-0 z-30 flex h-16 items-center justify-around border-t border-slate-200/90 bg-white/95 backdrop-blur-md px-2 lg:hidden shadow-[0_-2px_10px_rgba(0,0,0,0.03)]">
        <button
          onClick={() => setActive("Dashboard")}
          className={`flex flex-col items-center justify-center flex-1 py-1 transition-colors ${active === "Dashboard" ? "text-amber-600 font-bold" : "text-slate-400 hover:text-slate-700"
            }`}
        >
          <LayoutDashboard className="size-5" />
          <span className="text-[10px] mt-1 font-semibold">Dashboard</span>
        </button>
        <button
          onClick={() => setActive("Orders")}
          className={`relative flex flex-col items-center justify-center flex-1 py-1 transition-colors ${active === "Orders" ? "text-amber-600 font-bold" : "text-slate-400 hover:text-slate-700"
            }`}
        >
          <div className="relative">
            <ClipboardList className="size-5" />
            {activeOrderCount > 0 && (
              <span className="absolute -top-1 -right-2.5 flex size-4 items-center justify-center rounded-full bg-amber-600 text-[9px] font-bold text-white shadow-2xs">
                {activeOrderCount}
              </span>
            )}
          </div>
          <span className="text-[10px] mt-1 font-semibold">Orders</span>
        </button>
        <button
          onClick={() => setActive("Products")}
          className={`flex flex-col items-center justify-center flex-1 py-1 transition-colors ${active === "Products" ? "text-amber-600 font-bold" : "text-slate-400 hover:text-slate-700"
            }`}
=======
      {/* Card Body */}
      <div className="flex flex-col flex-1 p-6">
        <h3 className="text-lg sm:text-xl font-bold text-white group-hover:text-amber-300 transition-colors leading-tight">
          {product.name}
        </h3>
        <p className="mt-2 text-xs sm:text-sm text-slate-400 leading-relaxed flex-1">
          Authentic eastern recipe made fresh with premium ingredients, prepared daily in our Maruthamunai kitchen.
        </p>

        {/* Quality indicator */}
        <div className="mt-5 pt-4 border-t border-white/10 flex items-center justify-between text-xs">
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((s) => (
              <Star key={s} className="size-3.5 fill-amber-400 text-amber-400" />
            ))}
          </div>
          <span className="text-amber-400 font-semibold text-[11px] uppercase tracking-wider">Traditional Recipe</span>
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
          {/* Mobile */}
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

          {/* Address */}
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

          {/* Registration */}
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6 flex flex-col justify-between">
            <div>
              <div className="size-12 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-4">
                <FileText className="size-5" />
              </div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Official Registration</p>
              <p className="text-xl font-mono font-bold text-white mt-1">
                KDS/1597
              </p>
              <p className="text-xs text-slate-400 mt-1">Government Registered Sweet Maker</p>
            </div>
            <p className="text-xs text-slate-500 mt-4">Licensed & Quality Approved</p>
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
          <div className="flex size-11 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-lg shadow-amber-500/20">
            <Sparkles className="size-5" />
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
            Registration: <strong className="text-slate-200">KDS/1597</strong> · Mobile: <strong className="text-slate-200">0756656135</strong>
          </p>
          <p className="text-xs text-slate-500 mt-0.5">138, France City, Maruthamunai, Sri Lanka</p>
        </div>

        <Link
          href="/login"
          className="flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-5 py-2 text-xs font-bold text-slate-300 hover:border-amber-400 hover:text-amber-300 hover:bg-white/10 transition-all duration-200"
>>>>>>> Stashed changes
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
          // If offline or no supabase, use showcase sweets
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
          setProducts(
            data.map((p: any) => ({
              id: Number(p.id),
              name: p.name,
              unit: p.unit,
              price: Number(p.price),
              active: Boolean(p.active),
              imageUrl: p.image_url || undefined,
            }))
          );
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
      {/* Top Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 sm:px-8 py-4 bg-black/75 backdrop-blur-xl border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-md shadow-amber-500/20">
            <Sparkles className="size-4" />
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

      {/* Hero Section */}
      <HeroSection />

      {/* Sweets Showcase */}
      <section id="sweets" className="py-20 sm:py-28 px-4 relative bg-[#0a0600]">
        <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-amber-500/30 to-transparent" />

        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <span className="text-xs font-bold uppercase tracking-[0.3em] text-amber-400">
              Freshly Prepared Catalog
            </span>
            <h2 className="mt-3 text-3xl sm:text-5xl font-black text-white tracking-tight">
              Our Traditional Sweets
            </h2>
            <p className="mt-4 text-slate-400 text-sm sm:text-base max-w-xl mx-auto">
              Prepared to order with pure ghee, whole milk, and eastern culinary traditions.
            </p>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <div className="size-12 rounded-full border-4 border-amber-500/20 border-t-amber-500 animate-spin" />
              <p className="text-sm text-slate-400 font-medium">Loading sweet catalog…</p>
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {products.map((product, i) => (
                <ProductCard key={product.id} product={product} index={i} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Contact Section */}
      <ContactSection />

<<<<<<< Updated upstream
      {invoiceOrder && (
        <Invoice
          order={invoiceOrder}
          product={invoiceProduct}
          rate={invoiceRate}
          onClose={() => setInvoiceOrder(null)}
        />
      )}
<<<<<<< Updated upstream

      {/* Floating Toast Notification Container */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
=======
      {/* Footer */}
=======
=======
      <div className="flex flex-col flex-1 p-6">
        <h3 className="text-lg sm:text-xl font-bold text-white group-hover:text-amber-300 transition-colors leading-tight">
          {product.name}
        </h3>
        <p className="mt-2 text-xs sm:text-sm text-slate-400 leading-relaxed flex-1">
          Authentic eastern recipe made fresh with premium ingredients, prepared daily in our Maruthamunai kitchen.
        </p>

        <div className="mt-5 pt-4 border-t border-white/10 flex items-center justify-between text-xs">
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((s) => (
              <Star key={s} className="size-3.5 fill-amber-400 text-amber-400" />
            ))}
          </div>
          <span className="text-amber-400 font-semibold text-[11px] uppercase tracking-wider">Traditional Recipe</span>
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
                <FileText className="size-5" />
              </div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Official Registration</p>
              <p className="text-xl font-mono font-bold text-white mt-1">
                KDS/1597
              </p>
              <p className="text-xs text-slate-400 mt-1">Government Registered Sweet Maker</p>
            </div>
            <p className="text-xs text-slate-500 mt-4">Licensed & Quality Approved</p>
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
          <div className="flex size-11 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-lg shadow-amber-500/20">
            <Sparkles className="size-5" />
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
            Registration: <strong className="text-slate-200">KDS/1597</strong> · Mobile: <strong className="text-slate-200">0756656135</strong>
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
          setProducts(
            data.map((p: any) => ({
              id: Number(p.id),
              name: p.name,
              unit: p.unit,
              price: Number(p.price),
              active: Boolean(p.active),
              imageUrl: p.image_url || undefined,
            }))
          );
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
          <div className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-md shadow-amber-500/20">
            <Sparkles className="size-4" />
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

      <section id="sweets" className="py-20 sm:py-28 px-4 relative bg-[#0a0600]">
        <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-amber-500/30 to-transparent" />

        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <span className="text-xs font-bold uppercase tracking-[0.3em] text-amber-400">
              Freshly Prepared Catalog
            </span>
            <h2 className="mt-3 text-3xl sm:text-5xl font-black text-white tracking-tight">
              Our Traditional Sweets
            </h2>
            <p className="mt-4 text-slate-400 text-sm sm:text-base max-w-xl mx-auto">
              Prepared to order with pure ghee, whole milk, and eastern culinary traditions.
            </p>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <div className="size-12 rounded-full border-4 border-amber-500/20 border-t-amber-500 animate-spin" />
              <p className="text-sm text-slate-400 font-medium">Loading sweet catalog…</p>
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {products.map((product, i) => (
                <ProductCard key={product.id} product={product} index={i} />
              ))}
            </div>
          )}
        </div>
      </section>

      <ContactSection />
>>>>>>> Stashed changes
      <Footer />
>>>>>>> Stashed changes
    </div>
  );
}
