import { unstable_cache } from "next/cache";
import { hasUsableDatabaseUrl, prisma } from "@/lib/prisma";
import { getOpenShiftForUser, summarizeShift } from "@/lib/cash-shifts";

const DEFAULT_DB_ERROR_POS = "Configura una DATABASE_URL de PostgreSQL válida para usar la aplicación en red.";
const DEFAULT_DB_ERROR_ADMIN = "Configura una DATABASE_URL de PostgreSQL válida para usar el panel administrativo.";
const DB_CONNECTION_ERROR = "No fue posible conectar con PostgreSQL. Revisa DATABASE_URL y vuelve a intentar.";

const settingsSelect = {
  id: true,
  nombreNegocio: true,
  direccion: true,
  telefono: true,
  mensajeTicket: true,
} as const;

const productVariantSelect = {
  id: true,
  nombreVariante: true,
  precio: true,
} as const;

const productBaseSelect = {
  id: true,
  nombre: true,
  descripcion: true,
  precio: true,
  imagenUrl: true,
  stock: true,
  activo: true,
  categoriaId: true,
  variants: {
    select: productVariantSelect,
    orderBy: { precio: "asc" as const },
  },
} as const;

const productAdminSelect = {
  ...productBaseSelect,
  categoria: {
    select: {
      nombre: true,
    },
  },
} as const;

const saleListSelect = {
  id: true,
  numeroVenta: true,
  fecha: true,
  subtotal: true,
  total: true,
  metodoPago: true,
  montoRecibido: true,
  cambio: true,
  createdAt: true,
  cajero: {
    select: {
      nombre: true,
    },
  },
  items: {
    select: {
      id: true,
      nombreProducto: true,
      nombreVariante: true,
      cantidad: true,
      totalLinea: true,
      observacion: true,
      precioUnitario: true,
    },
  },
} as const;

const shiftSummaryInclude = {
  user: { select: { id: true, nombre: true } },
  movements: {
    select: {
      id: true,
      type: true,
      amount: true,
      description: true,
      createdAt: true,
      createdBy: { select: { nombre: true } },
    },
    orderBy: { createdAt: "desc" as const },
  },
  sales: {
    select: {
      metodoPago: true,
      total: true,
    },
  },
} as const;

const cachedSettings = unstable_cache(
  async () => prisma.businessSettings.findFirst({ select: settingsSelect }),
  ["business-settings"],
  { tags: ["settings"], revalidate: 300 },
);

const cachedPosCategories = unstable_cache(
  async () =>
    prisma.category.findMany({
      where: { activa: true },
      orderBy: { nombre: "asc" },
      select: {
        id: true,
        nombre: true,
        products: {
          where: { activo: true },
          orderBy: { nombre: "asc" },
          select: productBaseSelect,
        },
      },
    }),
  ["pos-categories-products"],
  { tags: ["categories", "products"], revalidate: 300 },
);

const cachedAdminCategories = unstable_cache(
  async () =>
    prisma.category.findMany({
      orderBy: { nombre: "asc" },
      select: {
        id: true,
        nombre: true,
        activa: true,
      },
    }),
  ["admin-categories"],
  { tags: ["categories"], revalidate: 300 },
);

const cachedAdminProducts = unstable_cache(
  async () =>
    prisma.product.findMany({
      orderBy: { nombre: "asc" },
      select: productAdminSelect,
    }),
  ["admin-products"],
  { tags: ["products", "categories"], revalidate: 300 },
);

function hasDb() {
  return hasUsableDatabaseUrl();
}

async function withDbFallback<T>(action: () => Promise<T>, fallback: T) {
  if (!hasDb()) {
    return fallback;
  }

  try {
    return await action();
  } catch {
    return fallback;
  }
}

export async function getPosData(userId?: string) {
  if (!hasDb()) {
    return {
      settings: null,
      categories: [],
      currentShift: null,
      currentShiftSummary: null,
      dbError: DEFAULT_DB_ERROR_POS,
    };
  }

  try {
    const [settings, categories, currentShift] = await Promise.all([
      cachedSettings(),
      cachedPosCategories(),
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

export async function getAdminDashboardData() {
  if (!hasDb()) {
    return {
      sales: [],
      metrics: {
        totalToday: 0,
        transactionsToday: 0,
        averageTicket: 0,
        salesToday: 0,
      },
      dbError: DEFAULT_DB_ERROR_ADMIN,
    };
  }

  try {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const [recentSales, todayAggregate] = await Promise.all([
      prisma.sale.findMany({
        orderBy: { createdAt: "desc" },
        take: 8,
        select: saleListSelect,
      }),
      prisma.sale.aggregate({
        where: { createdAt: { gte: startOfDay } },
        _sum: { total: true },
        _count: { id: true },
      }),
    ]);

    const totalToday = todayAggregate._sum.total ?? 0;
    const transactionsToday = todayAggregate._count.id ?? 0;

    return {
      sales: recentSales,
      metrics: {
        totalToday,
        transactionsToday,
        averageTicket: transactionsToday ? Math.round(totalToday / transactionsToday) : 0,
        salesToday: transactionsToday,
      },
      dbError: null,
    };
  } catch {
    return {
      sales: [],
      metrics: {
        totalToday: 0,
        transactionsToday: 0,
        averageTicket: 0,
        salesToday: 0,
      },
      dbError: DB_CONNECTION_ERROR,
    };
  }
}

export async function getAdminProductsData() {
  if (!hasDb()) {
    return { categories: [], products: [], dbError: DEFAULT_DB_ERROR_ADMIN };
  }

  try {
    const [categories, products] = await Promise.all([cachedAdminCategories(), cachedAdminProducts()]);
    return { categories, products, dbError: null };
  } catch {
    return { categories: [], products: [], dbError: DB_CONNECTION_ERROR };
  }
}

export async function getAdminCategoriesData() {
  if (!hasDb()) {
    return { categories: [], dbError: DEFAULT_DB_ERROR_ADMIN };
  }

  try {
    return { categories: await cachedAdminCategories(), dbError: null };
  } catch {
    return { categories: [], dbError: DB_CONNECTION_ERROR };
  }
}

export async function getAdminUsersData() {
  if (!hasDb()) {
    return { users: [], dbError: DEFAULT_DB_ERROR_ADMIN };
  }

  try {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        nombre: true,
        email: true,
        rol: true,
        activo: true,
      },
    });
    return { users, dbError: null };
  } catch {
    return { users: [], dbError: DB_CONNECTION_ERROR };
  }
}

export async function getAdminSettingsData() {
  if (!hasDb()) {
    return { settings: null, dbError: DEFAULT_DB_ERROR_ADMIN };
  }

  try {
    return { settings: await cachedSettings(), dbError: null };
  } catch {
    return { settings: null, dbError: DB_CONNECTION_ERROR };
  }
}

export async function getAdminReportsData() {
  if (!hasDb()) {
    return { sales: [], products: [], dbError: DEFAULT_DB_ERROR_ADMIN };
  }

  try {
    const [sales, products] = await Promise.all([
      prisma.sale.findMany({
        orderBy: { createdAt: "desc" },
        select: saleListSelect,
      }),
      prisma.product.findMany({
        select: {
          id: true,
          activo: true,
          imagenUrl: true,
          variants: { select: { id: true } },
        },
      }),
    ]);
    return { sales, products, dbError: null };
  } catch {
    return { sales: [], products: [], dbError: DB_CONNECTION_ERROR };
  }
}

export async function getAdminCashClosuresData() {
  if (!hasDb()) {
    return { cashShifts: [], dbError: DEFAULT_DB_ERROR_ADMIN };
  }

  try {
    const cashShifts = await prisma.cashShift.findMany({
      orderBy: { openedAt: "desc" },
      include: shiftSummaryInclude,
    });

    return {
      cashShifts: cashShifts.map((shift) => ({
        ...shift,
        summary: summarizeShift(shift),
      })),
      dbError: null,
    };
  } catch {
    return { cashShifts: [], dbError: DB_CONNECTION_ERROR };
  }
}

export async function getAdminSalesData(page = 1, pageSize = 20) {
  if (!hasDb()) {
    return {
      sales: [],
      total: 0,
      page,
      pageSize,
      pageCount: 1,
      settings: null,
      dbError: DEFAULT_DB_ERROR_ADMIN,
    };
  }

  try {
    const safePage = Math.max(1, page);
    const skip = (safePage - 1) * pageSize;

    const [settings, sales, total] = await Promise.all([
      cachedSettings(),
      prisma.sale.findMany({
        orderBy: { createdAt: "desc" },
        skip,
        take: pageSize,
        select: saleListSelect,
      }),
      prisma.sale.count(),
    ]);

    return {
      sales,
      total,
      page: safePage,
      pageSize,
      pageCount: Math.max(1, Math.ceil(total / pageSize)),
      settings,
      dbError: null,
    };
  } catch {
    return {
      sales: [],
      total: 0,
      page,
      pageSize,
      pageCount: 1,
      settings: null,
      dbError: DB_CONNECTION_ERROR,
    };
  }
}

export async function getShiftSnapshot(userId: string) {
  return withDbFallback(
    async () => {
      const shift = await getOpenShiftForUser(userId);
      return {
        shift,
        summary: shift ? summarizeShift(shift) : null,
      };
    },
    {
      shift: null,
      summary: null,
    },
  );
}
