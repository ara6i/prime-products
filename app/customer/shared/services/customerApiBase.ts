export function getCustomerApiBaseUrl(): string {
  return (
    process.env.PRIMESTYLE_API_INTERNAL_URL ||
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    ""
  ).replace(/\/$/, "");
}

export function isCustomerApiLocalBackend(): boolean {
  return /https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/i.test(getCustomerApiBaseUrl());
}
