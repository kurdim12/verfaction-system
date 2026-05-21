import { findByCode, markRedeemed, unredeem, logAudit } from "../lib/repo";
import { isValidCode, normaliseCode } from "../lib/code";

async function main() {
  const raw = process.argv[2];
  const flag = process.argv[3];
  if (!raw) {
    console.error("Usage: pnpm redeem <code>          # mark redeemed (CLI uses 'cli' as actor)");
    console.error("       pnpm redeem <code> --undo   # un-redeem");
    console.error("       pnpm redeem <code> --check  # show status only");
    process.exit(1);
  }
  const code = normaliseCode(raw);
  if (!isValidCode(code)) {
    console.error(`✗ Invalid code format. Expected 4 digits. Got: ${code}`);
    process.exit(1);
  }
  const existing = await findByCode(code);
  if (!existing) { console.error(`✗ Code not found: ${code}`); process.exit(1); }
  const fullName = [existing.first_name, existing.last_name].filter(Boolean).join(" ") || "(no name)";

  if (flag === "--check") {
    console.log(`\nCode:       ${existing.redemption_code}`);
    console.log(`Customer:   ${fullName}`);
    console.log(`Email:      ${existing.email}`);
    console.log(`Tier:       ${existing.membership_tier}  (Coffee Score ${existing.bonus_points})`);
    console.log(`Sent:       ${existing.sent_at ?? "(not sent)"}`);
    console.log(`Redeemed:   ${existing.redeemed_at ?? "(NO)"}`);
    if (existing.redeemed_by) console.log(`Redeemed by: ${existing.redeemed_by}`);
    return;
  }

  if (flag === "--undo") {
    if (!existing.redeemed_at) { console.log(`⚠ ${code} was not redeemed`); return; }
    await unredeem(code);
    await logAudit({ action: "undo_redeem", actor: "cli", redemption_code: code, customer_email: existing.email, metadata: { reason: "cli undo" } });
    console.log(`✓ Un-redeemed ${code}`);
    return;
  }

  if (existing.redeemed_at) {
    console.log(`⚠ Already redeemed at ${existing.redeemed_at} by ${existing.redeemed_by ?? "(unknown)"}`);
    return;
  }
  const updated = await markRedeemed(code, "cli");
  await logAudit({ action: "redeem", actor: "cli", redemption_code: code, customer_email: existing.email });
  console.log(`✓ Redeemed ${code}  (${fullName}, ${existing.membership_tier})  at ${updated?.redeemed_at}`);
}

main().catch((e) => { console.error("✗ Error:", e); process.exit(1); });
