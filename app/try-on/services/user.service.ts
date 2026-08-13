interface UserMeResponse {
  gender?: string;
  [key: string]: unknown;
}

export async function fetchUserGender(): Promise<string | null> {
  try {
    const res = await fetch("/api/users/me", { credentials: "include" });
    if (!res.ok) return null;
    const data: UserMeResponse = await res.json();
    return data.gender ?? null;
  } catch {
    return null;
  }
}
