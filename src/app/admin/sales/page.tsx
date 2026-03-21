import { SalesClient } from "@/components/admin-clients";
import { Banner } from "@/components/ui";
import { getAdminSalesData } from "@/lib/data";

export default async function SalesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const params = await searchParams;
  const page = Number(params.page || "1");
  const data = await getAdminSalesData(Number.isFinite(page) ? page : 1);
  return (
    <div className="space-y-4">
      {data.dbError ? <Banner tone="error">{data.dbError}</Banner> : null}
      <SalesClient
        sales={data.sales as never}
        pagination={{
          page: data.page,
          pageCount: data.pageCount,
        }}
        settings={
          (data.settings as never) || {
            id: "fallback",
            nombreNegocio: "Arepas Stefania",
            direccion: "Colombia",
            telefono: "",
            mensajeTicket: "Gracias por tu compra.",
          }
        }
      />
    </div>
  );
}
