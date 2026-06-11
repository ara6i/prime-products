export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-white px-6 text-center text-slate-950">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">404</p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight">Page not found</h1>
      <p className="mt-3 max-w-sm text-sm leading-6 text-slate-600">
        This page is not available.
      </p>
    </main>
  );
}
