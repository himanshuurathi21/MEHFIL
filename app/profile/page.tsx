"use client";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, PageShell, PrimaryButton, TopBar, ToastProvider, useToast } from "@/components/ui";
import { BottomNav, LogoutButton } from "@/components/nav";

type Me = {
  username: string;
  displayName: string;
  createdAt: string;
  birthdate?: string | null;
};

function formatDob(iso: string | null | undefined): string {
  if (!iso) return "Not set";
  const d = new Date(iso);
  return d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

function ProfileInner() {
  const router = useRouter();
  const { push } = useToast();
  const [user, setUser] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);

  const [displayName, setDisplayName] = useState("");
  const [dob, setDob] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me", { cache: "no-store" });
      const j = await res.json();
      if (!j.user) {
        router.push("/login");
        return;
      }
      if (j.user.role === "ADMIN") {
        router.push("/admin");
        return;
      }
      setUser(j.user);
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

  function startEdit() {
    if (!user) return;
    setDisplayName(user.displayName);
    setDob(user.birthdate ? String(user.birthdate).slice(0, 10) : "");
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setEditing(true);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    if (newPassword || confirmPassword || currentPassword) {
      if (!currentPassword) {
        push("Enter your current password to change it.");
        return;
      }
      if (newPassword.length < 6) {
        push("New password must be at least 6 characters.");
        return;
      }
      if (newPassword !== confirmPassword) {
        push("New passwords do not match.");
        return;
      }
    }
    setSaving(true);
    try {
      const payload: Record<string, string | null> = {};
      if (displayName.trim() && displayName.trim() !== user.displayName) {
        payload.displayName = displayName.trim();
      }
      const nextDob = dob || null;
      const prevDob = user.birthdate ? String(user.birthdate).slice(0, 10) : null;
      if (nextDob !== prevDob) {
        payload.birthdate = nextDob;
      }
      if (newPassword) {
        payload.currentPassword = currentPassword;
        payload.newPassword = newPassword;
      }
      if (Object.keys(payload).length === 0) {
        push("No changes to save.");
        setEditing(false);
        return;
      }
      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const j = await res.json();
      if (!res.ok) {
        push(j.error ?? "Could not save changes.");
        return;
      }
      setUser((u) =>
        u
          ? {
              ...u,
              displayName: j.displayName ?? u.displayName,
              birthdate: j.birthdate !== undefined ? j.birthdate : u.birthdate,
            }
          : u
      );
      setEditing(false);
      push(j.passwordChanged ? "Details saved. Password changed." : "Details saved.");
    } catch {
      push("Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  if (loading || !user) {
    return (
      <PageShell>
        <TopBar title="Profile" sub="Your account" />
        <Card><p className="text-sm text-[#7a4f26]">Loading…</p></Card>
        <BottomNav />
      </PageShell>
    );
  }

  return (
    <PageShell>
      <TopBar title="Profile" sub="Your account" />
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black">Profile</h1>
        {!editing ? (
          <button
            type="button"
            onClick={startEdit}
            className="rounded-2xl bg-[#2b1a0e] px-4 py-2.5 text-sm font-bold text-[#fdf8f0]"
          >
            ✏️ EDIT DETAILS
          </button>
        ) : null}
      </div>

      {!editing ? (
        <Card className="mt-3">
          <p className="text-xs font-bold tracking-wide text-[#7a4f26]">EMAIL</p>
          <p className="text-base font-bold">{user.username}</p>

          <p className="mt-3 text-xs font-bold tracking-wide text-[#7a4f26]">DISPLAY NAME</p>
          <p className="text-lg font-black">{user.displayName}</p>

          <p className="mt-3 text-xs font-bold tracking-wide text-[#7a4f26]">PASSWORD</p>
          <p className="text-base font-bold tracking-widest">••••••</p>

          <p className="mt-3 text-xs font-bold tracking-wide text-[#7a4f26]">DATE OF BIRTH</p>
          <p className="text-base font-bold">
            {user.birthdate ? `🎂 ${formatDob(user.birthdate)}` : "Not set"}
          </p>

          <p className="mt-3 text-xs font-bold tracking-wide text-[#7a4f26]">ACCOUNT CREATED</p>
          <p className="text-sm font-medium">{new Date(user.createdAt).toLocaleDateString()}</p>

          <div className="mt-5">
            <LogoutButton />
          </div>
        </Card>
      ) : (
        <Card className="mt-3">
          <p className="text-base font-extrabold">Edit details</p>
          <p className="mt-0.5 text-xs text-[#7a4f26]">Email cannot be changed.</p>
          <form onSubmit={save} className="mt-4 space-y-3">
            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold text-[#5a3a1e]">Email (cannot be changed)</span>
              <input
                value={user.username}
                disabled
                className="min-h-[52px] w-full rounded-2xl border border-[#e5d3b3] bg-[#f9efe0] px-4 text-base text-[#a08c6f]"
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold text-[#5a3a1e]">Display Name</span>
              <input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                maxLength={50}
                required
                className="min-h-[52px] w-full rounded-2xl border border-[#e5d3b3] bg-white px-4 text-base"
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold text-[#5a3a1e]">🎂 Birthday (optional - free Chai gift!)</span>
              <input
                type="date"
                value={dob}
                max={new Date().toISOString().slice(0, 10)}
                onChange={(e) => setDob(e.target.value)}
                className="min-h-[52px] w-full rounded-2xl border border-[#e5d3b3] bg-white px-4 text-base"
              />
            </label>
            <div className="rounded-2xl bg-[#fdf3e3] p-4">
              <p className="text-sm font-extrabold">Change password (optional)</p>
              <div className="mt-2 space-y-3">
                <label className="block">
                  <span className="mb-1.5 block text-sm font-semibold text-[#5a3a1e]">Current Password</span>
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    autoComplete="current-password"
                    className="min-h-[52px] w-full rounded-2xl border border-[#e5d3b3] bg-white px-4 text-base"
                  />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-sm font-semibold text-[#5a3a1e]">New Password</span>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    autoComplete="new-password"
                    className="min-h-[52px] w-full rounded-2xl border border-[#e5d3b3] bg-white px-4 text-base"
                  />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-sm font-semibold text-[#5a3a1e]">Confirm New Password</span>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    autoComplete="new-password"
                    className="min-h-[52px] w-full rounded-2xl border border-[#e5d3b3] bg-white px-4 text-base"
                  />
                </label>
              </div>
            </div>
            <div className="flex gap-2">
              <div className="flex-1">
                <PrimaryButton type="submit" disabled={saving}>
                  {saving ? "SAVING…" : "SAVE CHANGES"}
                </PrimaryButton>
              </div>
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="min-h-[52px] rounded-2xl border border-[#e5d3b3] px-5 text-sm font-bold text-[#5a3a1e]"
              >
                Cancel
              </button>
            </div>
          </form>
        </Card>
      )}
      <BottomNav />
    </PageShell>
  );
}

export default function ProfilePage() {
  return (
    <ToastProvider>
      <ProfileInner />
    </ToastProvider>
  );
}
