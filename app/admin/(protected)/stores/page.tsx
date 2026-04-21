import { AdminShell } from "@/app/admin/shared/components/AdminShell";
import { listStores } from "./services/storesService";
import { StoresTable } from "./components/desktop/StoresTable";
import { StoresFilters } from "./components/desktop/StoresFilters";
import { StoresPagination } from "./components/desktop/StoresPagination";
import { StoresList } from "./components/mobile/StoresList";
import { StoresFiltersMobile } from "./components/mobile/StoresFiltersMobile";

export const dynamic = "force-dynamic";

interface SearchParams {
  search?: string;
  source?: "all" | "shopify" | "sdk";
  page?: string;
}

const LIMIT = 20;

export default async function AdminStoresPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);
  const data = await listStores({
    search: sp.search ?? "",
    source: sp.source ?? "all",
    page,
    limit: LIMIT,
  });

  return (
    <AdminShell title="Stores" subtitle="Shopify merchants and SDK stores">
      <div className="hidden lg:flex flex-col gap-[var(--spacing-admin-gap-md)]">
        <StoresFilters total={data.pagination.total} />
        <StoresTable data={data} />
        <StoresPagination
          page={data.pagination.page}
          totalPages={data.pagination.totalPages}
          total={data.pagination.total}
        />
      </div>
      <div className="lg:hidden flex flex-col gap-3">
        <StoresFiltersMobile total={data.pagination.total} />
        <StoresList data={data} />
        <StoresPagination
          page={data.pagination.page}
          totalPages={data.pagination.totalPages}
          total={data.pagination.total}
        />
      </div>
    </AdminShell>
  );
}
