interface Props {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
}

export function AdminHeader({ title, subtitle, right }: Props) {
  return (
    <header
      className="hidden lg:flex items-center justify-between bg-admin-surface-card border-b border-admin-border px-[var(--spacing-admin-content-x)] sticky top-0 z-10 backdrop-blur-md bg-admin-surface-card/95"
      style={{ height: "var(--spacing-admin-header)" }}
    >
      <div className="flex flex-col">
        <h1 className="text-admin-xl font-semibold text-text-primary leading-tight tracking-tight">
          {title}
        </h1>
        {subtitle && (
          <span className="text-admin-xs text-text-hint leading-tight mt-[0.104vw]">
            {subtitle}
          </span>
        )}
      </div>

      {right && <div className="flex items-center gap-[var(--spacing-admin-gap-md)]">{right}</div>}
    </header>
  );
}
