"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Badge, Card, EmptyState, TopBar, ToastProvider, useToast } from "@/components/ui";
import { AdminNav, LogoutButton } from "@/components/nav";
import { describePurchase } from "@/lib/loyalty/engine";

type Stats = {
  todayPurchases: number;
  pendingRequests: number;
  approvedPurchases: number;
  rejectedPurchases: number;
  activeUsers: number;
  rewardsAvailable: number;
  rewardsRedeemed: number;
  weekRevenue?: number;
  weekApproved?: number;
};

type WeekDay = {
  date: string;
  label: string;
  approved: number;
  pending: number;
  rejected: number;
  revenue: number;
  rewards: number;
};

type Pending = {
  id: string;
  purchaseType: string;
  chaiQty?: number;
  maggieQty?: number;
  paymentMode?: string;
  transactionRef?: string | null;
  amount: number;
  createdAt: string;
  user: { username: string; displayName: string };
};

function purchaseLabel(p: Pending): string {
  return describePurchase({
    purchaseType: p.purchaseType,
    chaiQty: p.chaiQty,
    maggieQty: p.maggieQty,
    amount: p.amount,
  });
}

function icon(t: string) {
  return t === "CHAI" ? "☕" : t === "MAGGIE" ? "🍜" : t === "COMBO" ? "☕🍜" : "🏪";
}

function AdminHomeInner() {
  const router = useRouter();
  const { push } = useToast();
  const [stats, setStats] = useState<Stats | null>(null);
  const [pending, setPending] = useState<Pending[]>([]);
  const [weekly, setWeekly] = useState<WeekDay[]>([]);
  const [birthdays, setBirthdays] = useState<Array<{ id: string; username: string; displayName: string; day: number; month: number; inDays: number }>>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [reason, setReason] = useState("Payment not found");

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/dashboard", { cache: "no-store" });
    if (res.status === 401) {
      router.push("/admin/login");
      return;
    }
    if (res.status === 403) {
      router.push("/login");
      return;
    }
    const j = await res.json();
    setStats(j.stats);
    setPending(j.recentPending ?? []);
    setWeekly(j.weekly ?? []);
    setBirthdays(j.birthdays ?? []);
  }, [router]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch-on-mount: syncs server state into local state once
    load();
  }, [load]);

  async function approve(id: string) {
    setBusy(id);
    try {
      const res = await fetch(`/api/admin/purchases/${id}/approve`, { method: "POST" });
      const j = await res.json();
      if (!res.ok) {
        push(j.error ?? "Could not approve.");
        return;
      }
      push(j.rewards?.length ? `Purchase approved. Reward unlocked 🎉` : "Purchase approved.");
      load();
    } catch {
      push("Something went wrong. Please try again.");
    } finally {
      setBusy(null);
    }
  }

  async function giftBirthday(userId: string, name: string) {
    if (!confirm(`Gift Birthday Free Chai to ${name}?`)) return;
    setBusy(userId);
    try {
      const res = await fetch(`/api/admin/users/${userId}/birthday-reward`, { method: "POST" });
      const j = await res.json();
      if (!res.ok) {
        push(j.error ?? "Could not gift.");
        return;
      }
      push(`🎂 Birthday Free Chai gifted to ${name}!`);
      load();
    } catch {
      push("Something went wrong. Please try again.");
    } finally {
      setBusy(null);
    }
  }

  async function reject(id: string) {
    setBusy(id);
    try {
      const res = await fetch(`/api/admin/purchases/${id}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      const j = await res.json();
      if (!res.ok) {
        push(j.error ?? "Could not reject.");
        return;
      }
      push("Purchase rejected.");
      setRejectId(null);
      load();
    } catch {
      push("Something went wrong. Please try again.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-4 pb-28 pt-4">
      <TopBar title="MEHFIL Admin" sub="मेहफिल • Admin" />
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black">Pending Purchases</h1>
        <Link href="/admin/scanner" className="rounded-2xl bg-[#2b1a0e] px-4 py-2.5 text-sm font-bold text-[#fdf8f0]">
          SCAN REWARD
        </Link>
      </div>

      {stats ? (
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[
            ["Today", stats.todayPurchases],
            ["Pending", stats.pendingRequests],
            ["Approved", stats.approvedPurchases],
            ["Rejected", stats.rejectedPurchases],
            ["Users", stats.activeUsers],
            ["Rewards open", stats.rewardsAvailable],
            ["Redeemed", stats.rewardsRedeemed],
            ["7-day ₹", stats.weekRevenue ?? 0],
          ].map(([k, v]) => (
            <Card key={k as string} className="p-3 text-center">
              <p className="text-2xl font-black">{v as number}</p>
              <p className="text-[11px] font-bold text-[#7a4f26]">{k as string}</p>
            </Card>
          ))}
        </div>
      ) : null}

      {weekly.length > 0 ? (
        <Card className="mt-3">
          <p className="text-sm font-extrabold">Last 7 days</p>
          <div className="mt-2 flex items-end gap-1.5" role="img" aria-label="Approved purchases per day, last 7 days">
            {(() => {
              const max = Math.max(1, ...weekly.map((x) => x.approved));
              return weekly.map((w) => {
              const h = Math.round((w.approved / max) * 64) + 6;
              return (
                <div key={w.date} className="flex flex-1 flex-col items-center gap-1">
                  <span className="text-[11px] font-black">{w.approved}</span>
                  <div className="flex w-full items-end justify-center rounded-lg bg-[#f2e2c9]" style={{ height: 70 }}>
                    <div className="w-full rounded-lg bg-[#c68a2b]" style={{ height: `${Math.round((h / 70) * 100)}%`, minHeight: w.approved > 0 ? 18 : 6 }} />
                  </div>
                  <span className="text-[10px] font-bold text-[#7a4f26]">{w.label}</span>
                </div>
              );
              });
            })()}
          </div>
          <p className="mt-2 text-xs text-[#7a4f26]">
            7-day approved: <b>{stats?.weekApproved ?? weekly.reduce((s, w) => s + w.approved, 0)}</b>
            {" • "}revenue: <b>₹{stats?.weekRevenue ?? weekly.reduce((s, w) => s + w.revenue, 0)}</b>
            {" • "}rewards: <b>{weekly.reduce((s, w) => s + w.rewards, 0)}</b>
          </p>
        </Card>
      ) : null}

      {birthdays.length > 0 ? (
        <Card className="mt-3">
          <p className="text-sm font-extrabold">🎂 Birthdays - next 7 days</p>
          <div className="mt-2 grid gap-2">
            {birthdays.map((b) => (
              <div key={b.id} className="flex items-center justify-between gap-2 rounded-2xl bg-[#fdf3e3] px-3 py-2.5">
                <div>
                  <p className="text-sm font-extrabold">{b.displayName} <span className="font-medium text-[#7a4f26]">@{b.username}</span></p>
                  <p className="text-xs text-[#7a4f26]">{b.day}/{b.month}{b.inDays === 0 ? " • Today! 🎉" : b.inDays === 1 ? " • Tomorrow" : ` • in ${b.inDays} days`}</p>
                </div>
                <button
                  type="button"
                  disabled={busy === b.id}
                  onClick={() => giftBirthday(b.id, b.displayName)}
                  className="min-h-[44px] rounded-2xl bg-[#c68a2b] px-3 text-xs font-black text-white disabled:opacity-60"
                >
                  {busy === b.id ? "…" : "🎁 GIFT CHAI"}
                </button>
              </div>
            ))}
          </div>
        </Card>
      ) : null}

      <div className="mt-4 grid gap-3">
        {pending.length === 0 ? (
          <EmptyState title="You're all caught up 🎉" hint="No pending purchase requests." />
        ) : (
          pending.map((p) => (
            <Card key={p.id}>
              <p className="text-xs font-bold tracking-wide text-[#7a4f26]">NEW PURCHASE • {new Date(p.createdAt).toLocaleTimeString()}</p>
              <div className="mt-1 flex items-center justify-between">
                <p className="text-base font-extrabold">
                  {icon(p.purchaseType)} {purchaseLabel(p)}
                </p>
                <Badge tone="pending">PENDING</Badge>
              </div>
              <p className="mt-1 text-sm text-[#5a3a1e]">
                Customer: <span className="font-bold">{p.user.displayName}</span> <span className="text-[#7a4f26]">@{p.user.username}</span>
              </p>
              <p className="mt-1 font-mono text-xs text-[#7a4f26]">
                {p.paymentMode === "ONLINE" ? "📱 Online" : "💵 Offline"}{p.transactionRef ? ` • Ref: ${p.transactionRef}` : ""}
              </p>
              {rejectId === p.id ? (
                <div className="mt-3 space-y-2">
                  <label className="block text-sm font-bold">Reason for rejection</label>
                  <select
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="min-h-[48px] w-full rounded-2xl border border-[#e5d3b3] bg-white px-3 text-sm"
                  >
                    <option>Payment not found</option>
                    <option>Wrong amount</option>
                    <option>Duplicate request</option>
                    <option>Invalid purchase</option>
                    <option>Other</option>
                  </select>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={busy === p.id}
                      onClick={() => reject(p.id)}
                      className="min-h-[48px] flex-1 rounded-2xl bg-red-700 px-4 text-sm font-black text-white disabled:opacity-60"
                    >
                      {busy === p.id ? "REJECTING…" : "CONFIRM REJECT"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setRejectId(null)}
                      className="min-h-[48px] flex-1 rounded-2xl border border-[#e5d3b3] px-4 text-sm font-bold"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    disabled={busy === p.id}
                    onClick={() => approve(p.id)}
                    className="min-h-[52px] rounded-2xl bg-emerald-700 px-4 text-sm font-black text-white disabled:opacity-60"
                  >
                    {busy === p.id ? "APPROVING…" : "✓ APPROVE"}
                  </button>
                  <button
                    type="button"
                    disabled={busy === p.id}
                    onClick={() => setRejectId(p.id)}
                    className="min-h-[52px] rounded-2xl border border-red-200 bg-red-50 px-4 text-sm font-black text-red-800"
                  >
                    ✕ REJECT
                  </button>
                </div>
              )}
            </Card>
          ))
        )}
      </div>

      <div className="mt-6 grid grid-cols-2 gap-2">
        <Link href="/admin/purchases" className="rounded-2xl border border-[#e5d3b3] bg-white px-4 py-3 text-center text-sm font-bold">All Pending</Link>
        <Link href="/admin/users" className="rounded-2xl border border-[#e5d3b3] bg-white px-4 py-3 text-center text-sm font-bold">Users</Link>
        <Link href="/admin/rewards" className="rounded-2xl border border-[#e5d3b3] bg-white px-4 py-3 text-center text-sm font-bold">Rewards</Link>
        <Link href="/admin/audit" className="rounded-2xl border border-[#e5d3b3] bg-white px-4 py-3 text-center text-sm font-bold">Admin Activity</Link>
      </div>
      <div className="mt-3">
        <LogoutButton />
      </div>
      <AdminNav />
    </div>
  );
}

export default function AdminHome() {
  return (
    <ToastProvider>
      <AdminHomeInner />
    </ToastProvider>
  );
}
