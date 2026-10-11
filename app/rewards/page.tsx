"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge, Card, EmptyState, PageShell, TopBar, ToastProvider, useToast } from "@/components/ui";
import { BottomNav } from "@/components/nav";
import { QrDisplay } from "@/components/qr-display";
import { celebrate } from "@/lib/celebrate";

type Reward = {
  id: string;
  rewardType: string;
  status: string;
  createdAt: string;
  claimedAt: string | null;
  redeemedAt: string | null;
  redemptionToken: string | null;
};

const LABELS: Record<string, string> = {
  BUN_MASKA: "🎁 Bun Maska - 8 Chai completed",
  FREE_MAGGIE: "🎁 Free Maggie - 8 Maggie completed",
  FREE_CHAI: "🎁 Free Chai - 5 eligible visits completed",
  BIRTHDAY_CHAI: "🎂 Birthday Free Chai - MEHFIL gift",
};

function RewardsInner() {
  const router = useRouter();
  const { push } = useToast();
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState<string | null>(null);
  const prevAvailable = useRef<number | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/user/rewards", { cache: "no-store" });
      if (res.status === 401) {
        router.push("/login");
        return;
      }
      const j = await res.json();
      const list: Reward[] = j.rewards ?? [];
      setRewards(list);
      const avail = list.filter((r) => ["AVAILABLE", "CLAIMED"].includes(r.status)).length;
      if (prevAvailable.current !== null && avail > prevAvailable.current) {
        celebrate();
        push("Reward unlocked 🎉 Congratulations!");
      }
      prevAvailable.current = avail;
    } catch {
      push("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [router, push]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch-on-mount: syncs server state into local state once
    load();
  }, [load]);

  async function claim(id: string) {
    if (!confirm("You are about to claim your reward. Continue?")) return;
    setClaiming(id);
    try {
      const res = await fetch(`/api/rewards/${id}/claim`, { method: "POST" });
      const j = await res.json();
      if (!res.ok) {
        push(j.error ?? "Could not claim.");
        return;
      }
      push("Reward claimed.");
      celebrate();
      load();
    } catch {
      push("Something went wrong. Please try again.");
    } finally {
      setClaiming(null);
    }
  }

  return (
    <PageShell>
      <TopBar title="Rewards" sub="MEHFIL • मेहफिल" />
      <h1 className="text-2xl font-black">My Rewards</h1>
      {loading ? (
        <Card><p className="text-sm text-[#7a4f26]">Loading…</p></Card>
      ) : rewards.length === 0 ? (
        <div className="mt-3">
          <EmptyState title="Your reward journey starts here 🎁" hint="Complete Chai, Maggie or Visits to unlock." />
        </div>
      ) : (
        <div className="mt-3 grid gap-3">
          {rewards.map((r) => (
            <Card key={r.id}>
              <div className="flex items-center justify-between">
                <p className="text-sm font-extrabold">{LABELS[r.rewardType] ?? r.rewardType}</p>
                <Badge tone={r.status === "AVAILABLE" || r.status === "CLAIMED" ? "available" : r.status === "REDEEMED" ? "approved" : "neutral"}>
                  {r.status}
                </Badge>
              </div>
              <p className="mt-1 text-xs text-[#7a4f26]">
                {r.status === "REDEEMED" && r.redeemedAt
                  ? `Redeemed ${new Date(r.redeemedAt).toLocaleDateString()}`
                  : `Earned ${new Date(r.createdAt).toLocaleDateString()}`}
              </p>
              {r.status === "AVAILABLE" ? (
                <button
                  type="button"
                  disabled={claiming === r.id}
                  onClick={() => claim(r.id)}
                  className="mt-3 min-h-[48px] w-full rounded-2xl bg-[#2b1a0e] px-4 text-sm font-black text-[#fdf8f0] disabled:opacity-60"
                >
                  {claiming === r.id ? "CLAIMING…" : "CLAIM REWARD"}
                </button>
              ) : null}
              {r.status === "CLAIMED" && r.redemptionToken ? (
                <div className="mt-3 text-center">
                  <p className="mb-2 text-sm font-black text-emerald-900">READY TO REDEEM</p>
                  <QrDisplay token={r.redemptionToken} />
                  <p className="mt-2 text-xs font-medium text-[#7a4f26]">Show this QR at the shop counter. One-time use.</p>
                </div>
              ) : null}
            </Card>
          ))}
        </div>
      )}
      <BottomNav />
    </PageShell>
  );
}

export default function RewardsPage() {
  return (
    <ToastProvider>
      <RewardsInner />
    </ToastProvider>
  );
}
