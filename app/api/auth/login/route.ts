import { NextRequest } from "next/server";
import { verifyStaffPin, logAudit } from "@/lib/repo";
import { setSession } from "@/lib/auth";

function clientIp(req: NextRequest): string | null {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? req.headers.get("x-real-ip") ?? null;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const pin = typeof body.pin === "string" ? body.pin.trim() : "";

    if (!name || !/^[0-9]{4}$/.test(pin)) {
      return Response.json({ error: "Name and 4-digit PIN required" }, { status: 400 });
    }

    const staff = await verifyStaffPin(name, pin);
    const ip = clientIp(req);

    if (!staff) {
      await logAudit({
        action: "login_fail",
        actor: name,
        metadata: { reason: "bad_pin" },
        ip_address: ip,
      });
      return Response.json({ error: "Wrong PIN" }, { status: 401 });
    }

    await setSession(staff.name);
    await logAudit({ action: "login_success", actor: staff.name, ip_address: ip });
    return Response.json({ ok: true, name: staff.name });
  } catch (err) {
    return Response.json({ error: err instanceof Error ? err.message : "error" }, { status: 500 });
  }
}
