import { currentStaff } from "@/lib/auth";
import { getActiveStaff } from "@/lib/repo";
import StaffClient from "./staff-client";

export const dynamic = "force-dynamic";

export default async function StaffPage() {
  const me = await currentStaff();
  const staff = await getActiveStaff().catch(() => []);
  return <StaffClient initialMe={me} staffNames={staff.map((s) => s.name)} />;
}
