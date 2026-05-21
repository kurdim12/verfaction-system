// 4-digit numeric redemption codes — 10,000 unique combos, ~1% collision for 147 customers.
// Retry on collision via DB check.

const CODE_LENGTH = 4;
const CODE_REGEX = /^[0-9]{4}$/;

export function generateCode(): string {
  let s = "";
  for (let i = 0; i < CODE_LENGTH; i++) {
    s += Math.floor(Math.random() * 10).toString();
  }
  return s;
}

export function isValidCode(value: unknown): value is string {
  return typeof value === "string" && CODE_REGEX.test(value);
}

export function normaliseCode(value: string): string {
  return value.trim().replace(/\D+/g, "").padStart(CODE_LENGTH, "0").slice(-CODE_LENGTH);
}
