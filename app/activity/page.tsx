"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge, Card, EmptyState, PageShell, TopBar, ToastProvider, useToast } from "@/components/ui";
import { BottomNav } from "@/components/nav";
import { describePurchase } from "@/lib/loyalty/engine";

type Purchase = { id: string; purchaseType: string; chaiQty?: number; maggieQty?: number; paymentMode?: string; transactionRef?: string | null; amount: number; status: string; createdAt: string; rejectionReason?: string | null };
type Reward = { id: string; rewardType: string; status: string; createdAt: string; redeemedAt?: string | null };

function icon(t: string) {
  return t === "CHAI" ? "☕" : t === "MAGGIE" ? "🍜" : t === "COMBO" ? "☕🍜" : "🏪";
}

function purchaseLabel(p: Purchase): string {
  const label = describePurchase({
    purchaseType: p.purchaseType,
    chaiQty: p.chaiQty,
    maggieQty: p.maggieQty,
    amount: p.amount,
  });
  // Prefix single-type purchases with an icon for quick scanning.
  if ((p.chaiQty ?? 0) + (p.maggieQty ?? 0) === 0) {
    return `${icon(p.purchaseType)} ${label}`;
  }
  return label;
}

function ActivityInner() {
  const router = useRouter();
  const { push } = useToast();
  const [filter, setFilter] = useState("ALL");
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/user/activity${filter === "ALL" ? "" : `?status=${filter}`}`, { cache: "no-store" });
        if (res.status === 401) {
          router.push("/login");
          return;
        }
        const j = await res.json();
        if (!cancelled) {
          setPurchases(j.purchases ?? []);
          setRewards(j.rewards ?? []);
        }
      } catch {
        if (!cancelled) push("Something went wrong. Please try again.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [filter, router, push]);

  return (
    <PageShell>
      <TopBar title="Activity" sub="Purchases & rewards" />
      <h1 className="text-2xl font-black">My Activity</h1>
      <div className="mt-3 grid grid-cols-4 gap-2">
        {["ALL", "PENDING", "APPROVED", "REJECTED"].map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => { setLoading(true); setFilter(f); }}
            className={`min-h-[44px] rounded-2xl px-2 text-xs font-black ${filter === f ? "bg-[#2b1a0e] text-[#fdf8f0]" : "border border-[#e5d3b3] bg-white text-[#5a3a1e]"}`}
          >
            {f}
          </button>
        ))}
      </div>

      <h2 className="mb-2 mt-5 text-base font-black">Purchases</h2>
      {loading ? (
        <Card><p className="text-sm text-[#7a4f26]">Loading…</p></Card>
      ) : purchases.length === 0 ? (
        <EmptyState title="No purchases yet. Start earning your first reward ☕" />
      ) : (
        <div className="grid gap-2">
          {purchases.map((p) => (
            <Card key={p.id} className="p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-bold">
                  {purchaseLabel(p)}
                </p>
                <Badge tone={p.status === "APPROVED" ? "approved" : p.status === "REJECTED" ? "rejected" : "pending"}>
                  {p.status}
                </Badge>
              </div>
              {(p.transactionRef || p.paymentMode) ? (
                <p className="mt-1 font-mono text-[11px] text-[#7a4f26]">{p.paymentMode ?? "OFFLINE"}{p.transactionRef ? ` • ${p.transactionRef}` : ""}</p>
              ) : null}
              <p className="mt-1 text-xs text-[#7a4f26]">{new Date(p.createdAt).toLocaleString()}</p>
              {p.status === "PENDING" ? (
                <p className="mt-1 text-xs font-medium text-amber-800">Your purchase is waiting for MEHFIL verification.</p>
              ) : null}
              {p.status === "REJECTED" ? (
                <p className="mt-1 text-xs font-medium text-red-800">
                  Purchase rejected.{p.rejectionReason ? ` Reason: ${p.rejectionReason}` : ""}
                </p>
              ) : null}
            </Card>
          ))}
        </div>
      )}

      <h2 className="mb-2 mt-5 text-base font-black">Reward History</h2>
      {rewards.length === 0 ? (
        <EmptyState title="No rewards yet 🎁" />
      ) : (
        <div className="grid gap-2">
          {rewards.map((r) => (
            <div key={r.id} className="flex items-center justify-between rounded-2xl border border-[#f2e2c9] bg-white px-4 py-3">
              <span className="text-sm font-bold">🎁 {r.rewardType.replace(/_/g, " ")}</span>
              <Badge tone={r.status === "REDEEMED" ? "approved" : r.status === "AVAILABLE" || r.status === "CLAIMED" ? "available" : "neutral"}>
                {r.status}
              </Badge>
            </div>
          ))}
        </div>
      )}
      <BottomNav />
    </PageShell>
  );
}

export default function ActivityPage() {
  return (
    <ToastProvider>
      <ActivityInner />
    </ToastProvider>
  );
}
