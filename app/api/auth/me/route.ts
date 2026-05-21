import { currentStaff } from "@/lib/auth";

export async function GET() {
  const name = await currentStaff();
  return Response.json({ staff: name });
}
