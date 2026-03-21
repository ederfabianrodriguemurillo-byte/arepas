import { CategoriesClient } from "@/components/admin-clients";
import { Banner } from "@/components/ui";
import { getAdminCategoriesData } from "@/lib/data";

export default async function CategoriesPage() {
  const data = await getAdminCategoriesData();
  return (
    <div className="space-y-4">
      {data.dbError ? <Banner tone="error">{data.dbError}</Banner> : null}
      <CategoriesClient categories={data.categories} />
    </div>
  );
}
