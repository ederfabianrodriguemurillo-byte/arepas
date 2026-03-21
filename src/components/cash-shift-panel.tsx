"use client";

import type { ComponentType } from "react";
import { useMemo, useState } from "react";
import { BanknoteArrowDown, BanknoteArrowUp, ClipboardList, DoorClosedLocked, DoorOpen, HandCoins, Wallet } from "lucide-react";
import { Banner, Button, Card, Input, Select, TextArea } from "@/components/ui";
import { cashMovementTypeLabel, cashShiftStatusLabel, formatCop, formatDateTime } from "@/lib/format";
import { REQUEST_TIMEOUT } from "@/lib/constants";

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

type ShiftMovement = {
  id: string;
  type: "INCOME" | "EXPENSE" | "WITHDRAWAL" | "ADJUSTMENT";
  amount: number;
  description: string;
  createdAt: string | Date;
  createdBy: { nombre: string };
};

type CurrentShift = {
  id: string;
  openedAt: string | Date;
  status: "OPEN" | "CLOSED" | "CLOSED_WITH_DIFFERENCE" | "PENDING_REVIEW";
  user: { nombre: string };
  movements: ShiftMovement[];
};

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
  } finally {
    window.clearTimeout(timeout);
  }
}

export function CashShiftPanel({
  userName,
  currentShift,
  currentShiftSummary,
  onShiftUpdated,
}: {
  userName: string;
  currentShift: CurrentShift | null;
  currentShiftSummary: ShiftSummary | null;
  onShiftUpdated: () => Promise<void> | void;
}) {
  const [openingAmount, setOpeningAmount] = useState("");
  const [movementType, setMovementType] = useState<"INCOME" | "EXPENSE" | "WITHDRAWAL" | "ADJUSTMENT">("INCOME");
  const [movementAmount, setMovementAmount] = useState("");
  const [movementDescription, setMovementDescription] = useState("");
  const [countedCash, setCountedCash] = useState("");
  const [deliveredAmount, setDeliveredAmount] = useState("");
  const [receivedBy, setReceivedBy] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [busy, setBusy] = useState(false);

  const expectedCash = currentShiftSummary?.expectedCash || 0;
  const difference = useMemo(() => (Number(countedCash) || 0) - expectedCash, [countedCash, expectedCash]);
  const differenceLabel = difference === 0 ? "En balance correcto" : difference > 0 ? "Sobrante" : "Faltante";

  async function openShift() {
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      await request("/api/cash-shifts/open", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ openingAmount: Number(openingAmount || 0) }),
      });
      setOpeningAmount("");
      setSuccess("Turno abierto correctamente.");
      await onShiftUpdated();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "No se pudo abrir la caja.");
    } finally {
      setBusy(false);
    }
  }

  async function saveMovement() {
    if (!currentShift) {
      setError("Debes abrir un turno antes de registrar movimientos.");
      return;
    }
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      await request(`/api/cash-shifts/${currentShift.id}/movements`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: movementType,
          amount: Number(movementAmount || 0),
          description: movementDescription,
        }),
      });
      setMovementAmount("");
      setMovementDescription("");
      setSuccess("Movimiento registrado.");
      await onShiftUpdated();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "No se pudo guardar el movimiento.");
    } finally {
      setBusy(false);
    }
  }

  async function closeShift() {
    if (!currentShift) {
      setError("No hay turno abierto para cerrar.");
      return;
    }
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      await request(`/api/cash-shifts/${currentShift.id}/close`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          closingAmountCounted: Number(countedCash || 0),
          deliveredAmount: Number(deliveredAmount || 0),
          receivedBy,
          notes,
        }),
      });
      setCountedCash("");
      setDeliveredAmount("");
      setReceivedBy("");
      setNotes("");
      setSuccess("Turno cerrado correctamente.");
      await onShiftUpdated();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "No se pudo cerrar el turno.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-amber-300">Cierre de caja</p>
          <h2 className="text-2xl font-black text-stone-50">Cuadre de turno</h2>
        </div>
        {currentShift ? <DoorOpen className="h-6 w-6 text-emerald-300" /> : <DoorClosedLocked className="h-6 w-6 text-stone-500" />}
      </div>

      {error ? <Banner tone="error">{error}</Banner> : null}
      {success ? <Banner tone="success">{success}</Banner> : null}

      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-2xl border border-stone-800 p-4">
          <p className="text-sm text-stone-400">Cajero</p>
          <p className="font-semibold text-stone-50">{userName}</p>
        </div>
        <div className="rounded-2xl border border-stone-800 p-4">
          <p className="text-sm text-stone-400">Hora actual</p>
          <p className="font-semibold text-stone-50">{formatDateTime(new Date())}</p>
        </div>
      </div>

      {!currentShift ? (
        <div className="space-y-3 rounded-2xl border border-dashed border-stone-700 p-4">
          <p className="font-semibold text-stone-100">Apertura de caja</p>
          <Input value={openingAmount} onChange={(event) => setOpeningAmount(event.target.value.replace(/\D/g, ""))} placeholder="Monto inicial en caja" inputMode="numeric" />
          <Button busy={busy} onClick={openShift}>
            Abrir turno
          </Button>
        </div>
      ) : (
        <>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-2xl border border-stone-800 p-4">
              <p className="text-sm text-stone-400">Hora de apertura</p>
              <p className="font-semibold text-stone-50">{formatDateTime(currentShift.openedAt)}</p>
            </div>
            <div className="rounded-2xl border border-stone-800 p-4">
              <p className="text-sm text-stone-400">Estado</p>
              <p className="font-semibold text-stone-50">{cashShiftStatusLabel(currentShift.status)}</p>
            </div>
          </div>

          {currentShiftSummary ? (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <Metric icon={Wallet} label="Monto inicial" value={formatCop(currentShiftSummary.openingAmount)} />
              <Metric icon={BanknoteArrowUp} label="Ventas en efectivo" value={formatCop(currentShiftSummary.cashSales)} />
              <Metric icon={ClipboardList} label="Transferencia" value={formatCop(currentShiftSummary.transferSales)} />
              <Metric icon={ClipboardList} label="Tarjeta" value={formatCop(currentShiftSummary.cardSales)} />
              <Metric icon={BanknoteArrowUp} label="Ingresos manuales" value={formatCop(currentShiftSummary.manualIncome)} />
              <Metric icon={BanknoteArrowDown} label="Gastos / salidas" value={formatCop(currentShiftSummary.expenses)} />
              <Metric icon={HandCoins} label="Retiros" value={formatCop(currentShiftSummary.withdrawals)} />
              <Metric icon={Wallet} label="Total esperado" value={formatCop(currentShiftSummary.expectedCash)} />
            </div>
          ) : null}

          <div className="space-y-3 rounded-2xl border border-stone-800 p-4">
            <p className="font-semibold text-stone-100">Movimiento manual</p>
            <div className="grid gap-3 md:grid-cols-[220px_1fr_160px]">
              <Select value={movementType} onChange={(event) => setMovementType(event.target.value as typeof movementType)}>
                <option value="INCOME">Ingreso manual</option>
                <option value="EXPENSE">Gasto / salida</option>
                <option value="WITHDRAWAL">Retiro</option>
                <option value="ADJUSTMENT">Ajuste</option>
              </Select>
              <Input value={movementDescription} onChange={(event) => setMovementDescription(event.target.value)} placeholder="Motivo o descripción" />
              <Input value={movementAmount} onChange={(event) => setMovementAmount(event.target.value.replace(/\D/g, ""))} placeholder="Valor" inputMode="numeric" />
            </div>
            <Button busy={busy} variant="secondary" onClick={saveMovement}>
              Guardar movimiento
            </Button>
          </div>

          <div className="space-y-3 rounded-2xl border border-stone-800 p-4">
            <p className="font-semibold text-stone-100">Cierre del turno</p>
            <div className="grid gap-3 md:grid-cols-2">
              <Input value={countedCash} onChange={(event) => setCountedCash(event.target.value.replace(/\D/g, ""))} placeholder="Efectivo contado real" inputMode="numeric" />
              <Input value={deliveredAmount} onChange={(event) => setDeliveredAmount(event.target.value.replace(/\D/g, ""))} placeholder="Monto entregado" inputMode="numeric" />
            </div>
            <Input value={receivedBy} onChange={(event) => setReceivedBy(event.target.value)} placeholder="A quién se entrega" />
            <TextArea value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Observaciones del cierre" />
            <div className="rounded-2xl border border-stone-800 bg-stone-950/50 p-4">
              <p className="text-sm text-stone-400">Diferencia</p>
              <p className={`text-2xl font-black ${difference === 0 ? "text-emerald-300" : difference > 0 ? "text-sky-300" : "text-rose-300"}`}>{formatCop(difference)}</p>
              <p className="text-sm text-stone-300">{differenceLabel}</p>
            </div>
            <Button busy={busy} onClick={closeShift}>
              Cerrar turno
            </Button>
          </div>

          <div className="space-y-2">
            <p className="font-semibold text-stone-100">Movimientos del turno</p>
            {currentShift.movements.length ? currentShift.movements.slice(0, 8).map((movement) => (
              <div key={movement.id} className="flex flex-col gap-1 rounded-2xl border border-stone-800 p-3 text-sm md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-stone-100">{cashMovementTypeLabel(movement.type)} - {movement.description}</p>
                  <p className="text-stone-400">{formatDateTime(movement.createdAt)} • {movement.createdBy.nombre}</p>
                </div>
                <strong className="text-amber-300">{formatCop(movement.amount)}</strong>
              </div>
            )) : <p className="text-sm text-stone-400">No hay movimientos manuales registrados en este turno.</p>}
          </div>
        </>
      )}
    </Card>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-stone-800 p-4">
      <div className="mb-2 flex items-center gap-2 text-stone-400">
        <Icon className="h-4 w-4" />
        <span className="text-sm">{label}</span>
      </div>
      <p className="text-lg font-black text-stone-50">{value}</p>
    </div>
  );
}
