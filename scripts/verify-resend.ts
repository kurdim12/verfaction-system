import fs from "node:fs";
import { getSupabase } from "../lib/supabase";

const CSV_PATH = process.argv[2] ?? "C:/Users/User/Downloads/emails-sent-1779395046851.csv";

// Properly parse a CSV row, respecting double-quoted fields (subjects contain commas).
function parseRow(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQ) {
      if (c === '"') {
        if (line[i + 1] === '"') { cur += '"'; i++; }
        else inQ = false;
      } else cur += c;
    } else {
      if (c === ',') { out.push(cur); cur = ""; }
      else if (c === '"') inQ = true;
      else cur += c;
    }
  }
  out.push(cur);
  return out;
}

async function main() {
  const csv = fs.readFileSync(CSV_PATH, "utf8");
  const lines = csv.split(/\r?\n/).filter(Boolean);
  const header = parseRow(lines[0]);
  const toIdx = header.indexOf("to");
  const statusIdx = header.indexOf("last_event");
  const sentAtIdx = header.indexOf("sent_at");

  const byEmail = new Map<string, { status: string; sent_at: string }[]>();
  for (let i = 1; i < lines.length; i++) {
    const cols = parseRow(lines[i]);
    const to = cols[toIdx]?.trim().toLowerCase();
    if (!to) continue;
    if (!byEmail.has(to)) byEmail.set(to, []);
    byEmail.get(to)!.push({ status: cols[statusIdx], sent_at: cols[sentAtIdx] });
  }

  console.log(`Resend CSV       : ${lines.length - 1} messages, ${byEmail.size} unique recipients`);

  const sb = getSupabase();
  const { data: sent } = await sb
    .from("customers")
    .select("email, first_name, last_name, membership_tier, status, redemption_code, sent_at")
    .eq("status", "sent");
  console.log(`Supabase 'sent'  : ${sent?.length ?? 0} customers`);
  console.log("");

  // Supabase says sent but Resend doesn't have it
  const missing = (sent ?? []).filter((c) => !byEmail.has(c.email.toLowerCase()));
  if (missing.length === 0) {
    console.log("✓ Every Supabase 'sent' customer has a matching Resend record.");
  } else {
    console.log("⚠ MISMATCH — Supabase says sent but no Resend record:");
    missing.forEach((c) => console.log(`  ${c.email}  (${c.first_name ?? ""} ${c.last_name ?? ""}, ${c.membership_tier}, code=${c.redemption_code})`));
  }

  // Resend has it but Supabase doesn't (probably test sends from earlier)
  const sbSet = new Set((sent ?? []).map((c) => c.email.toLowerCase()));
  const extra = [...byEmail.keys()].filter((e) => !sbSet.has(e));
  if (extra.length > 0) {
    console.log("");
    console.log("Resend records not in Supabase 'sent' (likely the 6 prior test sends to yourself):");
    extra.forEach((e) => {
      const recs = byEmail.get(e)!;
      console.log(`  ${e}  ×${recs.length}  [${[...new Set(recs.map((r) => r.status))].join(", ")}]`);
    });
  }

  // Non-delivered statuses
  console.log("");
  console.log("═══ Delivery status summary ═══");
  const statusCounts = new Map<string, number>();
  for (const recs of byEmail.values()) for (const r of recs) statusCounts.set(r.status, (statusCounts.get(r.status) ?? 0) + 1);
  for (const [s, n] of statusCounts) console.log(`  ${s.padEnd(12)} ${n}`);

  console.log("");
  console.log("═══ Anything not 'delivered' ═══");
  const issues = [...byEmail.entries()].filter(([_, recs]) => recs.some((r) => r.status !== "delivered"));
  if (issues.length === 0) console.log("  none — everything delivered");
  issues.forEach(([email, recs]) => {
    const statuses = recs.map((r) => r.status);
    console.log(`  ${email.padEnd(40)}  ${statuses.join(", ")}`);
  });
}

main().catch((e) => { console.error(e); process.exit(1); });
