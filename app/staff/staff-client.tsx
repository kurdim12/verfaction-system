"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface Customer {
  email: string;
  first_name: string | null;
  last_name: string | null;
  membership_tier: "gold" | "silver" | "bronze";
  bonus_points: number;
  redemption_code: string;
  redeemed_at: string | null;
  redeemed_by: string | null;
  status: string;
}

interface Props {
  initialMe: string | null;
  staffNames: string[];
}

const TIER_LABEL = { gold: "Gold", silver: "Silver", bronze: "Bronze" } as const;

export default function StaffClient({ initialMe, staffNames }: Props) {
  const [me, setMe] = useState<string | null>(initialMe);

  if (!me) return <LoginScreen staffNames={staffNames} onLogin={setMe} />;
  return <RedeemScreen me={me} onLogout={() => setMe(null)} />;
}

// ─── LOGIN ──────────────────────────────────────────────────────────

function LoginScreen({ staffNames, onLogin }: { staffNames: string[]; onLogin: (name: string) => void }) {
  const [selected, setSelected] = useState<string | null>(null);
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (pin.length === 4 && selected && !busy) {
      submit();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pin]);

  async function submit() {
    if (!selected) return;
    setBusy(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: selected, pin }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Wrong PIN");
        setPin("");
        return;
      }
      onLogin(data.name);
    } catch {
      toast.error("Network error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <Card className="w-full max-w-md border-2">
        <CardContent className="p-8 space-y-6">
          <div className="text-center">
            <div className="font-heading text-2xl tracking-widest text-primary">RAW SMITH</div>
            <div className="text-xs uppercase tracking-widest text-muted-foreground mt-1">Staff</div>
          </div>

          {!selected ? (
            <>
              <Label className="text-sm font-medium">Who are you?</Label>
              <div className="grid grid-cols-2 gap-3">
                {staffNames.length === 0 && (
                  <div className="col-span-2 text-sm text-muted-foreground text-center py-4">
                    No staff configured. Insert rows in the `staff` table.
                  </div>
                )}
                {staffNames.map((n) => (
                  <Button key={n} variant="outline" size="lg" className="h-14 text-base" onClick={() => setSelected(n)}>
                    {n}
                  </Button>
                ))}
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs uppercase tracking-widest text-muted-foreground">Signing in as</div>
                  <div className="font-heading text-xl text-primary">{selected}</div>
                </div>
                <Button variant="ghost" size="sm" onClick={() => { setSelected(null); setPin(""); }}>
                  ← Change
                </Button>
              </div>
              <Label htmlFor="pin" className="text-sm font-medium">Enter your 4-digit PIN</Label>
              <Input
                id="pin"
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                autoFocus
                value={pin}
                maxLength={4}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                className="text-center text-3xl tracking-[1em] h-16 font-mono"
                disabled={busy}
              />
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── REDEEM ─────────────────────────────────────────────────────────

function RedeemScreen({ me, onLogout }: { me: string; onLogout: () => void }) {
  const [code, setCode] = useState("");
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [searching, setSearching] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [alreadyMsg, setAlreadyMsg] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [undoOpen, setUndoOpen] = useState(false);
  const [undoReason, setUndoReason] = useState("");

  // Auto-lookup when 4 digits entered
  useEffect(() => {
    if (code.length === 4) lookup();
    else setCustomer(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  async function lookup() {
    setSearching(true);
    setAlreadyMsg(null);
    try {
      const res = await fetch(`/api/lookup?code=${encodeURIComponent(code)}`);
      const data = await res.json();
      if (!res.ok || !data.found) {
        toast.error("Code not found");
        setCustomer(null);
        return;
      }
      setCustomer(data.customer);
      if (data.customer.redeemed_at) {
        setAlreadyMsg(
          `Already redeemed ${new Date(data.customer.redeemed_at).toLocaleString()} by ${data.customer.redeemed_by ?? "(unknown)"}`,
        );
      }
    } catch {
      toast.error("Network error");
    } finally {
      setSearching(false);
    }
  }

  async function doRedeem() {
    if (!customer) return;
    setConfirmOpen(false);
    const res = await fetch("/api/redeem", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: customer.redemption_code }),
    });
    const data = await res.json();
    if (res.status === 409) {
      toast.warning("Already redeemed");
      setAlreadyMsg(data.message ?? null);
      setCustomer(data.customer ?? null);
      return;
    }
    if (!res.ok) {
      toast.error(data.error ?? "Failed");
      return;
    }
    toast.success(`Redeemed ${customer.first_name ?? customer.email}`);
    setCode("");
    setCustomer(null);
    inputRef.current?.focus();
  }

  async function doUndo() {
    if (!customer) return;
    if (undoReason.trim().length < 4) {
      toast.error("Reason required (4+ chars)");
      return;
    }
    const res = await fetch("/api/redeem", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: customer.redemption_code, action: "undo", reason: undoReason.trim() }),
    });
    const data = await res.json();
    if (!res.ok) {
      toast.error(data.error ?? "Failed");
      return;
    }
    toast.success("Undone");
    setUndoOpen(false);
    setUndoReason("");
    setCode("");
    setCustomer(null);
    setAlreadyMsg(null);
    inputRef.current?.focus();
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    onLogout();
  }

  const fullName = customer ? [customer.first_name, customer.last_name].filter(Boolean).join(" ") || "(no name)" : "";

  return (
    <div className="min-h-screen p-4 pb-12">
      {/* Header */}
      <div className="max-w-2xl mx-auto flex items-center justify-between mb-6">
        <div>
          <div className="font-heading text-lg tracking-widest text-primary">RAW SMITH</div>
          <div className="text-xs uppercase tracking-widest text-muted-foreground">Redemption</div>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="secondary" className="font-medium">{me}</Badge>
          <Button variant="ghost" size="sm" onClick={logout}>Logout</Button>
          <a href="/admin" className="text-sm text-muted-foreground hover:text-foreground">Admin →</a>
        </div>
      </div>

      <div className="max-w-2xl mx-auto space-y-6">
        {/* Code entry */}
        <Card className="border-2">
          <CardContent className="p-8 space-y-4">
            <Label htmlFor="code" className="text-sm font-medium">Enter customer's 4-digit code</Label>
            <Input
              id="code"
              ref={inputRef}
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              autoFocus
              value={code}
              maxLength={4}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 4))}
              className="text-center text-5xl tracking-[0.5em] h-24 font-mono font-bold"
              placeholder="0000"
              disabled={searching}
            />
          </CardContent>
        </Card>

        {/* Customer card */}
        {customer && (
          <Card className={alreadyMsg ? "border-2 border-yellow-500" : "border-2 border-primary"}>
            <CardContent className="p-8 space-y-4">
              <div>
                <div className="text-xs uppercase tracking-widest text-muted-foreground">Customer</div>
                <div className="font-heading text-2xl">{fullName}</div>
                <div className="text-xs text-muted-foreground">{customer.email}</div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-xs uppercase tracking-widest text-muted-foreground">Tier</div>
                  <div className={`font-heading text-xl tier-badge-${customer.membership_tier} inline-block px-3 py-1 rounded mt-1`}>
                    {TIER_LABEL[customer.membership_tier]}
                  </div>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-widest text-muted-foreground">Coffee Score</div>
                  <div className="font-heading text-2xl text-primary">{customer.bonus_points}</div>
                </div>
              </div>

              {alreadyMsg ? (
                <div className="rounded border border-yellow-500/50 bg-yellow-50 text-yellow-900 p-4 text-sm">
                  ⚠ {alreadyMsg}
                  <div className="mt-3">
                    <Button variant="outline" size="sm" onClick={() => setUndoOpen(true)}>
                      Undo redemption
                    </Button>
                  </div>
                </div>
              ) : customer.status !== "sent" ? (
                <div className="rounded border border-orange-500/50 bg-orange-50 text-orange-900 p-3 text-sm">
                  ⚠ Heads-up: customer's email status is <strong>{customer.status}</strong>. Continue only if you're sure.
                </div>
              ) : null}

              {!alreadyMsg && (
                <Button
                  size="lg"
                  className="w-full h-16 text-lg font-medium"
                  onClick={() => setConfirmOpen(true)}
                  disabled={!!alreadyMsg}
                >
                  Redeem coffee → {TIER_LABEL[customer.membership_tier]}
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Confirm redeem */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm redemption</DialogTitle>
            <DialogDescription>
              {customer && `Redeem one ${TIER_LABEL[customer.membership_tier]} Coffee Score ${customer.bonus_points} cup for ${fullName}?`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>Cancel</Button>
            <Button onClick={doRedeem}>Yes, redeem</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Undo */}
      <Dialog open={undoOpen} onOpenChange={setUndoOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Undo redemption</DialogTitle>
            <DialogDescription>
              {customer && `Undo redemption for ${fullName}? Both the original redemption and this undo are logged.`}
            </DialogDescription>
          </DialogHeader>
          <Label className="text-sm">Reason (required, visible in admin log)</Label>
          <Input value={undoReason} onChange={(e) => setUndoReason(e.target.value)} placeholder="e.g. wrong customer, customer didn't receive coffee…" />
          <DialogFooter>
            <Button variant="outline" onClick={() => setUndoOpen(false)}>Cancel</Button>
            <Button onClick={doUndo}>Undo</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
