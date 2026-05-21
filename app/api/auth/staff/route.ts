import { NextRequest } from "next/server";
import { getActiveStaff } from "@/lib/repo";

export async function GET() {
  try {
    const rows = await getActiveStaff();
    return Response.json({ staff: rows.map((s) => ({ name: s.name })) });
  } catch (err) {
    return Response.json({ error: err instanceof Error ? err.message : "error" }, { status: 500 });
  }
}

// Avoid type-only unused import warning
export type _ = NextRequest;
