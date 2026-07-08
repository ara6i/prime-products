import type {
  CustomerProductAutoDetectErrors,
  CustomerProductAutoDetectForm,
} from "../types/products";

export function normalizeCustomerAutoDetectWebsiteUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  const hasProtocol = /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed);
  if (hasProtocol && !/^https?:\/\//i.test(trimmed)) return trimmed;
  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const url = new URL(withProtocol);
    url.protocol = "https:";
    url.username = "";
    url.password = "";
    url.hash = "";
    return url.href;
  } catch {
    return withProtocol.replace(/^http:\/\//i, "https://");
  }
}

function isValidWebUrl(value: string) {
  try {
    const url = new URL(normalizeCustomerAutoDetectWebsiteUrl(value));
    const isWebUrl = url.protocol === "https:";
    const hasDomain = url.hostname.includes(".") && url.hostname.length >= 4;
    return isWebUrl && hasDomain;
  } catch {
    return false;
  }
}

export function validateCustomerProductAutoDetectForm(
  values: CustomerProductAutoDetectForm,
): CustomerProductAutoDetectErrors {
  const errors: CustomerProductAutoDetectErrors = {};

  if (!values.websiteUrl.trim()) {
    errors.websiteUrl = "Enter a public website URL.";
  } else if (!isValidWebUrl(values.websiteUrl)) {
    errors.websiteUrl = "Enter a valid public website URL.";
  }

  if (!values.authorized) {
    errors.authorized = "Confirm one-time authorization for this website.";
  }

  return errors;
}
