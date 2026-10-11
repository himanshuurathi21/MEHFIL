"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Badge, Card, TopBar, ToastProvider, useToast } from "@/components/ui";
import { AdminNav } from "@/components/nav";
import { QrScanner } from "@/components/qr-scanner";

type Lookup = {
  id: string;
  rewardType: string;
  status: string;
  user: { username: string; displayName: string };
};

function ScannerInner() {
  const router = useRouter();
  const { push } = useToast();
  const [manual, setManual] = useState("");
  const [found, setFound] = useState<Lookup | null>(null);
  const [verifiedToken, setVerifiedToken] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [adminLoginNeeded, setAdminLoginNeeded] = useState(false);

  async function lookup(token: string) {
    const cleaned = token.trim();
    if (!cleaned) {
      push("Enter or scan the token first.");
      return;
    }
    setBusy(true);
    setFound(null);
    setVerifiedToken(null);
    setAdminLoginNeeded(false);
    try {      const res = await fetch("/api/admin/rewards/redeem?mode=lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      if (res.status === 401) {
        router.push("/admin/login");
        return;
      }
      if (res.status === 403) {
        // Logged in, but as a customer - this device needs admin login.
        setAdminLoginNeeded(true);
        return;
      }
      const j = await res.json();
      if (!res.ok) {
        if (j.reward) {
          setFound(j.reward);
          // Keep the token that produced this result so REDEEM acts on the
          // verified reward even if the input is edited afterwards.
          setVerifiedToken(cleaned);
        }
        push(j.error ?? "Invalid reward.");
        return;
      }
      setFound(j.reward);
      setVerifiedToken(cleaned);
      push("Valid reward ✓");
    } catch {
      push("Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function redeem() {
    if (!found) return;
    // Redeem the token that was verified (not whatever is currently typed),
    // so the on-screen reward always matches what gets redeemed.
    const redeemToken = (verifiedToken ?? manual).trim();
    if (!redeemToken) {
      push("Enter or scan the token first.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/admin/rewards/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: redeemToken }),
      });
      if (res.status === 401) {
        router.push("/admin/login");
        return;
      }
      if (res.status === 403) {
        setAdminLoginNeeded(true);
        return;
      }
      const j = await res.json();
      if (!res.ok) {
        push(j.error ?? "Could not redeem.");
        return;
      }
      push("Reward redeemed successfully.");
      setFound(null);
      setVerifiedToken(null);
      setManual("");
    } catch {
      push("Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-4 pb-28 pt-4">
      <TopBar title="Scan Reward" sub="Verify & redeem" />
      <h1 className="text-2xl font-black">Scan Reward</h1>
      <Card className="mt-3">
        <QrScanner
          onScan={(text) => {
            setManual(text);
            lookup(text);
          }}
        />
        <label className="mt-3 block">
          <span className="mb-1.5 block text-sm font-bold">Or paste token manually</span>
          <input
            value={manual}
            onChange={(e) => setManual(e.target.value)}
            className="min-h-[52px] w-full rounded-2xl border border-[#e5d3b3] px-4 font-mono text-sm"
          />
        </label>
        <button
          type="button"
          disabled={busy || !manual.trim()}
          onClick={() => lookup(manual)}
          className="mt-2 min-h-[52px] w-full rounded-2xl border border-[#e5d3b3] bg-white px-4 text-sm font-black disabled:opacity-60"
        >
          {busy ? "CHECKING…" : "VERIFY TOKEN"}
        </button>
      </Card>

      {adminLoginNeeded ? (
        <Card className="mt-3 border-amber-200">
          <p className="text-base font-black">Admin login required</p>
          <p className="mt-1 text-sm text-[#5a3a1e]">
            This device is logged in as a customer. Rewards can only be scanned
            from an admin login.
          </p>
          <button
            type="button"
            onClick={() => router.push("/admin/login")}
            className="mt-3 min-h-[52px] w-full rounded-2xl bg-[#2b1a0e] px-4 text-base font-black text-white"
          >
            GO TO ADMIN LOGIN
          </button>
        </Card>
      ) : null}

      {found ? (
        <Card className="mt-3 border-emerald-200">
          <p className="text-base font-black text-emerald-900">
            {found.status === "CLAIMED" ? "✓ VALID REWARD" : `REWARD: ${found.status}`}
          </p>
          <p className="mt-1 text-sm">Customer: <b>{found.user.displayName}</b> @{found.user.username}</p>
          <p className="text-sm">Reward: <b>{found.rewardType.replace(/_/g, " ")}</b></p>
          <p className="mt-1"><Badge tone={found.status === "CLAIMED" ? "available" : found.status === "REDEEMED" ? "approved" : "neutral"}>{found.status}</Badge></p>
          {found.status === "CLAIMED" ? (
            <button
              type="button"
              disabled={busy}
              onClick={redeem}
              className="mt-3 min-h-[52px] w-full rounded-2xl bg-[#2b1a0e] px-4 text-base font-black text-white disabled:opacity-60"
            >
              {busy ? "REDEEMING…" : "REDEEM REWARD"}
            </button>
          ) : (
            <p className="mt-3 text-sm font-medium text-[#7a4f26]">
              {found.status === "REDEEMED"
                ? "This reward was already redeemed - do not give the item again."
                : found.status === "CANCELLED"
                  ? "This reward was cancelled."
                  : "This reward is not ready to redeem yet (must be CLAIMED by the customer first)."}
            </p>
          )}
        </Card>
      ) : null}
      <AdminNav />
    </div>
  );
}

export default function ScannerPage() {
  return (
    <ToastProvider>
      <ScannerInner />
    </ToastProvider>
  );
}
