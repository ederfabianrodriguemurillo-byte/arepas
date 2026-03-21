import { CashMovementType, CashShiftStatus, PaymentMethod, Role } from "@prisma/client";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export const currencyFormatter = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

export function formatCop(value: number) {
  return currencyFormatter.format(value);
}

export function formatDateTime(date: string | Date) {
  return format(new Date(date), "dd/MM/yyyy HH:mm", { locale: es });
}

export function paymentMethodLabel(method: PaymentMethod | "CASH" | "TRANSFER" | "CARD") {
  switch (method) {
    case "CASH":
      return "Efectivo";
    case "TRANSFER":
      return "Transferencia";
    case "CARD":
      return "Tarjeta";
  }
}

export function roleLabel(role: Role) {
  switch (role) {
    case "PRINCIPAL_ADMIN":
      return "Administrador principal";
    case "SECONDARY_ADMIN":
      return "Administrador secundario";
    case "CASHIER":
      return "Cajero";
  }
}

export function cashMovementTypeLabel(type: CashMovementType | "INCOME" | "EXPENSE" | "WITHDRAWAL" | "ADJUSTMENT") {
  switch (type) {
    case "INCOME":
      return "Ingreso manual";
    case "EXPENSE":
      return "Gasto / salida";
    case "WITHDRAWAL":
      return "Retiro";
    case "ADJUSTMENT":
      return "Ajuste";
  }
}

export function cashShiftStatusLabel(status: CashShiftStatus | "OPEN" | "CLOSED" | "CLOSED_WITH_DIFFERENCE" | "PENDING_REVIEW") {
  switch (status) {
    case "OPEN":
      return "Turno abierto";
    case "CLOSED":
      return "Correcto";
    case "CLOSED_WITH_DIFFERENCE":
      return "Con diferencia";
    case "PENDING_REVIEW":
      return "Pendiente de revisión";
  }
}
