"use client";

import { useState, useMemo, useEffect } from "react";
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
  unit: string;
  price: number;
  active: boolean;
  imageUrl?: string;
  description?: string;
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

export const getOrderItems = (o: Order): OrderItem[] => {
  if (Array.isArray(o.items) && o.items.length > 0) return o.items;
  if (o.productId) return [{ productId: o.productId, qty: o.qty ?? 0, rate: o.rate }];
  return [];
};

export const getOrderTotal = (o: Order, products: Product[]): number => {
  const items = getOrderItems(o);
  return items.reduce((sum, item) => {
    const prod = products.find((p) => p.id === item.productId);
    const r = item.rate ?? prod?.price ?? 0;
    return sum + (item.qty * r);
  }, 0);
};

export const getOrderTotalKg = (o: Order): number => {
  const items = getOrderItems(o);
  return items.reduce((sum, item) => sum + (Number(item.qty) || 0), 0);
};

export const isWholeNumberUnit = (unit?: string): boolean => {
  if (!unit) return false;
  const u = unit.trim().toLowerCase();
  return ["pcs", "box", "piece", "pieces", "boxes"].includes(u);
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

function Invoice({ order, products, onClose }: {
  order: Order; products: Product[]; onClose: () => void;
}) {
  const items = getOrderItems(order);
  const lineItems = items.map((item) => {
    const prod = products.find((p) => p.id === item.productId);
    const unitPrice = item.rate ?? prod?.price ?? 0;
    const amount = item.qty * unitPrice;
    return {
      product: prod,
      name: prod?.name ?? "Sweet Item",
      unit: prod?.unit ?? "kg",
      qty: item.qty,
      rate: unitPrice,
      amount,
    };
  });
  const total = lineItems.reduce((sum, item) => sum + item.amount, 0);

  return (
    <div className="invoice-modal-overlay fixed inset-0 z-50 overflow-y-auto bg-slate-950/60 p-2.5 sm:p-4 backdrop-blur-xs flex items-center justify-center">
      <style dangerouslySetInnerHTML={{
        __html: `
        @media print {
          @page { size: portrait; margin: 10mm; }
          html, body { background: #ffffff !important; color: #0f172a !important; margin: 0 !important; padding: 0 !important; height: auto !important; min-height: 0 !important; overflow: visible !important; }
          aside, header, main, nav, .print-hide, .toast-container { display: none !important; }
          .invoice-modal-overlay { position: static !important; display: block !important; padding: 0 !important; margin: 0 !important; background: transparent !important; overflow: visible !important; height: auto !important; min-height: 0 !important; }
          .invoice-card { border: none !important; box-shadow: none !important; margin: 0 !important; padding: 0 !important; max-width: 100% !important; border-radius: 0 !important; overflow: visible !important; height: auto !important; max-height: none !important; }
          #printable-invoice { position: static !important; display: block !important; width: 100% !important; max-width: 100% !important; margin: 0 !important; padding: 0 !important; border: none !important; box-shadow: none !important; page-break-inside: avoid !important; break-inside: avoid !important; height: auto !important; max-height: none !important; overflow: visible !important; }
        }
      ` }} />
      <div className="invoice-card my-auto w-full max-w-[760px] max-h-[92vh] flex flex-col rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden">
        <div className="shrink-0 border-b border-slate-200 px-3.5 py-3 sm:px-6 sm:py-4 bg-slate-50 flex items-center justify-between print:hidden gap-2">
          <div>
            <p className="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-amber-600">Official Bill</p>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 truncate">Customer Invoice</h2>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <Button variant="outline" size="sm" onClick={() => window.print()} className="border-slate-300 text-slate-700 text-xs h-8 px-2 sm:px-3">
              <Printer className="size-3.5" /> <span className="hidden sm:inline">Print Bill</span>
            </Button>
            <Button size="sm" onClick={() => window.print()} className="bg-amber-600 text-white hover:bg-amber-700 text-xs h-8 px-2 sm:px-3">
              <Download className="size-3.5" /> <span className="hidden sm:inline">Download PDF</span>
            </Button>
            <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700" aria-label="Close invoice">
              <X className="size-4" />
            </button>
          </div>
        </div>
        <article id="printable-invoice" className="flex-1 overflow-y-auto p-4 sm:p-8 print:p-0 print:overflow-visible">
          <div className="flex flex-col justify-between gap-3 border-b border-slate-200 pb-4 print:pb-3 sm:flex-row">
            <div>
              <div className="flex items-center gap-2.5">
                <img src="/logo.jpg" alt="Dhuniya Products" className="size-9 rounded-xl object-contain border border-slate-200" />
                <span className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">Dhuniya Products</span>
              </div>
              <p className="mt-0.5 text-xs font-semibold uppercase tracking-wider text-amber-700">Eastern Traditional Sweets</p>
              <p className="mt-1 text-xs text-slate-500 leading-relaxed">
                Registration: KDS/1597 · Mobile: 0756656135<br />
                138, France City, Maruthamunai
              </p>
            </div>
            <div className="text-left sm:text-right">
              <span className="inline-block rounded-md bg-amber-50 border border-amber-200 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-amber-800">Customer Invoice</span>
              <p className="mt-1 text-base sm:text-lg font-bold text-slate-900">{order.customer}</p>
              <p className="mt-0.5 text-xs text-slate-500">Date: {dateLabel(order.date)}</p>
            </div>
          </div>

          <div className="grid gap-3 sm:gap-6 border-b border-slate-200 py-3.5 print:py-3 sm:grid-cols-2">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Billed To</p>
              <p className="mt-0.5 text-base sm:text-lg font-bold text-slate-900">{order.customer}</p>
              {order.phone && (
                <p className="mt-0.5 text-xs text-slate-600 flex items-center gap-1.5">
                  <Phone className="size-3 text-slate-400 shrink-0" />
                  <a href={`tel:${order.phone}`} className="text-amber-700 hover:underline font-medium">{order.phone}</a>
                </p>
              )}
              {order.address && (
                <p className="mt-0.5 text-xs text-slate-500 flex items-start gap-1.5">
                  <MapPin className="size-3 text-slate-400 mt-0.5 shrink-0" />
                  <span>{order.address}</span>
                </p>
              )}
              {order.notes && <p className="mt-1.5 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-2 inline-block">Note: {order.notes}</p>}
            </div>
            <div className="sm:text-right">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Handover Schedule</p>
              <p className="mt-0.5 text-base sm:text-lg font-bold text-slate-900">{dateLabel(order.deliveryDate)}</p>
              <p className="text-xs text-slate-500">Order Status: <span className="font-semibold text-slate-800">{order.status}</span></p>
              <p className="text-xs text-slate-400">Payment Due on Receipt</p>
            </div>
          </div>

          {/* Mobile Item Breakdown */}
          <div className="mt-4 sm:hidden print:hidden space-y-2">
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

          {/* Desktop & Print Table */}
          <div className="hidden sm:block print:block mt-4 print:mt-3">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 text-xs font-bold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="pb-2.5">Sweet Product</th>
                  <th className="pb-2.5 text-right">Quantity</th>
                  <th className="pb-2.5 text-right">Rate</th>
                  <th className="pb-2.5 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {lineItems.map((item, idx) => (
                  <tr key={idx} className="border-b border-slate-100">
                    <td className="py-2.5 font-semibold text-slate-900">{item.name}</td>
                    <td className="py-2.5 text-right font-medium text-slate-700">{item.qty} {item.unit}</td>
                    <td className="py-2.5 text-right text-slate-700">{money(item.rate)}</td>
                    <td className="py-2.5 text-right font-bold text-slate-900">{money(item.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Grand Total */}
          <div className="mt-4 print:mt-3 flex justify-end">
            <div className="w-full sm:max-w-[260px] border-t-2 border-slate-900 pt-2.5">
              <div className="flex items-center justify-between text-sm sm:text-base font-bold text-slate-900">
                <span>Grand Total:</span>
                <span className="text-xl sm:text-2xl text-amber-600">{money(total)}</span>
              </div>
            </div>
          </div>

          <p className="mt-5 print:mt-4 border-t border-slate-200 pt-3 text-center text-xs text-slate-400">
            Thank you for choosing Dhuniya Products. We take pride in authentic eastern sweets.
          </p>
        </article>
      </div>
    </div>
  );
}

// --- Product Modal with Cloudinary Upload ---
type ProductFormData = { name: string; unit: string; price: string; active: boolean; imageUrl?: string; description?: string };

function ProductModal({ initial, onSave, onClose }: {
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
    description: initial?.description ?? "",
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
      <div className="my-auto w-full max-w-md max-h-[92vh] flex flex-col rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden">
        <div className="shrink-0 flex items-center justify-between border-b border-slate-200 px-4 py-3.5 sm:px-6 sm:py-5 bg-slate-50">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-amber-600">{initial ? "Edit" : "New"} Sweet</p>
            <h3 className="mt-0.5 text-base sm:text-lg font-bold text-slate-900">{initial ? "Update Sweet Details" : "Add Sweet to Catalog"}</h3>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200"><X className="size-4" /></button>
        </div>
        <div className="flex-1 overflow-y-auto space-y-4 px-4 py-5 sm:px-6 sm:py-6">
          <div>
            <label className="mb-1.5 block text-xs font-bold text-slate-700">Sweet Name *</label>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Musket Halwa"
              className={`w-full rounded-xl border px-3.5 py-2.5 text-sm outline-none focus:border-amber-600 focus:ring-2 focus:ring-amber-500/20 transition-all ${errors.name ? "border-rose-400 bg-rose-50/30" : "border-slate-300"}`}
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
              className={`w-full rounded-xl border px-3.5 py-2.5 text-sm outline-none focus:border-amber-600 focus:ring-2 focus:ring-amber-500/20 transition-all ${errors.price ? "border-rose-400 bg-rose-50/30" : "border-slate-300"}`}
            />
            {errors.price && <p className="mt-1 text-xs text-rose-600">{errors.price}</p>}
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-bold text-slate-700">Description (Shown on Homepage)</label>
            <textarea
              rows={3}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="e.g. Traditional slow-cooked musket halwa prepared with pure ghee, cashews, and aromatic spices."
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm outline-none focus:border-amber-600 focus:ring-2 focus:ring-amber-500/20 resize-none placeholder:text-slate-400"
            />
            <p className="mt-1 text-[11px] text-slate-400">Describe the sweet recipe, ingredients, or specialty for public visitors.</p>
          </div>

          {/* Cloudinary Image Upload */}
          <div>
            <label className="mb-1.5 block text-xs font-bold text-slate-700">Product Image (Cloudinary)</label>
            <CloudinaryUpload
              value={form.imageUrl}
              onChange={(url) => setForm({ ...form, imageUrl: url })}
              onClear={() => setForm({ ...form, imageUrl: "" })}
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
      <div className="mx-auto max-w-[1250px] px-3.5 py-5 sm:px-6 sm:py-8 lg:px-10">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-amber-600">Sweet Catalog</span>
          <h2 className="mt-1 text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">Products & Production Demand</h2>
          <p className="mt-1 text-xs sm:text-sm text-slate-500">Manage sweet catalog, standard rates, and live customer orders in production.</p>
        </div>

        {products.length === 0 ? (
          <div className="mt-8 flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-white py-16 sm:py-20 text-center p-4">
            <PackagePlus className="size-12 text-amber-600" />
            <p className="mt-4 text-base sm:text-lg font-bold text-slate-800">No sweet products in catalog</p>
            <p className="mt-1 text-xs sm:text-sm text-slate-500">Add your first sweet to start taking orders.</p>
            <button onClick={() => setShowModal(true)} className="mt-5 rounded-xl bg-amber-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-amber-700 shadow-sm">
              Add Sweet Product
            </button>
          </div>
        ) : (
          <div className="mt-6">
            <div className="block sm:hidden space-y-3">
              {products.map((p) => {
                const activeOrders = orders.filter((o) => getOrderItems(o).some((it) => it.productId === p.id) && !["Completed", "Cancelled"].includes(o.status));
                const totalOrderedKg = activeOrders.reduce((sum, o) => {
                  const it = getOrderItems(o).find((i) => i.productId === p.id);
                  return sum + (Number(it?.qty) || 0);
                }, 0);
                return (
                  <div key={p.id} className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-sm hover:border-amber-300 transition-all space-y-3">
                    <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-3">
                      <div className="flex items-center gap-3 min-w-0">
                        {p.imageUrl ? (
                          <img src={optimizeImageUrl(p.imageUrl, 100)} alt={p.name} loading="lazy" decoding="async" className="size-10 shrink-0 rounded-xl object-cover border border-amber-300/40 shadow-2xs" />
                        ) : (
                          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-100 to-amber-200 text-amber-900 font-bold text-xs border border-amber-300/40 shadow-2xs">
                            {p.name.split(" ").map((w) => w[0]).join("").slice(0, 2)}
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-slate-900 text-base truncate">{p.name}</p>
                          {p.description && (
                            <p className="text-xs text-slate-400 line-clamp-1 mt-0.5">{p.description}</p>
                          )}
                          <p className="text-xs font-semibold text-amber-700 mt-0.5">{money(p.price)} / {p.unit}</p>
                        </div>
                      </div>
                      <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold border ${p.active ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-slate-100 text-slate-600 border-slate-200"}`}>
                        <span className={`size-1.5 rounded-full ${p.active ? "bg-emerald-500" : "bg-slate-400"}`} />
                        {p.active ? "Active" : "Archived"}
                      </span>
                    </div>
                    <div className="rounded-xl bg-slate-50 border border-slate-100 p-3 flex items-center justify-between">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Production Demand</p>
                        {activeOrders.length > 0 ? (
                          <p className="text-sm font-extrabold text-slate-900 mt-0.5">{totalOrderedKg.toFixed(2)} {p.unit} <span className="text-xs font-normal text-slate-500">({activeOrders.length} orders)</span></p>
                        ) : (
                          <p className="text-xs text-slate-400 mt-0.5">No active orders</p>
                        )}
                      </div>
                      {activeOrders.length > 0 && (
                        <button onClick={() => onViewProductOrders(p.id)} className="text-xs font-bold text-amber-600 hover:text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-lg">
                          View orders →
                        </button>
                      )}
                    </div>
                    <div className="flex items-center justify-end gap-2 pt-1">
                      <button onClick={() => setEditProduct(p)} className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors">
                        <Edit2 className="size-3.5" /> Edit
                      </button>
                      <button onClick={() => setDeleteId(p.id)} className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 hover:border-rose-200 transition-colors">
                        <Trash2 className="size-3.5" /> Delete
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

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
                      const activeOrders = orders.filter((o) => getOrderItems(o).some((it) => it.productId === p.id) && !["Completed", "Cancelled"].includes(o.status));
                      const totalOrderedKg = activeOrders.reduce((sum, o) => {
                        const it = getOrderItems(o).find((i) => i.productId === p.id);
                        return sum + (Number(it?.qty) || 0);
                      }, 0);
                      return (
                        <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              {p.imageUrl ? (
                                <img src={optimizeImageUrl(p.imageUrl, 100)} alt={p.name} loading="lazy" decoding="async" className="size-10 shrink-0 rounded-xl object-cover border border-amber-300/40" />
                              ) : (
                                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-800 font-bold text-xs">
                                  {p.name.split(" ").map((w) => w[0]).join("").slice(0, 2)}
                                </div>
                              )}
                              <div className="min-w-0 max-w-xs">
                                <span className="font-bold text-slate-900 block truncate">{p.name}</span>
                                {p.description && (
                                  <span className="text-xs text-slate-400 block truncate mt-0.5">{p.description}</span>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 font-medium text-slate-600">{p.unit}</td>
                          <td className="px-6 py-4 font-bold text-slate-900">{money(p.price)}<span className="ml-1 text-xs font-normal text-slate-400">/ {p.unit}</span></td>
                          <td className="px-6 py-4">
                            {activeOrders.length > 0 ? (
                              <div>
                                <p className="font-bold text-slate-900">{totalOrderedKg.toFixed(2)} {p.unit}</p>
                                <button onClick={() => onViewProductOrders(p.id)} className="mt-0.5 inline-flex items-center gap-1 text-xs font-semibold text-amber-600 hover:text-amber-700 hover:underline">
                                  {activeOrders.length} order{activeOrders.length !== 1 ? "s" : ""} · See who ordered & handover →
                                </button>
                              </div>
                            ) : (
                              <span className="text-xs text-slate-400">No active orders</span>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold border ${p.active ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-slate-100 text-slate-600 border-slate-200"}`}>
                              <span className={`size-1.5 rounded-full ${p.active ? "bg-emerald-500" : "bg-slate-400"}`} />
                              {p.active ? "Active" : "Inactive"}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button onClick={() => setEditProduct(p)} className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors" title="Edit sweet">
                                <Edit2 className="size-3.5" />
                              </button>
                              <button onClick={() => setDeleteId(p.id)} className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 transition-colors" title="Delete sweet">
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
  onSave,
  onClose,
}: {
  initial?: OrderItemFormData;
  products: Product[];
  onSave: (item: OrderItemFormData) => void;
  onClose: () => void;
}) {
  const activeProducts = products.filter((p) => p.active);
  const defaultProd = activeProducts[0] ?? products[0];

  const [productId, setProductId] = useState<string>(
    initial?.productId ? String(initial.productId) : String(defaultProd?.id ?? "")
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
            <select
              value={productId}
              onChange={(e) => handleProductChange(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-900 outline-none focus:border-amber-600 focus:ring-2 focus:ring-amber-500/20"
            >
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} — {money(p.price)} / {p.unit}
                </option>
              ))}
            </select>
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
              Amount Paid by Customer (Rs.)
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

function OrderModal({ initial, products, customers = [], initialCustomer, onSave, onClose }: {
  initial?: Order; products: Product[]; customers?: (Customer | string)[]; initialCustomer?: string | null; onSave: (data: OrderFormData) => void; onClose: () => void;
}) {
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
  const [deliveryDate, setDeliveryDate] = useState(initial?.deliveryDate ?? getTodayStr());
  const [notes, setNotes] = useState(initial?.notes ?? "");
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
    onSave({
      customer: customer.trim(),
      phone: phone.trim() || undefined,
      address: address.trim() || undefined,
      deliveryDate,
      notes: notes.trim(),
      items: items.map((it) => ({
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

              {normalizedCustomers.length > 0 && (
                <div className="mb-2">
                  <select
                    value={normalizedCustomers.some((c) => c.name.toLowerCase() === customer.toLowerCase()) ? (normalizedCustomers.find((c) => c.name.toLowerCase() === customer.toLowerCase())?.name ?? customer) : ""}
                    onChange={(e) => {
                      if (e.target.value) {
                        selectCustomer(e.target.value);
                      }
                    }}
                    className="w-full rounded-xl border border-amber-300/80 bg-amber-50/70 px-3.5 py-2 text-xs font-semibold text-slate-700 outline-none focus:border-amber-600 focus:ring-2 focus:ring-amber-500/20 cursor-pointer"
                  >
                    <option value="">▼ Select from saved customers ({normalizedCustomers.length})...</option>
                    {normalizedCustomers.map((c) => (
                      <option key={c.name} value={c.name}>
                        👤 {c.name} {c.phone ? `(${c.phone})` : ""}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <input
                list="customer-suggestions"
                value={customer}
                onChange={(e) => selectCustomer(e.target.value)}
                placeholder={normalizedCustomers.length > 0 ? "Or type a new customer name..." : "e.g. Sharma Sweets, Grand Banquets"}
                autoComplete="off"
                className={`w-full rounded-xl border px-3.5 py-2.5 text-sm outline-none focus:border-amber-600 focus:ring-2 focus:ring-amber-500/20 transition-all ${errors.customer ? "border-rose-400 bg-rose-50/30" : "border-slate-300"}`}
              />
              <datalist id="customer-suggestions">
                {normalizedCustomers.map((c) => (
                  <option key={c.name} value={c.name} />
                ))}
              </datalist>
              {errors.customer && <p className="mt-1 text-xs text-rose-600">{errors.customer}</p>}

              {normalizedCustomers.length > 0 && (
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mr-0.5">Quick pick:</span>
                  {normalizedCustomers.slice(0, 5).map((c) => (
                    <button
                      key={c.name}
                      type="button"
                      onClick={() => selectCustomer(c.name)}
                      className={`text-[11px] font-medium px-2 py-0.5 rounded-lg border transition-all ${customer.toLowerCase() === c.name.toLowerCase()
                        ? "bg-amber-600 text-white border-amber-600 shadow-2xs"
                        : "bg-slate-100 text-slate-600 border-slate-200 hover:bg-amber-50 hover:text-amber-800 hover:border-amber-300"
                        }`}
                    >
                      {c.name}
                    </button>
                  ))}
                </div>
              )}

              <div className="mt-3 grid gap-3 sm:grid-cols-2">
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
            </div>

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
                <button
                  type="button"
                  onClick={() => {
                    setEditingItemIdx(null);
                    setShowItemDialog(true);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-amber-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-amber-700 transition-colors shadow-2xs"
                >
                  <Plus className="size-3.5" />
                  <span>Add Product</span>
                </button>
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
          onSave={(savedItem) => {
            if (editingItemIdx !== null) {
              setItems((prev) => prev.map((it, i) => (i === editingItemIdx ? savedItem : it)));
            } else {
              setItems((prev) => [...prev, savedItem]);
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

function OrderCard({ order, products, customerLookup, onStatusChange, onGenerate, onEdit, onDelete, onManagePayment }: {
  order: Order; products: Product[]; customerLookup?: Map<string, Customer>; onStatusChange: (id: string, s: string) => void; onGenerate: (o: Order) => void; onEdit: (o: Order) => void; onDelete: (id: string) => void; onManagePayment: (o: Order) => void;
}) {
  const items = getOrderItems(order);
  const total = getOrderTotal(order, products);
  const totalKg = getOrderTotalKg(order);
  const badge = getHandoverBadge(order.deliveryDate);
  const info = customerLookup?.get(order.customer.trim().toLowerCase());
  const phone = order.phone || info?.phone;
  const address = order.address || info?.address;

  return (
    <div className="rounded-xl border border-slate-200/90 bg-white shadow-sm hover:border-amber-300 transition-all overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2.5 px-3 py-2.5 border-b border-slate-100">
        <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-amber-100 to-amber-200 text-amber-900 font-bold text-xs border border-amber-300/40">
          {order.customer.charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="font-bold text-slate-900 text-sm truncate leading-tight">{order.customer}</h4>
            {badge && <span className={`inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-bold ${badge.style}`}>{badge.label}</span>}
          </div>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <span className="text-[10px] text-slate-500">{items.length} item{items.length !== 1 ? "s" : ""} · {dateLabel(order.deliveryDate)}</span>
            {phone && (
              <a href={`tel:${phone}`} className="text-[10px] font-bold text-amber-700 hover:underline flex items-center gap-0.5">
                <Phone className="size-2.5" />{phone}
              </a>
            )}
          </div>
        </div>
        <div className="shrink-0">
          <StatusDropdown value={order.status} onChange={(v) => onStatusChange(order.id, v)} />
        </div>
      </div>

      {/* Sweets List */}
      <div className="px-3 py-2 space-y-1 bg-amber-50/30 border-b border-amber-100/60">
        {items.map((item, idx) => {
          const prod = products.find((p) => p.id === item.productId);
          const r = item.rate ?? prod?.price ?? 0;
          return (
            <div key={idx} className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-slate-800 truncate">{prod?.name ?? "Sweet"}</span>
              <span className="text-[11px] text-slate-500 shrink-0">{item.qty} {prod?.unit ?? "kg"} ({money(item.qty * r)})</span>
            </div>
          );
        })}
        <div className="flex items-center justify-between pt-1 border-t border-amber-100/60">
          <button
            type="button"
            onClick={() => onManagePayment(order)}
            className="cursor-pointer group flex items-center gap-1"
            title="Click to manage payment"
          >
            <PaymentBadge amountPaid={order.amountPaid ?? 0} total={total} />
            <span className="text-[10px] text-amber-700 font-semibold underline group-hover:text-amber-800">Edit Pay</span>
          </button>
          <span className="text-xs font-black text-amber-800">{money(total)}</span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1.5 px-3 py-2">
        <button
          onClick={() => onManagePayment(order)}
          className="h-7 rounded-lg border border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100 text-[11px] font-bold px-2.5 transition-colors"
        >
          💳 Payment
        </button>
        <Button size="sm" variant="outline" onClick={() => onGenerate(order)} className="h-7 border-slate-200 text-slate-700 hover:bg-slate-50 text-[11px] font-bold px-2.5 gap-1">
          <FileText className="size-3" /> Bill
        </Button>
        <button onClick={() => onEdit(order)} className="flex h-7 items-center gap-1 rounded-lg border border-slate-200 px-2 text-[11px] font-semibold text-slate-600 hover:bg-slate-50 transition-colors">
          <Edit2 className="size-3" /> Edit
        </button>
        <button onClick={() => onDelete(order.id)} className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 transition-colors ml-auto">
          <Trash2 className="size-3.5" />
        </button>
      </div>
    </div>
  );
}

function OrdersTable({ orders, products, customerLookup, onStatusChange, onGenerate, onEdit, onDelete, onManagePayment }: {
  orders: Order[]; products: Product[]; customerLookup?: Map<string, Customer>; onStatusChange: (id: string, s: string) => void; onGenerate: (o: Order) => void; onEdit: (o: Order) => void; onDelete: (id: string) => void; onManagePayment: (o: Order) => void;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[960px] text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-4 py-3">Customer</th>
              <th className="px-4 py-3">Sweets & Qty</th>
              <th className="px-4 py-3">Handover</th>
              <th className="px-4 py-3">Amount</th>
              <th className="px-4 py-3">Payment</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {orders.map((order) => {
              const items = getOrderItems(order);
              const total = getOrderTotal(order, products);
              const badge = getHandoverBadge(order.deliveryDate);
              const info = customerLookup?.get(order.customer.trim().toLowerCase());
              const phone = order.phone || info?.phone;
              const address = order.address || info?.address;

              return (
                <tr key={order.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2.5">
                      <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-800 font-bold text-xs">
                        {order.customer.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-slate-900 text-sm leading-tight">{order.customer}</p>
                        <div className="flex items-center gap-2 mt-0.5 text-xs">
                          {phone && (
                            <a href={`tel:${phone}`} className="inline-flex items-center gap-0.5 font-semibold text-amber-700 hover:underline">
                              <Phone className="size-2.5" />{phone}
                            </a>
                          )}
                          {order.notes && <span className="italic text-slate-400 truncate max-w-[140px] text-[11px]">{order.notes}</span>}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="space-y-0.5 max-w-[220px]">
                      {items.map((item, idx) => {
                        const prod = products.find((p) => p.id === item.productId);
                        return (
                          <div key={idx} className="flex items-center gap-1.5 text-xs">
                            <span className="font-semibold text-slate-800 truncate">{prod?.name ?? "Sweet"}</span>
                            <span className="text-slate-400 shrink-0">{item.qty} {prod?.unit ?? "kg"}</span>
                          </div>
                        );
                      })}
                    </div>
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex flex-col gap-0.5">
                      <div className="flex items-center gap-1">
                        <Calendar className="size-3 text-amber-600" />
                        <span className="font-bold text-xs text-slate-900">{dateLabel(order.deliveryDate)}</span>
                      </div>
                      {badge && <span className={`inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-bold ${badge.style}`}>{badge.label}</span>}
                    </div>
                  </td>
                  <td className="px-4 py-2.5 font-bold text-sm text-slate-900">{money(total)}</td>
                  <td className="px-4 py-2.5">
                    <button
                      type="button"
                      onClick={() => onManagePayment(order)}
                      className="cursor-pointer group flex items-center gap-1 hover:opacity-80 transition-opacity"
                      title="Click to manage payment"
                    >
                      <PaymentBadge amountPaid={order.amountPaid ?? 0} total={total} />
                      <span className="text-[10px] text-amber-600 opacity-0 group-hover:opacity-100 transition-opacity font-semibold">Edit</span>
                    </button>
                  </td>
                  <td className="px-4 py-2.5"><StatusDropdown value={order.status} onChange={(v) => onStatusChange(order.id, v)} /></td>
                  <td className="px-4 py-2.5 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => onManagePayment(order)}
                        className="rounded-lg border border-amber-300 bg-amber-50 px-2 py-1 text-xs font-bold text-amber-800 hover:bg-amber-100 transition-colors"
                        title="Manage payment"
                      >
                        💳 Pay
                      </button>
                      <Button size="sm" variant="outline" onClick={() => onGenerate(order)} className="h-7 border-amber-200 bg-amber-50/70 text-amber-800 hover:bg-amber-100 font-semibold text-xs px-2">
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

function OrdersPage({ orders, products, customers = [], initialCustomer = null, onClearInitialCustomer, onAdd, onEdit, onDelete, onStatusChange, onGenerate, onUpdatePayment, initialProductFilter = null, onClearProductFilter, onOpenSidebar }: {
  orders: Order[]; products: Product[]; customers?: (Customer | string)[]; initialCustomer?: string | null; onClearInitialCustomer?: () => void; onAdd: (data: OrderFormData) => void; onEdit: (id: string, data: OrderFormData) => void;
  onDelete: (id: string) => void; onStatusChange: (id: string, status: string) => void; onGenerate: (order: Order) => void; onUpdatePayment: (orderId: string, amount: number) => void;
  initialProductFilter?: number | null; onClearProductFilter?: () => void; onOpenSidebar?: () => void;
}) {
  const [showModal, setShowModal] = useState(false);
  const [editOrder, setEditOrder] = useState<Order | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [paymentOrder, setPaymentOrder] = useState<Order | null>(null);
  const [selectedCustomerForNewOrder, setSelectedCustomerForNewOrder] = useState<string | null>(initialCustomer);
  const [query, setQuery] = useState("");
  const [filterProductId, setFilterProductId] = useState<string>(initialProductFilter ? String(initialProductFilter) : "All");
  const [filterStatus, setFilterStatus] = useState("All");
  const [filterDate, setFilterDate] = useState("");
  const [quickTab, setQuickTab] = useState<"all" | "today" | "ready" | "kitchen" | "completed">("all");
  const [groupBy, setGroupBy] = useState<"date" | "product" | "status" | "none">("date");
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

  const totalFilteredKg = useMemo(() => displayedOrders.reduce((sum, o) => sum + getOrderTotalKg(o), 0), [displayedOrders]);
  const getProduct = (id: number) => products.find((p) => p.id === id);

  const groupedOrders = useMemo(() => {
    if (groupBy === "none") return [{ key: "all", title: "All Orders", orders: displayedOrders }];
    if (groupBy === "date") {
      const todayOrders: Order[] = [], tomorrowOrders: Order[] = [], upcomingOrders: Order[] = [], pastOrders: Order[] = [];
      displayedOrders.forEach((o) => {
        const badge = getHandoverBadge(o.deliveryDate);
        if (badge?.label === "Today" || o.deliveryDate === todayStr) todayOrders.push(o);
        else if (badge?.label === "Tomorrow") tomorrowOrders.push(o);
        else if (badge?.label?.startsWith("In") || o.deliveryDate > todayStr) upcomingOrders.push(o);
        else pastOrders.push(o);
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
              const groupKg = group.orders.reduce((sum, o) => sum + getOrderTotalKg(o), 0);
              return (
                <section key={group.key} className="space-y-3">
                  {groupBy !== "none" && (
                    <div className="flex items-center justify-between px-1">
                      <div className="flex items-center gap-2">
                        <span className="flex size-6 items-center justify-center rounded-lg bg-amber-100 text-amber-800 text-xs font-extrabold shadow-2xs">{group.orders.length}</span>
                        <h3 className="text-sm sm:text-base font-extrabold text-slate-900">{group.title}</h3>
                        {(group as any).badge && (<span className="rounded-md bg-amber-100 border border-amber-300/60 px-2 py-0.5 text-[10px] font-bold text-amber-800">{(group as any).badge}</span>)}
                      </div>
                      <span className="text-xs font-bold text-slate-500">Total: <strong className="text-amber-600 font-extrabold">{groupKg.toFixed(2)} kg</strong></span>
                    </div>
                  )}
                  <div className="block sm:hidden space-y-3.5">
                    {group.orders.map((order) => {
                      // multi-product ready
                      return <OrderCard key={order.id} order={order} products={products} customerLookup={customerLookup} onStatusChange={onStatusChange} onGenerate={onGenerate} onEdit={setEditOrder} onDelete={setDeleteId} onManagePayment={setPaymentOrder} />;
                    })}
                  </div>
                  <div className="hidden sm:block">
                    <OrdersTable orders={group.orders} products={products} customerLookup={customerLookup} onStatusChange={onStatusChange} onGenerate={onGenerate} onEdit={setEditOrder} onDelete={setDeleteId} onManagePayment={setPaymentOrder} />
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </div>

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
  const totalKg = activeOrders.reduce((sum, o) => sum + getOrderTotalKg(o), 0);
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
    customerMap.set(o.customer, { orders: existing.orders + 1, kg: existing.kg + getOrderTotalKg(o) });
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
            <div className="mt-2 sm:mt-2.5 flex items-baseline gap-1">
              <span className="text-xl sm:text-3xl font-black text-slate-900">{totalKg.toFixed(2)}</span>
              <span className="text-[10px] sm:text-xs font-bold text-amber-600">kg active</span>
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
                          <p className="text-base sm:text-xl font-extrabold text-slate-950">{kg.toFixed(2)}</p>
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
                                  <span className="text-sm font-extrabold text-amber-700">{(getOrderItems(o).find(it => it.productId === product.id)?.qty ?? o.qty ?? 0)} {product.unit}</span>
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
                              return (
                                <div key={o.id} className="grid grid-cols-[1fr_90px_140px_110px] gap-2 items-center px-6 py-3 hover:bg-amber-50/40 transition-colors">
                                  <div className="flex items-center gap-2.5 min-w-0">
                                    <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-amber-100 text-[10px] font-bold text-amber-800">{o.customer.charAt(0).toUpperCase()}</div>
                                    <div className="min-w-0">
                                      <p className="text-sm font-bold truncate text-slate-900">{o.customer}</p>
                                      <p className="text-[11px] text-slate-400 truncate">{o.notes ? `"${o.notes}"` : ""}</p>
                                    </div>
                                  </div>
                                  <p className="text-sm font-bold text-right text-amber-600">{(getOrderItems(o).find(it => it.productId === product.id)?.qty ?? o.qty ?? 0)} {product.unit}</p>
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
                            Total for {product.name}: <strong className="text-slate-900 font-bold">{kg.toFixed(2)} {product.unit}</strong> across {count} customer order{count !== 1 ? "s" : ""}
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

function CustomersPage({
  customers,
  orders,
  onAdd,
  onEdit,
  onDelete,
  onCreateOrder,
  onOpenSidebar,
}: {
  customers: Customer[];
  orders: Order[];
  onAdd: (data: CustomerFormData) => void;
  onEdit: (id: number | string, data: CustomerFormData) => void;
  onDelete: (id: number | string, name: string) => void;
  onCreateOrder: (customerName: string) => void;
  onOpenSidebar?: () => void;
}) {
  const [showModal, setShowModal] = useState(false);
  const [editCustomer, setEditCustomer] = useState<Customer | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Customer | null>(null);
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
      cur.totalKg += getOrderTotalKg(o);
      if (!cur.lastDate || o.date > cur.lastDate) {
        cur.lastDate = o.date;
      }
      map.set(name, cur);
    }
    return map;
  }, [orders]);

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
            {/* Mobile Cards (Visible on mobile screens) */}
            <div className="mt-4 block sm:hidden space-y-3">
              {filtered.map((c) => {
                const stats = customerStats.get(c.name.trim());
                const initials = c.name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
                return (
                  <div key={c.id ?? c.name} className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-sm space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-100 to-amber-100 text-amber-900 font-bold text-xs border border-amber-300/40">
                          {initials}
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-slate-900 text-sm truncate">{c.name}</p>
                          {c.address && (
                            <p className="text-[11px] text-slate-500 flex items-center gap-1 truncate mt-0.5">
                              <MapPin className="size-3 text-slate-400 shrink-0" />
                              <span className="truncate">{c.address}</span>
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Orders badge */}
                      {stats && stats.totalOrders > 0 ? (
                        <span className="shrink-0 rounded-full bg-amber-50 border border-amber-200 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                          {stats.totalOrders} order{stats.totalOrders !== 1 ? "s" : ""}
                        </span>
                      ) : (
                        <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500">
                          New
                        </span>
                      )}
                    </div>

                    {c.phone && (
                      <div className="flex items-center justify-between bg-slate-50 rounded-xl px-3 py-2 text-xs">
                        <span className="text-slate-500 font-medium">Contact:</span>
                        <a href={`tel:${c.phone}`} className="font-bold text-amber-700 hover:underline flex items-center gap-1">
                          <Phone className="size-3" />
                          <span>{c.phone}</span>
                        </a>
                      </div>
                    )}

                    {c.notes && (
                      <p className="text-xs text-slate-500 italic bg-amber-50/40 border border-amber-100 rounded-lg p-2">
                        &ldquo;{c.notes}&rdquo;
                      </p>
                    )}

                    <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                      <button
                        onClick={() => onCreateOrder(c.name)}
                        className="inline-flex items-center gap-1 text-xs font-bold text-amber-600 hover:text-amber-700"
                      >
                        <Plus className="size-3.5" />
                        <span>Place Order</span>
                      </button>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => { setEditCustomer(c); setShowModal(true); }}
                          className="rounded-lg p-1.5 text-slate-400 hover:text-amber-700 hover:bg-slate-100"
                          title="Edit Customer"
                        >
                          <Edit2 className="size-4" />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(c)}
                          className="rounded-lg p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                          title="Delete Customer"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop Table (Visible on sm and larger) */}
            <div className="mt-5 hidden sm:block overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-xs">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="border-b border-slate-200 bg-slate-50/75 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-6 py-3.5">Customer</th>
                    <th className="px-6 py-3.5">Contact Phone</th>
                    <th className="px-6 py-3.5">Address / Location</th>
                    <th className="px-6 py-3.5">Order History</th>
                    <th className="px-6 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map((c) => {
                    const stats = customerStats.get(c.name.trim());
                    const initials = c.name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
                    return (
                      <tr key={c.id ?? c.name} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-100 to-amber-100 text-amber-900 font-bold text-xs border border-amber-300/40">
                              {initials}
                            </div>
                            <div className="min-w-0">
                              <span className="font-bold text-slate-900 block truncate">{c.name}</span>
                              {c.notes && (
                                <span className="text-xs text-slate-400 block truncate mt-0.5 italic">{c.notes}</span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {c.phone ? (
                            <a href={`tel:${c.phone}`} className="inline-flex items-center gap-1.5 font-semibold text-slate-800 hover:text-amber-700 hover:underline">
                              <Phone className="size-3.5 text-slate-400" />
                              <span>{c.phone}</span>
                            </a>
                          ) : (
                            <span className="text-slate-400 text-xs italic">— No phone</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          {c.address ? (
                            <span className="inline-flex items-center gap-1.5 text-slate-700">
                              <MapPin className="size-3.5 text-slate-400 shrink-0" />
                              <span className="truncate max-w-[200px]">{c.address}</span>
                            </span>
                          ) : (
                            <span className="text-slate-400 text-xs italic">— No location</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          {stats && stats.totalOrders > 0 ? (
                            <div>
                              <span className="font-bold text-slate-900">{stats.totalOrders} order{stats.totalOrders !== 1 ? "s" : ""}</span>
                              <span className="text-xs text-slate-500 block">({stats.totalKg.toFixed(1)} kg total)</span>
                            </div>
                          ) : (
                            <span className="text-xs font-medium text-slate-400">No orders yet</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              onClick={() => onCreateOrder(c.name)}
                              className="rounded-lg bg-amber-50 border border-amber-200 px-2.5 py-1 text-xs font-bold text-amber-700 hover:bg-amber-100 transition-colors"
                              title="Create order for this customer"
                            >
                              + Order
                            </button>
                            <button
                              onClick={() => { setEditCustomer(c); setShowModal(true); }}
                              className="rounded-lg p-1.5 text-slate-400 hover:text-amber-700 hover:bg-slate-100 transition-colors"
                              title="Edit Customer"
                            >
                              <Edit2 className="size-4" />
                            </button>
                            <button
                              onClick={() => setDeleteTarget(c)}
                              className="rounded-lg p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                              title="Delete Customer"
                            >
                              <Trash2 className="size-4" />
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
        try {
          const lp = localStorage.getItem("dhuniya_products"); if (lp) setProducts(JSON.parse(lp));
          const lo = localStorage.getItem("dhuniya_orders"); if (lo) setOrders(JSON.parse(lo));
        } catch { }
        setIsLoading(false); return;
      }
      try {
        const { data: prodData, error: prodErr } = await client
          .from("products")
          .select("id,name,unit,price,active,image_url,description")
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
            description: p.description || undefined,
          }));

          // Deduplicate products by lowercase name so duplicates in database never double up
          const mapByName = new Map<string, Product>();
          for (const p of loadedProducts) {
            const key = p.name.trim().toLowerCase();
            const existing = mapByName.get(key);
            if (!existing) {
              mapByName.set(key, p);
            } else if ((!existing.imageUrl && p.imageUrl) || (!existing.description && p.description)) {
              mapByName.set(key, { ...existing, ...p });
            }
          }
          const deduplicatedProducts = Array.from(mapByName.values());
          setProducts(deduplicatedProducts);
          try { localStorage.setItem("dhuniya_products", JSON.stringify(deduplicatedProducts)); } catch { }
        } else {
          setProducts([]);
        }
        const { data: ordData, error: ordErr } = await client.from("orders").select("*").order("created_at", { ascending: false });
        if (ordErr) throw ordErr;
        let loadedOrders: Order[] = [];
        if (ordData && ordData.length > 0) {
          loadedOrders = ordData.map((o: any) => {
            let parsedItems: OrderItem[] = [];
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
              } catch { }
            }
            if (parsedItems.length === 0 && o.product_id) {
              parsedItems = [{
                productId: Number(o.product_id),
                qty: Number(o.qty ?? 0),
                rate: o.rate ? Number(o.rate) : undefined,
              }];
            }
            return {
              id: o.id,
              date: o.date,
              deliveryDate: o.delivery_date,
              customer: o.customer,
              items: parsedItems,
              productId: parsedItems[0]?.productId ?? Number(o.product_id),
              qty: parsedItems.reduce((s, it) => s + it.qty, 0),
              rate: parsedItems[0]?.rate ?? (o.rate ? Number(o.rate) : undefined),
              status: o.status,
              notes: o.notes || undefined,
              phone: o.phone || undefined,
              address: o.address || undefined,
            };
          });
          setOrders(loadedOrders);
          try { localStorage.setItem("dhuniya_orders", JSON.stringify(loadedOrders)); } catch { }
        } else {
          try { const lo = localStorage.getItem("dhuniya_orders"); if (lo) { loadedOrders = JSON.parse(lo); setOrders(loadedOrders); } } catch { }
        }

        // Load customers from Supabase table + existing orders + local storage
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

        const existingNames = new Set(remoteCust.map((c) => c.name.toLowerCase()));
        const orderCust: Customer[] = [];
        for (const o of loadedOrders) {
          const name = o.customer?.trim();
          if (name && !existingNames.has(name.toLowerCase())) {
            existingNames.add(name.toLowerCase());
            orderCust.push({ id: `order-${name}`, name });
          }
        }

        let localCust: Customer[] = [];
        try {
          const lc = localStorage.getItem("dhuniya_customers_v2");
          if (lc) localCust = JSON.parse(lc);
        } catch { }

        for (const c of localCust) {
          if (c.name && !existingNames.has(c.name.trim().toLowerCase())) {
            existingNames.add(c.name.trim().toLowerCase());
            orderCust.push(c);
          }
        }

        const combinedCustomers = [...remoteCust, ...orderCust].sort((a, b) => a.name.localeCompare(b.name));
        setCustomers(combinedCustomers);
        try { localStorage.setItem("dhuniya_customers_v2", JSON.stringify(combinedCustomers)); } catch { }
      } catch (err: any) {
        console.error("Error loading Supabase data:", err);
        addToast("error", `Supabase connection note: ${err.message || "Using local storage"}`);
        try { const lp = localStorage.getItem("dhuniya_products"); if (lp) setProducts(JSON.parse(lp)); const lo = localStorage.getItem("dhuniya_orders"); if (lo) setOrders(JSON.parse(lo)); } catch { }
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
      unit: data.unit,
      price: Number(data.price),
      active: data.active,
      imageUrl: data.imageUrl?.trim() || undefined,
      description: data.description?.trim() || undefined,
    };
    setProducts((prev) => { const updated = [...prev, newProduct]; try { localStorage.setItem("dhuniya_products", JSON.stringify(updated)); } catch { } return updated; });
    addToast("success", `Sweet "${data.name}" added`);
    const client = getSupabase();
    if (client) {
      try {
        let { data: inserted, error } = await client.from("products").insert({
          name: data.name.trim(),
          unit: data.unit,
          price: Number(data.price),
          active: data.active,
          image_url: data.imageUrl?.trim() || null,
          description: data.description?.trim() || null,
        }).select().single();

        // Fallback: If Supabase table does not yet have 'description' column, save without it
        if (error && (error.message?.includes("description") || error.code === "PGRST204")) {
          const fallback = await client.from("products").insert({
            name: data.name.trim(),
            unit: data.unit,
            price: Number(data.price),
            active: data.active,
            image_url: data.imageUrl?.trim() || null,
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
      unit: data.unit,
      price: Number(data.price),
      active: data.active,
      imageUrl: data.imageUrl?.trim() || undefined,
      description: data.description?.trim() || undefined,
    };
    setProducts((prev) => { const updated = prev.map((p) => (p.id === id ? updatedProduct : p)); try { localStorage.setItem("dhuniya_products", JSON.stringify(updated)); } catch { } return updated; });
    addToast("success", `Sweet "${data.name}" updated`);
    const client = getSupabase();
    if (client) {
      try {
        let { error } = await client.from("products").update({
          name: data.name.trim(),
          unit: data.unit,
          price: Number(data.price),
          active: data.active,
          image_url: data.imageUrl?.trim() || null,
          description: data.description?.trim() || null,
        }).eq("id", id);

        // Fallback: If Supabase table does not yet have 'description' column, update without it
        if (error && (error.message?.includes("description") || error.code === "PGRST204")) {
          const fallback = await client.from("products").update({
            name: data.name.trim(),
            unit: data.unit,
            price: Number(data.price),
            active: data.active,
            image_url: data.imageUrl?.trim() || null,
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

    setProducts((prev) => { const updated = prev.filter((p) => p.id !== id); try { localStorage.setItem("dhuniya_products", JSON.stringify(updated)); } catch { } return updated; });
    addToast("info", `Deleted "${target?.name ?? "Sweet"}"`);
    const client = getSupabase();
    if (client) {
      try { const { error } = await client.from("products").delete().eq("id", id); if (error) throw error; }
      catch (err: any) { addToast("error", `Supabase delete failed: ${err.message}`); setProducts(prevProducts); }
    }
  };

  const addOrder = async (data: OrderFormData) => {
    const newOrderId = genOrderId(orders);
    const parsedItems: OrderItem[] = (data.items && data.items.length > 0)
      ? data.items.map((it) => ({
        productId: Number(it.productId),
        qty: Number(it.qty),
        rate: it.rate ? Number(it.rate) : undefined,
      }))
      : (data.productId ? [{ productId: Number(data.productId), qty: Number(data.qty), rate: data.rate ? Number(data.rate) : undefined }] : []);

    const primaryItem = parsedItems[0];
    const totalQty = parsedItems.reduce((sum, it) => sum + it.qty, 0);

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
      notes: data.notes?.trim() || undefined,
      phone: data.phone?.trim() || undefined,
      address: data.address?.trim() || undefined,
    };
    setOrders((prev) => { const updated = [newOrder, ...prev]; try { localStorage.setItem("dhuniya_orders", JSON.stringify(updated)); } catch { } return updated; });

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
        try { localStorage.setItem("dhuniya_customers_v2", JSON.stringify(updated)); } catch { }
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
        // Try inserting with items JSON
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
          notes: newOrder.notes ?? null,
          phone: newOrder.phone ?? null,
          address: newOrder.address ?? null,
        });

        // Fallback 1: table might not have items column yet
        if (error && (error.message?.includes("items") || error.code === "PGRST204")) {
          const fb = await client.from("orders").insert({
            id: newOrder.id,
            date: newOrder.date,
            delivery_date: newOrder.deliveryDate,
            customer: newOrder.customer,
            product_id: newOrder.productId || null,
            qty: newOrder.qty,
            rate: newOrder.rate ?? null,
            status: newOrder.status,
            notes: newOrder.notes ?? null,
            phone: newOrder.phone ?? null,
            address: newOrder.address ?? null,
          });
          error = fb.error;
        }

        // Fallback 2: table might not have phone/address
        if (error && (error.message?.includes("phone") || error.message?.includes("address") || error.code === "PGRST204")) {
          const fb2 = await client.from("orders").insert({
            id: newOrder.id,
            date: newOrder.date,
            delivery_date: newOrder.deliveryDate,
            customer: newOrder.customer,
            product_id: newOrder.productId || null,
            qty: newOrder.qty,
            rate: newOrder.rate ?? null,
            status: newOrder.status,
            notes: newOrder.notes ?? null,
          });
          error = fb2.error;
        }

        if (error) throw error;
      } catch (err: any) { addToast("error", `Supabase error: ${err.message}`); setOrders((prev) => prev.filter((o) => o.id !== newOrderId)); }
    }
  };

  const editOrder = async (id: string, data: OrderFormData) => {
    const prevOrders = [...orders];
    const current = orders.find((o) => o.id === id);
    const parsedItems: OrderItem[] = (data.items && data.items.length > 0)
      ? data.items.map((it) => ({
        productId: Number(it.productId),
        qty: Number(it.qty),
        rate: it.rate ? Number(it.rate) : undefined,
      }))
      : (data.productId ? [{ productId: Number(data.productId), qty: Number(data.qty), rate: data.rate ? Number(data.rate) : undefined }] : []);

    const primaryItem = parsedItems[0];
    const totalQty = parsedItems.reduce((sum, it) => sum + it.qty, 0);

    const updatedOrder: Order = {
      id,
      date: current?.date ?? getTodayStr(),
      customer: data.customer.trim(),
      items: parsedItems,
      productId: primaryItem?.productId ?? current?.productId ?? 0,
      qty: totalQty,
      rate: primaryItem?.rate,
      deliveryDate: data.deliveryDate,
      notes: data.notes?.trim() || undefined,
      phone: data.phone?.trim() || current?.phone || undefined,
      address: data.address?.trim() || current?.address || undefined,
      status: current?.status ?? "Pending",
    };
    setOrders((prev) => { const updated = prev.map((o) => (o.id === id ? updatedOrder : o)); try { localStorage.setItem("dhuniya_orders", JSON.stringify(updated)); } catch { } return updated; });

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
        try { localStorage.setItem("dhuniya_customers_v2", JSON.stringify(updated)); } catch { }
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
        let { error } = await client.from("orders").update({
          customer: data.customer.trim(),
          items: updatedOrder.items,
          product_id: updatedOrder.productId || null,
          qty: updatedOrder.qty,
          rate: updatedOrder.rate ?? null,
          delivery_date: data.deliveryDate,
          notes: data.notes?.trim() || null,
          phone: updatedOrder.phone ?? null,
          address: updatedOrder.address ?? null,
        }).eq("id", id);

        if (error && (error.message?.includes("items") || error.code === "PGRST204")) {
          const fb = await client.from("orders").update({
            customer: data.customer.trim(),
            product_id: updatedOrder.productId || null,
            qty: updatedOrder.qty,
            rate: updatedOrder.rate ?? null,
            delivery_date: data.deliveryDate,
            notes: data.notes?.trim() || null,
            phone: updatedOrder.phone ?? null,
            address: updatedOrder.address ?? null,
          }).eq("id", id);
          error = fb.error;
        }

        if (error && (error.message?.includes("phone") || error.message?.includes("address") || error.code === "PGRST204")) {
          const fb2 = await client.from("orders").update({
            customer: data.customer.trim(),
            product_id: updatedOrder.productId || null,
            qty: updatedOrder.qty,
            rate: updatedOrder.rate ?? null,
            delivery_date: data.deliveryDate,
            notes: data.notes?.trim() || null,
          }).eq("id", id);
          error = fb2.error;
        }

        if (error) throw error;
      } catch (err: any) { addToast("error", `Supabase update failed: ${err.message}`); setOrders(prevOrders); }
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
      try { localStorage.setItem("dhuniya_customers_v2", JSON.stringify(updated)); } catch { }
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
      try { localStorage.setItem("dhuniya_customers_v2", JSON.stringify(updated)); } catch { }
      return updated;
    });
    addToast("success", `Customer "${trimmed}" updated`);
  };

  const deleteCustomer = async (id: number | string, name: string) => {
    const prevCustomers = [...customers];
    setCustomers((prev) => {
      const updated = prev.filter((c) => c.id !== id && c.name !== name);
      try { localStorage.setItem("dhuniya_customers_v2", JSON.stringify(updated)); } catch { }
      return updated;
    });

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
    setOrders((prev) => { const updated = prev.filter((o) => o.id !== id); try { localStorage.setItem("dhuniya_orders", JSON.stringify(updated)); } catch { } return updated; });
    addToast("info", "Order deleted");
    const client = getSupabase();
    if (client) {
      try { const { error } = await client.from("orders").delete().eq("id", id); if (error) throw error; }
      catch (err: any) { addToast("error", `Supabase delete failed: ${err.message}`); setOrders(prevOrders); }
    }
  };

  const updateStatus = async (id: string, status: string) => {
    const prevOrders = [...orders];
    setOrders((prev) => { const updated = prev.map((o) => (o.id === id ? { ...o, status } : o)); try { localStorage.setItem("dhuniya_orders", JSON.stringify(updated)); } catch { } return updated; });
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
    try {
      localStorage.setItem("dhuniya_orders", JSON.stringify(updatedOrders));
    } catch {}

    addToast("success", `Payment of ${money(amountPaid)} recorded for ${target.customer}`);

    const client = getSupabase();
    if (client) {
      try {
        const { error } = await client
          .from("orders")
          .update({
            amount_paid: amountPaid,
            payment_status: paymentStatus,
          })
          .eq("id", id);
        if (error) throw error;
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
        {active === "Customers" && (<CustomersPage customers={customers} orders={orders} onAdd={addCustomer} onEdit={editCustomer} onDelete={deleteCustomer} onCreateOrder={(name) => { setNewOrderInitialCustomer(name); setActive("Orders"); }} onOpenSidebar={() => setSidebarOpen(true)} />)}
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

