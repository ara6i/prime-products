"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAdminLogin } from "../hooks/useAdminAuth";

export function LoginForm({ redirectTo }: { redirectTo: string }) {
  const router = useRouter();
  const { login, loading, error } = useAdminLogin();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h1 style={styles.title}>Try-On Test Lab</h1>
        <p style={styles.subtitle}>Sign in to continue</p>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            const ok = await login(username, password);
            if (ok) router.push(redirectTo);
          }}
          style={styles.form}
        >
          <label style={styles.label}>
            Username
            <input
              type="text"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              style={styles.input}
            />
          </label>
          <label style={styles.label}>
            Password
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={styles.input}
            />
          </label>
          {error && <div style={styles.error}>{error}</div>}
          <button type="submit" disabled={loading} style={styles.btn}>
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: { minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px", background: "#f7f8fb" },
  card: { width: "100%", maxWidth: 360, background: "#fff", borderRadius: 14, padding: "28px 24px", boxShadow: "0 8px 28px rgba(20,30,60,0.08)" },
  title: { fontSize: 22, fontWeight: 700, margin: "0 0 4px", color: "#0f172a" },
  subtitle: { fontSize: 13, color: "#6b7280", margin: "0 0 20px" },
  form: { display: "flex", flexDirection: "column", gap: 14 },
  label: { display: "flex", flexDirection: "column", fontSize: 12, fontWeight: 600, color: "#374151", gap: 6 },
  input: { padding: "10px 12px", borderRadius: 8, border: "1px solid #d6dbe4", fontSize: 14, fontFamily: "inherit", outline: "none" },
  error: { color: "#dc2626", fontSize: 12, fontWeight: 500 },
  btn: { marginTop: 4, padding: "11px 14px", borderRadius: 8, border: "none", background: "#2154EF", color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer" },
};
