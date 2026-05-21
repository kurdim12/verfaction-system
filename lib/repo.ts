import { getSupabase } from "./supabase";
export { getSupabase };
import { generateCode } from "./code";
import { bonusFor, normaliseTier, type Tier } from "./constants";

export type Status = "pending" | "sent" | "failed" | "skipped";

export interface CustomerRow {
  email: string;
  first_name: string | null;
  last_name: string | null;
  current_points: number;
  membership_tier: Tier;
  visits: number;
  bonus_points: number;
  redemption_code: string;
  redeemed_at: string | null;
  redeemed_by: string | null;
  status: Status;
  resend_id: string | null;
  error_message: string | null;
  sent_at: string | null;
  imported_at: string;
}

export interface CustomerInput {
  email: string;
  first_name?: string | null;
  last_name?: string | null;
  current_points?: number;
  membership_tier: string;
  visits?: number;
}

export interface ImportResult {
  inserted: number;
  updated: number;
  invalid: { email: string; reason: string }[];
}

/** Mint a 4-digit code that isn't already in use. */
async function uniqueCode(): Promise<string> {
  const sb = getSupabase();
  for (let i = 0; i < 100; i++) {
    const candidate = generateCode();
    const { data, error } = await sb
      .from("customers")
      .select("redemption_code")
      .eq("redemption_code", candidate)
      .maybeSingle();
    if (error) throw error;
    if (!data) return candidate;
  }
  throw new Error("Unable to mint unique 4-digit code (10k space exhausted?)");
}

export async function upsertCustomers(rows: CustomerInput[]): Promise<ImportResult> {
  const sb = getSupabase();
  let inserted = 0;
  let updated = 0;
  const invalid: ImportResult["invalid"] = [];

  for (const raw of rows) {
    const email = (raw.email ?? "").trim().toLowerCase();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      invalid.push({ email: raw.email ?? "(empty)", reason: "invalid email" });
      continue;
    }
    const tier = normaliseTier(raw.membership_tier);

    const { data: existing } = await sb
      .from("customers")
      .select("email, status, redemption_code")
      .eq("email", email)
      .maybeSingle();

    if (existing) {
      if (existing.status !== "pending") continue; // never overwrite sent/failed/skipped
      const { error } = await sb
        .from("customers")
        .update({
          first_name: raw.first_name?.trim() || null,
          last_name: raw.last_name?.trim() || null,
          current_points: Number(raw.current_points) || 0,
          membership_tier: tier,
          visits: Number(raw.visits) || 0,
          bonus_points: bonusFor(tier),
        })
        .eq("email", email);
      if (error) {
        invalid.push({ email, reason: error.message });
        continue;
      }
      updated++;
    } else {
      const code = await uniqueCode();
      const { error } = await sb.from("customers").insert({
        email,
        first_name: raw.first_name?.trim() || null,
        last_name: raw.last_name?.trim() || null,
        current_points: Number(raw.current_points) || 0,
        membership_tier: tier,
        visits: Number(raw.visits) || 0,
        bonus_points: bonusFor(tier),
        redemption_code: code,
      });
      if (error) {
        invalid.push({ email, reason: error.message });
        continue;
      }
      inserted++;
    }
  }

  return { inserted, updated, invalid };
}

export async function findByCode(code: string): Promise<CustomerRow | null> {
  const { data, error } = await getSupabase()
    .from("customers")
    .select("*")
    .eq("redemption_code", code.trim())
    .maybeSingle();
  if (error) throw error;
  return (data as CustomerRow) ?? null;
}

export async function findByEmail(email: string): Promise<CustomerRow | null> {
  const { data, error } = await getSupabase()
    .from("customers")
    .select("*")
    .eq("email", email.trim().toLowerCase())
    .maybeSingle();
  if (error) throw error;
  return (data as CustomerRow) ?? null;
}

export async function searchCustomers(query: string, limit = 10): Promise<CustomerRow[]> {
  const q = `%${query.trim().toLowerCase()}%`;
  const { data, error } = await getSupabase()
    .from("customers")
    .select("*")
    .or(`email.ilike.${q},first_name.ilike.${q},last_name.ilike.${q},redemption_code.ilike.${q}`)
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as CustomerRow[];
}

export async function markRedeemed(code: string, by: string): Promise<CustomerRow | null> {
  const sb = getSupabase();
  const current = await findByCode(code);
  if (!current) return null;
  if (current.redeemed_at) return current; // already redeemed; idempotent
  const { error } = await sb
    .from("customers")
    .update({ redeemed_at: new Date().toISOString(), redeemed_by: by })
    .eq("redemption_code", code);
  if (error) throw error;
  return findByCode(code);
}

export async function unredeem(code: string): Promise<CustomerRow | null> {
  const { error } = await getSupabase()
    .from("customers")
    .update({ redeemed_at: null, redeemed_by: null })
    .eq("redemption_code", code);
  if (error) throw error;
  return findByCode(code);
}

export async function markSent(email: string, resendId: string): Promise<void> {
  const { error } = await getSupabase()
    .from("customers")
    .update({
      status: "sent",
      resend_id: resendId,
      error_message: null,
      sent_at: new Date().toISOString(),
    })
    .eq("email", email.trim().toLowerCase());
  if (error) throw error;
}

export async function markFailed(email: string, message: string): Promise<void> {
  const { error } = await getSupabase()
    .from("customers")
    .update({
      status: "failed",
      error_message: message.slice(0, 500),
      sent_at: new Date().toISOString(),
    })
    .eq("email", email.trim().toLowerCase());
  if (error) throw error;
}

export async function markSkipped(email: string): Promise<void> {
  const { error } = await getSupabase()
    .from("customers")
    .update({ status: "skipped" })
    .eq("email", email.trim().toLowerCase());
  if (error) throw error;
}

export async function unskip(email: string): Promise<void> {
  const { error } = await getSupabase()
    .from("customers")
    .update({ status: "pending" })
    .eq("email", email.trim().toLowerCase())
    .eq("status", "skipped");
  if (error) throw error;
}

export interface Stats {
  total: number;
  pending: number;
  sent: number;
  failed: number;
  skipped: number;
  redeemed: number;
  byTier: Record<Tier, { total: number; pending: number; sent: number; redeemed: number }>;
  byBaristaToday: { barista: string; count: number }[];
}

export async function getStats(): Promise<Stats> {
  const sb = getSupabase();
  const { data: rows, error } = await sb
    .from("customers")
    .select("status, membership_tier, redeemed_at, redeemed_by");
  if (error) throw error;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayIso = today.toISOString();

  const s: Stats = {
    total: 0,
    pending: 0,
    sent: 0,
    failed: 0,
    skipped: 0,
    redeemed: 0,
    byTier: {
      gold: { total: 0, pending: 0, sent: 0, redeemed: 0 },
      silver: { total: 0, pending: 0, sent: 0, redeemed: 0 },
      bronze: { total: 0, pending: 0, sent: 0, redeemed: 0 },
    },
    byBaristaToday: [],
  };
  const baristaCounts = new Map<string, number>();

  for (const r of (rows ?? []) as Pick<CustomerRow, "status" | "membership_tier" | "redeemed_at" | "redeemed_by">[]) {
    s.total++;
    s[r.status as keyof Stats["byTier"]["gold"] as never];
    if (r.status === "pending") s.pending++;
    if (r.status === "sent") s.sent++;
    if (r.status === "failed") s.failed++;
    if (r.status === "skipped") s.skipped++;
    if (r.redeemed_at) s.redeemed++;

    const t = s.byTier[r.membership_tier];
    if (t) {
      t.total++;
      if (r.status === "pending") t.pending++;
      if (r.status === "sent") t.sent++;
      if (r.redeemed_at) t.redeemed++;
    }
    if (r.redeemed_at && r.redeemed_by && r.redeemed_at >= todayIso) {
      baristaCounts.set(r.redeemed_by, (baristaCounts.get(r.redeemed_by) ?? 0) + 1);
    }
  }
  s.byBaristaToday = [...baristaCounts.entries()]
    .map(([barista, count]) => ({ barista, count }))
    .sort((a, b) => b.count - a.count);
  return s;
}

export async function listCustomers(filters: { status?: Status; tier?: Tier; redeemed?: boolean } = {}): Promise<CustomerRow[]> {
  let q = getSupabase().from("customers").select("*").order("imported_at", { ascending: false });
  if (filters.status) q = q.eq("status", filters.status);
  if (filters.tier) q = q.eq("membership_tier", filters.tier);
  if (filters.redeemed === true) q = q.not("redeemed_at", "is", null);
  if (filters.redeemed === false) q = q.is("redeemed_at", null);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as CustomerRow[];
}

// ─── Staff ──────────────────────────────────────────────────────────

export interface StaffRow {
  id: number;
  name: string;
  pin: string;
  active: boolean;
}

export async function getActiveStaff(): Promise<StaffRow[]> {
  const { data, error } = await getSupabase()
    .from("staff")
    .select("*")
    .eq("active", true)
    .order("name");
  if (error) throw error;
  return (data ?? []) as StaffRow[];
}

export async function verifyStaffPin(name: string, pin: string): Promise<StaffRow | null> {
  const { data, error } = await getSupabase()
    .from("staff")
    .select("*")
    .eq("name", name)
    .eq("active", true)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const row = data as StaffRow;
  return row.pin === pin ? row : null;
}

// ─── Audit log ──────────────────────────────────────────────────────

export interface AuditEntry {
  action: string;
  actor: string | null;
  redemption_code?: string | null;
  customer_email?: string | null;
  metadata?: Record<string, unknown>;
  ip_address?: string | null;
}

export async function logAudit(entry: AuditEntry): Promise<void> {
  await getSupabase().from("audit_log").insert({
    action: entry.action,
    actor: entry.actor,
    redemption_code: entry.redemption_code ?? null,
    customer_email: entry.customer_email ?? null,
    metadata: entry.metadata ?? null,
    ip_address: entry.ip_address ?? null,
  });
}

export interface AuditRow {
  id: number;
  occurred_at: string;
  action: string;
  actor: string | null;
  redemption_code: string | null;
  customer_email: string | null;
  metadata: Record<string, unknown> | null;
  ip_address: string | null;
}

export async function listAudit(limit = 100, filter?: { actor?: string; action?: string }): Promise<AuditRow[]> {
  let q = getSupabase().from("audit_log").select("*").order("occurred_at", { ascending: false }).limit(limit);
  if (filter?.actor) q = q.eq("actor", filter.actor);
  if (filter?.action) q = q.eq("action", filter.action);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as AuditRow[];
}
