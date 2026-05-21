import {
  TIER_BONUS,
  TIER_ARABIC,
  TIER_ENGLISH,
  normaliseTier,
  type Tier,
} from "./constants";

export interface BuildEmailInput {
  firstName: string | null | undefined;
  tier: Tier | string;
  code: string;
  points?: number;
  siteUrl?: string; // e.g. https://verfaction-system.vercel.app
}

export interface BuildEmailOutput {
  subject: string;
  html: string;
  text: string;
}

const ARABIC_FALLBACK_NAME = "عميلنا الكريم";
const ENGLISH_FALLBACK_NAME = "valued customer";

function pickName(firstName: string | null | undefined): { ar: string; en: string } {
  const trimmed = (firstName ?? "").trim();
  if (!trimmed) return { ar: ARABIC_FALLBACK_NAME, en: ENGLISH_FALLBACK_NAME };
  return { ar: trimmed, en: trimmed };
}

const DROPLET_SVG = `<svg width="48" height="64" viewBox="0 0 48 64" xmlns="http://www.w3.org/2000/svg" style="display:block;margin:0 auto;" aria-label="Raw Smith"><path d="M24 4 C 24 4, 4 26, 4 40 A 20 20 0 0 1 44 40 C 44 26, 24 4, 24 4 Z" fill="#e8ddc6"/></svg>`;

export function buildEmail(input: BuildEmailInput): BuildEmailOutput {
  const tier = normaliseTier(input.tier as string);
  const points = input.points ?? TIER_BONUS[tier];
  const name = pickName(input.firstName);
  const code = input.code.trim();
  const tierEnglish = TIER_ENGLISH[tier];
  const tierArabic = TIER_ARABIC[tier];
  const claimUrl = input.siteUrl ? `${input.siteUrl.replace(/\/$/, "")}/c/${encodeURIComponent(code)}` : null;

  const subject = `${name.ar}، تحديث من Raw Smith | ${name.en}, an update from Raw Smith`;

  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Raw Smith</title>
</head>
<body style="margin:0;padding:0;background:#f1ead7;font-family:Georgia,'Times New Roman',serif;color:#2c2823;line-height:1.75;-webkit-font-smoothing:antialiased;">

<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f1ead7;">
  <tr>
    <td align="center" style="padding:32px 16px;">

      <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="max-width:600px;background:#ffffff;">

        <!-- Olive header -->
        <tr>
          <td style="background:#6b6e3a;padding:56px 32px 44px;text-align:center;" align="center">
            ${DROPLET_SVG}
            <div style="font-family:Georgia,'Times New Roman',serif;font-size:32px;letter-spacing:0.20em;color:#e8ddc6;font-weight:400;line-height:1;margin-top:22px;">RAW SMITH</div>
            <div style="font-family:Georgia,serif;font-size:10px;letter-spacing:0.32em;color:#c5b894;margin-top:14px;text-transform:uppercase;font-style:italic;">A matter of coffee concept</div>
          </td>
        </tr>

        <!-- ENGLISH -->
        <tr>
          <td dir="ltr" style="padding:48px 48px 32px;font-family:'Segoe UI','Helvetica',Arial,sans-serif;text-align:left;color:#2c2823;line-height:1.8;font-size:15px;">
            <p style="margin:0 0 18px;">Hello ${name.en},</p>
            <p style="margin:0 0 18px;">Raw Smith's current loyalty system will be discontinued starting tomorrow, as we transition to our new system.</p>
            <p style="margin:0 0 8px;">As a thank-you for your loyalty, you can claim one complimentary cup of coffee based on your <strong>${tierEnglish}</strong> membership.</p>

            <!-- Ticket card (English) -->
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:24px 0;">
              <tr>
                <td style="background:#f8f3e6;border:1px solid #d4c5a3;padding:30px 28px;text-align:center;">
                  <div style="font-size:10px;color:#7a7464;letter-spacing:0.26em;text-transform:uppercase;margin-bottom:6px;">Your tier</div>
                  <div style="font-family:Georgia,'Times New Roman',serif;font-size:24px;color:#6b6e3a;letter-spacing:0.04em;font-weight:400;">${tierEnglish} &middot; Coffee Score ${points}</div>
                  <div style="border-top:1px dashed #d4c5a3;margin:22px auto 22px;width:60%;font-size:0;line-height:0;">&nbsp;</div>
                  <div style="font-size:10px;color:#7a7464;letter-spacing:0.26em;text-transform:uppercase;margin-bottom:8px;">Your code</div>
                  <div style="font-family:'SF Mono',Consolas,'Courier New',monospace;font-size:42px;color:#2c2823;letter-spacing:0.36em;font-weight:700;">${code}</div>
                  <div style="font-size:11px;color:#7a7464;margin-top:14px;font-style:italic;">Read this 4-digit code to your barista</div>
                </td>
              </tr>
            </table>

            ${claimUrl ? `<p style="margin:0 0 18px;text-align:center;"><a href="${claimUrl}" style="display:inline-block;background:#6b6e3a;color:#e8ddc6;padding:14px 28px;text-decoration:none;font-family:Georgia,serif;letter-spacing:0.12em;font-size:13px;text-transform:uppercase;">Open your code at the counter →</a></p>` : ""}

            <p style="margin:18px 0 18px;">Visit our <strong>only branch</strong> and read the code above to your barista.</p>
            <p style="margin:0 0 18px;"><strong>Claim deadline:</strong> within 30 days from the date of this message.</p>
            <p style="margin:24px 0 0;">Thank you for your trust,<br><span style="color:#6b6e3a;">The Raw Smith Team</span></p>
          </td>
        </tr>

        <!-- Divider -->
        <tr>
          <td style="padding:0 48px;">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
              <tr><td style="border-top:1px solid #e0d4b5;font-size:0;line-height:0;height:1px;">&nbsp;</td></tr>
            </table>
          </td>
        </tr>

        <!-- ARABIC -->
        <tr>
          <td dir="rtl" style="padding:32px 48px 56px;font-family:'Segoe UI','Tahoma',sans-serif;text-align:right;color:#2c2823;line-height:1.85;font-size:15px;">
            <p style="margin:0 0 18px;">مرحباً ${name.ar}،</p>
            <p style="margin:0 0 18px;">نود إعلامكم بأن نظام الولاء الحالي في <strong style="color:#6b6e3a;">Raw Smith</strong> سيتم إيقافه اعتباراً من الغد، استعداداً للانتقال إلى النظام الجديد.</p>
            <p style="margin:0 0 8px;">كتقدير لولائكم، يمكنكم استلام كوب قهوة مجاني وفقاً لفئة عضويتكم <strong>${tierEnglish}</strong>.</p>

            <!-- Ticket card (Arabic) -->
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:24px 0;">
              <tr>
                <td style="background:#f8f3e6;border:1px solid #d4c5a3;padding:30px 28px;text-align:center;">
                  <div style="font-size:11px;color:#7a7464;letter-spacing:0.18em;margin-bottom:6px;">فئة عضويتكم</div>
                  <div style="font-family:Georgia,'Times New Roman',serif;font-size:24px;color:#6b6e3a;letter-spacing:0.04em;font-weight:400;direction:ltr;">${tierEnglish} &middot; Coffee Score ${points}</div>
                  <div style="border-top:1px dashed #d4c5a3;margin:22px auto 22px;width:60%;font-size:0;line-height:0;">&nbsp;</div>
                  <div style="font-size:11px;color:#7a7464;letter-spacing:0.18em;margin-bottom:8px;">رمز الاستلام</div>
                  <div style="font-family:'SF Mono',Consolas,'Courier New',monospace;font-size:42px;color:#2c2823;letter-spacing:0.36em;font-weight:700;direction:ltr;">${code}</div>
                  <div style="font-size:12px;color:#7a7464;margin-top:14px;">اقرأوا هذا الرمز (4 أرقام) لباريستا</div>
                </td>
              </tr>
            </table>

            ${claimUrl ? `<p style="margin:0 0 18px;text-align:center;"><a href="${claimUrl}" style="display:inline-block;background:#6b6e3a;color:#e8ddc6;padding:14px 28px;text-decoration:none;font-family:Georgia,serif;letter-spacing:0.12em;font-size:13px;text-transform:uppercase;">افتح رمزك عند الكاشير ←</a></p>` : ""}

            <p style="margin:18px 0 18px;">يرجى زيارة <strong>فرعنا الوحيد</strong> وقراءة الرمز أعلاه للباريستا.</p>
            <p style="margin:0 0 18px;"><strong>آخر موعد للاستلام:</strong> خلال 30 يوماً من تاريخ هذه الرسالة.</p>
            <p style="margin:24px 0 0;">شكراً لثقتكم،<br><span style="color:#6b6e3a;">فريق Raw Smith</span></p>
          </td>
        </tr>

        <!-- Olive footer -->
        <tr>
          <td style="background:#6b6e3a;padding:28px;text-align:center;" align="center">
            <div style="font-family:Georgia,serif;font-size:11px;color:#bdb293;letter-spacing:0.22em;text-transform:uppercase;">Amman &middot; Jordan</div>
            <div style="font-family:Georgia,serif;font-size:11px;color:#a8a182;margin-top:10px;font-style:italic;letter-spacing:0.04em;">A matter of coffee concept</div>
          </td>
        </tr>

      </table>

      <div style="font-size:11px;color:#7a7464;margin-top:18px;line-height:1.5;max-width:560px;font-family:'Segoe UI',sans-serif;">
        You're receiving this because you're a member of Raw Smith Circle.<br>
        Your unique code <strong>${code}</strong> is good for one complimentary coffee.
      </div>
    </td>
  </tr>
</table>

</body>
</html>`;

  const text = [
    `Hello ${name.en},`,
    "",
    "Raw Smith's current loyalty system will be discontinued starting tomorrow.",
    `Your reward: ${tierEnglish} · Coffee Score ${points}`,
    `Your code: ${code}`,
    claimUrl ? `Open your code: ${claimUrl}` : "",
    "Visit our only branch and read the code to your barista. Valid for 30 days.",
    "",
    "Thank you for your trust,",
    "The Raw Smith Team",
    "",
    "—",
    "",
    `مرحباً ${name.ar}،`,
    "",
    "نظام الولاء الحالي في Raw Smith سيتم إيقافه اعتباراً من الغد.",
    `فئتكم: ${tierEnglish} (${tierArabic}) · Coffee Score ${points}`,
    `رمزكم: ${code}`,
    "للاستلام، يرجى زيارة فرعنا الوحيد وقراءة الرمز للباريستا. ساري لمدة 30 يوماً.",
    "",
    "شكراً لثقتكم،",
    "فريق Raw Smith",
    "A matter of coffee concept",
  ].filter(Boolean).join("\n");

  return { subject, html, text };
}
