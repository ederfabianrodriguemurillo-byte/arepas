"use client";

import Image from "next/image";
import { Role } from "@prisma/client";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Printer, Upload } from "lucide-react";
import { Banner, Button, Card, EmptyState, Input, SectionTitle, Select, StatCard, TextArea } from "@/components/ui";
import { cashMovementTypeLabel, cashShiftStatusLabel, formatCop, formatDateTime, paymentMethodLabel, roleLabel } from "@/lib/format";
import { REQUEST_TIMEOUT } from "@/lib/constants";
import { TicketPrintSheet, type PrintableSale } from "@/components/ticket-print-sheet";

type Category = { id: string; nombre: string; activa: boolean };
type Variant = { id: string; nombreVariante: string; precio: number };
type Product = {
  id: string;
  nombre: string;
  descripcion: string | null;
  precio: number | null;
  imagenUrl: string | null;
  stock: number;
  activo: boolean;
  categoriaId: string;
  categoria: { nombre: string };
  variants: Variant[];
};
type User = {
  id: string;
  nombre: string;
  email: string;
  rol: Role;
  activo: boolean;
};
type Settings = {
  id: string;
  nombreNegocio: string;
  direccion: string;
  telefono: string;
  mensajeTicket: string;
};
type Sale = PrintableSale & {
  id: string;
  createdAt: string;
};
type CashClosure = {
  id: string;
  openedAt: string | Date;
  closedAt: string | Date | null;
  openingAmount: number;
  closingAmountExpected: number | null;
  closingAmountCounted: number | null;
  deliveredAmount: number | null;
  difference: number | null;
  status: "OPEN" | "CLOSED" | "CLOSED_WITH_DIFFERENCE" | "PENDING_REVIEW";
  receivedBy: string | null;
  notes: string | null;
  user: { id: string; nombre: string };
  summary: {
    cashSales: number;
    transferSales: number;
    cardSales: number;
    manualIncome: number;
    expenses: number;
    withdrawals: number;
    expectedCash: number;
  };
  movements: Array<{
    id: string;
    type: "INCOME" | "EXPENSE" | "WITHDRAWAL" | "ADJUSTMENT";
    amount: number;
    description: string;
    createdAt: string | Date;
    createdBy: { nombre: string };
  }>;
};

function toDateKey(value: string | Date) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
}

function isRemoteImage(url: string | null) {
  return Boolean(url && /^https?:\/\//i.test(url));
}

async function optimizeImageBeforeUpload(file: File) {
  if (typeof window === "undefined" || file.size <= 2_000_000) {
    return file;
  }

  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");
  if (!context) {
    bitmap.close();
    return file;
  }

  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, "image/webp", 0.82);
  });

  if (!blob) {
    return file;
  }

  const baseName = file.name.replace(/\.[^.]+$/, "") || "producto";
  return new File([blob], `${baseName}.webp`, { type: "image/webp" });
}

async function request(url: string, options: RequestInit = {}) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(result.error || "No se pudo completar la operación.");
    }
    return result;
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error("La solicitud tardó demasiado. Intenta de nuevo.");
    }

    if (error instanceof TypeError) {
      throw new Error("No se pudo conectar con el servidor. Si la imagen es muy pesada, intenta con una más liviana.");
    }

    throw error;
  } finally {
    window.clearTimeout(timeout);
  }
}

export function DashboardClient({
  metrics,
  recentSales,
}: {
  metrics: { totalToday: number; transactionsToday: number; averageTicket: number; salesToday: number };
  recentSales: Sale[];
}) {
  return (
    <div className="space-y-6">
      <SectionTitle title="Dashboard" subtitle="Resumen operativo del día sin pantallas en blanco ni métricas vacías." />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Ventas del día" value={String(metrics.salesToday)} />
        <StatCard label="Total vendido" value={formatCop(metrics.totalToday)} />
        <StatCard label="Ticket promedio" value={formatCop(metrics.averageTicket)} />
        <StatCard label="Transacciones" value={String(metrics.transactionsToday)} />
      </div>
      <Card className="space-y-4">
        <SectionTitle title="Últimas ventas" subtitle="Historial reciente para revisar rápidamente caja e impresión." />
        {recentSales.length ? (
          <div className="space-y-3">
            {recentSales.slice(0, 8).map((sale) => (
              <div key={sale.id} className="flex flex-col gap-2 rounded-2xl border border-stone-800 p-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="font-semibold text-stone-100">Venta #{sale.numeroVenta}</p>
                  <p className="text-sm text-stone-400">{formatDateTime(sale.fecha)} • {sale.cajero.nombre}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-amber-300">{formatCop(sale.total)}</p>
                  <p className="text-sm text-stone-400">{paymentMethodLabel(sale.metodoPago)}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState title="Sin ventas todavía" description="El dashboard siempre muestra cero si aún no hay transacciones registradas." />
        )}
      </Card>
    </div>
  );
}

export function CategoriesClient({ categories }: { categories: Category[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState({ nombre: "", activa: true });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function submit() {
    setError("");
    try {
      await request(editingId ? `/api/categories/${editingId}` : "/api/categories", {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      setForm({ nombre: "", activa: true });
      setEditingId(null);
      startTransition(() => router.refresh());
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "No se pudo guardar la categoría.");
    }
  }

  async function remove(id: string) {
    try {
      await request(`/api/categories/${id}`, { method: "DELETE" });
      startTransition(() => router.refresh());
    } catch (removeError) {
      setError(removeError instanceof Error ? removeError.message : "No se pudo eliminar la categoría.");
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1.2fr_.8fr]">
      <Card className="space-y-4">
        <SectionTitle title="Categorías" subtitle="Activa, desactiva o crea categorías visibles en el POS." />
        {error ? <Banner tone="error">{error}</Banner> : null}
        {categories.length ? (
          <div className="space-y-3">
            {categories.map((category) => (
              <div key={category.id} className="flex flex-col gap-3 rounded-2xl border border-stone-800 p-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="font-semibold">{category.nombre}</p>
                  <p className="text-sm text-stone-400">{category.activa ? "Activa en POS y admin" : "Oculta temporalmente"}</p>
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" onClick={() => {
                    setEditingId(category.id);
                    setForm({ nombre: category.nombre, activa: category.activa });
                  }}>
                    Editar
                  </Button>
                  <Button variant="danger" onClick={() => remove(category.id)}>
                    Eliminar
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState title="No hay categorías" description="Crea la primera categoría para organizar el catálogo." />
        )}
      </Card>

      <Card className="space-y-4">
        <SectionTitle title={editingId ? "Editar categoría" : "Nueva categoría"} />
        <Input placeholder="Nombre" value={form.nombre} onChange={(event) => setForm((current) => ({ ...current, nombre: event.target.value }))} />
        <label className="flex items-center gap-2 text-sm text-stone-300">
          <input type="checkbox" checked={form.activa} onChange={(event) => setForm((current) => ({ ...current, activa: event.target.checked }))} />
          Activa
        </label>
        <Button busy={pending} onClick={submit}>
          {editingId ? "Guardar cambios" : "Crear categoría"}
        </Button>
      </Card>
    </div>
  );
}

export function ProductsClient({
  products,
  categories,
}: {
  products: Product[];
  categories: Category[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [editing, setEditing] = useState<Product | null>(null);
  const emptyForm = {
    nombre: "",
    descripcion: "",
    precio: "",
    categoriaId: categories[0]?.id ?? "",
    imagenUrl: "",
    stock: "0",
    activo: true,
    variants: [] as Array<{ id?: string; nombreVariante: string; precio: string }>,
  };
  const [form, setForm] = useState(emptyForm);
  const [preview, setPreview] = useState("");
  const [uploading, setUploading] = useState(false);

  const filtered = useMemo(() => {
    return products.filter((product) => {
      const matchesName = product.nombre.toLowerCase().includes(query.toLowerCase());
      const matchesCategory = categoryFilter ? product.categoriaId === categoryFilter : true;
      return matchesName && matchesCategory;
    });
  }, [products, query, categoryFilter]);

  async function handleUpload(file: File | null) {
    if (!file) {
      return;
    }
    setUploading(true);
    setError("");
    try {
      const optimizedFile = await optimizeImageBeforeUpload(file);
      const data = new FormData();
      data.append("file", optimizedFile);
      const result = await request("/api/upload", { method: "POST", body: data });
      setForm((current) => ({ ...current, imagenUrl: result.url }));
      setPreview(result.url);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "No se pudo subir la imagen.");
    } finally {
      setUploading(false);
    }
  }

  function loadProduct(product: Product) {
    setEditing(product);
    setPreview(product.imagenUrl || "");
    setForm({
      nombre: product.nombre,
      descripcion: product.descripcion || "",
      precio: product.precio ? String(product.precio) : "",
      categoriaId: product.categoriaId,
      imagenUrl: product.imagenUrl || "",
      stock: String(product.stock),
      activo: product.activo,
      variants: product.variants.map((variant) => ({
        id: variant.id,
        nombreVariante: variant.nombreVariante,
        precio: String(variant.precio),
      })),
    });
  }

  async function submit() {
    setError("");
    try {
      await request(editing ? `/api/products/${editing.id}` : "/api/products", {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          precio: form.precio ? Number(form.precio) : null,
          stock: Number(form.stock || "0"),
          variants: form.variants.map((variant) => ({
            ...variant,
            precio: Number(variant.precio || 0),
          })),
        }),
      });
      setEditing(null);
      setPreview("");
      setForm(emptyForm);
      startTransition(() => router.refresh());
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "No se pudo guardar el producto.");
    }
  }

  async function remove(id: string) {
    try {
      await request(`/api/products/${id}`, { method: "DELETE" });
      startTransition(() => router.refresh());
    } catch (removeError) {
      setError(removeError instanceof Error ? removeError.message : "No se pudo eliminar el producto.");
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1.25fr_.75fr]">
      <Card className="space-y-4">
        <SectionTitle title="Productos" subtitle="Busca, filtra y actualiza el catálogo del POS." />
        <div className="grid gap-3 md:grid-cols-[1fr_240px]">
          <Input placeholder="Buscar por nombre" value={query} onChange={(event) => setQuery(event.target.value)} />
          <Select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}>
            <option value="">Todas las categorías</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>{category.nombre}</option>
            ))}
          </Select>
        </div>
        {error ? <Banner tone="error">{error}</Banner> : null}
        {filtered.length ? (
          <div className="space-y-3">
            {filtered.map((product) => (
              <div key={product.id} className="grid gap-3 rounded-2xl border border-stone-800 p-4 md:grid-cols-[80px_1fr_auto] md:items-center">
                <div className="relative h-20 w-20 overflow-hidden rounded-2xl bg-stone-950">
                  <Image
                    src={product.imagenUrl || "/placeholder-food.svg"}
                    alt={product.nombre}
                    fill
                    className="object-cover"
                    sizes="80px"
                    unoptimized={isRemoteImage(product.imagenUrl)}
                  />
                </div>
                <div>
                  <p className="font-semibold text-stone-100">{product.nombre}</p>
                  <p className="text-sm text-stone-400">{product.categoria.nombre}</p>
                  <p className="text-sm text-amber-300">{product.variants.length ? `Variantes: ${product.variants.length}` : formatCop(product.precio || 0)}</p>
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" onClick={() => loadProduct(product)}>Editar</Button>
                  <Button variant="danger" onClick={() => remove(product.id)}>Eliminar</Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState title="No hay productos" description="Crea productos o ajusta los filtros de búsqueda." />
        )}
      </Card>

      <Card className="space-y-4">
        <SectionTitle title={editing ? "Editar producto" : "Nuevo producto"} />
        <Input placeholder="Nombre" value={form.nombre} onChange={(event) => setForm((current) => ({ ...current, nombre: event.target.value }))} />
        <TextArea placeholder="Descripción" value={form.descripcion} onChange={(event) => setForm((current) => ({ ...current, descripcion: event.target.value }))} />
        <div className="grid grid-cols-2 gap-3">
          <Input placeholder="Precio base" inputMode="numeric" value={form.precio} onChange={(event) => setForm((current) => ({ ...current, precio: event.target.value.replace(/\D/g, "") }))} />
          <Input placeholder="Stock" inputMode="numeric" value={form.stock} onChange={(event) => setForm((current) => ({ ...current, stock: event.target.value.replace(/\D/g, "") }))} />
        </div>
        <Select value={form.categoriaId} onChange={(event) => setForm((current) => ({ ...current, categoriaId: event.target.value }))}>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>{category.nombre}</option>
          ))}
        </Select>
        <label className="flex items-center gap-2 text-sm text-stone-300">
          <input type="checkbox" checked={form.activo} onChange={(event) => setForm((current) => ({ ...current, activo: event.target.checked }))} />
          Producto activo
        </label>
        <div className="rounded-2xl border border-dashed border-stone-700 p-4">
          <label className="flex cursor-pointer items-center gap-2 text-sm text-stone-200">
            <Upload className="h-4 w-4" />
            {uploading ? "Subiendo imagen..." : "Subir imagen JPG, PNG o WEBP"}
            <input type="file" accept=".jpg,.jpeg,.png,.webp" className="hidden" onChange={(event) => handleUpload(event.target.files?.[0] || null)} />
          </label>
          {preview ? (
            <div className="relative mt-4 h-40 overflow-hidden rounded-2xl bg-stone-950">
              <Image
                src={preview}
                alt="Vista previa"
                fill
                className="object-cover"
                sizes="320px"
                unoptimized={isRemoteImage(preview)}
              />
            </div>
          ) : null}
        </div>

        <div className="space-y-2 rounded-2xl border border-stone-800 p-4">
          <div className="flex items-center justify-between">
            <p className="font-semibold text-stone-100">Variantes</p>
            <Button
              variant="ghost"
              className="px-3 py-2 text-xs"
              onClick={() => setForm((current) => ({ ...current, variants: [...current.variants, { nombreVariante: "", precio: "" }] }))}
            >
              <Plus className="h-4 w-4" />
              Agregar variante
            </Button>
          </div>
          {form.variants.map((variant, index) => (
            <div key={`${variant.id || "new"}-${index}`} className="grid grid-cols-[1fr_140px_auto] gap-2">
              <Input placeholder="Nombre variante" value={variant.nombreVariante} onChange={(event) => setForm((current) => ({
                ...current,
                variants: current.variants.map((currentVariant, currentIndex) => currentIndex === index ? { ...currentVariant, nombreVariante: event.target.value } : currentVariant),
              }))} />
              <Input placeholder="Precio" inputMode="numeric" value={variant.precio} onChange={(event) => setForm((current) => ({
                ...current,
                variants: current.variants.map((currentVariant, currentIndex) => currentIndex === index ? { ...currentVariant, precio: event.target.value.replace(/\D/g, "") } : currentVariant),
              }))} />
              <Button variant="danger" onClick={() => setForm((current) => ({ ...current, variants: current.variants.filter((_, currentIndex) => currentIndex !== index) }))}>
                X
              </Button>
            </div>
          ))}
        </div>

        <Button busy={pending} onClick={submit}>{editing ? "Guardar cambios" : "Crear producto"}</Button>
      </Card>
    </div>
  );
}

export function UsersClient({
  users,
  currentUserRole,
}: {
  users: User[];
  currentUserRole: Role;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    nombre: "",
    email: "",
    rol: "CASHIER" as Role,
    activo: true,
    password: "",
  });

  async function submit() {
    setError("");
    try {
      await request(editingId ? `/api/users/${editingId}` : "/api/users", {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      setEditingId(null);
      setForm({ nombre: "", email: "", rol: "CASHIER", activo: true, password: "" });
      startTransition(() => router.refresh());
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "No se pudo guardar el usuario.");
    }
  }

  async function toggle(user: User) {
    try {
      await request(`/api/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: user.nombre,
          email: user.email,
          rol: user.rol,
          activo: !user.activo,
        }),
      });
      startTransition(() => router.refresh());
    } catch (toggleError) {
      setError(toggleError instanceof Error ? toggleError.message : "No se pudo actualizar el usuario.");
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1.15fr_.85fr]">
      <Card className="space-y-4">
        <SectionTitle title="Usuarios" subtitle="Gestiona cajeros y administradores sin romper permisos críticos." />
        {error ? <Banner tone="error">{error}</Banner> : null}
        {users.length ? (
          <div className="space-y-3">
            {users.map((user) => (
              <div key={user.id} className="flex flex-col gap-3 rounded-2xl border border-stone-800 p-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="font-semibold">{user.nombre}</p>
                  <p className="text-sm text-stone-400">{user.email}</p>
                  <p className="text-sm text-amber-300">{roleLabel(user.rol)}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="ghost" onClick={() => {
                    setEditingId(user.id);
                    setForm({ nombre: user.nombre, email: user.email, rol: user.rol, activo: user.activo, password: "" });
                  }}>
                    Editar
                  </Button>
                  <Button variant="ghost" onClick={() => toggle(user)}>
                    {user.activo ? "Desactivar" : "Activar"}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState title="No hay usuarios" description="Crea un usuario para caja o administración." />
        )}
      </Card>

      <Card className="space-y-4">
        <SectionTitle title={editingId ? "Editar usuario" : "Nuevo usuario"} />
        {currentUserRole !== "PRINCIPAL_ADMIN" ? <Banner tone="error">Solo el administrador principal puede gestionar usuarios.</Banner> : null}
        <Input placeholder="Nombre" value={form.nombre} onChange={(event) => setForm((current) => ({ ...current, nombre: event.target.value }))} />
        <Input placeholder="Correo" value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} />
        <Select value={form.rol} onChange={(event) => setForm((current) => ({ ...current, rol: event.target.value as Role }))}>
          <option value="CASHIER">Cajero</option>
          <option value="SECONDARY_ADMIN">Administrador secundario</option>
          <option value="PRINCIPAL_ADMIN">Administrador principal</option>
        </Select>
        <Input placeholder={editingId ? "Nueva contraseña opcional" : "Contraseña temporal"} value={form.password} onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))} type="password" />
        <label className="flex items-center gap-2 text-sm text-stone-300">
          <input type="checkbox" checked={form.activo} onChange={(event) => setForm((current) => ({ ...current, activo: event.target.checked }))} />
          Usuario activo
        </label>
        <Button busy={pending} onClick={submit} disabled={currentUserRole !== "PRINCIPAL_ADMIN"}>
          {editingId ? "Guardar cambios" : "Crear usuario"}
        </Button>
      </Card>
    </div>
  );
}

export function SettingsClient({ settings }: { settings: Settings }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [form, setForm] = useState(settings);

  async function submit() {
    setError("");
    try {
      await request("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      startTransition(() => router.refresh());
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "No se pudo guardar la configuración.");
    }
  }

  return (
    <Card className="max-w-3xl space-y-4">
      <SectionTitle title="Configuración del negocio" subtitle="Datos usados en POS, dashboard e impresión térmica." />
      {error ? <Banner tone="error">{error}</Banner> : null}
      <Input placeholder="Nombre del negocio" value={form.nombreNegocio} onChange={(event) => setForm((current) => ({ ...current, nombreNegocio: event.target.value }))} />
      <Input placeholder="Dirección" value={form.direccion} onChange={(event) => setForm((current) => ({ ...current, direccion: event.target.value }))} />
      <Input placeholder="Teléfono" value={form.telefono} onChange={(event) => setForm((current) => ({ ...current, telefono: event.target.value }))} />
      <TextArea placeholder="Mensaje del ticket" value={form.mensajeTicket} onChange={(event) => setForm((current) => ({ ...current, mensajeTicket: event.target.value }))} />
      <Button busy={pending} onClick={submit}>Guardar configuración</Button>
    </Card>
  );
}

export function SalesClient({
  sales,
  settings,
}: {
  sales: Sale[];
  settings: Settings;
}) {
  const [query, setQuery] = useState("");
  const [date, setDate] = useState("");
  const [selected, setSelected] = useState<Sale | null>(null);

  const filtered = useMemo(() => {
    return sales.filter((sale) => {
      const matchesQuery = query ? String(sale.numeroVenta).includes(query) : true;
      const matchesDate = date ? toDateKey(sale.fecha) === date : true;
      return matchesQuery && matchesDate;
    });
  }, [sales, query, date]);

  return (
    <div className="space-y-6">
      <SectionTitle title="Historial de ventas" subtitle="Filtra por fecha, busca por número de venta y reimprime cuando haga falta." />
      <Card className="space-y-4">
        <div className="grid gap-3 md:grid-cols-[1fr_220px]">
          <Input placeholder="Buscar por número de venta" value={query} onChange={(event) => setQuery(event.target.value.replace(/\D/g, ""))} />
          <Input type="date" value={date} onChange={(event) => setDate(event.target.value)} />
        </div>
        {filtered.length ? (
          <div className="space-y-3">
            {filtered.map((sale) => (
              <div key={sale.id} className="rounded-2xl border border-stone-800 p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="font-semibold text-stone-100">Venta #{sale.numeroVenta}</p>
                    <p className="text-sm text-stone-400">{formatDateTime(sale.fecha)} • {sale.cajero.nombre}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-lg font-black text-amber-300">{formatCop(sale.total)}</span>
                    <Button variant="ghost" onClick={() => setSelected(sale)}>
                      <Printer className="h-4 w-4" />
                      Reimprimir
                    </Button>
                  </div>
                </div>
                <div className="mt-3 grid gap-2 text-sm text-stone-400">
                  {sale.items.map((item) => (
                    <div key={item.id} className="flex justify-between gap-3">
                      <span>{item.cantidad} x {item.nombreProducto}{item.nombreVariante ? ` (${item.nombreVariante})` : ""}</span>
                      <span>{formatCop(item.totalLinea)}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState title="No hay ventas para mostrar" description="Prueba otro filtro o espera a que se registren transacciones." />
        )}
      </Card>
      <TicketPrintSheet sale={selected} settings={settings} autoPrint={Boolean(selected)} />
    </div>
  );
}

export function ReportsClient({ sales, products }: { sales: Sale[]; products: Product[] }) {
  const productMap = new Map<string, { nombre: string; cantidad: number }>();
  const paymentMap = new Map<string, number>();
  const dateMap = new Map<string, number>();

  for (const sale of sales) {
    paymentMap.set(sale.metodoPago, (paymentMap.get(sale.metodoPago) || 0) + sale.total);
    const dateKey = toDateKey(sale.fecha);
    dateMap.set(dateKey, (dateMap.get(dateKey) || 0) + sale.total);
    for (const item of sale.items) {
      const current = productMap.get(item.nombreProducto) || { nombre: item.nombreProducto, cantidad: 0 };
      current.cantidad += item.cantidad;
      productMap.set(item.nombreProducto, current);
    }
  }

  const topProducts = Array.from(productMap.values()).sort((a, b) => b.cantidad - a.cantidad).slice(0, 10);
  const payments = Array.from(paymentMap.entries());
  const salesByDate = Array.from(dateMap.entries()).sort((a, b) => a[0].localeCompare(b[0]));

  return (
    <div className="space-y-6">
      <SectionTitle title="Reportes" subtitle="Resumen práctico de productos, métodos de pago y ventas por fecha." />
      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="space-y-3">
          <h3 className="text-lg font-bold text-stone-50">Productos más vendidos</h3>
          {topProducts.length ? topProducts.map((item) => (
            <div key={item.nombre} className="flex justify-between gap-3 text-sm">
              <span>{item.nombre}</span>
              <span>{item.cantidad} uds</span>
            </div>
          )) : <EmptyState title="Sin datos" description="Aún no hay ventas para calcular ranking." />}
        </Card>
        <Card className="space-y-3">
          <h3 className="text-lg font-bold text-stone-50">Ventas por método de pago</h3>
          {payments.length ? payments.map(([method, total]) => (
            <div key={method} className="flex justify-between gap-3 text-sm">
              <span>{paymentMethodLabel(method as "CASH" | "TRANSFER" | "CARD")}</span>
              <span>{formatCop(total)}</span>
            </div>
          )) : <EmptyState title="Sin datos" description="Todavía no hay pagos registrados." />}
        </Card>
        <Card className="space-y-3">
          <h3 className="text-lg font-bold text-stone-50">Ventas por fecha</h3>
          {salesByDate.length ? salesByDate.map(([date, total]) => (
            <div key={date} className="flex justify-between gap-3 text-sm">
              <span>{date}</span>
              <span>{formatCop(total)}</span>
            </div>
          )) : <EmptyState title="Sin datos" description="Los totales diarios aparecerán aquí." />}
        </Card>
      </div>
      <Card className="space-y-4">
        <SectionTitle title="Catálogo actual" subtitle="Referencia rápida del número de productos activos e inventario cargado." />
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Productos" value={String(products.length)} />
          <StatCard label="Activos" value={String(products.filter((product) => product.activo).length)} />
          <StatCard label="Con imagen" value={String(products.filter((product) => Boolean(product.imagenUrl)).length)} />
          <StatCard label="Con variantes" value={String(products.filter((product) => product.variants.length > 0).length)} />
        </div>
      </Card>
    </div>
  );
}

export function InventoryClient({ products }: { products: Product[] }) {
  return (
    <Card className="space-y-4">
      <SectionTitle title="Inventario básico" subtitle="Visible desde ahora, sin bloquear ventas si un producto llega a cero." />
      {products.length ? (
        <div className="space-y-3">
          {products.map((product) => (
            <div key={product.id} className="flex flex-col gap-2 rounded-2xl border border-stone-800 p-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="font-semibold">{product.nombre}</p>
                <p className="text-sm text-stone-400">{product.categoria.nombre}</p>
              </div>
              <div className="text-right">
                <p className="font-bold text-stone-50">Stock {product.stock}</p>
                <p className="text-sm text-stone-400">{product.activo ? "Activo" : "Inactivo"}</p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState title="Inventario vacío" description="Cuando agregues productos verás aquí el stock inicial y futuros movimientos." />
      )}
    </Card>
  );
}

export function CashClosuresClient({
  cashShifts,
}: {
  cashShifts: CashClosure[];
}) {
  const router = useRouter();
  const [date, setDate] = useState("");
  const [cashier, setCashier] = useState("");
  const [selected, setSelected] = useState<CashClosure | null>(null);
  const [manualCounted, setManualCounted] = useState("");
  const [manualDelivered, setManualDelivered] = useState("");
  const [manualReceivedBy, setManualReceivedBy] = useState("");
  const [manualNotes, setManualNotes] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const cashiers = Array.from(new Set(cashShifts.map((shift) => shift.user.nombre))).sort();
  const filtered = useMemo(() => {
    return cashShifts.filter((shift) => {
      const matchesDate = date ? toDateKey(shift.openedAt) === date || toDateKey(shift.closedAt || shift.openedAt) === date : true;
      const matchesCashier = cashier ? shift.user.nombre === cashier : true;
      return matchesDate && matchesCashier;
    });
  }, [cashShifts, date, cashier]);

  return (
    <div className="space-y-6">
      <SectionTitle title="Cierres de caja" subtitle="Consulta aperturas, cierres, diferencias y detalle de movimientos por cajero." />
      {error ? <Banner tone="error">{error}</Banner> : null}
      <Card className="space-y-4">
        <div className="grid gap-3 md:grid-cols-[220px_240px]">
          <Input type="date" value={date} onChange={(event) => setDate(event.target.value)} />
          <Select value={cashier} onChange={(event) => setCashier(event.target.value)}>
            <option value="">Todos los cajeros</option>
            {cashiers.map((name) => (
              <option key={name} value={name}>{name}</option>
            ))}
          </Select>
        </div>
        {filtered.length ? (
          <div className="space-y-3">
            {filtered.map((shift) => (
              <div key={shift.id} className="rounded-2xl border border-stone-800 p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="font-semibold text-stone-100">{shift.user.nombre}</p>
                    <p className="text-sm text-stone-400">
                      Apertura: {formatDateTime(shift.openedAt)} {shift.closedAt ? `• Cierre: ${formatDateTime(shift.closedAt)}` : "• Sigue abierto"}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-amber-300">{cashShiftStatusLabel(shift.status)}</p>
                    <p className="text-sm text-stone-400">Diferencia {formatCop(shift.difference || 0)}</p>
                  </div>
                </div>
                <div className="mt-3 grid gap-2 text-sm text-stone-300 md:grid-cols-4">
                  <div>Monto inicial: {formatCop(shift.openingAmount)}</div>
                  <div>Ventas efectivo: {formatCop(shift.summary.cashSales)}</div>
                  <div>Esperado: {formatCop(shift.closingAmountExpected ?? shift.summary.expectedCash)}</div>
                  <div>Contado: {formatCop(shift.closingAmountCounted ?? 0)}</div>
                </div>
                <div className="mt-3">
                  <Button variant="ghost" onClick={() => {
                    setSelected(shift);
                    setManualCounted(String(shift.closingAmountCounted ?? shift.summary.expectedCash));
                    setManualDelivered(String(shift.deliveredAmount ?? shift.summary.expectedCash));
                    setManualReceivedBy(shift.receivedBy ?? "");
                    setManualNotes(shift.notes ?? "");
                  }}>Ver detalle</Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState title="Sin cierres registrados" description="Cuando los cajeros abran y cierren turnos aparecerán aquí." />
        )}
      </Card>

      {selected ? (
        <Card className="space-y-4">
          <SectionTitle title={`Detalle de ${selected.user.nombre}`} subtitle={`Estado: ${cashShiftStatusLabel(selected.status)}`} action={<Button variant="ghost" onClick={() => setSelected(null)}>Cerrar detalle</Button>} />
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Monto inicial" value={formatCop(selected.openingAmount)} />
            <StatCard label="Ventas efectivo" value={formatCop(selected.summary.cashSales)} />
            <StatCard label="Esperado" value={formatCop(selected.closingAmountExpected ?? selected.summary.expectedCash)} />
            <StatCard label="Contado" value={formatCop(selected.closingAmountCounted ?? 0)} />
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Transferencia" value={formatCop(selected.summary.transferSales)} />
            <StatCard label="Tarjeta" value={formatCop(selected.summary.cardSales)} />
            <StatCard label="Ingresos" value={formatCop(selected.summary.manualIncome)} />
            <StatCard label="Retiros y salidas" value={formatCop(selected.summary.expenses + selected.summary.withdrawals)} />
          </div>
          <Card className="space-y-2 border-stone-700">
            <p className="font-semibold text-stone-50">Entrega y observaciones</p>
            <p className="text-sm text-stone-300">Entregado: {formatCop(selected.deliveredAmount ?? 0)}</p>
            <p className="text-sm text-stone-300">Recibe: {selected.receivedBy || "Sin registrar"}</p>
            <p className="text-sm text-stone-300">Notas: {selected.notes || "Sin observaciones"}</p>
          </Card>
          <div className="space-y-2">
            <p className="font-semibold text-stone-50">Movimientos manuales</p>
            {selected.movements.length ? selected.movements.map((movement) => (
              <div key={movement.id} className="flex flex-col gap-1 rounded-2xl border border-stone-800 p-3 text-sm md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-stone-100">{cashMovementTypeLabel(movement.type)} - {movement.description}</p>
                  <p className="text-stone-400">{formatDateTime(movement.createdAt)} • {movement.createdBy.nombre}</p>
                </div>
                <strong className="text-amber-300">{formatCop(movement.amount)}</strong>
              </div>
            )) : <p className="text-sm text-stone-400">No hubo movimientos manuales.</p>}
          </div>
          {selected.status === "OPEN" ? (
            <Card className="space-y-3 border-amber-600/30">
              <p className="font-semibold text-stone-50">Cierre manual por administrador</p>
              <div className="grid gap-3 md:grid-cols-2">
                <Input value={manualCounted} onChange={(event) => setManualCounted(event.target.value.replace(/\D/g, ""))} placeholder="Efectivo contado" inputMode="numeric" />
                <Input value={manualDelivered} onChange={(event) => setManualDelivered(event.target.value.replace(/\D/g, ""))} placeholder="Monto entregado" inputMode="numeric" />
              </div>
              <Input value={manualReceivedBy} onChange={(event) => setManualReceivedBy(event.target.value)} placeholder="Recibido por" />
              <TextArea value={manualNotes} onChange={(event) => setManualNotes(event.target.value)} placeholder="Observaciones" />
              <Button
                busy={busy}
                onClick={async () => {
                  setBusy(true);
                  setError("");
                  try {
                    await request(`/api/cash-shifts/${selected.id}/close`, {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        closingAmountCounted: Number(manualCounted || 0),
                        deliveredAmount: Number(manualDelivered || 0),
                        receivedBy: manualReceivedBy,
                        notes: manualNotes,
                      }),
                    });
                    setSelected(null);
                    router.refresh();
                  } catch (requestError) {
                    setError(requestError instanceof Error ? requestError.message : "No se pudo cerrar manualmente el turno.");
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                Cerrar turno manualmente
              </Button>
            </Card>
          ) : null}
        </Card>
      ) : null}
    </div>
  );
}
