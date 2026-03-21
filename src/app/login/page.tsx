"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Banner, Button, Card, Input } from "@/components/ui";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("arepasstefania@gmail.com");
  const [password, setPassword] = useState("Arepas2026!");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "No fue posible iniciar sesión.");
      }
      router.push("/");
      router.refresh();
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : "No fue posible iniciar sesión.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(245,158,11,.18),transparent_28%),linear-gradient(180deg,#17120e_0%,#0f0d0b_100%)] p-4">
      <Card className="w-full max-w-md space-y-5">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-amber-300">Acceso seguro</p>
          <h1 className="text-3xl font-black text-stone-50">Arepas Stefania POS</h1>
          <p className="mt-2 text-sm text-stone-400">Inicia sesión para entrar al punto de venta o al panel administrativo.</p>
        </div>
        {error ? <Banner tone="error">{error}</Banner> : null}
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Correo" />
          <Input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Contraseña" />
          <Button type="submit" className="w-full" busy={busy}>
            Entrar
          </Button>
        </form>
        <p className="text-xs text-stone-500">Administrador inicial: arepasstefania@gmail.com</p>
      </Card>
    </div>
  );
}
