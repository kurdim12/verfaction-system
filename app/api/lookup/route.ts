import { NextRequest } from "next/server";
import { requireStaff } from "@/lib/auth";
import { findByCode, searchCustomers, logAudit } from "@/lib/repo";
import { isValidCode, normaliseCode } from "@/lib/code";

function clientIp(req: NextRequest): string | null {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
}

export async function GET(req: NextRequest) {
  let staff: string;
  try {
    staff = await requireStaff();
  } catch {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }

  const url = new URL(req.url);
  const codeRaw = url.searchParams.get("code") ?? "";
  const query = url.searchParams.get("q") ?? "";

  if (codeRaw) {
    const code = normaliseCode(codeRaw);
    if (!isValidCode(code)) return Response.json({ error: "Invalid code format" }, { status: 400 });
    const customer = await findByCode(code);
    if (!customer) {
      await logAudit({ action: "lookup_unknown", actor: staff, redemption_code: code, ip_address: clientIp(req) });
      return Response.json({ found: false }, { status: 404 });
    }
    return Response.json({ found: true, customer });
  }

  if (query) {
    const results = await searchCustomers(query, 10);
    return Response.json({ found: true, results });
  }

  return Response.json({ error: "Provide ?code or ?q" }, { status: 400 });
}
