import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-white px-6 text-center">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-blue">404</p>
      <h1 className="text-3xl font-semibold text-text-primary">Page not found</h1>
      <p className="max-w-md text-sm text-text-body">
        The page you&rsquo;re looking for doesn&rsquo;t exist or has been moved.
      </p>
      <Link
        href="/"
        className="mt-2 inline-flex h-11 items-center rounded-full bg-brand-blue px-6 text-sm font-semibold text-white transition-colors hover:bg-brand-blue-dark"
      >
        Back to homepage
      </Link>
    </div>
  );
}
