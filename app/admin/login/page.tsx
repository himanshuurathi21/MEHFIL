"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { BrandMark, Card, Field, PageShell, PasswordField, PrimaryButton, ToastProvider, useToast } from "@/components/ui";

function AdminLoginForm() {
  const router = useRouter();
  const { push } = useToast();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Login failed.");
        return;
      }
      if (data.user.role !== "ADMIN") {
        setError("This login is for MEHFIL admin only.");
        await fetch("/api/auth/logout", { method: "POST" });
        return;
      }
      push(`Welcome back, ${data.user.displayName}.`);
      router.push("/admin");
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <PageShell>
      <div className="mb-4 flex justify-center pt-6">
        <BrandMark />
      </div>
      <Card>
        <h1 className="text-center text-2xl font-black">MEHFIL Admin Login</h1>
        <p className="mt-1 text-center text-sm text-[#7a4f26]">Admin access only • मेहफिल</p>
        <form onSubmit={submit} className="mt-5 space-y-3">
          <Field label="Admin Username" value={username} onChange={(e) => setUsername(e.target.value)} required autoComplete="username" />
          <PasswordField label="Password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" />
          {error ? (
            <p role="alert" className="rounded-2xl bg-red-50 px-3 py-2 text-sm font-semibold text-red-800">{error}</p>
          ) : null}
          <PrimaryButton type="submit" disabled={loading}>
            {loading ? "LOGGING IN…" : "ADMIN LOGIN"}
          </PrimaryButton>
        </form>
      </Card>
    </PageShell>
  );
}

export default function AdminLoginPage() {
  return (
    <ToastProvider>
      <AdminLoginForm />
    </ToastProvider>
  );
}
