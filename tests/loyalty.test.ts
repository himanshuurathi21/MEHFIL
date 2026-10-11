import { describe, it, expect } from "vitest";
import {
  computeApprovalDelta,
  applyApprovalToProgress,
} from "../lib/loyalty/engine";

// CHAI
describe("chai loyalty", () => {
  it("7 -> 8 creates Bun Maska reward", () => {
    const { next, rewards } = applyApprovalToProgress(
      { chaiCount: 7, maggieCount: 0, eligibleVisitCount: 0 },
      { chaiDelta: 1, maggieDelta: 0, visitDelta: 0 }
    );
    expect(next.chaiCount).toBe(0);
    expect(rewards).toHaveLength(1);
    expect(rewards[0].rewardType).toBe("BUN_MASKA");
  });

  it("16 chai total earns 2 rewards", () => {
    let state = { chaiCount: 0, maggieCount: 0, eligibleVisitCount: 0 };
    let totalRewards = 0;
    for (let i = 0; i < 16; i++) {
      const r = applyApprovalToProgress(state, { chaiDelta: 1, maggieDelta: 0, visitDelta: 0 });
      state = r.next;
      totalRewards += r.rewards.filter((x) => x.rewardType === "BUN_MASKA").length;
    }
    expect(totalRewards).toBe(2);
    expect(state.chaiCount).toBe(0);
  });

  it("does not show 16/8 forever (counter resets)", () => {
    const { next } = applyApprovalToProgress(
      { chaiCount: 7, maggieCount: 0, eligibleVisitCount: 0 },
      { chaiDelta: 1, maggieDelta: 0, visitDelta: 0 }
    );
    expect(next.chaiCount).toBeLessThan(8);
  });
});

// MAGGIE
describe("maggie loyalty", () => {
  it("7 -> 8 creates Free Maggie reward", () => {
    const { next, rewards } = applyApprovalToProgress(
      { chaiCount: 0, maggieCount: 7, eligibleVisitCount: 0 },
      { chaiDelta: 0, maggieDelta: 1, visitDelta: 0 }
    );
    expect(next.maggieCount).toBe(0);
    expect(rewards[0].rewardType).toBe("FREE_MAGGIE");
  });

  it("16 maggie earns 2 rewards", () => {
    let state = { chaiCount: 0, maggieCount: 0, eligibleVisitCount: 0 };
    let total = 0;
    for (let i = 0; i < 16; i++) {
      const r = applyApprovalToProgress(state, { chaiDelta: 0, maggieDelta: 1, visitDelta: 0 });
      state = r.next;
      total += r.rewards.length;
    }
    expect(total).toBe(2);
  });
});

// VISITS
describe("visits loyalty", () => {
  it("₹14 is not eligible, ₹15 is eligible", () => {
    expect(computeApprovalDelta("VISIT", 14).visitDelta).toBe(0);
    expect(computeApprovalDelta("VISIT", 15).visitDelta).toBe(1);
  });

  it("₹100 counts as exactly one visit", () => {
    expect(computeApprovalDelta("CHAI", 100).visitDelta).toBe(1);
    expect(computeApprovalDelta("MAGGIE", 100).visitDelta).toBe(1);
    expect(computeApprovalDelta("VISIT", 100).visitDelta).toBe(1);
  });

  it("5 eligible visits create Free Chai", () => {
    const state = { chaiCount: 0, maggieCount: 0, eligibleVisitCount: 4 };
    const { next, rewards } = applyApprovalToProgress(state, {
      chaiDelta: 0,
      maggieDelta: 0,
      visitDelta: 1,
    });
    expect(next.eligibleVisitCount).toBe(0);
    expect(rewards[0].rewardType).toBe("FREE_CHAI");
  });

  it("10 eligible visits earn 2 Free Chai", () => {
    let state = { chaiCount: 0, maggieCount: 0, eligibleVisitCount: 0 };
    let total = 0;
    for (let i = 0; i < 10; i++) {
      const r = applyApprovalToProgress(state, { chaiDelta: 0, maggieDelta: 0, visitDelta: 1 });
      state = r.next;
      total += r.rewards.length;
    }
    expect(total).toBe(2);
  });
});

// MULTI-OFFER
describe("one purchase serves multiple offers", () => {
  it("Chai ₹20 adds +1 chai AND +1 visit", () => {
    const d = computeApprovalDelta("CHAI", 20);
    expect(d).toEqual({ chaiDelta: 1, maggieDelta: 0, visitDelta: 1 });
  });

  it("Maggie ₹50 adds +1 maggie AND +1 visit", () => {
    const d = computeApprovalDelta("MAGGIE", 50);
    expect(d).toEqual({ chaiDelta: 0, maggieDelta: 1, visitDelta: 1 });
  });

  it("Himanshu example: 7 chai/6 maggie/4 visits + Chai ₹20 => Bun Maska + Free Chai", () => {
    const start = { chaiCount: 7, maggieCount: 6, eligibleVisitCount: 4 };
    const delta = computeApprovalDelta("CHAI", 20);
    const { next, rewards } = applyApprovalToProgress(start, delta);
    expect(next.chaiCount).toBe(0);
    expect(next.eligibleVisitCount).toBe(0);
    expect(rewards.map((r) => r.rewardType).sort()).toEqual(
      ["BUN_MASKA", "FREE_CHAI"].sort()
    );
  });

  it("Chai ₹10 adds chai but no visit", () => {
    const d = computeApprovalDelta("CHAI", 10);
    expect(d.chaiDelta).toBe(1);
    expect(d.visitDelta).toBe(0);
  });

  it("COMBO: 1 chai + 1 maggie in one bill (₹120) => +1 chai, +1 maggie, +1 visit", () => {
    const d = computeApprovalDelta("COMBO", 120, { chaiQty: 1, maggieQty: 1 });
    expect(d).toEqual({ chaiDelta: 1, maggieDelta: 1, visitDelta: 1 });
  });

  it("COMBO: 2 chai + 0 maggie (₹60) => +2 chai, +1 visit max", () => {
    const d = computeApprovalDelta("COMBO", 60, { chaiQty: 2, maggieQty: 0 });
    expect(d).toEqual({ chaiDelta: 2, maggieDelta: 0, visitDelta: 1 });
  });

  it("COMBO under ₹15 gives items but no visit", () => {
    const d = computeApprovalDelta("COMBO", 10, { chaiQty: 1, maggieQty: 1 });
    expect(d.chaiDelta).toBe(1);
    expect(d.maggieDelta).toBe(1);
    expect(d.visitDelta).toBe(0);
  });

  it("bulk Chai (5x, one bill ₹75) counts +5 chai and +1 visit", () => {
    const d = computeApprovalDelta("CHAI", 75, { chaiQty: 5, maggieQty: 0 });
    expect(d).toEqual({ chaiDelta: 5, maggieDelta: 0, visitDelta: 1 });
  });

  it("bulk Maggie (3x, one bill ₹90) counts +3 maggie and +1 visit", () => {
    const d = computeApprovalDelta("MAGGIE", 90, { chaiQty: 0, maggieQty: 3 });
    expect(d).toEqual({ chaiDelta: 0, maggieDelta: 3, visitDelta: 1 });
  });

  it("legacy single Chai (no items) still counts +1", () => {
    expect(computeApprovalDelta("CHAI", 20)).toEqual({
      chaiDelta: 1,
      maggieDelta: 0,
      visitDelta: 1,
    });
  });

  it("bulk chai crossing threshold mints reward and keeps remainder", () => {
    const delta = computeApprovalDelta("CHAI", 100, { chaiQty: 5, maggieQty: 0 });
    const { next, rewards } = applyApprovalToProgress(
      { chaiCount: 6, maggieCount: 0, eligibleVisitCount: 0 },
      delta
    );
    // 6 + 5 = 11 => 1 reward, 3 remainder
    expect(rewards.filter((r) => r.rewardType === "BUN_MASKA")).toHaveLength(1);
    expect(next.chaiCount).toBe(3);
  });
});
