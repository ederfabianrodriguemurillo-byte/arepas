import { AdminShell } from "@/components/admin-shell";
import { requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAdmin();
  return <AdminShell user={{ nombre: user.nombre, rol: user.rol }}>{children}</AdminShell>;
}
