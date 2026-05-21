import { currentStaff } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getStats, listAudit } from "@/lib/repo";
import AdminClient from "./admin-client";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const me = await currentStaff();
  if (!me) redirect("/staff");
  const [stats, audit] = await Promise.all([getStats(), listAudit(100)]);
  return <AdminClient me={me} stats={stats} audit={audit} />;
}
