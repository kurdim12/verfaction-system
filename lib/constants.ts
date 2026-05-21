export type Tier = "gold" | "silver" | "bronze";

export const TIER_BONUS: Record<Tier, number> = {
  gold: 89,
  silver: 88,
  bronze: 78,
};

export const TIER_ARABIC: Record<Tier, string> = {
  gold: "عضو ذهبي",
  silver: "عضو فضي",
  bronze: "عضو برونزي",
};

export const TIER_ENGLISH: Record<Tier, string> = {
  gold: "Gold",
  silver: "Silver",
  bronze: "Bronze",
};

export const VALID_TIERS: readonly Tier[] = ["gold", "silver", "bronze"] as const;

export function isValidTier(value: unknown): value is Tier {
  return typeof value === "string" && (VALID_TIERS as readonly string[]).includes(value);
}

export function bonusFor(tier: string): number {
  return isValidTier(tier) ? TIER_BONUS[tier] : TIER_BONUS.bronze;
}

export function normaliseTier(tier: string | null | undefined): Tier {
  const t = (tier ?? "").trim().toLowerCase();
  return isValidTier(t) ? t : "bronze";
}
