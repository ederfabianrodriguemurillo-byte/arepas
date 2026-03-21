import { Role } from "@prisma/client";

export function canAccessAdmin(role: Role) {
  return role === "PRINCIPAL_ADMIN" || role === "SECONDARY_ADMIN";
}

export function canManageUsers(role: Role) {
  return role === "PRINCIPAL_ADMIN";
}
