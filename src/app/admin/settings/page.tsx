import { SettingsClient } from "@/components/admin-clients";
import { Banner } from "@/components/ui";
import { getAdminSettingsData } from "@/lib/data";

export default async function SettingsPage() {
  const data = await getAdminSettingsData();
  return (
    <div className="space-y-4">
      {data.dbError ? <Banner tone="error">{data.dbError}</Banner> : null}
      <SettingsClient
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
