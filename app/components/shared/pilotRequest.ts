"use client";

export const PILOT_REQUEST_PATH = "/api/contact/pilot-request";

export function getPilotRequestUrl() {
  const apiBase = process.env.NEXT_PUBLIC_API_URL ?? "";
  return `${apiBase}${PILOT_REQUEST_PATH}`;
}

