"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { celebrate } from "@/lib/celebrate";
import { describePurchase, remainingToUnlock } from "@/lib/loyalty/engine";
import {
  Badge,
  Card,
  EmptyState,
  PageShell,
  PrimaryButton,
  Progress,
  TopBar,
  ToastProvider,
  useToast,
} from "@/components/ui";
import { BottomNav } from "@/components/nav";

type DashboardData = {
  user: { displayName: string; username: string };
  progress: { chaiCount: number; maggieCount: number; eligibleVisitCount: number };
  thresholds: { chai: number; maggie: number; visits: number; visitMinAmount: number };
  rewards: Array<{ id: string; rewardType: string; status: string; createdAt: string }>;
  recentPurchases: Array<{ id: string; purchaseType: string; chaiQty?: number; maggieQty?: number; paymentMode?: string; transactionRef?: string | null; amount: number; status: string; createdAt: string }>;
};

const REWARD_META: Record<string, { icon: string; title: string; hint: string }> = {
  BUN_MASKA: { icon: "🎁", title: "Bun Maska", hint: "Complete 8 Chai" },
  FREE_MAGGIE: { icon: "🎁", title: "Free Maggie", hint: "Complete 8 Maggie" },
  FREE_CHAI: { icon: "🎁", title: "Free Chai", hint: "Complete 5 eligible visits with ₹15 minimum" },
  BIRTHDAY_CHAI: { icon: "🎂", title: "Birthday Free Chai", hint: "MEHFIL birthday gift" },
};

function DashboardInner() {
  const router = useRouter();
  const { push } = useToast();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [chaiQty, setChaiQty] = useState(1);
  const [maggieQty, setMaggieQty] = useState(0);
  const [visitOnly, setVisitOnly] = useState(false);
  const [amount, setAmount] = useState("");
  const [transactionRef, setTransactionRef] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const prevAvailable = useRef<number | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/user/dashboard", { cache: "no-store" });
      if (res.status === 401) {
        router.push("/login");
        return;
      }
      const j = await res.json();
      setData(j);
      const avail = (j.rewards ?? []).filter((r: { status: string }) =>
        ["AVAILABLE", "CLAIMED"].includes(r.status)
      ).length;
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

  async function submitPurchase(e: React.FormEvent) {
    e.preventDefault();
    if (chaiQty + maggieQty === 0 && !visitOnly) {
      push("Select at least one item (Chai / Maggie / Visit).");
      return;
    }
    if (transactionRef.trim().length < 3) {
      push("Enter Transaction ID (type 0000 if payment was offline).");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/purchases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chaiQty,
          maggieQty,
          visitOnly: chaiQty + maggieQty === 0 && visitOnly,
          amount: Number(amount),
          transactionRef: transactionRef.trim(),
        }),
      });
      const j = await res.json();
      if (!res.ok) {
        push(j.error ?? "Could not submit purchase.");
        return;
      }
      push("Purchase submitted. Waiting for MEHFIL verification.");
      setShowAdd(false);
      setAmount("");
      setTransactionRef("");
      setChaiQty(1);
      setMaggieQty(0);
      setVisitOnly(false);
      load();
    } catch {
      push("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function claim(id: string, title: string) {
    if (!confirm(`You are about to claim your ${title}. Continue?`)) return;
    setClaimingId(id);
    try {
      const res = await fetch(`/api/rewards/${id}/claim`, { method: "POST" });
      const j = await res.json();
      if (!res.ok) {
        push(j.error ?? "Could not claim reward.");
        return;
      }
      push("Reward claimed. Show the QR at the shop counter.");
      celebrate();
      load();
      router.push("/rewards");
    } catch {
      push("Something went wrong. Please try again.");
    } finally {
      setClaimingId(null);
    }
  }

  if (loading || !data) {
    return (
      <PageShell>
        <TopBar title="MEHFIL" sub="Loading…" />
        <Card><p className="text-sm text-[#7a4f26]">Loading your rewards…</p></Card>
        <BottomNav />
      </PageShell>
    );
  }

  const { progress, thresholds } = data;
  const myRewards = data.rewards.filter((r) => ["AVAILABLE", "CLAIMED"].includes(r.status));

  // Derive reward card states: show one card per type with best status.
  // If a user earned 2 of the same type (e.g. 16 Chai), the count badge
  // makes the extra rewards visible; claim them one by one, or see all in /rewards.
  // Prefer AVAILABLE over CLAIMED so the action button always offers the next claim.
  const cardFor = (type: string) => {
    const list = data.rewards.filter((r) => r.rewardType === type && ["AVAILABLE", "CLAIMED"].includes(r.status));
    return list.find((r) => r.status === "AVAILABLE") ?? list[0] ?? null;
  };
  const countFor = (type: string) =>
    data.rewards.filter((r) => r.rewardType === type && ["AVAILABLE", "CLAIMED"].includes(r.status)).length;
  const bun = cardFor("BUN_MASKA");
  const mag = cardFor("FREE_MAGGIE");
  const chaiFree = cardFor("FREE_CHAI");
  const bday = cardFor("BIRTHDAY_CHAI");

  return (
    <PageShell>
      <TopBar title="MEHFIL" sub="मेहफिल • Loyalty" />
      <h1 className="text-2xl font-black">Hi, {data.user.displayName} 👋</h1>

      <div className="mt-4 grid gap-3">
        <Card>
          <div className="flex items-center justify-between">
            <p className="text-base font-extrabold">☕ Chai</p>
            <p className="text-sm font-black">{progress.chaiCount} / {thresholds.chai}</p>
          </div>
          <div className="mt-2"><Progress value={progress.chaiCount} max={thresholds.chai} /></div>
          <p className="mt-2 text-sm text-[#7a4f26]">
            {progress.chaiCount >= thresholds.chai
              ? "Reward unlocked 🎉"
              : `${remainingToUnlock(progress.chaiCount, thresholds.chai)} more Chai to unlock Bun Maska`}
          </p>
        </Card>
        <Card>
          <div className="flex items-center justify-between">
            <p className="text-base font-extrabold">🍜 Maggie</p>
            <p className="text-sm font-black">{progress.maggieCount} / {thresholds.maggie}</p>
          </div>
          <div className="mt-2"><Progress value={progress.maggieCount} max={thresholds.maggie} /></div>
          <p className="mt-2 text-sm text-[#7a4f26]">
            {progress.maggieCount >= thresholds.maggie
              ? "Reward unlocked 🎉"
              : `${remainingToUnlock(progress.maggieCount, thresholds.maggie)} more Maggie to unlock Free Maggie`}
          </p>
        </Card>
        <Card>
          <div className="flex items-center justify-between">
            <p className="text-base font-extrabold">🏪 Visits</p>
            <p className="text-sm font-black">{progress.eligibleVisitCount} / {thresholds.visits}</p>
          </div>
          <div className="mt-2"><Progress value={progress.eligibleVisitCount} max={thresholds.visits} /></div>
          <p className="mt-2 text-sm text-[#7a4f26]">
            {progress.eligibleVisitCount >= thresholds.visits
              ? "Reward unlocked 🎉"
              : `${remainingToUnlock(progress.eligibleVisitCount, thresholds.visits)} more eligible visits to unlock Free Chai`}
          </p>
          <p className="mt-1 text-xs text-[#a08c6f]">Eligible visit = ₹{thresholds.visitMinAmount}+ in a single purchase.</p>
        </Card>
      </div>

      <div className="mt-5">
        <PrimaryButton onClick={() => setShowAdd((s) => !s)}>+ ADD PURCHASE</PrimaryButton>
        {showAdd ? (
          <Card className="mt-3">
            <p className="text-base font-extrabold">What did you purchase?</p>
            <div className="mt-2 grid gap-2">
              <div className="rounded-2xl border border-[#e5d3b3] bg-[#fdf8f0] px-4 py-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold">☕ Chai - how many? (count)</span>
                  <div className="flex items-center gap-2">
                    <button type="button" aria-label="Less chai" onClick={() => setChaiQty((q) => Math.max(0, q - 1))} className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#e5d3b3] bg-white text-lg font-black">−</button>
                    <span className="w-6 text-center text-base font-black">{chaiQty}</span>
                    <button type="button" aria-label="More chai" onClick={() => { setChaiQty((q) => Math.min(20, q + 1)); setVisitOnly(false); }} className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#e5d3b3] bg-white text-lg font-black">+</button>
                  </div>
                </div>
              </div>
              <div className="rounded-2xl border border-[#e5d3b3] bg-[#fdf8f0] px-4 py-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold">🍜 Maggie - how many? (count)</span>
                  <div className="flex items-center gap-2">
                    <button type="button" aria-label="Less maggie" onClick={() => setMaggieQty((q) => Math.max(0, q - 1))} className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#e5d3b3] bg-white text-lg font-black">−</button>
                    <span className="w-6 text-center text-base font-black">{maggieQty}</span>
                    <button type="button" aria-label="More maggie" onClick={() => { setMaggieQty((q) => Math.min(20, q + 1)); setVisitOnly(false); }} className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#e5d3b3] bg-white text-lg font-black">+</button>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (visitOnly) {
                    setVisitOnly(false);
                  } else {
                    setChaiQty(0);
                    setMaggieQty(0);
                    setVisitOnly(true);
                  }
                }}
                className={`min-h-[52px] rounded-2xl border px-4 py-3 text-sm font-bold ${visitOnly ? "border-[#2b1a0e] bg-[#2b1a0e] text-[#fdf8f0]" : "border-[#e5d3b3] bg-[#fdf8f0] text-[#5a3a1e]"}`}
              >
                🏪 Visit - something else (no Chai/Maggie)
              </button>
            </div>
            <form onSubmit={submitPurchase} className="mt-3 space-y-3">
              <label className="block">
                <span className="mb-1.5 block text-sm font-semibold text-[#5a3a1e]">Total Amount Paid ₹</span>
                <input
                  inputMode="numeric"
                  required
                  min={1}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value.replace(/[^0-9]/g, ""))}
                  className="min-h-[52px] w-full rounded-2xl border border-[#e5d3b3] bg-white px-4 text-base"
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-sm font-semibold text-[#5a3a1e]">
                  Transaction ID
                </span>
                <input
                  value={transactionRef}
                  onChange={(e) => setTransactionRef(e.target.value.slice(0, 100))}
                  className="min-h-[52px] w-full rounded-2xl border border-[#e5d3b3] bg-white px-4 font-mono text-sm"
                />
                <span className="mt-1 block text-xs text-[#7a4f26]">
                  type 0000 if payment was offline
                </span>
              </label>
              <PrimaryButton type="submit" disabled={submitting || !amount}>
                {submitting ? "SUBMITTING…" : "SUBMIT PURCHASE"}
              </PrimaryButton>
              <p className="text-center text-xs text-[#7a4f26]">
                Pay at the shop as usual. Your purchase waits for MEHFIL verification.
              </p>
            </form>
          </Card>
        ) : null}
      </div>

      <section className="mt-6">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-lg font-black">My Rewards</h2>
          <Link href="/rewards" className="text-sm font-bold text-[#7a4f26] underline">View all</Link>
        </div>
        <div className="grid gap-3">
          {[
            { meta: REWARD_META.BUN_MASKA, rec: bun },
            { meta: REWARD_META.FREE_MAGGIE, rec: mag },
            { meta: REWARD_META.FREE_CHAI, rec: chaiFree },
            { meta: REWARD_META.BIRTHDAY_CHAI, rec: bday },
          ].map(({ meta, rec }) => {
            const typeKey =
              meta.title === "Bun Maska" ? "BUN_MASKA"
              : meta.title === "Free Maggie" ? "FREE_MAGGIE"
              : meta.title === "Free Chai" ? "FREE_CHAI"
              : "BIRTHDAY_CHAI";
            const n = countFor(typeKey);
            return (
            <Card key={meta.title}>
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-base font-extrabold">{meta.icon} {meta.title}{n > 1 ? ` ×${n}` : ""}</p>
                  <p className="text-xs text-[#7a4f26]">{meta.hint}{n > 1 ? ` • ${n} available - claim one by one` : ""}</p>
                </div>
                {rec ? (
                  <Badge tone="available">{rec.status}{n > 1 ? ` ×${n}` : ""}</Badge>
                ) : (
                  <Badge tone="neutral">LOCKED</Badge>
                )}
              </div>
              {rec ? (
                <button
                  type="button"
                  disabled={claimingId === rec.id}
                  onClick={() => claim(rec.id, meta.title)}
                  className="mt-3 min-h-[48px] w-full rounded-2xl bg-[#c68a2b] px-4 text-sm font-black text-white disabled:opacity-60"
                >
                  {claimingId === rec.id ? "CLAIMING…" : rec.status === "CLAIMED" ? "VIEW QR" : n > 1 ? `CLAIM 1 OF ${n}` : "CLAIM REWARD"}
                </button>
              ) : null}
            </Card>
            );
          })}
          {myRewards.length === 0 ? (
            <EmptyState title="Your reward journey starts here 🎁" hint="Approve purchases to unlock treats." />
          ) : null}
        </div>
      </section>

      <section className="mt-6">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-lg font-black">Recent</h2>
          <Link href="/activity" className="text-sm font-bold text-[#7a4f26] underline">My Activity</Link>
        </div>
        {data.recentPurchases.length === 0 ? (
          <EmptyState title="No purchases yet. Start earning your first reward ☕" />
        ) : (
          <div className="grid gap-2">
            {data.recentPurchases.slice(0, 5).map((p) => {
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
                    <Badge tone={p.status === "APPROVED" ? "approved" : p.status === "REJECTED" ? "rejected" : "pending"}>
                      {p.status}
                    </Badge>
                  </div>
                  {p.transactionRef || p.paymentMode ? (
                    <p className="mt-1 font-mono text-[11px] text-[#7a4f26]">
                      {p.paymentMode ?? "OFFLINE"}{p.transactionRef ? ` • ${p.transactionRef}` : ""}
                    </p>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </section>

      <BottomNav />
    </PageShell>
  );
}

export default function DashboardPage() {
  return (
    <ToastProvider>
      <DashboardInner />
    </ToastProvider>
  );
}
