import { SignJWT, jwtVerify } from "jose";

export const SITE_AUTH_COOKIE_NAME = "ps_prime_products_session";
export const SITE_AUTH_TTL_SECONDS = 60 * 60 * 12; // 12 hours

const SITE_AUTH_SCOPE = "prime-products-site";

interface SiteSessionPayload {
  sub: string;
  scope: typeof SITE_AUTH_SCOPE;
  iat: number;
}

export function isSiteAuthEnabled(): boolean {
  return process.env.PRIME_PRODUCTS_SITE_AUTH_ENABLED === "true";
}

export function getSiteAuthJwtSecret(): string | null {
  if (!isSiteAuthEnabled()) return null;

  const jwtSecret = process.env.PRIME_PRODUCTS_SITE_AUTH_JWT_SECRET?.trim();

  if (!jwtSecret || jwtSecret.length < 32) {
    return null;
  }

  return jwtSecret;
}

function getSecretKey(): Uint8Array {
  const secret = getSiteAuthJwtSecret();
  if (!secret) {
    throw new Error("[site-auth] PRIME_PRODUCTS_SITE_AUTH_JWT_SECRET is missing or too short");
  }

  return new TextEncoder().encode(secret);
}

export async function signSiteSessionToken(username: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000);

  return new SignJWT({ sub: username, scope: SITE_AUTH_SCOPE, iat: now })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setExpirationTime(now + SITE_AUTH_TTL_SECONDS)
    .sign(getSecretKey());
}

export async function verifySiteSessionToken(token: string): Promise<SiteSessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey(), { algorithms: ["HS256"] });

    if (
      typeof payload.sub !== "string" ||
      payload.scope !== SITE_AUTH_SCOPE
    ) {
      return null;
    }

    return {
      sub: payload.sub,
      scope: SITE_AUTH_SCOPE,
      iat: Number(payload.iat) || 0,
    };
  } catch {
    return null;
  }
}

export function sanitizeRedirectPath(value: string | null | undefined): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/";
  }

  if (value === "/login" || value.startsWith("/login?")) {
    return "/";
  }

  return value;
}
