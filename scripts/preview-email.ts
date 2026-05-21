import fs from "node:fs";
import path from "node:path";
import { buildEmail } from "../lib/email-template";
import { TIER_BONUS } from "../lib/constants";

const OUT_DIR = path.join(process.cwd(), "email-preview");
fs.mkdirSync(OUT_DIR, { recursive: true });

interface Sample {
  slug: string;
  label: string;
  input: Parameters<typeof buildEmail>[0];
}

const samples: Sample[] = [
  {
    slug: "gold-ahmad",
    label: "Gold — Ahmad",
    input: { firstName: "Ahmad", tier: "gold", points: TIER_BONUS.gold, code: "RS-AHMAD7" },
  },
  {
    slug: "silver-layan",
    label: "Silver — Layan",
    input: { firstName: "Layan", tier: "silver", points: TIER_BONUS.silver, code: "RS-LAYAN3" },
  },
  {
    slug: "bronze-noor",
    label: "Bronze — Noor",
    input: { firstName: "Noor", tier: "bronze", points: TIER_BONUS.bronze, code: "RS-NOOR94" },
  },
  {
    slug: "empty-name",
    label: "Empty firstName (fallback)",
    input: { firstName: "", tier: "gold", points: TIER_BONUS.gold, code: "RS-DEMO01" },
  },
  {
    slug: "founder-test",
    label: "Founder test (Abdelrahman, gold)",
    input: { firstName: "Abdelrahman", tier: "gold", points: TIER_BONUS.gold, code: "RS-FOUND4" },
  },
];

const links: { slug: string; label: string; subject: string }[] = [];

for (const s of samples) {
  const { subject, html, text } = buildEmail(s.input);
  fs.writeFileSync(path.join(OUT_DIR, `${s.slug}.html`), html, "utf8");
  fs.writeFileSync(path.join(OUT_DIR, `${s.slug}.txt`), text, "utf8");
  links.push({ slug: s.slug, label: s.label, subject });
  console.log(`✓ ${s.label}`);
  console.log(`  subject: ${subject}`);
  console.log(`  → email-preview/${s.slug}.html`);
}

const index = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Raw Smith — Email Previews</title>
  <style>
    body { font-family: -apple-system, system-ui, Segoe UI, sans-serif; max-width: 720px; margin: 40px auto; padding: 20px; color: #2c2c2c; background: #faf7f2; }
    h1 { color: #6b4423; }
    ul { list-style: none; padding: 0; }
    li { padding: 16px 20px; background: white; border-radius: 8px; margin-bottom: 12px; border: 1px solid #e8dcc4; }
    a { color: #6b4423; text-decoration: none; font-weight: 600; }
    a:hover { text-decoration: underline; }
    .subject { display: block; font-family: ui-monospace, monospace; font-size: 13px; color: #666; margin-top: 6px; word-break: break-word; }
  </style>
</head>
<body>
  <h1>Raw Smith — Email Previews</h1>
  <p>Click any sample to inspect rendered HTML. Open the <code>.html</code> file directly in any browser.</p>
  <ul>
    ${links
      .map(
        (l) =>
          `<li><a href="${l.slug}.html">${l.label}</a><span class="subject">${l.subject.replace(/</g, "&lt;")}</span></li>`,
      )
      .join("\n    ")}
  </ul>
</body>
</html>`;

fs.writeFileSync(path.join(OUT_DIR, "index.html"), index, "utf8");
console.log(`\nIndex: ${path.relative(process.cwd(), path.join(OUT_DIR, "index.html"))}`);
