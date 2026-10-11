import { LOYALTY_CONFIG, type PurchaseTypeKey, type RewardTypeKey } from "./config";

export type PurchaseType = PurchaseTypeKey;
export type RewardType = RewardTypeKey;

export interface PurchaseItems {
  chaiQty: number;
  maggieQty: number;
}

export interface LoyaltyCounts {
  chaiCount: number;
  maggieCount: number;
  eligibleVisitCount: number;
}

export interface ApprovalDelta {
  chaiDelta: number;
  maggieDelta: number;
  visitDelta: number;
}

/**
 * Pure function: given an approved purchase, compute loyalty increments.
 * - CHAI purchase => +chaiQty chai (bulk counts, e.g. 5 people = 5 Chai);
 *   +1 visit if amount >= 15. Legacy single chai (no items) => +1.
 * - MAGGIE purchase => +maggieQty maggie (bulk counts);
 *   +1 visit if amount >= 15. Legacy single maggie (no items) => +1.
 * - VISIT purchase => +1 visit only if amount >= 15, else +0
 * - COMBO (multi-item, single transaction) => +chaiQty chai, +maggieQty maggie,
 *   +1 visit max if amount >= 15 (one transaction = max ONE visit).
 * - A single purchase/transaction counts as a maximum of ONE visit.
 */
export function computeApprovalDelta(
  purchaseType: PurchaseType,
  amount: number,
  items?: PurchaseItems
): ApprovalDelta {
  const eligibleVisit =
    amount >= LOYALTY_CONFIG.VISITS.minimumAmount ? 1 : 0;
  const clampQty = (n: number) => Math.max(0, Math.min(20, Math.floor(n)));
  if (purchaseType === "COMBO") {
    if (!items) return { chaiDelta: 0, maggieDelta: 0, visitDelta: eligibleVisit };
    return {
      chaiDelta: clampQty(items.chaiQty),
      maggieDelta: clampQty(items.maggieQty),
      visitDelta: eligibleVisit,
    };
  }
  switch (purchaseType) {
    case "CHAI": {
      const q =
        items && items.chaiQty > 0 ? clampQty(items.chaiQty) : 1;
      return { chaiDelta: q, maggieDelta: 0, visitDelta: eligibleVisit };
    }
    case "MAGGIE": {
      const q =
        items && items.maggieQty > 0 ? clampQty(items.maggieQty) : 1;
      return { chaiDelta: 0, maggieDelta: q, visitDelta: eligibleVisit };
    }
    case "VISIT":
      return { chaiDelta: 0, maggieDelta: 0, visitDelta: eligibleVisit };
    default:
      return { chaiDelta: 0, maggieDelta: 0, visitDelta: 0 };
  }
}

export interface RewardToCreate {
  rewardType: RewardType;
}

/**
 * Pure function: given current progress + delta, compute new progress
 * and which rewards should be created.
 *
 * Cycle logic: progress stores the remainder toward the NEXT reward.
 * When a counter reaches its threshold, a reward is created and the
 * threshold is subtracted (consumed at creation time). This guarantees:
 * - 8 chai => 1 reward, counter resets to 0
 * - 16 chai => 2 rewards total
 * - Never shows 16/8 forever
 * - Duplicate approval cannot create duplicate rewards because each
 *   approved purchase is processed exactly once (status PENDING -> APPROVED).
 */
export function applyApprovalToProgress(
  current: LoyaltyCounts,
  delta: ApprovalDelta
): { next: LoyaltyCounts; rewards: RewardToCreate[] } {
  let chai = current.chaiCount + delta.chaiDelta;
  let maggie = current.maggieCount + delta.maggieDelta;
  let visits = current.eligibleVisitCount + delta.visitDelta;
  const rewards: RewardToCreate[] = [];

  while (chai >= LOYALTY_CONFIG.CHAI.threshold) {
    rewards.push({ rewardType: "BUN_MASKA" });
    chai -= LOYALTY_CONFIG.CHAI.threshold;
  }
  while (maggie >= LOYALTY_CONFIG.MAGGIE.threshold) {
    rewards.push({ rewardType: "FREE_MAGGIE" });
    maggie -= LOYALTY_CONFIG.MAGGIE.threshold;
  }
  while (visits >= LOYALTY_CONFIG.VISITS.threshold) {
    rewards.push({ rewardType: "FREE_CHAI" });
    visits -= LOYALTY_CONFIG.VISITS.threshold;
  }

  return {
    next: { chaiCount: chai, maggieCount: maggie, eligibleVisitCount: visits },
    rewards,
  };
}

/** Remaining count to unlock, for UI display. */
export function remainingToUnlock(current: number, threshold: number): number {
  if (current >= threshold) return 0;
  return threshold - current;
}

/** Human-readable summary for a purchase (supports legacy + multi-item). */
export function describePurchase(p: {
  purchaseType: string;
  chaiQty?: number | null;
  maggieQty?: number | null;
  amount: number;
}): string {
  const cq = p.chaiQty ?? 0;
  const mq = p.maggieQty ?? 0;
  if (p.purchaseType === "COMBO" || cq + mq > 0) {
    const parts: string[] = [];
    if (cq > 0) parts.push(`${cq}x Chai`);
    if (mq > 0) parts.push(`${mq}x Maggie`);
    if (parts.length === 0) return `${p.purchaseType} - ₹${p.amount}`;
    return `${parts.join(" + ")} - ₹${p.amount}`;
  }
  return `${p.purchaseType} - ₹${p.amount}`;
}
