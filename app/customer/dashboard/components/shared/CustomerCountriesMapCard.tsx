import { CustomerDashboardCard } from "./CustomerDashboardCard";
import { CustomerWorldMapInteractive } from "./CustomerWorldMapInteractive";
import type { CustomerDashboardCountrySlice } from "../../types";
import { prepareCustomerMapData } from "../../utils/map/prepareCustomerMapData";

interface CustomerCountriesMapCardProps {
  countries: CustomerDashboardCountrySlice[];
}

export async function CustomerCountriesMapCard({ countries }: CustomerCountriesMapCardProps) {
  const map = await prepareCustomerMapData(countries);

  return (
    <CustomerDashboardCard title="Customer countries" description="Where try-ons happen">
      <CustomerWorldMapInteractive
        width={map.width}
        height={map.height}
        countries={map.countries}
      />
    </CustomerDashboardCard>
  );
}
