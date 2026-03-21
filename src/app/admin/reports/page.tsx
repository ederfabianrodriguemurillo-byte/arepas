import { ReportsClient } from "@/components/admin-clients";
import { Banner } from "@/components/ui";
import { getAdminReportsData } from "@/lib/data";

export default async function ReportsPage() {
  const data = await getAdminReportsData();
  return (
    <div className="space-y-4">
      {data.dbError ? <Banner tone="error">{data.dbError}</Banner> : null}
      <ReportsClient sales={data.sales as never} products={data.products as never} />
    </div>
  );
}
