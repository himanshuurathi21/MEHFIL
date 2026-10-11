"use client";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge, Card, EmptyState, ToastProvider, TopBar, useToast } from "@/components/ui";
import { AdminNav } from "@/components/nav";
import { describePurchase } from "@/lib/loyalty/engine";

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

function label(p: Pending): string {
  return describePurchase({
    purchaseType: p.purchaseType,
    chaiQty: p.chaiQty,
    maggieQty: p.maggieQty,
    amount: p.amount,
  });
}

function purchaseIcon(t: string) {
  return t === "CHAI" ? "☕" : t === "MAGGIE" ? "🍜" : t === "COMBO" ? "☕🍜" : "🏪";
}

const REJECT_REASONS = [
  "Payment not found",
  "Wrong amount",
  "Duplicate request",
  "Invalid purchase",
  "Other",
] as const;

function PurchasesAdminInner() {
  const router = useRouter();
  const { push } = useToast();
  const [list, setList] = useState<Pending[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [reason, setReason] = useState<string>(REJECT_REASONS[0]);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/purchases/pending", { cache: "no-store" });
      if (res.status === 401) {
        router.push("/admin/login");
        return;
      }
      if (res.status === 403) {
        router.push("/login");
        return;
      }
      const j = await res.json();
      setList(j.purchases ?? []);
    } catch {
      push("Something went wrong. Please try again.");
    }
  }, [router, push]);

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
      push("Purchase approved.");
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
      <TopBar title="Pending" sub="Approve in one tap" />
      <h1 className="text-2xl font-black">Pending Purchases</h1>
      <div className="mt-3 grid gap-3">
        {list.length === 0 ? (
          <EmptyState title="You're all caught up 🎉" />
        ) : (
          list.map((p) => (
            <Card key={p.id}>
              <div className="flex items-center justify-between">
                <p className="font-extrabold">{purchaseIcon(p.purchaseType)} {label(p)}</p>
                <Badge tone="pending">PENDING</Badge>
              </div>
              <p className="mt-1 text-sm">Customer: <b>{p.user.displayName}</b> @{p.user.username}</p>
              <p className="mt-0.5 font-mono text-xs text-[#7a4f26]">{p.paymentMode === "ONLINE" ? "📱 Online" : "💵 Offline"}{p.transactionRef ? ` • ${p.transactionRef}` : ""}</p>
              <p className="text-xs text-[#7a4f26]">{new Date(p.createdAt).toLocaleString()}</p>
              {rejectId === p.id ? (
                <div className="mt-3 space-y-2">
                  <label className="block text-sm font-bold">Reason for rejection</label>
                  <select
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="min-h-[48px] w-full rounded-2xl border border-[#e5d3b3] bg-white px-3 text-sm"
                  >
                    {REJECT_REASONS.map((r) => (
                      <option key={r}>{r}</option>
                    ))}
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
                  className="min-h-[52px] rounded-2xl bg-emerald-700 text-sm font-black text-white disabled:opacity-60"
                >
                  {busy === p.id ? "WORKING…" : "✓ APPROVE"}
                </button>
                <button
                  type="button"
                  disabled={busy === p.id}
                  onClick={() => setRejectId(p.id)}
                  className="min-h-[52px] rounded-2xl border border-red-200 bg-red-50 text-sm font-black text-red-800"
                >
                  ✕ REJECT
                </button>
              </div>
              )}
            </Card>
          ))
        )}
      </div>
      <AdminNav />
    </div>
  );
}

export default function AdminPurchasesPage() {
  return (
    <ToastProvider>
      <PurchasesAdminInner />
    </ToastProvider>
  );
}
