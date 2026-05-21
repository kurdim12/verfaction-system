"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Stats {
  total: number;
  pending: number;
  sent: number;
  failed: number;
  skipped: number;
  redeemed: number;
  byTier: Record<"gold" | "silver" | "bronze", { total: number; pending: number; sent: number; redeemed: number }>;
  byBaristaToday: { barista: string; count: number }[];
}

interface AuditRow {
  id: number;
  occurred_at: string;
  action: string;
  actor: string | null;
  redemption_code: string | null;
  customer_email: string | null;
  metadata: Record<string, unknown> | null;
}

interface Props { me: string; stats: Stats; audit: AuditRow[]; }

export default function AdminClient({ me, stats, audit }: Props) {
  const [filter, setFilter] = useState<string>("all");
  const redeemRate = stats.sent > 0 ? Math.round((stats.redeemed / stats.sent) * 100) : 0;
  const filtered = filter === "all" ? audit : audit.filter((a) => a.action === filter);

  return (
    <div className="min-h-screen p-4 pb-12">
      <div className="max-w-5xl mx-auto flex items-center justify-between mb-6">
        <div>
          <div className="font-heading text-lg tracking-widest text-primary">RAW SMITH</div>
          <div className="text-xs uppercase tracking-widest text-muted-foreground">Admin</div>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="secondary">{me}</Badge>
          <a href="/staff" className="text-sm text-muted-foreground hover:text-foreground">← Back to redeem</a>
        </div>
      </div>

      <div className="max-w-5xl mx-auto space-y-6">
        {/* Top stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Imported" value={stats.total} />
          <StatCard label="Sent" value={stats.sent} sub={`${stats.pending} pending, ${stats.failed} failed`} />
          <StatCard label="Redeemed" value={stats.redeemed} sub={`${redeemRate}% of sent`} />
          <StatCard label="Skipped" value={stats.skipped} />
        </div>

        {/* Progress */}
        <Card>
          <CardContent className="p-6 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="font-medium">Redemption progress</span>
              <span className="text-muted-foreground">{stats.redeemed} / {stats.sent} sent · {redeemRate}%</span>
            </div>
            <Progress value={redeemRate} />
          </CardContent>
        </Card>

        {/* Per-tier */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {(["gold", "silver", "bronze"] as const).map((t) => {
            const tt = stats.byTier[t];
            return (
              <Card key={t}>
                <CardContent className="p-6">
                  <div className={`inline-block px-3 py-1 rounded font-heading text-base tier-badge-${t}`}>
                    {t[0].toUpperCase() + t.slice(1)}
                  </div>
                  <div className="mt-4 text-3xl font-heading text-primary">{tt.redeemed} / {tt.sent}</div>
                  <div className="text-xs text-muted-foreground">redeemed of sent · {tt.total} total</div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Per-barista today */}
        {stats.byBaristaToday.length > 0 && (
          <Card>
            <CardContent className="p-6">
              <div className="text-xs uppercase tracking-widest text-muted-foreground mb-3">Redemptions today, by barista</div>
              <div className="flex flex-wrap gap-3">
                {stats.byBaristaToday.map((b) => (
                  <Badge key={b.barista} variant="outline" className="text-base px-3 py-1">
                    {b.barista} · {b.count}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Audit log */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="font-heading text-lg">Audit log</div>
                <div className="text-xs text-muted-foreground">Latest 100 actions. Append-only.</div>
              </div>
              <select
                className="border rounded px-3 py-1 text-sm bg-background"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
              >
                <option value="all">All actions</option>
                <option value="redeem">Redeem</option>
                <option value="undo_redeem">Undo</option>
                <option value="login_success">Login</option>
                <option value="login_fail">Failed login</option>
                <option value="lookup_unknown">Unknown code</option>
              </select>
            </div>
            <div className="rounded border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[160px]">When</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Actor</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 && (
                    <TableRow><TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-6">No events</TableCell></TableRow>
                  )}
                  {filtered.map((a) => (
                    <TableRow key={a.id}>
                      <TableCell className="text-xs font-mono whitespace-nowrap">{new Date(a.occurred_at).toLocaleString()}</TableCell>
                      <TableCell><ActionPill action={a.action} /></TableCell>
                      <TableCell className="text-sm">{a.actor ?? "—"}</TableCell>
                      <TableCell className="font-mono text-sm">{a.redemption_code ?? "—"}</TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-[180px] truncate">{a.customer_email ?? "—"}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {a.metadata ? Object.entries(a.metadata).map(([k, v]) => `${k}: ${String(v)}`).join(", ") : ""}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({ label, value, sub }: { label: string; value: number; sub?: string }) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="text-xs uppercase tracking-widest text-muted-foreground">{label}</div>
        <div className="text-4xl font-heading text-primary mt-2">{value}</div>
        {sub && <div className="text-xs text-muted-foreground mt-1">{sub}</div>}
      </CardContent>
    </Card>
  );
}

function ActionPill({ action }: { action: string }) {
  const color =
    action === "redeem" ? "bg-green-100 text-green-900 border-green-300" :
    action === "undo_redeem" ? "bg-yellow-100 text-yellow-900 border-yellow-300" :
    action === "login_fail" || action === "lookup_unknown" ? "bg-red-100 text-red-900 border-red-300" :
    "bg-muted text-muted-foreground border-border";
  return <span className={`inline-block px-2 py-0.5 rounded border text-xs ${color}`}>{action}</span>;
}
