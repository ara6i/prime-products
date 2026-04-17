"use client";

import { useState, useEffect, useRef } from "react";

interface UserInfo {
  firstName: string | null;
  initials: string | null;
  photoUrl: string | null;
}

export function useUserInfo(): UserInfo {
  const [info, setInfo] = useState<UserInfo>({
    firstName: null,
    initials: null,
    photoUrl: null,
  });
  const fetched = useRef(false);

  useEffect(() => {
    if (fetched.current) return;
    fetched.current = true;

    fetch("/api/users/me", { credentials: "include" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!data?.name) return;
        const parts = data.name.trim().split(/\s+/);
        const firstName = parts[0];
        const initials = parts.length >= 2
          ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
          : parts[0].slice(0, 2).toUpperCase();
        setInfo({
          firstName,
          initials,
          photoUrl: data.photoUrl ?? null,
        });
      })
      .catch(() => {});
  }, []);

  return info;
}

/** Convenience — returns just the first name */
export function useUserName(): string | null {
  const { firstName } = useUserInfo();
  return firstName;
}
