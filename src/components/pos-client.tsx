"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CircleUserRound, CreditCard, Landmark, Minus, Plus, Receipt, Search, ShieldCheck, ShoppingBasket, Trash2 } from "lucide-react";
import { Banner, Button, Card, EmptyState, Input } from "@/components/ui";
import { formatCop } from "@/lib/format";
import { REQUEST_TIMEOUT } from "@/lib/constants";
import { TicketPrintSheet, printSaleTicket, type PrintableSale } from "@/components/ticket-print-sheet";
import { CashShiftPanel } from "@/components/cash-shift-panel";

type Variant = { id: string; nombreVariante: string; precio: number };
type Product = {
  id: string;
  nombre: string;
  descripcion: string | null;
  precio: number | null;
  imagenUrl: string | null;
  stock: number;
  categoriaId: string;
  variants: Variant[];
};
type Category = { id: string; nombre: string; products: Product[] };
type User = { nombre: string; rol: "PRINCIPAL_ADMIN" | "SECONDARY_ADMIN" | "CASHIER" };
type ShiftSummary = {
  openingAmount: number;
  cashSales: number;
  transferSales: number;
  cardSales: number;
  manualIncome: number;
  expenses: number;
  withdrawals: number;
  adjustments: number;
  expectedCash: number;
};
type CurrentShift = {
  id: string;
  openedAt: string | Date;
  status: "OPEN" | "CLOSED" | "CLOSED_WITH_DIFFERENCE" | "PENDING_REVIEW";
  user: { nombre: string };
  movements: Array<{
    id: string;
    type: "INCOME" | "EXPENSE" | "WITHDRAWAL" | "ADJUSTMENT";
    amount: number;
    description: string;
    createdAt: string | Date;
    createdBy: { nombre: string };
  }>;
};

type CartItem = {
  key: string;
  productId: string;
  variantId?: string | null;
  nombreProducto: string;
  nombreVariante?: string | null;
  precioUnitario: number;
  cantidad: number;
  observacion: string;
};

const paymentOptions = [
  { value: "CASH", label: "Efectivo", icon: Landmark },
  { value: "TRANSFER", label: "Transferencia", icon: Receipt },
  { value: "CARD", label: "Tarjeta", icon: CreditCard },
] as const;

function isRemoteImage(url: string | null) {
  return Boolean(url && /^https?:\/\//i.test(url));
}

export function PosClient({
  settings,
  categories,
  user,
  canEnterAdmin,
  currentShift,
  currentShiftSummary,
}: {
  settings: { nombreNegocio: string; direccion: string; telefono: string; mensajeTicket: string };
  categories: Category[];
  user: User;
  canEnterAdmin: boolean;
  currentShift: CurrentShift | null;
  currentShiftSummary: ShiftSummary | null;
}) {
  const router = useRouter();
  const [activeCategoryId, setActiveCategoryId] = useState(categories[0]?.id ?? "");
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [variantPicker, setVariantPicker] = useState<Product | null>(null);
  const [showCheckout, setShowCheckout] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"CASH" | "TRANSFER" | "CARD">("CASH");
  const [amountReceived, setAmountReceived] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [successSale, setSuccessSale] = useState<PrintableSale | null>(null);
  const [autoPrint, setAutoPrint] = useState(false);
  const [logoutError, setLogoutError] = useState("");

  const visibleProducts = useMemo(() => {
    const base = categories.find((category) => category.id === activeCategoryId)?.products ?? [];
    const term = search.trim().toLowerCase();
    if (!term) {
      return base;
    }
    return base.filter((product) => product.nombre.toLowerCase().includes(term));
  }, [categories, activeCategoryId, search]);

  const subtotal = cart.reduce((sum, item) => sum + item.precioUnitario * item.cantidad, 0);
  const change = paymentMethod === "CASH" ? Math.max((Number(amountReceived) || 0) - subtotal, 0) : 0;

  function addProduct(product: Product, variant?: Variant) {
    const key = `${product.id}-${variant?.id ?? "base"}`;
    setCart((current) => {
      const index = current.findIndex((item) => item.key === key);
      if (index >= 0) {
        return current.map((item, currentIndex) =>
          currentIndex === index ? { ...item, cantidad: item.cantidad + 1 } : item,
        );
      }
      return [
        ...current,
        {
          key,
          productId: product.id,
          variantId: variant?.id,
          nombreProducto: product.nombre,
          nombreVariante: variant?.nombreVariante ?? null,
          precioUnitario: variant?.precio ?? product.precio ?? 0,
          cantidad: 1,
          observacion: "",
        },
      ];
    });
    setVariantPicker(null);
  }

  async function confirmSale() {
    if (!currentShift) {
      setError("Debes abrir caja antes de registrar ventas.");
      return;
    }
    if (!cart.length) {
      setError("Agrega al menos un producto al pedido.");
      return;
    }

    if (paymentMethod === "CASH" && (Number(amountReceived) || 0) < subtotal) {
      setError("El monto recibido debe ser mayor o igual al total.");
      return;
    }

    setSubmitting(true);
    setError("");

    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

    try {
      const response = await fetch("/api/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          metodoPago: paymentMethod,
          montoRecibido: paymentMethod === "CASH" ? Number(amountReceived) : null,
          items: cart,
        }),
        signal: controller.signal,
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "No fue posible registrar la venta.");
      }

      setSuccessSale(result.sale);
      setCart([]);
      setAmountReceived("");
      setShowCheckout(false);
      setAutoPrint(true);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "No fue posible registrar la venta.");
    } finally {
      window.clearTimeout(timeout);
      setSubmitting(false);
    }
  }

  async function logout() {
    setLogoutError("");
    const response = await fetch("/api/auth/logout", { method: "POST" });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      setLogoutError(result.error || "No fue posible cerrar sesión.");
      return;
    }
    router.push("/login");
    router.refresh();
  }

  return (
    <>
      <div className="grid min-h-screen grid-cols-1 bg-[radial-gradient(circle_at_top,_rgba(245,158,11,.18),transparent_25%),linear-gradient(180deg,#17120e_0%,#0f0d0b_100%)] text-stone-100 xl:grid-cols-[1fr_430px]">
        <section className="p-4 md:p-6">
          <div className="mb-4 flex flex-col gap-4 rounded-[28px] border border-stone-800 bg-stone-950/70 p-5 backdrop-blur md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-amber-300">Punto de venta</p>
              <h1 className="text-3xl font-black">{settings.nombreNegocio}</h1>
              <p className="text-sm text-stone-400">{settings.direccion}</p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="rounded-2xl border border-stone-800 px-4 py-3 text-sm">
                <div className="flex items-center gap-2 text-stone-300">
                  <CircleUserRound className="h-4 w-4" />
                  {user.nombre}
                </div>
              </div>
              <div className="rounded-2xl border border-emerald-700 bg-emerald-950/40 px-4 py-3 text-sm text-emerald-200">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4" />
                  Sesión activa
                </div>
              </div>
              {canEnterAdmin ? (
                <a href="/admin" className="rounded-2xl bg-amber-500 px-4 py-3 text-sm font-semibold text-stone-950 transition hover:bg-amber-400">
                  Ir al admin
                </a>
              ) : null}
              <Button variant="ghost" onClick={logout}>
                Salir
              </Button>
            </div>
          </div>

          {logoutError ? <Banner tone="error">{logoutError}</Banner> : null}
          {!currentShift ? (
            <Banner tone="error">No hay turno abierto. Debes abrir caja antes de vender o salir dejará el turno pendiente sin ventas.</Banner>
          ) : null}

          <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-wrap gap-3">
              {categories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => setActiveCategoryId(category.id)}
                  className={`rounded-2xl px-5 py-4 text-base font-semibold transition ${
                    activeCategoryId === category.id ? "bg-amber-500 text-stone-950" : "border border-stone-800 bg-stone-950/60 text-stone-200 hover:bg-stone-900"
                  }`}
                >
                  {category.nombre}
                </button>
              ))}
            </div>

            <div className="relative min-w-[260px]">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-500" />
              <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar producto..." className="pl-10" />
            </div>
          </div>

          {visibleProducts.length ? (
            <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-3">
              {visibleProducts.map((product) => (
                <button
                  key={product.id}
                  onClick={() => (product.variants.length ? setVariantPicker(product) : addProduct(product))}
                  className="group overflow-hidden rounded-[28px] border border-stone-800 bg-stone-900/70 text-left transition hover:border-amber-500/50 hover:bg-stone-900"
                >
                  <div className="relative h-48 bg-stone-950">
                    <Image
                      src={product.imagenUrl || "/placeholder-food.svg"}
                      alt={product.nombre}
                      fill
                      className="object-cover transition duration-300 group-hover:scale-105"
                      sizes="(max-width: 1024px) 100vw, 33vw"
                      unoptimized={isRemoteImage(product.imagenUrl)}
                    />
                  </div>
                  <div className="space-y-2 p-4">
                    <p className="text-lg font-bold text-stone-50">{product.nombre}</p>
                    <p className="text-sm text-stone-400">{product.descripcion || "Listo para agregar al pedido."}</p>
                    <div className="flex items-end justify-between gap-3">
                      <div>
                        <p className="text-xs uppercase tracking-[0.2em] text-stone-500">Precio</p>
                        <p className="text-2xl font-black text-amber-300">
                          {product.variants.length ? `Desde ${formatCop(Math.min(...product.variants.map((variant) => variant.precio)))}` : formatCop(product.precio ?? 0)}
                        </p>
                      </div>
                      <span className="rounded-full border border-stone-700 px-3 py-1 text-xs text-stone-300">Stock {product.stock}</span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <EmptyState title="No hay productos visibles" description="Prueba cambiando de categoría o ajustando la búsqueda." />
          )}

          <div className="mt-6">
            <CashShiftPanel
              userName={user.nombre}
              currentShift={currentShift}
              currentShiftSummary={currentShiftSummary}
              onShiftUpdated={async () => {
                router.refresh();
              }}
            />
          </div>
        </section>

        <aside className="border-t border-stone-800 bg-stone-950/80 p-4 backdrop-blur xl:border-l xl:border-t-0">
          <Card className="h-full space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-amber-300">Pedido actual</p>
                <h2 className="text-2xl font-black text-stone-50">Caja táctil</h2>
              </div>
              <ShoppingBasket className="h-6 w-6 text-amber-300" />
            </div>

            {error ? <Banner tone="error">{error}</Banner> : null}

            <div className="max-h-[58vh] space-y-3 overflow-y-auto pr-1">
              {cart.length ? (
                cart.map((item) => (
                  <div key={item.key} className="rounded-2xl border border-stone-800 bg-stone-950/60 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-stone-100">{item.nombreProducto}</p>
                        {item.nombreVariante ? <p className="text-sm text-stone-400">{item.nombreVariante}</p> : null}
                        <p className="text-sm font-semibold text-amber-300">{formatCop(item.precioUnitario)}</p>
                      </div>
                      <button onClick={() => setCart((current) => current.filter((currentItem) => currentItem.key !== item.key))} className="rounded-xl border border-stone-800 p-2 text-stone-400 transition hover:text-rose-300">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="mt-3 flex items-center gap-2">
                      <button
                        onClick={() =>
                          setCart((current) =>
                            current
                              .map((currentItem) =>
                                currentItem.key === item.key ? { ...currentItem, cantidad: currentItem.cantidad - 1 } : currentItem,
                              )
                              .filter((currentItem) => currentItem.cantidad > 0),
                          )
                        }
                        className="rounded-xl border border-stone-700 p-2"
                      >
                        <Minus className="h-4 w-4" />
                      </button>
                      <span className="min-w-8 text-center font-bold">{item.cantidad}</span>
                      <button
                        onClick={() =>
                          setCart((current) =>
                            current.map((currentItem) =>
                              currentItem.key === item.key ? { ...currentItem, cantidad: currentItem.cantidad + 1 } : currentItem,
                            ),
                          )
                        }
                        className="rounded-xl border border-stone-700 p-2"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                      <Input
                        value={item.observacion}
                        onChange={(event) =>
                          setCart((current) =>
                            current.map((currentItem) =>
                              currentItem.key === item.key ? { ...currentItem, observacion: event.target.value } : currentItem,
                            ),
                          )
                        }
                        placeholder="Observación"
                        className="py-2"
                      />
                    </div>
                  </div>
                ))
              ) : (
                <EmptyState title="Sin productos en el pedido" description="Toca una tarjeta del catálogo para empezar a vender." />
              )}
            </div>

            <div className="space-y-3 border-t border-stone-800 pt-4">
              <div className="flex justify-between text-stone-400">
                <span>Subtotal</span>
                <span>{formatCop(subtotal)}</span>
              </div>
              <div className="flex justify-between text-3xl font-black text-stone-50">
                <span>Total</span>
                <span>{formatCop(subtotal)}</span>
              </div>
              <Button className="w-full py-4 text-base" onClick={() => setShowCheckout(true)} disabled={!cart.length}>
                Cobrar pedido
              </Button>
            </div>
          </Card>
        </aside>
      </div>

      {variantPicker ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 p-4">
          <Card className="w-full max-w-xl space-y-4">
            <div>
              <h3 className="text-2xl font-black text-stone-50">{variantPicker.nombre}</h3>
              <p className="text-sm text-stone-400">Selecciona la variante o tamaño.</p>
            </div>
            <div className="grid gap-3">
              {variantPicker.variants.map((variant) => (
                <button
                  key={variant.id}
                  onClick={() => addProduct(variantPicker, variant)}
                  className="flex items-center justify-between rounded-2xl border border-stone-800 bg-stone-950/60 px-4 py-4 text-left transition hover:border-amber-500/50"
                >
                  <span>{variant.nombreVariante}</span>
                  <strong>{formatCop(variant.precio)}</strong>
                </button>
              ))}
            </div>
            <Button variant="ghost" onClick={() => setVariantPicker(null)}>
              Cerrar
            </Button>
          </Card>
        </div>
      ) : null}

      {showCheckout ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 p-4">
          <Card className="w-full max-w-2xl space-y-5">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-amber-300">Cobro</p>
              <h3 className="text-4xl font-black text-stone-50">{formatCop(subtotal)}</h3>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              {paymentOptions.map((option) => {
                const Icon = option.icon;
                return (
                  <button
                    key={option.value}
                    onClick={() => setPaymentMethod(option.value)}
                    className={`rounded-2xl border px-4 py-4 text-left transition ${
                      paymentMethod === option.value ? "border-amber-400 bg-amber-500/15" : "border-stone-800 bg-stone-950/60"
                    }`}
                  >
                    <Icon className="mb-2 h-5 w-5 text-amber-300" />
                    <p className="font-semibold">{option.label}</p>
                  </button>
                );
              })}
            </div>

            {paymentMethod === "CASH" ? (
              <div className="space-y-3">
                <Input value={amountReceived} onChange={(event) => setAmountReceived(event.target.value.replace(/\D/g, ""))} placeholder="Monto recibido" inputMode="numeric" />
                <div className="grid grid-cols-3 gap-2">
                  {[subtotal, Math.ceil(subtotal / 5000) * 5000, Math.ceil(subtotal / 10000) * 10000].map((amount, index) => (
                    <button key={`${amount}-${index}`} onClick={() => setAmountReceived(String(amount))} className="rounded-2xl border border-stone-800 px-3 py-3 text-sm hover:bg-stone-900">
                      {formatCop(amount)}
                    </button>
                  ))}
                </div>
                <Banner tone="info">Cambio: {formatCop(change)}</Banner>
              </div>
            ) : null}

            {error ? <Banner tone="error">{error}</Banner> : null}

            <div className="flex flex-col-reverse gap-3 md:flex-row md:justify-end">
              <Button variant="ghost" onClick={() => setShowCheckout(false)}>
                Cancelar
              </Button>
              <Button busy={submitting} onClick={confirmSale}>
                Confirmar y cobrar
              </Button>
            </div>
          </Card>
        </div>
      ) : null}

      {successSale ? (
        <div className="fixed bottom-4 right-4 z-30 max-w-md">
          <Banner tone="success">
            Venta #{successSale.numeroVenta} registrada correctamente.
            <div className="mt-3 flex gap-2">
              <Button className="px-3 py-2 text-xs" onClick={() => successSale ? printSaleTicket(successSale, settings) : null}>
                Imprimir
              </Button>
              <Button className="px-3 py-2 text-xs" variant="ghost" onClick={() => setSuccessSale(null)}>
                Cerrar
              </Button>
            </div>
          </Banner>
        </div>
      ) : null}

      <TicketPrintSheet sale={successSale} settings={settings} autoPrint={autoPrint} />
    </>
  );
}
