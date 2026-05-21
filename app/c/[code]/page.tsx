import { findByCode } from "@/lib/repo";
import { isValidCode, normaliseCode } from "@/lib/code";
import { TIER_ENGLISH } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function ClaimPage({ params }: { params: Promise<{ code: string }> }) {
  const { code: raw } = await params;
  const code = normaliseCode(raw);
  if (!isValidCode(code)) {
    return <Shell><Message title="Invalid code" body="That code isn't a valid 4-digit redemption code. Check the link in your email." /></Shell>;
  }
  const c = await findByCode(code).catch(() => null);
  if (!c) {
    return <Shell><Message title="Code not found" body="We couldn't find that code. Please open the most recent email from Raw Smith." /></Shell>;
  }

  const redeemed = !!c.redeemed_at;

  return (
    <Shell>
      <div className="text-center space-y-1">
        <div className="text-xs uppercase tracking-[0.3em] text-[#c5b894]">A matter of coffee concept</div>
        <div className="font-serif text-3xl tracking-[0.2em] mt-2" style={{ color: "#e8ddc6" }}>RAW SMITH</div>
      </div>

      <div className="bg-white rounded p-8 space-y-6 mt-8">
        <div className="text-center">
          <div className="text-xs uppercase tracking-[0.3em] text-[#7a7464]">Hello{c.first_name ? "," : ""}</div>
          {c.first_name && <div className="font-serif text-2xl text-[#2c2823] mt-1">{c.first_name}</div>}
        </div>

        <div className="text-center">
          <div className="text-xs uppercase tracking-[0.3em] text-[#7a7464] mb-2">Your tier</div>
          <div className="font-serif text-xl text-[#6b6e3a]">{TIER_ENGLISH[c.membership_tier]} · Coffee Score {c.bonus_points}</div>
        </div>

        <div className="border-t border-dashed border-[#d4c5a3]" />

        <div className="text-center">
          <div className="text-xs uppercase tracking-[0.3em] text-[#7a7464] mb-2">Your code</div>
          <div className="font-mono text-6xl font-bold tracking-[0.3em] text-[#2c2823]">{c.redemption_code}</div>
        </div>

        {redeemed ? (
          <div className="bg-green-50 border border-green-300 rounded p-4 text-center">
            <div className="text-green-900 font-medium">✓ Already redeemed</div>
            {c.redeemed_at && (
              <div className="text-xs text-green-800 mt-1">
                {new Date(c.redeemed_at).toLocaleString()} {c.redeemed_by ? `· by ${c.redeemed_by}` : ""}
              </div>
            )}
          </div>
        ) : (
          <div className="bg-[#f8f3e6] border border-[#d4c5a3] rounded p-4 text-center">
            <div className="text-[#2c2823] font-medium">Show this screen at the counter.</div>
            <div className="text-xs text-[#7a7464] mt-1">The barista will read your 4-digit code.</div>
          </div>
        )}
      </div>

      <div className="text-center text-[10px] uppercase tracking-[0.3em] text-[#bdb293] mt-8">Amman · Jordan</div>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-start justify-center p-4 sm:p-8" style={{ background: "#6b6e3a" }}>
      <div className="w-full max-w-md py-8">{children}</div>
    </div>
  );
}

function Message({ title, body }: { title: string; body: string }) {
  return (
    <div className="bg-white rounded p-8 text-center">
      <div className="font-serif text-2xl text-[#2c2823]">{title}</div>
      <div className="text-sm text-[#7a7464] mt-3">{body}</div>
    </div>
  );
}
