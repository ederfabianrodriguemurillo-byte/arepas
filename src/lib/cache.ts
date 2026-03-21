import { revalidateTag } from "next/cache";

export function revalidateSettings() {
  revalidateTag("settings", "max");
}

export function revalidateCategories() {
  revalidateTag("categories", "max");
}

export function revalidateProducts() {
  revalidateTag("products", "max");
}

export function revalidateCatalog() {
  revalidateSettings();
  revalidateCategories();
  revalidateProducts();
}
