import { cookies } from "next/headers";
import crypto from "node:crypto";

const COOKIE_NAME = "rs_session";
const COOKIE_MAX_AGE = 60 * 60 * 12; // 12 hours

function getSecret(): string {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 16) throw new Error("SESSION_SECRET is missing or too short (16+ chars required)");
  return s;
}

function sign(payload: string): string {
  return crypto.createHmac("sha256", getSecret()).update(payload).digest("base64url");
}

function encode(name: string): string {
  const exp = Math.floor(Date.now() / 1000) + COOKIE_MAX_AGE;
  const payload = `${encodeURIComponent(name)}.${exp}`;
  return `${payload}.${sign(payload)}`;
}

function decode(token: string | undefined): { name: string } | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [name, exp, sig] = parts;
  const payload = `${name}.${exp}`;
  if (sign(payload) !== sig) return null;
  if (Number(exp) * 1000 < Date.now()) return null;
  return { name: decodeURIComponent(name) };
}

export async function setSession(name: string): Promise<void> {
  const jar = await cookies();
  jar.set(COOKIE_NAME, encode(name), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: COOKIE_MAX_AGE,
  });
}

export async function clearSession(): Promise<void> {
  const jar = await cookies();
  jar.delete(COOKIE_NAME);
}

export async function currentStaff(): Promise<string | null> {
  const jar = await cookies();
  const tok = jar.get(COOKIE_NAME)?.value;
  return decode(tok)?.name ?? null;
}

/** Throw-style guard for API routes. */
export async function requireStaff(): Promise<string> {
  const name = await currentStaff();
  if (!name) throw Object.assign(new Error("Not authenticated"), { status: 401 });
  return name;
}
