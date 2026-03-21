import bcrypt from "bcryptjs";
import { PrismaClient, Role } from "@prisma/client";

const prisma = new PrismaClient();

const products = {
  AREPAS: [
    { nombre: "Arepa con todo", precio: 11000 },
    { nombre: "Arepa mixta", precio: 9000 },
    { nombre: "Arepa con pollo", precio: 7000 },
    { nombre: "Arepa con carne", precio: 7000 },
    { nombre: "Arepa con perico", precio: 5500 },
    { nombre: "Arepa con queso", precio: 5500 },
    { nombre: "Arepa con jamón y queso", precio: 4000 },
    { nombre: "Hawaiana especial", precio: 8000 },
    { nombre: "Hawaiana sencilla", precio: 6000 },
    { nombre: "Hawaiana super especial", precio: 9000 },
    { nombre: "Burger", precio: 6000 },
    { nombre: "Chicharron", precio: 7000 },
    { nombre: "Arepa con jamón y queso rallado", precio: 6000 },
    { nombre: "Arepa trifasica", precio: 10000 },
  ],
  BEBIDAS: [
    {
      nombre: "Chocolate en leche",
      variants: [
        { nombreVariante: "Pequeño", precio: 2000 },
        { nombreVariante: "Grande", precio: 2500 },
      ],
    },
    {
      nombre: "Café en leche",
      variants: [
        { nombreVariante: "Pequeño", precio: 2000 },
        { nombreVariante: "Grande", precio: 2500 },
      ],
    },
    {
      nombre: "Tinto",
      variants: [
        { nombreVariante: "Pequeño", precio: 1000 },
        { nombreVariante: "Grande", precio: 1500 },
      ],
    },
    {
      nombre: "Jugo HIT",
      variants: [
        { nombreVariante: "Personal", precio: 4000 },
        { nombreVariante: "Grande", precio: 5000 },
      ],
    },
    { nombre: "Gaseosa", precio: 3000 },
    { nombre: "Gaseosa 2 litros", precio: 6000 },
    { nombre: "Gaseosa 3 litros", precio: 10000 },
    { nombre: "Agua", precio: 2000 },
  ],
  COMBOS: [],
  EXTRAS: [],
};

async function main() {
  const passwordHash = await bcrypt.hash("Arepas2026!", 10);

  await prisma.businessSettings.upsert({
    where: { id: "default-settings" },
    update: {},
    create: {
      id: "default-settings",
      nombreNegocio: "Arepas Stefania",
      direccion: "Colombia",
      telefono: "300 000 0000",
      mensajeTicket: "Gracias por tu compra. Vuelve pronto.",
    },
  });

  await prisma.user.upsert({
    where: { email: "arepasstefania@gmail.com" },
    update: {
      nombre: "Administrador principal",
      rol: Role.PRINCIPAL_ADMIN,
      activo: true,
      passwordHash,
    },
    create: {
      nombre: "Administrador principal",
      email: "arepasstefania@gmail.com",
      passwordHash,
      rol: Role.PRINCIPAL_ADMIN,
      activo: true,
    },
  });

  for (const nombre of Object.keys(products)) {
    await prisma.category.upsert({
      where: { nombre },
      update: {},
      create: { nombre, activa: true },
    });
  }

  const categories = await prisma.category.findMany();
  const categoryMap = Object.fromEntries(categories.map((category) => [category.nombre, category.id]));

  for (const [categoryName, items] of Object.entries(products)) {
    for (const item of items) {
      const existing = await prisma.product.findFirst({
        where: {
          nombre: item.nombre,
          categoriaId: categoryMap[categoryName],
        },
      });

      const product = existing
        ? await prisma.product.update({
            where: { id: existing.id },
            data: {
              descripcion: existing.descripcion ?? "",
              precio: "precio" in item ? item.precio : null,
              stock: existing.stock ?? 0,
              activo: true,
            },
          })
        : await prisma.product.create({
            data: {
              nombre: item.nombre,
              descripcion: "",
              precio: "precio" in item ? item.precio : null,
              stock: 0,
              activo: true,
              categoriaId: categoryMap[categoryName],
            },
          });

      if ("variants" in item) {
        await prisma.productVariant.deleteMany({ where: { productId: product.id } });
        await prisma.productVariant.createMany({
          data: item.variants.map((variant) => ({
            productId: product.id,
            nombreVariante: variant.nombreVariante,
            precio: variant.precio,
          })),
        });
      }
    }
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
