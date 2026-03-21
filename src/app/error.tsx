"use client";

import { Button, Card } from "@/components/ui";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-stone-950 p-4">
      <Card className="max-w-lg space-y-4 text-center">
        <h2 className="text-2xl font-black text-stone-50">Algo falló, pero la app sigue recuperable</h2>
        <p className="text-sm text-stone-400">{error.message || "Ocurrió un error inesperado."}</p>
        <Button onClick={reset}>Reintentar</Button>
      </Card>
    </div>
  );
}
