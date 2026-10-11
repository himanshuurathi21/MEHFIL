"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, EmptyState, TopBar, ToastProvider } from "@/components/ui";
import { AdminNav } from "@/components/nav";

type Action = {
  id: string;
  actionType: string;
  targetType: string;
  targetId: string;
  details: string | null;
  createdAt: string;
  admin: { username: string; displayName: string };
};

function AuditInner() {
  const router = useRouter();
  const [actions, setActions] = useState<Action[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/admin/audit", { cache: "no-store" });
        if (res.status === 401) {
          router.push("/admin/login");
          return;
        }
        if (res.status === 403) {
          router.push("/login");
          return;
        }
        const j = await res.json();
        setActions(j.actions ?? []);
      } catch {
        setActions([]);
      }
    })();
  }, [router]);

  return (
    <div className="mx-auto w-full max-w-2xl px-4 pb-28 pt-4">
      <TopBar title="Audit" sub="Admin activity" />
      <h1 className="text-2xl font-black">Admin Activity</h1>
      <div className="mt-3 grid gap-2">
        {actions.length === 0 ? (
          <EmptyState title="No admin actions yet" />
        ) : (
          actions.map((a) => (
            <Card key={a.id} className="p-4">
              <p className="text-sm font-extrabold">{a.actionType} • {a.targetType}</p>
              <p className="mt-0.5 text-sm text-[#5a3a1e]">{a.details}</p>
              <p className="mt-1 text-xs text-[#7a4f26]">
                {a.admin.displayName} @{a.admin.username} • {new Date(a.createdAt).toLocaleString()}
              </p>
            </Card>
          ))
        )}
      </div>
      <AdminNav />
    </div>
  );
}

export default function AuditPage() {
  return (
    <ToastProvider>
      <AuditInner />
    </ToastProvider>
  );
}
