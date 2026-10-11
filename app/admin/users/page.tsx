"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, EmptyState, ToastProvider, TopBar, useToast } from "@/components/ui";
import { AdminNav } from "@/components/nav";
import { LOYALTY_CONFIG } from "@/lib/loyalty/config";

type Row = {
  id: string;
  username: string;
  displayName: string;
  createdAt: string;
  loyaltyProgress: { chaiCount: number; maggieCount: number; eligibleVisitCount: number } | null;
  _count: { purchases: number; rewards: number };
};

function UsersInner() {
  const router = useRouter();
  const { push } = useToast();
  const [q, setQ] = useState("");
  const [users, setUsers] = useState<Row[]>([]);

  useEffect(() => {
    let cancelled = false;
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/admin/users?q=${encodeURIComponent(q)}`, { cache: "no-store" });
        if (res.status === 401) {
          router.push("/admin/login");
          return;
        }
        if (res.status === 403) {
          router.push("/login");
          return;
        }
        const j = await res.json();
        if (!cancelled) setUsers(j.users ?? []);
      } catch {
        if (!cancelled) push("Something went wrong. Please try again.");
      }
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [q, router, push]);

  return (
    <div className="mx-auto w-full max-w-2xl px-4 pb-28 pt-4">
      <TopBar title="Users" sub="Search customers" />
      <h1 className="text-2xl font-black">Users</h1>
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        className="mt-3 min-h-[52px] w-full rounded-2xl border border-[#e5d3b3] bg-white px-4"
      />
      <div className="mt-3 grid gap-2">
        {users.length === 0 ? (
          <EmptyState title="No users found" />
        ) : (
          users.map((u) => (
            <Link key={u.id} href={`/admin/users/${u.id}`}>
              <Card className="p-4">
                <div className="flex items-center justify-between">
                  <p className="font-extrabold">{u.displayName} <span className="text-sm font-medium text-[#7a4f26]">@{u.username}</span></p>
                  <span className="text-xs text-[#7a4f26]">{new Date(u.createdAt).toLocaleDateString()}</span>
                </div>
                <p className="mt-1 text-xs font-medium text-[#5a3a1e]">
                  Chai {u.loyaltyProgress?.chaiCount ?? 0}/{LOYALTY_CONFIG.CHAI.threshold} • Maggie {u.loyaltyProgress?.maggieCount ?? 0}/{LOYALTY_CONFIG.MAGGIE.threshold} • Visits {u.loyaltyProgress?.eligibleVisitCount ?? 0}/{LOYALTY_CONFIG.VISITS.threshold}
                  {" • "}{u._count.purchases} purchases • {u._count.rewards} rewards
                </p>
              </Card>
            </Link>
          ))
        )}
      </div>
      <AdminNav />
    </div>
  );
}

export default function AdminUsersPage() {
  return (
    <ToastProvider>
      <UsersInner />
    </ToastProvider>
  );
}
