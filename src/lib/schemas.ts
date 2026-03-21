import { Role } from "@prisma/client";
import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Ingresa un correo válido."),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres."),
});

export const categorySchema = z.object({
  nombre: z.string().min(2, "El nombre es obligatorio."),
  activa: z.boolean().default(true),
});

export const productVariantSchema = z.object({
  id: z.string().optional(),
  nombreVariante: z.string().min(1, "El nombre de variante es obligatorio."),
  precio: z.coerce.number().int().nonnegative(),
});

export const productSchema = z
  .object({
    nombre: z.string().min(2, "El nombre es obligatorio."),
    descripcion: z.string().optional().nullable(),
    precio: z.coerce.number().int().nonnegative().nullable().optional(),
    categoriaId: z.string().min(1, "La categoría es obligatoria."),
    imagenUrl: z.string().optional().nullable(),
    stock: z.coerce.number().int().default(0),
    activo: z.boolean().default(true),
    variants: z.array(productVariantSchema).default([]),
  })
  .superRefine((value, ctx) => {
    if ((!value.precio || value.precio === 0) && value.variants.length === 0) {
      ctx.addIssue({
        code: "custom",
        path: ["precio"],
        message: "Debes definir un precio base o al menos una variante.",
      });
    }
  });

export const userSchema = z.object({
  nombre: z.string().min(2, "El nombre es obligatorio."),
  email: z.string().email("Correo inválido."),
  rol: z.nativeEnum(Role),
  activo: z.boolean().default(true),
  password: z.string().optional(),
});

export const settingsSchema = z.object({
  nombreNegocio: z.string().min(2, "El nombre es obligatorio."),
  direccion: z.string().min(2, "La dirección es obligatoria."),
  telefono: z.string().min(2, "El teléfono es obligatorio."),
  mensajeTicket: z.string().min(2, "El mensaje del ticket es obligatorio."),
});

export const saleItemSchema = z.object({
  productId: z.string().min(1),
  variantId: z.string().optional().nullable(),
  nombreProducto: z.string().min(1),
  nombreVariante: z.string().optional().nullable(),
  precioUnitario: z.coerce.number().int().nonnegative(),
  cantidad: z.coerce.number().int().positive(),
  observacion: z.string().optional().nullable(),
});

export const saleSchema = z.object({
  metodoPago: z.enum(["CASH", "TRANSFER", "CARD"]),
  montoRecibido: z.coerce.number().int().nonnegative().nullable().optional(),
  items: z.array(saleItemSchema).min(1, "Debes agregar al menos un producto."),
});

export const cashShiftOpenSchema = z.object({
  openingAmount: z.coerce.number().int().nonnegative(),
});

export const cashMovementSchema = z.object({
  type: z.enum(["INCOME", "EXPENSE", "WITHDRAWAL", "ADJUSTMENT"]),
  amount: z.coerce.number().int().positive(),
  description: z.string().min(2, "Describe el movimiento."),
});

export const cashShiftCloseSchema = z.object({
  closingAmountCounted: z.coerce.number().int().nonnegative(),
  deliveredAmount: z.coerce.number().int().nonnegative(),
  receivedBy: z.string().min(2, "Indica a quién se entrega."),
  notes: z.string().optional().nullable(),
});
