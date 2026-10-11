"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge, Card, EmptyState, PageShell, TopBar, ToastProvider, useToast } from "@/components/ui";
import { BottomNav } from "@/components/nav";
import { describePurchase } from "@/lib/loyalty/engine";

type Purchase = { id: string; purchaseType: string; chaiQty?: number; maggieQty?: number; paymentMode?: string; transactionRef?: string | null; amount: number; status: string; createdAt: string };

function PurchasesInner() {
  const router = useRouter();
  const { push } = useToast();
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/purchases", { cache: "no-store" });
        if (res.status === 401) {
          router.push("/login");
          return;
        }
        const j = await res.json();
        setPurchases(j.purchases ?? []);
      } catch {
        push("Something went wrong. Please try again.");
      } finally {
        setLoading(false);
      }
    })();
  }, [router, push]);

  return (
    <PageShell>
      <TopBar title="Purchases" sub="Your requests" />
      <h1 className="text-2xl font-black">My Purchases</h1>
      {loading ? (
        <Card><p className="text-sm">Loading…</p></Card>
      ) : purchases.length === 0 ? (
        <div className="mt-3">
          <EmptyState title="No purchases yet. Start earning your first reward ☕" />
        </div>
      ) : (
        <div className="mt-3 grid gap-2">
          {purchases.map((p) => {
            const label = describePurchase({
              purchaseType: p.purchaseType,
              chaiQty: p.chaiQty,
              maggieQty: p.maggieQty,
              amount: p.amount,
            });
            return (
              <div key={p.id} className="rounded-2xl border border-[#f2e2c9] bg-white px-4 py-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold">{label}</span>
                  <Badge tone={p.status === "APPROVED" ? "approved" : p.status === "REJECTED" ? "rejected" : "pending"}>{p.status}</Badge>
                </div>
                {(p.transactionRef || p.paymentMode) ? (
                  <p className="mt-1 font-mono text-[11px] text-[#7a4f26]">{p.paymentMode ?? "OFFLINE"}{p.transactionRef ? ` • ${p.transactionRef}` : ""}</p>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
      <BottomNav />
    </PageShell>
  );
}

export default function PurchasesPage() {
  return (
    <ToastProvider>
      <PurchasesInner />
    </ToastProvider>
  );
}
