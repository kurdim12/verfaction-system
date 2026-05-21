import { NextRequest } from "next/server";
import { requireStaff } from "@/lib/auth";
import { listAudit } from "@/lib/repo";

export async function GET(req: NextRequest) {
  try {
    await requireStaff();
  } catch {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }
  const url = new URL(req.url);
  const limit = Math.min(500, Math.max(1, parseInt(url.searchParams.get("limit") ?? "100", 10) || 100));
  const actor = url.searchParams.get("actor") ?? undefined;
  const action = url.searchParams.get("action") ?? undefined;
  const rows = await listAudit(limit, { actor, action });
  return Response.json({ entries: rows });
}
