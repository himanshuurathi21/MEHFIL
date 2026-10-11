"use client";
import React, { createContext, useCallback, useContext, useState } from "react";
import Image from "next/image";

type Toast = { id: number; message: string };
const ToastCtx = createContext<{ push: (msg: string) => void }>({ push: () => {} });
export const useToast = () => useContext(ToastCtx);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const push = useCallback((message: string) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, message }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3200);
  }, []);
  return (
    <ToastCtx.Provider value={{ push }}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-20 z-50 mx-auto flex w-full max-w-sm flex-col items-center gap-2 px-4">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="w-full rounded-2xl bg-[#1c1008] px-4 py-3 text-center text-sm font-medium text-[#fdf8f0] shadow-lg"
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

export function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <Image
        src="/mehfil-logo.png"
        alt="MEHFIL logo"
        width={compact ? 36 : 44}
        height={compact ? 36 : 44}
        className={`${compact ? "h-9 w-9" : "h-11 w-11"} rounded-2xl object-cover`}
      />
      <div className="leading-tight">
        <p className={`font-extrabold tracking-[0.18em] text-[#2b1a0e] ${compact ? "text-base" : "text-xl"}`}>
          MEHFIL
        </p>
      </div>
    </div>
  );
}

export function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`mehfil-card rounded-3xl border border-[#f2e2c9] bg-white p-5 ${className}`}>
      {children}
    </div>
  );
}

export function PrimaryButton({
  children,
  disabled,
  onClick,
  type,
  className = "",
}: {
  children: React.ReactNode;
  disabled?: boolean;
  onClick?: () => void;
  type?: "button" | "submit";
  className?: string;
}) {
  return (
    <button
      type={type ?? "button"}
      disabled={disabled}
      onClick={onClick}
      className={`min-h-[52px] w-full rounded-2xl bg-[#2b1a0e] px-5 text-base font-bold tracking-wide text-[#fdf8f0] transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
    >
      {children}
    </button>
  );
}

export function GhostButton({
  children,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="min-h-[48px] w-full rounded-2xl border border-[#e5d3b3] bg-[#fdf8f0] px-5 text-sm font-bold text-[#5a3a1e] disabled:opacity-60"
    >
      {children}
    </button>
  );
}

export function Field({
  label,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold text-[#5a3a1e]">{label}</span>
      <input
        {...props}
        className="min-h-[52px] w-full rounded-2xl border border-[#e5d3b3] bg-white px-4 text-base text-[#1c1008] placeholder:text-[#a08c6f]"
      />
    </label>
  );
}

export function PasswordField({
  label,
  ...props
}: Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> & { label: string }) {
  const [show, setShow] = useState(false);
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold text-[#5a3a1e]">{label}</span>
      <div className="relative">
        <input
          {...props}
          type={show ? "text" : "password"}
          className="min-h-[52px] w-full rounded-2xl border border-[#e5d3b3] bg-white py-2 pl-4 pr-14 text-base text-[#1c1008] placeholder:text-[#a08c6f]"
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          aria-label={show ? "Hide password" : "Show password"}
          aria-pressed={show}
          className="absolute inset-y-1 right-1 flex min-w-[48px] items-center justify-center rounded-xl px-3 text-xl"
        >
          <span aria-hidden>{show ? "🙈" : "👁️"}</span>
        </button>
      </div>
    </label>
  );
}

export function Progress({ value, max }: { value: number; max: number }) {
  const pct = max === 0 ? 0 : Math.min(100, Math.round((value / max) * 100));
  return (
    <div
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={max}
      className="h-2.5 w-full overflow-hidden rounded-full bg-[#f2e2c9]"
    >
      <div className="mehfil-progress h-full rounded-full bg-[#c68a2b]" style={{ width: `${pct}%` }} />
    </div>
  );
}

export function Badge({ children, tone = "pending" }: { children: React.ReactNode; tone?: "pending" | "approved" | "rejected" | "available" | "neutral" }) {
  const tones: Record<string, string> = {
    pending: "bg-amber-100 text-amber-900 border-amber-200",
    approved: "bg-emerald-100 text-emerald-900 border-emerald-200",
    rejected: "bg-red-100 text-red-900 border-red-200",
    available: "bg-[#2b1a0e] text-[#f9efe0] border-[#2b1a0e]",
    neutral: "bg-[#f9efe0] text-[#5a3a1e] border-[#f2e2c9]",
  };
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-bold tracking-wide ${tones[tone]}`}>
      {children}
    </span>
  );
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="rounded-3xl border border-dashed border-[#e5d3b3] bg-white/60 px-6 py-10 text-center">
      <p className="text-base font-bold text-[#2b1a0e]">{title}</p>
      {hint ? <p className="mt-1 text-sm text-[#7a4f26]">{hint}</p> : null}
    </div>
  );
}

export function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-md px-4 pb-28 pt-4 sm:max-w-lg">{children}</div>
  );
}

export function TopBar({ title, sub }: { title: string; sub?: string }) {
  return (
    <header className="mb-4 flex items-center justify-between">
      <BrandMark compact />
      <div className="text-right">
        <p className="text-sm font-extrabold text-[#2b1a0e]">{title}</p>
        {sub ? <p className="text-xs text-[#7a4f26]">{sub}</p> : null}
      </div>
    </header>
  );
}
