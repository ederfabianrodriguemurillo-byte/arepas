import { hasUsableDatabaseUrl, prisma } from "@/lib/prisma";
import { getOpenShiftForUser, summarizeShift } from "@/lib/cash-shifts";

export async function getPosData(userId?: string) {
  if (!hasUsableDatabaseUrl()) {
    return {
      settings: null,
      categories: [],
      currentShift: null,
      currentShiftSummary: null,
      dbError: "Configura una DATABASE_URL de PostgreSQL válida para usar la aplicación en red.",
    };
  }

  try {
    const [settings, categories, currentShift] = await Promise.all([
      prisma.businessSettings.findFirst(),
      prisma.category.findMany({
        where: { activa: true },
        orderBy: { nombre: "asc" },
        include: {
          products: {
            where: { activo: true },
            orderBy: { nombre: "asc" },
            include: { variants: { orderBy: { precio: "asc" } } },
          },
        },
      }),
      userId ? getOpenShiftForUser(userId) : Promise.resolve(null),
    ]);

    return {
      settings,
      categories,
      currentShift,
      currentShiftSummary: currentShift ? summarizeShift(currentShift) : null,
      dbError: null,
    };
  } catch {
    return {
      settings: null,
      categories: [],
      currentShift: null,
      currentShiftSummary: null,
      dbError: "No fue posible cargar la base de datos. Revisa la conexión PostgreSQL.",
    };
  }
}

export async function getAdminBootstrap() {
  if (!hasUsableDatabaseUrl()) {
    return {
      settings: null,
      categories: [],
      products: [],
      users: [],
      sales: [],
      cashShifts: [],
      metrics: {
        totalToday: 0,
        transactionsToday: 0,
        averageTicket: 0,
        salesToday: 0,
      },
      dbError: "Configura una DATABASE_URL de PostgreSQL válida para usar el panel administrativo.",
    };
  }

  try {
    const [settings, categories, products, users, sales, todaySales, cashShifts] = await Promise.all([
      prisma.businessSettings.findFirst(),
      prisma.category.findMany({ orderBy: { nombre: "asc" } }),
      prisma.product.findMany({
        orderBy: { createdAt: "desc" },
        include: { categoria: true, variants: true },
      }),
      prisma.user.findMany({ orderBy: { createdAt: "asc" } }),
      prisma.sale.findMany({
        orderBy: { createdAt: "desc" },
        take: 100,
        include: {
          cajero: { select: { nombre: true } },
          items: true,
        },
      }),
      prisma.sale.findMany({
        where: { createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } },
        include: { items: true },
      }),
      prisma.cashShift.findMany({
        orderBy: { openedAt: "desc" },
        include: {
          user: { select: { nombre: true, id: true } },
          movements: {
            include: { createdBy: { select: { nombre: true } } },
            orderBy: { createdAt: "desc" },
          },
          sales: true,
        },
      }),
    ]);

    const totalToday = todaySales.reduce((sum, sale) => sum + sale.total, 0);
    const transactionsToday = todaySales.length;
    const averageTicket = transactionsToday ? Math.round(totalToday / transactionsToday) : 0;

    return {
      settings,
      categories,
      products,
      users,
      sales,
      cashShifts: cashShifts.map((shift) => ({
        ...shift,
        summary: summarizeShift(shift),
      })),
      metrics: {
        totalToday,
        transactionsToday,
        averageTicket,
        salesToday: todaySales.length,
      },
      dbError: null,
    };
  } catch {
    return {
      settings: null,
      categories: [],
      products: [],
      users: [],
      sales: [],
      cashShifts: [],
      metrics: {
        totalToday: 0,
        transactionsToday: 0,
        averageTicket: 0,
        salesToday: 0,
      },
      dbError: "No fue posible conectar con PostgreSQL. Revisa DATABASE_URL y vuelve a intentar.",
    };
  }
}
