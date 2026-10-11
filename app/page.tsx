import Link from "next/link";
import { BrandMark, Card } from "@/components/ui";
import { InstallBanner } from "@/components/pwa";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function Landing() {
  let user: { role: string } | null = null;
  try {
    user = await getCurrentUser();
  } catch (e) {
    console.error("landing auth error", e);
    user = null;
  }
  const isAdmin = user?.role === "ADMIN";

  return (
    <main className="mx-auto w-full max-w-md px-4 pb-10 pt-6 sm:max-w-lg">
      <div className="flex items-center justify-between">
        <BrandMark />
        <div className="flex gap-2">
          {user ? (
            <Link
              href={isAdmin ? "/admin" : "/dashboard"}
              className="rounded-2xl bg-[#2b1a0e] px-4 py-2.5 text-sm font-bold text-[#fdf8f0]"
            >
              {isAdmin ? "ADMIN PANEL" : "DASHBOARD"}
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                className="rounded-2xl border border-[#e5d3b3] bg-white px-4 py-2.5 text-sm font-bold text-[#5a3a1e]"
              >
                LOGIN
              </Link>
              <Link
                href="/signup"
                className="rounded-2xl bg-[#2b1a0e] px-4 py-2.5 text-sm font-bold text-[#fdf8f0]"
              >
                SIGN UP
              </Link>
            </>
          )}
        </div>
      </div>

      <section className="mt-8 rounded-[2rem] bg-[#2b1a0e] p-7 text-[#fdf8f0]">
        <p className="text-xs font-bold tracking-[0.25em] text-[#d9a441]">मेहफिल • MEHFIL</p>
        <h1 className="mt-2 text-5xl font-black tracking-[0.08em]">MEHFIL</h1>
        <p className="mt-1 text-lg font-medium text-[#f2e2c9]">मेहफिल</p>
        <p className="mt-4 text-xl font-bold leading-snug">
          “Every Visit. Every Sip. Every Reward.”
        </p>
        <p className="mt-2 text-sm text-[#f2e2c9]/90">
          Earn rewards every time you visit MEHFIL. Scan the shop QR, submit your
          purchase, and unlock free treats.
        </p>
        <p className="mt-3 text-center text-[11px] text-[#f2e2c9]/70">
          No payments here - pay at the shop as usual, then track rewards.
        </p>
      </section>

      <section className="mt-4">
        <InstallBanner />
      </section>

      <section className="mt-4 grid gap-3">
        <Card>
          <p className="text-2xl" aria-hidden>☕</p>
          <p className="mt-1 text-base font-extrabold">8 Chai → Bun Maska FREE</p>
          <p className="text-sm text-[#7a4f26]">Every approved Chai counts. Complete 8 to unlock.</p>
        </Card>
        <Card>
          <p className="text-2xl" aria-hidden>🍜</p>
          <p className="mt-1 text-base font-extrabold">8 Maggie → Maggie FREE</p>
          <p className="text-sm text-[#7a4f26]">Every approved Maggie counts. Complete 8 to unlock.</p>
        </Card>
        <Card>
          <p className="text-2xl" aria-hidden>🏪</p>
          <p className="mt-1 text-base font-extrabold">5 Eligible Visits → Chai FREE</p>
          <p className="text-sm text-[#7a4f26]">
            Each visit with ₹15+ counts. Visits need not be consecutive.
          </p>
        </Card>
      </section>

      <section className="mt-4">
        <Card className="bg-[#fdf3e3]">
          <p className="text-sm font-extrabold text-[#2b1a0e]">How it works</p>
          <ol className="mt-2 space-y-1.5 text-sm font-medium text-[#5a3a1e]">
            <li>1️⃣ Create your MEHFIL account (no OTP needed).</li>
            <li>2️⃣ Pay at the shop with normal UPI.</li>
            <li>3️⃣ Tap ADD PURCHASE and submit.</li>
            <li>4️⃣ Shop verifies &amp; approves in one tap.</li>
            <li>5️⃣ Claim rewards, show QR, enjoy 🎉</li>
          </ol>
        </Card>
      </section>

      <footer className="mt-6 text-center text-xs text-[#7a4f26]">
        MEHFIL • मेहफिल - Loyalty &amp; Rewards
      </footer>
    </main>
  );
}
