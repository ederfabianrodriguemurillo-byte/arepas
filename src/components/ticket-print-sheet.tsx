"use client";

import { useEffect } from "react";
import { formatDateTime } from "@/lib/format";

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

type TicketSettings = {
  nombreNegocio: string;
  direccion: string;
  telefono: string;
  mensajeTicket: string;
};

function separator() {
  return "--------------------------------";
}

function formatTicketCop(value: number) {
  return `$${new Intl.NumberFormat("es-CO", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)}`;
}

function paymentMethodTicketLabel(method: PrintableSale["metodoPago"]) {
  switch (method) {
    case "CASH":
      return "Efectivo";
    case "TRANSFER":
      return "Transf.";
    case "CARD":
      return "Tarjeta";
  }
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;")
    .replaceAll("'", "&#39;");
}

function renderTicketHtml(sale: PrintableSale, settings: TicketSettings) {
  const items = sale.items.map((item) => {
    const itemName = `${item.cantidad} x ${item.nombreProducto}${item.nombreVariante ? ` (${item.nombreVariante})` : ""}`;
    return `
      <div class="ticket-item">
        <div class="ticket-row">
          <span class="ticket-item-name">${escapeHtml(itemName)}</span>
          <span class="ticket-item-price">${escapeHtml(formatTicketCop(item.totalLinea))}</span>
        </div>
        ${item.observacion ? `<p class="ticket-note">Obs: ${escapeHtml(item.observacion)}</p>` : ""}
      </div>
    `;
  }).join("");

  return `<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=48mm, initial-scale=1, maximum-scale=1" />
    <title>Ticket ${sale.numeroVenta}</title>
    <style>
      @page {
        size: 48mm auto;
        margin: 0;
      }

      html, body {
        width: 48mm;
        min-width: 48mm;
        max-width: 48mm;
        margin: 0;
        padding: 0;
        background: #fff;
        color: #000;
        overflow: hidden;
        transform: scale(1);
        zoom: 1;
        -webkit-text-size-adjust: 100%;
        print-color-adjust: exact;
        -webkit-print-color-adjust: exact;
      }

      body {
        font-family: "Courier New", monospace;
      }

      .ticket {
        width: 48mm;
        min-width: 48mm;
        max-width: 48mm;
        margin: 0;
        padding: 1mm;
        font-size: 8px;
        line-height: 1.15;
        transform: scale(1);
        zoom: 1;
      }

      p {
        margin: 0;
      }

      .ticket-center {
        text-align: center;
      }

      .ticket-business-name {
        font-size: 10px;
        font-weight: 700;
      }

      .ticket-divider {
        margin: 1mm 0;
        white-space: nowrap;
        overflow: hidden;
      }

      .ticket-row {
        display: grid;
        grid-template-columns: minmax(0, 1fr) 14.5mm;
        align-items: start;
        column-gap: 0.7mm;
        width: 100%;
      }

      .ticket-item {
        margin-top: 1mm;
      }

      .ticket-item:first-child {
        margin-top: 0;
      }

      .ticket-item-name {
        min-width: 0;
        word-break: break-word;
      }

      .ticket-item-price {
        white-space: nowrap;
        text-align: right;
        overflow: hidden;
      }

      .ticket-row-compact {
        grid-template-columns: minmax(0, 1fr) 12.5mm;
      }

      .ticket-note {
        margin-top: 0.8mm;
      }

      .ticket-total {
        font-weight: 700;
      }

      .ticket-value {
        text-align: right;
        word-break: break-word;
      }

      .ticket-money {
        white-space: nowrap;
      }
    </style>
  </head>
  <body>
    <main class="ticket">
      <header class="ticket-center">
        <p class="ticket-business-name">${escapeHtml(settings.nombreNegocio)}</p>
      </header>

      <p class="ticket-divider">${separator()}</p>

      <section>
        <p>${escapeHtml(settings.direccion)}</p>
        <p>${escapeHtml(settings.telefono)}</p>
        <p>${escapeHtml(formatDateTime(sale.fecha))}</p>
        <div class="ticket-row">
          <span>Venta</span>
          <span class="ticket-value">#${sale.numeroVenta}</span>
        </div>
        <p>Cajero: ${escapeHtml(sale.cajero.nombre)}</p>
      </section>

      <p class="ticket-divider">${separator()}</p>

      <section>
        ${items}
      </section>

      <p class="ticket-divider">${separator()}</p>

      <section>
        <div class="ticket-row">
          <span>Subtotal</span>
          <span class="ticket-value ticket-money">${escapeHtml(formatTicketCop(sale.subtotal))}</span>
        </div>
        <div class="ticket-row ticket-total">
          <span>Total</span>
          <span class="ticket-value ticket-money">${escapeHtml(formatTicketCop(sale.total))}</span>
        </div>
        <div class="ticket-row">
          <span>Pago</span>
          <span class="ticket-value">${escapeHtml(paymentMethodTicketLabel(sale.metodoPago))}</span>
        </div>
        ${sale.montoRecibido !== null ? `
          <div class="ticket-row">
            <span>Recibido</span>
            <span class="ticket-value ticket-money">${escapeHtml(formatTicketCop(sale.montoRecibido))}</span>
          </div>
        ` : ""}
        ${sale.cambio !== null ? `
          <div class="ticket-row">
            <span>Cambio</span>
            <span class="ticket-value ticket-money">${escapeHtml(formatTicketCop(sale.cambio))}</span>
          </div>
        ` : ""}
      </section>

      <p class="ticket-divider">${separator()}</p>

      <footer class="ticket-center">
        <p>${escapeHtml(settings.mensajeTicket)}</p>
      </footer>
    </main>
    <script>
      window.addEventListener("load", () => {
        setTimeout(() => {
          window.print();
        }, 200);
      });
      window.addEventListener("afterprint", () => {
        window.close();
      });
    </script>
  </body>
</html>`;
}

export function printSaleTicket(sale: PrintableSale, settings: TicketSettings) {
  const printWindow = window.open("", "_blank", "width=320,height=900");
  if (!printWindow) {
    throw new Error("No se pudo abrir la ventana de impresión. Revisa si el navegador bloqueó la ventana emergente.");
  }

  printWindow.document.open();
  printWindow.document.write(renderTicketHtml(sale, settings));
  printWindow.document.close();
  printWindow.focus();
}

export function TicketPrintSheet({
  sale,
  settings,
  autoPrint = false,
}: {
  sale: PrintableSale | null;
  settings: TicketSettings;
  autoPrint?: boolean;
}) {
  useEffect(() => {
    if (!autoPrint || !sale) {
      return;
    }

    const timeout = window.setTimeout(() => {
      printSaleTicket(sale, settings);
    }, 150);

    return () => window.clearTimeout(timeout);
  }, [autoPrint, sale, settings]);

  return null;
}
