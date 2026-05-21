import { requireStaff } from "@/lib/auth";
import { getStats } from "@/lib/repo";

export async function GET() {
  try {
    await requireStaff();
  } catch {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }
  const stats = await getStats();
  return Response.json(stats);
}
