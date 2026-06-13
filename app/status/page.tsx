type ServiceStatus = {
  id: string;
  name: string;
  status: "operational" | "degraded" | string;
  detail?: string;
};

type PublicStatusResponse = {
  status: "operational" | "degraded" | string;
  generatedAt: string;
  services: ServiceStatus[];
};

const API_BASE_URL =
  process.env.PRIMESTYLE_ADMIN_API_INTERNAL_URL ||
  process.env.PRIMESTYLE_API_INTERNAL_URL ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  "";

async function loadStatus(): Promise<PublicStatusResponse> {
  if (!API_BASE_URL) {
    return {
      status: "degraded",
      generatedAt: new Date().toISOString(),
      services: [
        {
          id: "api-config",
          name: "Status API",
          status: "degraded",
          detail: "API base URL is not configured.",
        },
      ],
    };
  }

  try {
    const response = await fetch(`${API_BASE_URL}/api/health/status`, { cache: "no-store" });
    if (!response.ok) throw new Error(response.statusText);
    return (await response.json()) as PublicStatusResponse;
  } catch {
    return {
      status: "degraded",
      generatedAt: new Date().toISOString(),
      services: [
        {
          id: "status-api",
          name: "Status API",
          status: "degraded",
          detail: "Could not reach the backend status endpoint.",
        },
      ],
    };
  }
}

export const dynamic = "force-dynamic";

export default async function StatusPage() {
  const data = await loadStatus();
  const isOperational = data.status === "operational";

  return (
    <main className="min-h-screen bg-[#f6f7fb] px-5 py-10 text-[#111827]">
      <section className="mx-auto max-w-4xl">
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-[#d7dce8] pb-6">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.12em] text-[#2154EF]">PrimeStyleAI Status</p>
            <h1 className="mt-3 text-4xl font-semibold tracking-normal">
              {isOperational ? "All systems operational" : "Some systems degraded"}
            </h1>
          </div>
          <p className="text-sm text-[#5f6b7a]">
            Updated {new Intl.DateTimeFormat("en-US", {
              dateStyle: "medium",
              timeStyle: "short",
            }).format(new Date(data.generatedAt))}
          </p>
        </div>

        <div className="mt-6 overflow-hidden rounded-lg border border-[#d7dce8] bg-white">
          {data.services.map((service) => {
            const ok = service.status === "operational";
            return (
              <article key={service.id} className="flex flex-wrap items-center justify-between gap-4 border-b border-[#edf0f6] p-5 last:border-b-0">
                <div>
                  <h2 className="text-base font-semibold">{service.name}</h2>
                  {service.detail ? <p className="mt-1 text-sm text-[#5f6b7a]">{service.detail}</p> : null}
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${ok ? "bg-[#e9f8ef] text-[#137a3a]" : "bg-[#fff3dc] text-[#986500]"}`}>
                  {ok ? "Operational" : "Degraded"}
                </span>
              </article>
            );
          })}
        </div>
      </section>
    </main>
  );
}
