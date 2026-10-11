"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useToast } from "./ui";

export function BottomNav() {
  const path = usePathname();
  const items = [
    { href: "/dashboard", label: "Home", icon: "🏠" },
    { href: "/rewards", label: "Rewards", icon: "🎁" },
    { href: "/purchases", label: "Bills", icon: "🧾" },
    { href: "/activity", label: "Activity", icon: "📋" },
    { href: "/profile", label: "Profile", icon: "👤" },
  ];
  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-[#f2e2c9] bg-white/95 backdrop-blur"
    >
      <div className="mx-auto grid w-full max-w-md grid-cols-5 px-2 py-2">
        {items.map((it) => {
          const active = path === it.href || (it.href !== "/dashboard" && path.startsWith(it.href));
          return (
            <Link
              key={it.href}
              href={it.href}
              className={`flex min-h-[56px] flex-col items-center justify-center gap-0.5 rounded-2xl text-xs font-bold ${
                active ? "bg-[#fdf3e3] text-[#2b1a0e]" : "text-[#7a4f26]"
              }`}
            >
              <span aria-hidden className="text-xl leading-none">{it.icon}</span>
              {it.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export function AdminNav() {
  const path = usePathname();
  const items = [
    { href: "/admin", label: "Home", icon: "🏠" },
    { href: "/admin/purchases", label: "Pending", icon: "🧾" },
    { href: "/admin/scanner", label: "Scan", icon: "📷" },
    { href: "/admin/users", label: "Users", icon: "👥" },
    { href: "/admin/audit", label: "Audit", icon: "📜" },
  ];
  return (
    <nav
      aria-label="Admin"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-[#f2e2c9] bg-white/95 backdrop-blur"
    >
      <div className="mx-auto grid w-full max-w-2xl grid-cols-5 px-2 py-2">
        {items.map((it) => {
          const active = path === it.href || (it.href !== "/admin" && path.startsWith(it.href));
          return (
            <Link
              key={it.href}
              href={it.href}
              className={`flex min-h-[56px] flex-col items-center justify-center gap-0.5 rounded-2xl text-[11px] font-bold ${
                active ? "bg-[#2b1a0e] text-[#fdf8f0]" : "text-[#7a4f26]"
              }`}
            >
              <span aria-hidden className="text-xl leading-none">{it.icon}</span>
              {it.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export function LogoutButton() {
  const router = useRouter();
  const { push } = useToast();
  return (
    <button
      type="button"
      onClick={async () => {
        await fetch("/api/auth/logout", { method: "POST" });
        push("Logged out.");
        router.push("/login");
        router.refresh();
      }}
      className="min-h-[48px] w-full rounded-2xl border border-red-200 bg-red-50 px-5 text-sm font-bold text-red-800"
    >
      Logout
    </button>
  );
}
