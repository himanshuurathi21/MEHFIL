"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BrandMark, Card, Field, PageShell, PasswordField, PrimaryButton, TopBar } from "@/components/ui";
import { ToastProvider, useToast } from "@/components/ui";

function LoginForm() {
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
      push(`Welcome to MEHFIL, ${data.user.displayName}!`);
      router.push(data.user.role === "ADMIN" ? "/admin" : "/dashboard");
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <PageShell>
      <TopBar title="Welcome Back" sub="Login to MEHFIL" />
      <Card>
        <div className="mb-4 flex justify-center">
          <BrandMark />
        </div>
        <h1 className="text-center text-2xl font-black">Welcome Back</h1>
        <form onSubmit={submit} className="mt-5 space-y-3">
          <Field label="Email" value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="email" required />
          <PasswordField label="Password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required />
          {error ? (
            <p role="alert" className="rounded-2xl bg-red-50 px-3 py-2 text-sm font-semibold text-red-800">
              {error}
            </p>
          ) : null}
          <PrimaryButton type="submit" disabled={loading}>
            {loading ? "LOGGING IN…" : "LOGIN"}
          </PrimaryButton>
        </form>
        <p className="mt-4 text-center text-sm text-[#7a4f26]">
          Don&apos;t have an account?{" "}
          <Link href="/signup" className="font-bold text-[#2b1a0e] underline">
            Sign up
          </Link>
        </p>
      </Card>
    </PageShell>
  );
}

export default function LoginPage() {
  return (
    <ToastProvider>
      <LoginForm />
    </ToastProvider>
  );
}
