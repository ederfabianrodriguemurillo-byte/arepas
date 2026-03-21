import { SalesClient } from "@/components/admin-clients";
import { Banner } from "@/components/ui";
import { getAdminBootstrap } from "@/lib/data";

export default async function SalesPage() {
  const data = await getAdminBootstrap();
  return (
    <div className="space-y-4">
      {data.dbError ? <Banner tone="error">{data.dbError}</Banner> : null}
      <SalesClient
        sales={data.sales as never}
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
