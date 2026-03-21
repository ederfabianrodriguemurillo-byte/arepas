import { Role } from "@prisma/client";
import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE } from "@/lib/constants";
import { prisma } from "@/lib/prisma";

type SessionPayload = {
  userId: string;
  role: Role;
  email: string;
};

function getSecret() {
  return new TextEncoder().encode(process.env.JWT_SECRET || "dev-secret-change-me");
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, passwordHash: string) {
  return bcrypt.compare(password, passwordHash);
}

export async function createSession(payload: SessionPayload) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getSecret());
}

export async function saveSession(token: string) {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function clearSession() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

export async function getSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;

  if (!token) {
    return null;
  }

  try {
    const { payload } = await jwtVerify(token, getSecret());
    return payload as SessionPayload;
  } catch {
    return null;
  }
}

export async function getCurrentUser() {
  const session = await getSession();
  if (!session) {
    return null;
  }

  return prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      id: true,
      nombre: true,
      email: true,
      rol: true,
      activo: true,
    },
  });
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user || !user.activo) {
    redirect("/login");
  }
  return user;
}

export async function requireAdmin() {
  const user = await requireUser();
  if (user.rol !== "PRINCIPAL_ADMIN" && user.rol !== "SECONDARY_ADMIN") {
    redirect("/");
  }
  return user;
}

export async function requirePrincipal() {
  const user = await requireUser();
  if (user.rol !== "PRINCIPAL_ADMIN") {
    redirect("/admin");
  }
  return user;
}
