"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * Client-side helpers for the try-on-test admin session. The actual gate
 * is server-side (middleware.ts + route.ts checks the cookie); these
 * hooks just give the UI a way to drive login/logout and surface state.
 */

export function useAdminLogin() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const login = useCallback(async (username: string, password: string): Promise<boolean> => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/try-on-test/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ username, password }),
      });
      if (res.ok) return true;
      const data = await res.json().catch(() => ({}));
      setError(data?.message || "Login failed");
      return false;
    } catch {
      setError("Network error. Please try again.");
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  return { login, loading, error };
}

export function useAdminLogout() {
  return useCallback(async () => {
    await fetch("/api/try-on-test/auth/logout", { method: "POST", credentials: "include" });
    window.location.href = "/try-on-test/login";
  }, []);
}

export function useAdminSession() {
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [username, setUsername] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/try-on-test/auth/me", { credentials: "include" })
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        setAuthenticated(!!data?.authenticated);
        setUsername(data?.username ?? null);
      })
      .catch(() => {
        if (!cancelled) setAuthenticated(false);
      });
    return () => { cancelled = true; };
  }, []);

  return { authenticated, username };
}
