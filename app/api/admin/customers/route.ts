import { NextRequest } from "next/server";
import { requireStaff } from "@/lib/auth";
import { listCustomers } from "@/lib/repo";
import { VALID_TIERS, type Tier } from "@/lib/constants";

export async function GET(req: NextRequest) {
  try {
    await requireStaff();
  } catch {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }
  const url = new URL(req.url);
  const status = url.searchParams.get("status") as ("pending" | "sent" | "failed" | "skipped" | null);
  const tierParam = url.searchParams.get("tier");
  const tier = tierParam && (VALID_TIERS as readonly string[]).includes(tierParam) ? (tierParam as Tier) : undefined;
  const redeemedParam = url.searchParams.get("redeemed");
  const redeemed = redeemedParam === "true" ? true : redeemedParam === "false" ? false : undefined;
  const rows = await listCustomers({ status: status ?? undefined, tier, redeemed });
  return Response.json({ customers: rows });
}
