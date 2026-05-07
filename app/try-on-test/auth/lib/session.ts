import { SignJWT, jwtVerify } from "jose";

/**
 * Stateless session token for the try-on-test admin. Signed with HS256
 * using TRYON_TEST_ADMIN_JWT_SECRET. The token lives effectively forever
 * (10-year expiry) — the user wants one-time login, no refresh dance.
 *
 * The token only carries the username + a stable id. We do NOT cache the
 * password or any secret; the cookie's value is enough for the middleware
 * to decide allow/deny on every protected request.
 */

export const COOKIE_NAME = "ps_tot_admin";
export const TOKEN_TTL_SECONDS = 60 * 60 * 24 * 365 * 10; // 10 years

interface SessionPayload {
  sub: string;       // username
  uid: string;       // mongo doc id, stable per user
  iat: number;
}

function getSecretKey(): Uint8Array {
  const raw = process.env.TRYON_TEST_ADMIN_JWT_SECRET;
  if (!raw) {
    throw new Error("[try-on-test:auth] TRYON_TEST_ADMIN_JWT_SECRET is not set");
  }
  return new TextEncoder().encode(raw);
}

export async function signSessionToken(payload: { username: string; uid: string }): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  return new SignJWT({ sub: payload.username, uid: payload.uid, iat: now })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setExpirationTime(now + TOKEN_TTL_SECONDS)
    .sign(getSecretKey());
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey(), { algorithms: ["HS256"] });
    if (typeof payload.sub !== "string" || typeof payload.uid !== "string") return null;
    return { sub: payload.sub, uid: payload.uid, iat: Number(payload.iat) || 0 };
  } catch {
    return null;
  }
}
