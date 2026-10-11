"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge, Card, EmptyState, TopBar, ToastProvider } from "@/components/ui";
import { AdminNav } from "@/components/nav";

type Reward = {
  id: string;
  rewardType: string;
  status: string;
  createdAt: string;
  user: { username: string; displayName: string };
};

function RewardsAdminInner() {
  const router = useRouter();
  const [filter, setFilter] = useState("");
  const [rewards, setRewards] = useState<Reward[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/admin/rewards${filter ? `?status=${filter}` : ""}`, { cache: "no-store" });
        if (res.status === 401) {
          router.push("/admin/login");
          return;
        }
        if (res.status === 403) {
          router.push("/login");
          return;
        }
        const j = await res.json();
        setRewards(j.rewards ?? []);
      } catch {
        setRewards([]);
      }
    })();
  }, [filter, router]);

  return (
    <div className="mx-auto w-full max-w-2xl px-4 pb-28 pt-4">
      <TopBar title="Rewards" sub="All customer rewards" />
      <h1 className="text-2xl font-black">Rewards</h1>
      <div className="mt-3 grid grid-cols-5 gap-1.5">
        {["", "AVAILABLE", "CLAIMED", "REDEEMED", "CANCELLED"].map((f) => (
          <button
            key={f || "ALL"}
            type="button"
            onClick={() => setFilter(f)}
            className={`min-h-[44px] rounded-2xl px-1 text-[11px] font-black ${filter === f ? "bg-[#2b1a0e] text-white" : "border border-[#e5d3b3] bg-white"}`}
          >
            {f || "ALL"}
          </button>
        ))}
      </div>
      <div className="mt-3 grid gap-2">
        {rewards.length === 0 ? (
          <EmptyState title="No rewards here" />
        ) : (
          rewards.map((r) => (
            <Card key={r.id} className="p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-extrabold">🎁 {r.rewardType} - {r.user.displayName}</p>
                <Badge tone={r.status === "REDEEMED" ? "approved" : r.status === "AVAILABLE" || r.status === "CLAIMED" ? "available" : "neutral"}>{r.status}</Badge>
              </div>
              <p className="mt-1 text-xs text-[#7a4f26]">@{r.user.username} • {new Date(r.createdAt).toLocaleString()}</p>
            </Card>
          ))
        )}
      </div>
      <AdminNav />
    </div>
  );
}

export default function AdminRewardsPage() {
  return (
    <ToastProvider>
      <RewardsAdminInner />
    </ToastProvider>
  );
}
