import { InventoryClient } from "@/components/admin-clients";
import { Banner } from "@/components/ui";
import { getAdminProductsData } from "@/lib/data";

export default async function InventoryPage() {
  const data = await getAdminProductsData();
  return (
    <div className="space-y-4">
      {data.dbError ? <Banner tone="error">{data.dbError}</Banner> : null}
      <InventoryClient products={data.products as never} />
    </div>
  );
}
