import { normalizeHost } from "@/app/try-on-test/lib/access";

const DEFAULT_ADMIN_HOSTS = [
  "localhost",
  "127.0.0.1",
  "::1",
  "test-fe-9a7k.primestyleai.com",
];

function configuredAdminHosts(): string[] {
  const raw = process.env.PRIME_PRODUCTS_ADMIN_HOSTS;
  if (!raw) return DEFAULT_ADMIN_HOSTS;
  return raw
    .split(",")
    .map((host) => normalizeHost(host))
    .filter(Boolean);
}

export function isAdminAvailableForHost(hostHeader: string | null | undefined): boolean {
  if (process.env.PRIME_PRODUCTS_ADMIN_ENABLED === "true") return true;
  if (process.env.PRIME_PRODUCTS_ADMIN_ENABLED === "false") return false;

  const host = normalizeHost(hostHeader);
  if (!host) return false;
  return configuredAdminHosts().includes(host);
}
