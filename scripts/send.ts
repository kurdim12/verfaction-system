import readline from "node:readline";
import fs from "node:fs";
import path from "node:path";
import { Resend } from "resend";
import { buildEmail } from "../lib/email-template";
import { listCustomers, markSent, markFailed, getSupabase, type CustomerRow } from "../lib/repo";
import { VALID_TIERS, type Tier } from "../lib/constants";

interface Args {
  dryRun: boolean;
  limit?: number;
  tier?: Tier;
  yes: boolean;
  retryFailed: boolean;
  onlyEmail?: string;
}

function parseArgs(argv: string[]): Args {
  const args: Args = { dryRun: false, yes: false, retryFailed: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--dry-run") args.dryRun = true;
    else if (a === "--yes" || a === "-y") args.yes = true;
    else if (a === "--retry-failed") args.retryFailed = true;
    else if (a === "--limit") args.limit = parseInt(argv[++i], 10);
    else if (a === "--tier") {
      const t = argv[++i] as Tier;
      if (!(VALID_TIERS as readonly string[]).includes(t)) {
        console.error(`✗ Invalid --tier "${t}". Use one of: ${VALID_TIERS.join(", ")}`);
        process.exit(1);
      }
      args.tier = t;
    } else if (a === "--only") args.onlyEmail = argv[++i];
    else {
      console.error(`✗ Unknown arg: ${a}`);
      process.exit(1);
    }
  }
  return args;
}

function confirm(question: string): Promise<string> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => rl.question(question, (ans) => { rl.close(); resolve(ans.trim()); }));
}
const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

async function recipientsFor(args: Args): Promise<CustomerRow[]> {
  if (args.onlyEmail) {
    const sb = getSupabase();
    const { data } = await sb.from("customers").select("*").eq("email", args.onlyEmail.trim().toLowerCase());
    return (data ?? []) as CustomerRow[];
  }
  if (args.retryFailed) {
    // reset failed → pending so loop picks them up
    const sb = getSupabase();
    let q = sb.from("customers").update({ status: "pending", error_message: null }).eq("status", "failed");
    if (args.tier) q = q.eq("membership_tier", args.tier);
    await q;
  }
  const pending = await listCustomers({ status: "pending", tier: args.tier });
  return args.limit ? pending.slice(0, args.limit) : pending;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.FROM_EMAIL;
  const replyTo = process.env.REPLY_TO;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (!args.dryRun) {
    if (!apiKey || apiKey === "re_xxxxx") { console.error("✗ RESEND_API_KEY missing"); process.exit(1); }
    if (!from) { console.error("✗ FROM_EMAIL missing"); process.exit(1); }
  }

  const recipients = await recipientsFor(args);
  if (recipients.length === 0) {
    const sent = await listCustomers({ status: "sent" });
    const total = await listCustomers();
    console.log(`Nothing to do. ${sent.length}/${total.length} already sent.`);
    return;
  }

  console.log("");
  console.log(`Mode:        ${args.dryRun ? "DRY-RUN (writes to dry-run/, no Resend calls)" : "LIVE SEND"}`);
  console.log(`Recipients:  ${recipients.length}`);
  if (args.tier) console.log(`Tier:        ${args.tier}`);
  if (args.limit) console.log(`Limit:       ${args.limit}`);
  if (!args.dryRun) {
    console.log(`From:        ${from}`);
    console.log(`Reply-To:    ${replyTo ?? "(none)"}`);
    console.log(`Site URL:    ${siteUrl ?? "(no claim link in email — set NEXT_PUBLIC_SITE_URL to add)"}`);
  }
  console.log("");

  if (!args.dryRun && !args.yes) {
    const ans = await confirm(`Type SEND (uppercase, exactly) to confirm: `);
    if (ans !== "SEND") { console.log("Aborted."); process.exit(0); }
  }

  const resend = args.dryRun ? null : new Resend(apiKey!);
  const dryDir = path.join(process.cwd(), "dry-run");
  if (args.dryRun) fs.mkdirSync(dryDir, { recursive: true });

  let ok = 0, fail = 0;
  const start = Date.now();
  for (let i = 0; i < recipients.length; i++) {
    const c = recipients[i];
    const idx = `[${String(i + 1).padStart(String(recipients.length).length)}/${recipients.length}]`;
    const { subject, html, text } = buildEmail({
      firstName: c.first_name,
      tier: c.membership_tier,
      points: c.bonus_points,
      code: c.redemption_code,
      siteUrl,
    });
    if (args.dryRun) {
      fs.writeFileSync(path.join(dryDir, c.email.replace(/[^a-z0-9._-]/gi, "_") + ".html"), html, "utf8");
      console.log(`${idx} dry  ${c.email.padEnd(38)} ${c.membership_tier.padEnd(6)} ${c.redemption_code}`);
      ok++; continue;
    }
    try {
      const result = await resend!.emails.send({ from: from!, to: c.email, ...(replyTo ? { replyTo } : {}), subject, html, text });
      if (result.error) {
        const msg = result.error.message ?? JSON.stringify(result.error);
        await markFailed(c.email, msg);
        console.log(`${idx} FAIL ${c.email.padEnd(38)} ${msg}`);
        fail++;
        if (/domain|verified/i.test(msg)) {
          console.error("\n✗ Domain not verified. Aborting.");
          process.exit(1);
        }
      } else {
        await markSent(c.email, result.data?.id ?? "");
        console.log(`${idx} ✓    ${c.email.padEnd(38)} ${c.membership_tier.padEnd(6)} ${c.redemption_code}  →  ${(result.data?.id ?? "").slice(0, 8)}`);
        ok++;
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      await markFailed(c.email, msg);
      console.log(`${idx} FAIL ${c.email.padEnd(38)} ${msg}`);
      fail++;
    }
    if (i < recipients.length - 1) await sleep(500);
  }

  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  console.log(`\nDone in ${elapsed}s — ${ok} ok, ${fail} failed`);
  if (fail > 0 && !args.dryRun) console.log("Re-run with --retry-failed to retry failures.");
  if (args.dryRun) console.log(`Dry-run HTML at ${path.relative(process.cwd(), dryDir)}/`);
}

main().catch((e) => { console.error("✗ Unexpected error:", e); process.exit(1); });
