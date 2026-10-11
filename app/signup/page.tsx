"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BrandMark, Card, Field, PageShell, PrimaryButton, TopBar, ToastProvider, useToast } from "@/components/ui";

function SignupForm() {
  const router = useRouter();
  const { push } = useToast();
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, displayName, password, confirmPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Signup failed.");
        return;
      }
      push("Account created successfully. Welcome to MEHFIL!");
      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <PageShell>
      <TopBar title="Join MEHFIL" sub="Create your account" />
      <Card>
        <div className="mb-4 flex justify-center">
          <BrandMark />
        </div>
        <h1 className="text-center text-2xl font-black">Create Your MEHFIL Account</h1>
        <form onSubmit={submit} className="mt-5 space-y-3">
          <Field label="Display Name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} autoComplete="name" required />
          <Field label="Email" type="email" value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="email" required />
          <Field label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" required />
          <Field label="Confirm Password" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} autoComplete="new-password" required />
          {error ? (
            <p role="alert" className="rounded-2xl bg-red-50 px-3 py-2 text-sm font-semibold text-red-800">
              {error}
            </p>
          ) : null}
          <PrimaryButton type="submit" disabled={loading}>
            {loading ? "CREATING…" : "CREATE ACCOUNT"}
          </PrimaryButton>
        </form>
        <p className="mt-4 text-center text-sm text-[#7a4f26]">
          Already have an account?{" "}
          <Link href="/login" className="font-bold text-[#2b1a0e] underline">
            Login
          </Link>
        </p>
      </Card>
    </PageShell>
  );
}

export default function SignupPage() {
  return (
    <ToastProvider>
      <SignupForm />
    </ToastProvider>
  );
}
