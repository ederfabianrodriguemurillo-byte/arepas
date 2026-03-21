"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, Package, Shapes, Users, Settings, Receipt, ChartColumn, Boxes, LogOut, ShoppingCart, Wallet } from "lucide-react";
import { Button } from "@/components/ui";
import { roleLabel } from "@/lib/format";
import { canManageUsers } from "@/lib/permissions";

const links = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/products", label: "Productos", icon: Package },
  { href: "/admin/categories", label: "Categorías", icon: Shapes },
  { href: "/admin/sales", label: "Ventas", icon: Receipt },
  { href: "/admin/cash-closures", label: "Cierres de caja", icon: Wallet },
  { href: "/admin/reports", label: "Reportes", icon: ChartColumn },
  { href: "/admin/inventory", label: "Inventario", icon: Boxes },
  { href: "/admin/settings", label: "Configuración", icon: Settings },
];

export function AdminShell({
  children,
  user,
}: {
  children: React.ReactNode;
  user: { nombre: string; rol: "PRINCIPAL_ADMIN" | "SECONDARY_ADMIN" | "CASHIER" };
}) {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  const navLinks = canManageUsers(user.rol) ? [...links, { href: "/admin/users", label: "Usuarios", icon: Users }] : links;

  return (
    <div className="grid min-h-screen grid-cols-1 bg-[radial-gradient(circle_at_top,_rgba(245,158,11,.18),transparent_28%),linear-gradient(180deg,#120f0b_0%,#17120d_100%)] md:grid-cols-[280px_1fr]">
      <aside className="border-b border-stone-800 bg-stone-950/80 p-5 backdrop-blur md:border-b-0 md:border-r">
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-[0.35em] text-amber-300">Panel admin</p>
          <h1 className="text-2xl font-black text-stone-50">Arepas Stefania</h1>
          <p className="text-sm text-stone-400">{user.nombre}</p>
          <p className="text-xs text-stone-500">{roleLabel(user.rol)}</p>
        </div>

        <nav className="mt-8 space-y-2">
          <Link href="/" className="flex items-center gap-3 rounded-2xl border border-stone-800 px-4 py-3 text-sm font-medium text-stone-200 transition hover:border-amber-500/40 hover:bg-stone-900">
            <ShoppingCart className="h-4 w-4" />
            Ir al POS
          </Link>
          {navLinks.map((link) => {
            const Icon = link.icon;
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition ${
                  active ? "bg-amber-500 text-stone-950" : "text-stone-300 hover:bg-stone-900"
                }`}
              >
                <Icon className="h-4 w-4" />
                {link.label}
              </Link>
            );
          })}
        </nav>

        <Button className="mt-8 w-full" variant="ghost" onClick={logout}>
          <LogOut className="h-4 w-4" />
          Cerrar sesión
        </Button>
      </aside>

      <main className="p-4 md:p-8">{children}</main>
    </div>
  );
}
