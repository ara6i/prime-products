import { LoginForm } from "./LoginForm";

export const dynamic = "force-dynamic";

export default function TryOnTestLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string }>;
}) {
  return <LoginFormWrapper searchParamsPromise={searchParams} />;
}

async function LoginFormWrapper({ searchParamsPromise }: { searchParamsPromise: Promise<{ from?: string }> }) {
  const sp = await searchParamsPromise;
  const from = sp.from || "/try-on-test";
  return <LoginForm redirectTo={from} />;
}
