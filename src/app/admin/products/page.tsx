import { ProductsClient } from "@/components/admin-clients";
import { Banner } from "@/components/ui";
import { getAdminProductsData } from "@/lib/data";

export default async function ProductsPage() {
  const data = await getAdminProductsData();
  return (
    <div className="space-y-4">
      {data.dbError ? <Banner tone="error">{data.dbError}</Banner> : null}
      <ProductsClient products={data.products as never} categories={data.categories} />
    </div>
  );
}
