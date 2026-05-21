import { Resend } from "resend";
import { buildEmail } from "../lib/email-template";

async function main() {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.FROM_EMAIL;
  const replyTo = process.env.REPLY_TO;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  const to = process.argv[2] ?? "abdalrhmankurdi12@gmail.com";

  if (!apiKey || apiKey === "re_xxxxx") { console.error("✗ RESEND_API_KEY missing"); process.exit(1); }
  if (!from) { console.error("✗ FROM_EMAIL missing"); process.exit(1); }

  // Random 4-digit code just for the test email
  const code = String(Math.floor(1000 + Math.random() * 9000));
  const { subject, html, text } = buildEmail({
    firstName: "Abdelrahman",
    tier: "gold",
    points: 89,
    code,
    siteUrl,
  });

  console.log(`From:     ${from}`);
  console.log(`Reply-To: ${replyTo ?? "(none)"}`);
  console.log(`To:       ${to}`);
  console.log(`Subject:  ${subject}`);
  console.log(`Code:     ${code}${siteUrl ? `   (claim URL: ${siteUrl.replace(/\/$/, "")}/c/${code})` : ""}`);
  console.log("");

  const resend = new Resend(apiKey);
  const result = await resend.emails.send({ from, to, ...(replyTo ? { replyTo } : {}), subject, html, text });
  if (result.error) {
    console.error("\n✗ Resend rejected:");
    console.error(JSON.stringify(result.error, null, 2));
    process.exit(1);
  }
  console.log(`✓ Sent. Resend ID: ${result.data?.id}`);
}

main().catch((e) => { console.error("✗ Error:", e); process.exit(1); });
