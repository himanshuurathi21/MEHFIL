"use client";
import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Badge, Card, TopBar, ToastProvider, useToast } from "@/components/ui";
import { AdminNav } from "@/components/nav";
import { describePurchase } from "@/lib/loyalty/engine";
import { LOYALTY_CONFIG } from "@/lib/loyalty/config";

type Detail = {
  id: string;
  username: string;
  displayName: string;
  createdAt: string;
  birthdate?: string | null;
  loyaltyProgress: { chaiCount: number; maggieCount: number; eligibleVisitCount: number } | null;
  purchases: Array<{ id: string; purchaseType: string; chaiQty?: number; maggieQty?: number; amount: number; status: string; createdAt: string }>;
  rewards: Array<{ id: string; rewardType: string; status: string; createdAt: string }>;
};

function DetailInner() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { push } = useToast();
  const [user, setUser] = useState<Detail | null>(null);
  const [gifting, setGifting] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/users/${params.id}`, { cache: "no-store" });
      if (res.status === 401) {
        router.push("/admin/login");
        return;
      }
      if (!res.ok) {
        router.push("/admin/users");
        return;
      }
      const j = await res.json();
      setUser(j.user);
    } catch {
      push("Something went wrong. Please try again.");
    }
  }, [params.id, router, push]);

  async function gift() {
    if (!user || !confirm(`Gift Birthday Free Chai to ${user.displayName}?`)) return;
    setGifting(true);
    try {
      const res = await fetch(`/api/admin/users/${user.id}/birthday-reward`, { method: "POST" });
      const j = await res.json();
      if (!res.ok) {
        push(j.error ?? "Could not gift.");
        return;
      }
      push("🎂 Birthday Free Chai gifted!");
      load();
    } catch {
      push("Something went wrong. Please try again.");
    } finally {
      setGifting(false);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch-on-mount: syncs server state into local state once
    load();
  }, [load]);

  if (!user) {
    return (
      <div className="mx-auto w-full max-w-2xl px-4 pb-28 pt-4">
        <TopBar title="User" sub="Loading" />
        <Card><p className="text-sm">Loading…</p></Card>
        <AdminNav />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-4 pb-28 pt-4">
      <TopBar title="User Profile" sub={`@${user.username}`} />
      <Card>
        <p className="text-xl font-black">{user.displayName}</p>
        <p className="text-sm text-[#7a4f26]">@{user.username} • joined {new Date(user.createdAt).toLocaleDateString()}{user.birthdate ? ` • 🎂 ${new Date(user.birthdate).getUTCDate()}/${new Date(user.birthdate).getUTCMonth() + 1}` : ""}</p>
        <button
          type="button"
          disabled={gifting}
          onClick={gift}
          className="mt-3 min-h-[48px] w-full rounded-2xl bg-[#c68a2b] px-4 text-sm font-black text-white disabled:opacity-60"
        >
          {gifting ? "GIFTING…" : "🎂 GIFT BIRTHDAY FREE CHAI"}
        </button>
        <div className="mt-3 grid grid-cols-3 gap-2 text-center">
          <div className="rounded-2xl bg-[#fdf3e3] p-3">
            <p className="text-lg font-black">☕ {user.loyaltyProgress?.chaiCount ?? 0}/{LOYALTY_CONFIG.CHAI.threshold}</p>
            <p className="text-[11px] font-bold">Chai</p>
          </div>
          <div className="rounded-2xl bg-[#fdf3e3] p-3">
            <p className="text-lg font-black">🍜 {user.loyaltyProgress?.maggieCount ?? 0}/{LOYALTY_CONFIG.MAGGIE.threshold}</p>
            <p className="text-[11px] font-bold">Maggie</p>
          </div>
          <div className="rounded-2xl bg-[#fdf3e3] p-3">
            <p className="text-lg font-black">🏪 {user.loyaltyProgress?.eligibleVisitCount ?? 0}/{LOYALTY_CONFIG.VISITS.threshold}</p>
            <p className="text-[11px] font-bold">Visits</p>
          </div>
        </div>
      </Card>

      <h2 className="mb-2 mt-5 text-base font-black">Purchase History</h2>
      <div className="grid gap-2">
        {user.purchases.map((p) => (
          <div key={p.id} className="flex items-center justify-between rounded-2xl border border-[#f2e2c9] bg-white px-4 py-2.5">
            <span className="text-sm font-bold">{describePurchase({ purchaseType: p.purchaseType, chaiQty: p.chaiQty, maggieQty: p.maggieQty, amount: p.amount })} <span className="text-xs font-medium text-[#7a4f26]">{new Date(p.createdAt).toLocaleDateString()}</span></span>
            <Badge tone={p.status === "APPROVED" ? "approved" : p.status === "REJECTED" ? "rejected" : "pending"}>{p.status}</Badge>
          </div>
        ))}
      </div>

      <h2 className="mb-2 mt-5 text-base font-black">Reward History</h2>
      <div className="grid gap-2">
        {user.rewards.map((r) => (
          <div key={r.id} className="flex items-center justify-between rounded-2xl border border-[#f2e2c9] bg-white px-4 py-2.5">
            <span className="text-sm font-bold">{r.rewardType.replace(/_/g, " ")}</span>
            <Badge tone={r.status === "REDEEMED" ? "approved" : r.status === "AVAILABLE" || r.status === "CLAIMED" ? "available" : "neutral"}>{r.status}</Badge>
          </div>
        ))}
      </div>
      <AdminNav />
    </div>
  );
}

export default function AdminUserDetailPage() {
  return (
    <ToastProvider>
      <DetailInner />
    </ToastProvider>
  );
}
