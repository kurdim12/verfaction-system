import { getStats, listCustomers } from "../lib/repo";

async function main() {
  const s = await getStats();
  const pad = (n: number, w = 4) => String(n).padStart(w);

  console.log("");
  console.log("Raw Smith — Status (Supabase)");
  console.log("──────────────────────────────");
  console.log(`Total imported   ${pad(s.total)}`);
  console.log(`  Pending        ${pad(s.pending)}`);
  console.log(`  Sent           ${pad(s.sent)}`);
  console.log(`  Failed         ${pad(s.failed)}`);
  console.log(`  Skipped        ${pad(s.skipped)}`);
  console.log(`Redeemed         ${pad(s.redeemed)}  ${s.sent > 0 ? `(${Math.round((s.redeemed / s.sent) * 100)}% of sent)` : ""}`);
  console.log("");
  console.log("By tier:");
  console.log("  tier      total  pending  sent  redeemed");
  for (const tier of ["gold", "silver", "bronze"] as const) {
    const t = s.byTier[tier];
    console.log(`  ${tier.padEnd(8)} ${pad(t.total, 5)}  ${pad(t.pending, 7)}  ${pad(t.sent, 4)}  ${pad(t.redeemed, 8)}`);
  }
  if (s.byBaristaToday.length > 0) {
    console.log("");
    console.log("Today:");
    for (const b of s.byBaristaToday) {
      console.log(`  ${b.barista.padEnd(12)} ${pad(b.count, 3)}`);
    }
  }

  const failed = await listCustomers({ status: "failed" });
  if (failed.length > 0) {
    console.log("");
    console.log(`Last failures (${Math.min(5, failed.length)} of ${failed.length}):`);
    for (const c of failed.slice(0, 5)) console.log(`  ${c.email}  →  ${c.error_message ?? "(no message)"}`);
  }
  console.log("");
}

main().catch((e) => { console.error("✗ Error:", e); process.exit(1); });
