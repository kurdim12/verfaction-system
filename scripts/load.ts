import fs from "node:fs";
import path from "node:path";
import Papa from "papaparse";
import { upsertCustomers, type CustomerInput } from "../lib/repo";
import { VALID_TIERS, normaliseTier } from "../lib/constants";

const ALIASES: Record<string, string> = {
  email: "email", email_address: "email", "e-mail": "email", mail: "email",
  first_name: "first_name", firstname: "first_name", first: "first_name", given_name: "first_name",
  last_name: "last_name", lastname: "last_name", last: "last_name", surname: "last_name", family_name: "last_name",
  full_name: "full_name", name: "full_name",
  current_points: "current_points", points: "current_points", balance: "current_points",
  membership_tier: "membership_tier", tier: "membership_tier", level: "membership_tier", membership: "membership_tier",
  visits: "visits", visit_count: "visits", num_visits: "visits",
};

function normaliseHeader(raw: string): string {
  const key = raw.trim().toLowerCase().replace(/[\s\-]+/g, "_");
  return ALIASES[key] ?? key;
}

function splitName(full: string | null | undefined): { first: string | null; last: string | null } {
  const v = (full ?? "").trim();
  if (!v) return { first: null, last: null };
  const parts = v.split(/\s+/);
  return { first: parts[0], last: parts.slice(1).join(" ") || null };
}

function num(v: unknown): number {
  const n = Number(((v as string) ?? "").toString().replace(/,/g, "").trim());
  return Number.isFinite(n) ? n : 0;
}

async function main() {
  const csvPath = process.argv[2];
  if (!csvPath) {
    console.error("Usage: pnpm load <path-to-csv>");
    process.exit(1);
  }
  const abs = path.resolve(csvPath);
  if (!fs.existsSync(abs)) {
    console.error(`✗ File not found: ${abs}`);
    process.exit(1);
  }

  const csvText = fs.readFileSync(abs, "utf8");
  const parsed = Papa.parse<Record<string, string>>(csvText, {
    header: true,
    skipEmptyLines: true,
    transformHeader: normaliseHeader,
  });

  console.log(`Detected columns: ${(parsed.meta.fields ?? []).join(", ")}`);
  console.log(`Parsed ${parsed.data.length} data rows from ${path.basename(abs)}`);

  const rows: CustomerInput[] = parsed.data.map((r) => {
    const fromFull = splitName(r.full_name);
    const tier = r.membership_tier ? normaliseTier(r.membership_tier) : "bronze";
    return {
      email: r.email ?? "",
      first_name: r.first_name?.trim() || fromFull.first,
      last_name: r.last_name?.trim() || fromFull.last,
      current_points: num(r.current_points),
      membership_tier: tier,
      visits: num(r.visits),
    };
  });

  console.log("\nPushing to Supabase (this may take 30–60s for 150 rows due to per-row uniqueness checks)…");
  const result = await upsertCustomers(rows);
  console.log(`\n✓ Inserted ${result.inserted} new`);
  console.log(`✓ Updated  ${result.updated} existing pending`);
  if (result.invalid.length > 0) {
    console.log(`✗ Skipped  ${result.invalid.length} invalid:`);
    result.invalid.slice(0, 10).forEach((i) => console.log(`  - ${i.email}: ${i.reason}`));
    if (result.invalid.length > 10) console.log(`  …and ${result.invalid.length - 10} more`);
  }

  const dist: Record<string, number> = { gold: 0, silver: 0, bronze: 0 };
  rows.forEach((r) => { if ((VALID_TIERS as readonly string[]).includes(r.membership_tier)) dist[r.membership_tier]++; });
  console.log(`\nTier distribution: gold ${dist.gold}, silver ${dist.silver}, bronze ${dist.bronze}`);
}

main().catch((e) => {
  console.error("✗ Error:", e);
  process.exit(1);
});
