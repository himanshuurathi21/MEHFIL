import prisma from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { generateRedemptionToken } from "@/lib/tokens";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;
  try {
    const { id } = await params;
    // Only the owner can claim their own reward. Atomic + idempotent:
    // the status flip is guarded (AVAILABLE -> CLAIMED) so concurrent
    // double-clicks cannot mint two tokens.
    const result = await prisma.$transaction(async (tx) => {
      const reward = await tx.reward.findUnique({ where: { id } });
      if (!reward) return { error: "Reward not found.", status: 404 } as const;
      if (reward.userId !== auth.user.id) {
        return { error: "You cannot claim another user's reward.", status: 403 } as const;
      }
      if (reward.status === "CLAIMED") {
        return { ok: true, reward, already: true } as const;
      }
      if (reward.status !== "AVAILABLE") {
        return { error: "This reward cannot be claimed.", status: 400 } as const;
      }
      const token = generateRedemptionToken();
      const marked = await tx.reward.updateMany({
        where: { id: reward.id, status: "AVAILABLE" },
        data: { status: "CLAIMED", claimedAt: new Date(), redemptionToken: token },
      });
      if (marked.count !== 1) {
        // Lost the race: re-read; if it is now CLAIMED by us, treat as idempotent success.
        const current = await tx.reward.findUnique({ where: { id: reward.id } });
        if (current && current.userId === auth.user.id && current.status === "CLAIMED") {
          return { ok: true, reward: current, already: true } as const;
        }
        return { error: "This reward cannot be claimed.", status: 409 } as const;
      }
      const updated = await tx.reward.findUnique({ where: { id: reward.id } });
      if (!updated) return { error: "Reward not found.", status: 404 } as const;
      return { ok: true, reward: updated } as const;
    });

    if ("error" in result) {
      return Response.json({ error: result.error }, { status: result.status });
    }
    return Response.json({ ok: true, reward: result.reward, already: "already" in result ? true : false });
  } catch (e) {
    console.error("claim error", e);
    return Response.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
