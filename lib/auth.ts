// Signed-cookie auth for the shared team PIN.
// Uses Web Crypto (HMAC-SHA256) so the same code runs in middleware
// (edge runtime) and in server actions (Node).

const COOKIE_NAME = "pt_auth";
const ONE_YEAR_S = 365 * 24 * 60 * 60;

function secret(): string {
  const s = process.env.AUTH_COOKIE_SECRET;
  if (!s) throw new Error("AUTH_COOKIE_SECRET is not set");
  return s;
}

async function hmac(payload: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return Buffer.from(sig).toString("base64url");
}

/** Cookie value is "<expiryEpochSeconds>.<signature>". */
export async function makeAuthCookieValue(): Promise<string> {
  const exp = Math.floor(Date.now() / 1000) + ONE_YEAR_S;
  return `${exp}.${await hmac(String(exp))}`;
}

export async function isValidAuthCookie(value: string | undefined): Promise<boolean> {
  if (!value) return false;
  const [exp, sig] = value.split(".");
  if (!exp || !sig) return false;
  if (Number(exp) < Date.now() / 1000) return false;
  const expected = await hmac(exp);
  if (sig.length !== expected.length) return false;
  // Constant-time compare
  let diff = 0;
  for (let i = 0; i < sig.length; i++) diff |= sig.charCodeAt(i) ^ expected.charCodeAt(i);
  return diff === 0;
}

export const AUTH_COOKIE = {
  name: COOKIE_NAME,
  maxAge: ONE_YEAR_S,
  options: {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
  },
};
