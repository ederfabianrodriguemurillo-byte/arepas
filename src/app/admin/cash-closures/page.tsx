import { CashClosuresClient } from "@/components/admin-clients";
import { Banner } from "@/components/ui";
import { getAdminBootstrap } from "@/lib/data";

export default async function CashClosuresPage() {
  const data = await getAdminBootstrap();
  return (
    <div className="space-y-4">
      {data.dbError ? <Banner tone="error">{data.dbError}</Banner> : null}
      <CashClosuresClient cashShifts={data.cashShifts as never} />
    </div>
  );
}
