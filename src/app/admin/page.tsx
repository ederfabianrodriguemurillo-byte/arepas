import { DashboardClient } from "@/components/admin-clients";
import { Banner } from "@/components/ui";
import { getAdminDashboardData } from "@/lib/data";

export default async function AdminDashboardPage() {
  const data = await getAdminDashboardData();
  return (
    <div className="space-y-4">
      {data.dbError ? <Banner tone="error">{data.dbError}</Banner> : null}
      <DashboardClient metrics={data.metrics} recentSales={data.sales as never} />
    </div>
  );
}
