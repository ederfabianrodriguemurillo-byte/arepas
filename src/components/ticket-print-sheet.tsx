"use client";

import { useEffect, useRef } from "react";
import { formatCop, formatDateTime, paymentMethodLabel } from "@/lib/format";

export type PrintableSale = {
  numeroVenta: number;
  fecha: string;
  subtotal: number;
  total: number;
  metodoPago: "CASH" | "TRANSFER" | "CARD";
  montoRecibido: number | null;
  cambio: number | null;
  cajero: { nombre: string };
  items: Array<{
    id: string;
    nombreProducto: string;
    nombreVariante: string | null;
    cantidad: number;
    precioUnitario: number;
    totalLinea: number;
    observacion: string | null;
  }>;
};

export function TicketPrintSheet({
  sale,
  settings,
  autoPrint = false,
}: {
  sale: PrintableSale | null;
  settings: {
    nombreNegocio: string;
    direccion: string;
    telefono: string;
    mensajeTicket: string;
  };
  autoPrint?: boolean;
}) {
  const printableRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!autoPrint || !sale || !printableRef.current) {
      return;
    }

    const timeout = window.setTimeout(() => {
      requestAnimationFrame(() => {
        window.print();
      });
    }, 250);

    return () => window.clearTimeout(timeout);
  }, [autoPrint, sale]);

  if (!sale) {
    return null;
  }

  return (
    <div className="print-only-container">
      <div ref={printableRef} className="ticket-sheet bg-white p-2 text-[10px] text-black">
        <div className="text-center">
          <p className="text-[13px] font-bold">{settings.nombreNegocio}</p>
          <p>{settings.direccion}</p>
          <p>{settings.telefono}</p>
        </div>
        <div className="mt-2 border-t border-dashed border-black pt-2">
          <p>Venta #{sale.numeroVenta}</p>
          <p>{formatDateTime(sale.fecha)}</p>
          <p>Cajero: {sale.cajero.nombre}</p>
        </div>
        <div className="mt-2 border-t border-dashed border-black pt-2">
          {sale.items.map((item) => (
            <div key={item.id} className="mb-1">
              <div className="flex justify-between gap-2">
                <p className="flex-1">
                  {item.cantidad} x {item.nombreProducto}
                  {item.nombreVariante ? ` (${item.nombreVariante})` : ""}
                </p>
                <p>{formatCop(item.totalLinea)}</p>
              </div>
              {item.observacion ? <p>Obs: {item.observacion}</p> : null}
            </div>
          ))}
        </div>
        <div className="mt-2 border-t border-dashed border-black pt-2">
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span>{formatCop(sale.subtotal)}</span>
          </div>
          <div className="flex justify-between font-bold">
            <span>Total</span>
            <span>{formatCop(sale.total)}</span>
          </div>
          <div className="flex justify-between">
            <span>Pago</span>
            <span>{paymentMethodLabel(sale.metodoPago)}</span>
          </div>
          {sale.montoRecibido ? (
            <div className="flex justify-between">
              <span>Recibido</span>
              <span>{formatCop(sale.montoRecibido)}</span>
            </div>
          ) : null}
          {sale.cambio ? (
            <div className="flex justify-between">
              <span>Cambio</span>
              <span>{formatCop(sale.cambio)}</span>
            </div>
          ) : null}
        </div>
        <div className="mt-2 border-t border-dashed border-black pt-2 text-center">
          <p>{settings.mensajeTicket}</p>
        </div>
      </div>
    </div>
  );
}
