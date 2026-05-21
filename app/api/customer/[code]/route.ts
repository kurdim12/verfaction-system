import { findByCode } from "@/lib/repo";
import { isValidCode, normaliseCode } from "@/lib/code";
import { TIER_ENGLISH } from "@/lib/constants";

// Public read-only endpoint used by the customer claim page /c/[code]
// Returns minimal fields — no internal status, no audit hints.
export async function GET(_req: Request, ctx: { params: Promise<{ code: string }> }) {
  const { code: raw } = await ctx.params;
  const code = normaliseCode(raw);
  if (!isValidCode(code)) {
    return Response.json({ found: false, error: "Invalid code" }, { status: 400 });
  }
  const c = await findByCode(code);
  if (!c) return Response.json({ found: false }, { status: 404 });
  return Response.json({
    found: true,
    code: c.redemption_code,
    first_name: c.first_name,
    tier: TIER_ENGLISH[c.membership_tier],
    coffee_score: c.bonus_points,
    redeemed: !!c.redeemed_at,
    redeemed_at: c.redeemed_at,
  });
}
