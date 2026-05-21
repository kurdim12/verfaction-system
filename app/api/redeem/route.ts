import { NextRequest } from "next/server";
import { requireStaff } from "@/lib/auth";
import { findByCode, markRedeemed, unredeem, logAudit } from "@/lib/repo";
import { isValidCode, normaliseCode } from "@/lib/code";

function clientIp(req: NextRequest): string | null {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
}

export async function POST(req: NextRequest) {
  let staff: string;
  try {
    staff = await requireStaff();
  } catch {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const codeRaw = typeof body.code === "string" ? body.code : "";
  const action = body.action === "undo" ? "undo" : "redeem";
  const reason = typeof body.reason === "string" ? body.reason.trim() : "";
  const ip = clientIp(req);

  const code = normaliseCode(codeRaw);
  if (!isValidCode(code)) return Response.json({ error: "Invalid code" }, { status: 400 });

  const customer = await findByCode(code);
  if (!customer) {
    await logAudit({ action: "lookup_unknown", actor: staff, redemption_code: code, ip_address: ip });
    return Response.json({ error: "Code not found" }, { status: 404 });
  }

  if (action === "undo") {
    if (!reason || reason.length < 4) {
      return Response.json({ error: "Undo requires a reason (4+ chars)" }, { status: 400 });
    }
    if (!customer.redeemed_at) {
      return Response.json({ error: "Code wasn't redeemed yet" }, { status: 400 });
    }
    const updated = await unredeem(code);
    await logAudit({
      action: "undo_redeem",
      actor: staff,
      redemption_code: code,
      customer_email: customer.email,
      metadata: { reason, previousRedeemer: customer.redeemed_by },
      ip_address: ip,
    });
    return Response.json({ ok: true, customer: updated });
  }

  // Redeem
  if (customer.redeemed_at) {
    return Response.json({
      ok: false,
      alreadyRedeemed: true,
      customer,
      message: `Already redeemed at ${customer.redeemed_at} by ${customer.redeemed_by ?? "(unknown)"}`,
    }, { status: 409 });
  }

  const updated = await markRedeemed(code, staff);
  await logAudit({
    action: "redeem",
    actor: staff,
    redemption_code: code,
    customer_email: customer.email,
    metadata: { tier: customer.membership_tier, coffeeScore: customer.bonus_points },
    ip_address: ip,
  });
  return Response.json({ ok: true, customer: updated });
}
