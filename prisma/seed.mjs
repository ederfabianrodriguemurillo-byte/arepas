import bcrypt from "bcryptjs";
import { PrismaClient, Role } from "@prisma/client";

const prisma = new PrismaClient();

const products = {
  AREPAS: [
    { nombre: "Arepa con todo", precio: 10000 },
    { nombre: "Arepa mixta", precio: 8000 },
    { nombre: "Arepa con pollo", precio: 6500 },
    { nombre: "Arepa con carne", precio: 6500 },
    { nombre: "Arepa con perico", precio: 5000 },
    { nombre: "Arepa con queso", precio: 5000 },
    { nombre: "Arepa con jamon y queso", precio: 4000 },
    { nombre: "Hawaiana especial", precio: 8000 },
    { nombre: "Hawaiana sencilla", precio: 6000 },
    { nombre: "Hawaiana super especial", precio: 9000 },
    { nombre: "Burger", precio: 6500 },
    { nombre: "Chicharron", precio: 7000 },
    { nombre: "Arepa con jamon y queso rallado", precio: 6000 },
    { nombre: "Arepa trifasica", precio: 10000 },
    { nombre: "Arepa sencilla con sal", precio: 700 },
    { nombre: "Arepa amasada con sal", precio: 700 },
    { nombre: "Arepa amasada", precio: 1200 },
    { nombre: "Arepa con 1 loncha", precio: 3500 },
    { nombre: "Arepa con queso rallado", precio: 5500 },
    { nombre: "Arepa sencilla con mantequilla", precio: 800 },
    { nombre: "Arepa amasada con mantequilla", precio: 1300 },
    { nombre: "Arepa amasada con 1 loncha", precio: 2500 },
    { nombre: "Arepa sencilla con 1 loncha", precio: 2500 },
    { nombre: "Arepa amasada con doble loncha", precio: 3500 },
    { nombre: "Arepa sencilla doble loncha", precio: 3500 },
    { nombre: "Arepa perico con doble loncha", precio: 7000 },
    { nombre: "Arepa perico con queso rallado", precio: 8000 },
  ],
  BEBIDAS: [
    {
      nombre: "Chocolate en leche",
      variants: [
        { nombreVariante: "Tradicional", precio: 2000 },
        { nombreVariante: "Medio", precio: 1700 },
        { nombreVariante: "Mini", precio: 800 },
      ],
    },
    {
      nombre: "Cafe en leche",
      variants: [
        { nombreVariante: "Tradicional", precio: 2000 },
        { nombreVariante: "Medio", precio: 1700 },
        { nombreVariante: "Mini", precio: 800 },
      ],
    },
    {
      nombre: "Tinto",
      variants: [
        { nombreVariante: "Grande", precio: 1500 },
        { nombreVariante: "Medio", precio: 1000 },
        { nombreVariante: "Mini", precio: 500 },
      ],
    },
    {
      nombre: "Jugo HIT",
      variants: [
        { nombreVariante: "Personal", precio: 4000 },
        { nombreVariante: "Grande", precio: 5000 },
      ],
    },
    {
      nombre: "Coca-Cola",
      variants: [
        { nombreVariante: "Mini plastica", precio: 2000 },
        { nombreVariante: "Vidrio 350 ml", precio: 3000 },
        { nombreVariante: "Plastica 400 ml", precio: 3500 },
        { nombreVariante: "1.5 L", precio: 6500 },
        { nombreVariante: "2.5 L", precio: 9000 },
        { nombreVariante: "3 L", precio: 11000 },
      ],
    },
    {
      nombre: "Premio",
      variants: [
        { nombreVariante: "Mini", precio: 1500 },
        { nombreVariante: "350 ml", precio: 3000 },
        { nombreVariante: "Plastica 400 ml", precio: 3500 },
      ],
    },
    {
      nombre: "Cuatro",
      variants: [
        { nombreVariante: "Mini", precio: 1500 },
        { nombreVariante: "Vidrio 350 ml", precio: 3000 },
      ],
    },
    {
      nombre: "Sprite",
      variants: [
        { nombreVariante: "Mini", precio: 1500 },
        { nombreVariante: "Vidrio 350 ml", precio: 3000 },
      ],
    },
    {
      nombre: "Agua Cristal",
      variants: [
        { nombreVariante: "Mini", precio: 1000 },
        { nombreVariante: "600 ml", precio: 2000 },
        { nombreVariante: "1 L", precio: 3000 },
      ],
    },
    {
      nombre: "Postobon",
      variants: [
        { nombreVariante: "Mini", precio: 1500 },
        { nombreVariante: "Mini plastica", precio: 2000 },
        { nombreVariante: "Vidrio 350 ml", precio: 3000 },
        { nombreVariante: "Personal plastica", precio: 3500 },
        { nombreVariante: "1.5 L", precio: 4500 },
        { nombreVariante: "2.5 L", precio: 6500 },
        { nombreVariante: "3 L", precio: 9000 },
      ],
    },
    {
      nombre: "Pony Malta",
      variants: [
        { nombreVariante: "Mini", precio: 2000 },
        { nombreVariante: "Personal", precio: 3000 },
        { nombreVariante: "Vidrio", precio: 3000 },
        { nombreVariante: "1 L", precio: 4500 },
        { nombreVariante: "1.5 L", precio: 6500 },
      ],
    },
    {
      nombre: "HIT",
      variants: [
        { nombreVariante: "500 ml", precio: 3500 },
        { nombreVariante: "1 L", precio: 5000 },
      ],
    },
    { nombre: "Gaseosa", precio: 3000 },
    { nombre: "Gaseosa 2 litros", precio: 6000 },
    { nombre: "Gaseosa 3 litros", precio: 10000 },
    { nombre: "Agua", precio: 2000 },
    { nombre: "Agua Brisa 600 ml", precio: 2000 },
    { nombre: "Gatorade", precio: 4000 },
    { nombre: "H2O", precio: 4000 },
  ],
  COMBOS: [],
  EXTRAS: [
    { nombre: "Adicion de burger", precio: 2000 },
    { nombre: "Adicion de perico", precio: 5000 },
    { nombre: "Adicion de carne", precio: 6000 },
    { nombre: "Adicion de pollo", precio: 6000 },
    { nombre: "Adicion de chicharron", precio: 6000 },
    { nombre: "Adicion de queso rallado", precio: 5000 },
  ],
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
