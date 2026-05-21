import { markSkipped, unskip, findByEmail } from "../lib/repo";

async function main() {
  const args = process.argv.slice(2);
  const undo = args.includes("--undo");
  const emails = args.filter((a) => !a.startsWith("--"));

  if (emails.length === 0) {
    console.error("Usage: pnpm skip <email> [<email> ...]   # mark skipped");
    console.error("       pnpm skip <email> --undo          # un-skip");
    process.exit(1);
  }

  for (const email of emails) {
    const c = await findByEmail(email);
    if (!c) { console.log(`✗ ${email}  not in DB`); continue; }
    if (undo) {
      if (c.status !== "skipped") { console.log(`⚠ ${email}  status=${c.status}, not skipped`); continue; }
      await unskip(email);
      console.log(`✓ ${email}  un-skipped`);
    } else {
      if (c.status === "sent") { console.log(`⚠ ${email}  already sent — refusing to skip`); continue; }
      await markSkipped(email);
      console.log(`✓ ${email}  skipped`);
    }
  }
}

main().catch((e) => { console.error("✗ Error:", e); process.exit(1); });
