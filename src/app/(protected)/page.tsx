import { redirect } from "next/navigation";
import { PosClient } from "@/components/pos-client";
import { Banner } from "@/components/ui";
import { getCurrentUser, getSession } from "@/lib/auth";
import { getPosData } from "@/lib/data";
import { canAccessAdmin } from "@/lib/permissions";

export default async function PosPage() {
  const [user, session] = await Promise.all([getCurrentUser(), getSession()]);

  if (!user || !session) {
    redirect("/login");
  }

  const data = await getPosData(user.id);

  return (
    <>
      {data.dbError ? (
        <div className="p-4">
          <Banner tone="error">{data.dbError}</Banner>
        </div>
      ) : null}
      <PosClient
        settings={{
          nombreNegocio: data.settings?.nombreNegocio || "Arepas Stefania",
          direccion: data.settings?.direccion || "Colombia",
          telefono: data.settings?.telefono || "",
          mensajeTicket: data.settings?.mensajeTicket || "Gracias por tu compra.",
        }}
        categories={data.categories}
        user={{ nombre: user.nombre, rol: user.rol }}
        canEnterAdmin={canAccessAdmin(user.rol)}
        currentShift={data.currentShift as never}
        currentShiftSummary={data.currentShiftSummary as never}
      />
    </>
  );
}
