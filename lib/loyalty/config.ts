// Central MEHFIL loyalty offer configuration.
// Do NOT hardcode these thresholds in multiple files - import from here.
export const LOYALTY_CONFIG = {
  CHAI: {
    threshold: 8,
    rewardType: "BUN_MASKA",
    rewardLabel: "Bun Maska FREE",
  },
  MAGGIE: {
    threshold: 8,
    rewardType: "FREE_MAGGIE",
    rewardLabel: "Free Maggie",
  },
  VISITS: {
    threshold: 5,
    minimumAmount: 15,
    rewardType: "FREE_CHAI",
    rewardLabel: "Free Chai",
  },
  BIRTHDAY: {
    rewardType: "BIRTHDAY_CHAI",
    rewardLabel: "Birthday Free Chai",
  },
} as const;

export type PurchaseTypeKey = "CHAI" | "MAGGIE" | "VISIT" | "COMBO";
export type RewardTypeKey =
  | "BUN_MASKA"
  | "FREE_MAGGIE"
  | "FREE_CHAI"
  | "BIRTHDAY_CHAI";
