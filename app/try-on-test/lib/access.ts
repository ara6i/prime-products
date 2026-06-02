const DEFAULT_TEST_LAB_HOSTS = [
  "localhost",
  "127.0.0.1",
  "::1",
  "test-fe-9a7k.primestyleai.com",
  "capacity-fe-9a7k.primestyleai.com",
];

export function normalizeHost(hostHeader: string | null | undefined): string {
  if (!hostHeader) return "";
  const host = hostHeader.trim().toLowerCase();
  if (host.startsWith("[")) {
    const close = host.indexOf("]");
    return close >= 0 ? host.slice(1, close) : host;
  }
  if (host.includes(":") && host.indexOf(":") !== host.lastIndexOf(":")) return host;
  return host.split(":")[0] ?? "";
}

function configuredTestLabHosts(): string[] {
  const raw = process.env.PRIME_PRODUCTS_TEST_LAB_HOSTS;
  if (!raw) return DEFAULT_TEST_LAB_HOSTS;
  return raw
    .split(",")
    .map((host) => normalizeHost(host))
    .filter(Boolean);
}

export function isTestLabAvailableForHost(hostHeader: string | null | undefined): boolean {
  if (process.env.PRIME_PRODUCTS_TEST_LAB_ENABLED === "true") return true;
  if (process.env.PRIME_PRODUCTS_TEST_LAB_ENABLED === "false") return false;

  const host = normalizeHost(hostHeader);
  if (!host) return false;
  return configuredTestLabHosts().includes(host);
}

export function isTryOnTestPath(pathname: string): boolean {
  return pathname === "/try-on-test" || pathname.startsWith("/try-on-test/");
}

export function isTryOnTestApiPath(pathname: string): boolean {
  return pathname === "/api/try-on-test" || pathname.startsWith("/api/try-on-test/");
}
