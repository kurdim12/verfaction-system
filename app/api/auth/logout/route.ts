import { currentStaff, clearSession } from "@/lib/auth";
import { logAudit } from "@/lib/repo";

export async function POST() {
  const name = await currentStaff();
  await clearSession();
  if (name) await logAudit({ action: "logout", actor: name });
  return Response.json({ ok: true });
}
