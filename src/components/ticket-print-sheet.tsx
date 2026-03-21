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

function separator() {
  return "--------------------------------";
}

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
    }, 300);

    return () => window.clearTimeout(timeout);
  }, [autoPrint, sale]);

  if (!sale) {
    return null;
  }

  return (
    <div className="print-only-container" aria-hidden="true">
      <div ref={printableRef} className="ticket print-ticket">
        <header className="ticket-center">
          <p className="ticket-business-name">{settings.nombreNegocio}</p>
        </header>

        <p className="ticket-divider">{separator()}</p>

        <section className="ticket-block">
          <p>{settings.direccion}</p>
          <p>{settings.telefono}</p>
          <p>{formatDateTime(sale.fecha)}</p>
          <div className="ticket-row">
            <span>Venta</span>
            <span>#{sale.numeroVenta}</span>
          </div>
          <p>Cajero: {sale.cajero.nombre}</p>
        </section>

        <p className="ticket-divider">{separator()}</p>

        <section className="ticket-block">
          {sale.items.map((item) => (
            <div key={item.id} className="ticket-item">
              <div className="ticket-row ticket-item-main">
                <span className="ticket-item-name">
                  {item.cantidad} x {item.nombreProducto}
                  {item.nombreVariante ? ` (${item.nombreVariante})` : ""}
                </span>
                <span className="ticket-item-price">{formatCop(item.totalLinea)}</span>
              </div>
              {item.observacion ? <p className="ticket-note">Obs: {item.observacion}</p> : null}
            </div>
          ))}
        </section>

        <p className="ticket-divider">{separator()}</p>

        <section className="ticket-block">
          <div className="ticket-row">
            <span>Subtotal</span>
            <span>{formatCop(sale.subtotal)}</span>
          </div>
          <div className="ticket-row ticket-total">
            <span>Total</span>
            <span>{formatCop(sale.total)}</span>
          </div>
          <div className="ticket-row">
            <span>Pago</span>
            <span>{paymentMethodLabel(sale.metodoPago)}</span>
          </div>
          {sale.montoRecibido !== null ? (
            <div className="ticket-row">
              <span>Recibido</span>
              <span>{formatCop(sale.montoRecibido)}</span>
            </div>
          ) : null}
          {sale.cambio !== null ? (
            <div className="ticket-row">
              <span>Cambio</span>
              <span>{formatCop(sale.cambio)}</span>
            </div>
          ) : null}
        </section>

        <p className="ticket-divider">{separator()}</p>

        <footer className="ticket-center ticket-block">
          <p>{settings.mensajeTicket}</p>
        </footer>
      </div>
    </div>
  );
}
