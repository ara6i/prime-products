"use client";

export const PILOT_REQUEST_PATH = "/api/contact/pilot-request";
export const PILOT_EMAIL_OTP_REQUEST_PATH = "/api/contact/email-otp/request";
export const PILOT_EMAIL_OTP_VERIFY_PATH = "/api/contact/email-otp/verify";

export function getPilotRequestUrl() {
  const apiBase = process.env.NEXT_PUBLIC_API_URL ?? "";
  return `${apiBase}${PILOT_REQUEST_PATH}`;
}

export function getPilotEmailOtpRequestUrl() {
  const apiBase = process.env.NEXT_PUBLIC_API_URL ?? "";
  return `${apiBase}${PILOT_EMAIL_OTP_REQUEST_PATH}`;
}

export function getPilotEmailOtpVerifyUrl() {
  const apiBase = process.env.NEXT_PUBLIC_API_URL ?? "";
  return `${apiBase}${PILOT_EMAIL_OTP_VERIFY_PATH}`;
}
