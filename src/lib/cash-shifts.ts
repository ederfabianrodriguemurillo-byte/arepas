import { CashMovementType, CashShiftStatus, PaymentMethod, Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export async function getOpenShiftForUser(userId: string) {
  return prisma.cashShift.findFirst({
    where: { userId, closedAt: null, status: "OPEN" },
    include: {
      user: { select: { id: true, nombre: true, email: true, rol: true } },
      movements: {
        include: { createdBy: { select: { nombre: true } } },
        orderBy: { createdAt: "desc" },
      },
      sales: {
        orderBy: { createdAt: "desc" },
        include: { cajero: { select: { nombre: true } }, items: true },
      },
    },
  });
}

export function summarizeShift(shift: {
  openingAmount: number;
  movements: Array<{ type: CashMovementType; amount: number }>;
  sales: Array<{ metodoPago: PaymentMethod; total: number }>;
}) {
  const cashSales = shift.sales.filter((sale) => sale.metodoPago === "CASH").reduce((sum, sale) => sum + sale.total, 0);
  const transferSales = shift.sales.filter((sale) => sale.metodoPago === "TRANSFER").reduce((sum, sale) => sum + sale.total, 0);
  const cardSales = shift.sales.filter((sale) => sale.metodoPago === "CARD").reduce((sum, sale) => sum + sale.total, 0);
  const manualIncome = shift.movements.filter((movement) => movement.type === "INCOME").reduce((sum, movement) => sum + movement.amount, 0);
  const expenses = shift.movements.filter((movement) => movement.type === "EXPENSE").reduce((sum, movement) => sum + movement.amount, 0);
  const withdrawals = shift.movements.filter((movement) => movement.type === "WITHDRAWAL").reduce((sum, movement) => sum + movement.amount, 0);
  const adjustments = shift.movements.filter((movement) => movement.type === "ADJUSTMENT").reduce((sum, movement) => sum + movement.amount, 0);
  const expectedCash = shift.openingAmount + cashSales + manualIncome + adjustments - expenses - withdrawals;

  return {
    openingAmount: shift.openingAmount,
    cashSales,
    transferSales,
    cardSales,
    manualIncome,
    expenses,
    withdrawals,
    adjustments,
    expectedCash,
  };
}

export function resolveShiftStatus(difference: number) {
  if (difference === 0) {
    return "CLOSED" satisfies CashShiftStatus;
  }
  return "CLOSED_WITH_DIFFERENCE" satisfies CashShiftStatus;
}

export function canForceLeave(role: Role) {
  return role === "PRINCIPAL_ADMIN" || role === "SECONDARY_ADMIN";
}
