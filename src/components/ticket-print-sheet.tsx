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
  return "-".repeat(31);
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
      return "Efe.";
    case "TRANSFER":
      return "Transf.";
    case "CARD":
      return "Tarj.";
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
  const itemsHtml = sale.items.map((item) => {
    const itemName = `${item.cantidad} x ${item.nombreProducto}${item.nombreVariante ? ` (${item.nombreVariante})` : ""}`;
    return `
      <div class="ticket-item">
        <div class="ticket-line">
          <span class="ticket-left">${escapeHtml(itemName)}</span>
          <span class="ticket-right">${escapeHtml(formatTicketCop(item.totalLinea))}</span>
        </div>
        ${item.observacion ? `<div class="ticket-note">(${escapeHtml(item.observacion)})</div>` : ""}
      </div>
    `;
  }).join("");

  const summaryRows = [
    { label: "Subtotal", value: formatTicketCop(sale.subtotal), strong: false },
    { label: "TOTAL", value: formatTicketCop(sale.total), strong: true },
    { label: "Pago", value: paymentMethodTicketLabel(sale.metodoPago), strong: false },
    ...(sale.montoRecibido !== null ? [{ label: "Recibido", value: formatTicketCop(sale.montoRecibido), strong: false }] : []),
    ...(sale.cambio !== null ? [{ label: "Cambio", value: formatTicketCop(sale.cambio), strong: false }] : []),
  ].map((row) => `
      <div class="ticket-line ${row.strong ? "ticket-total" : ""}">
        <span class="ticket-left">${escapeHtml(row.label)}</span>
        <span class="ticket-right">${escapeHtml(row.value)}</span>
      </div>
    `).join("");

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
        overflow: visible;
        box-sizing: border-box;
        -webkit-text-size-adjust: 100%;
        print-color-adjust: exact;
        -webkit-print-color-adjust: exact;
      }

      body {
        font-family: "Courier New", monospace;
      }

      .ticket {
        width: 46mm;
        min-width: 46mm;
        max-width: 46mm;
        margin: 0;
        padding: 0.35mm 0.2mm 0.35mm 0.15mm;
        font-size: 10px;
        line-height: 1.12;
        box-sizing: border-box;
      }

      p {
        margin: 0;
      }

      .ticket-header,
      .ticket-footer {
        text-align: center;
      }

      .ticket-business-name {
        font-size: 10px;
        font-weight: 700;
      }

      .ticket-phone,
      .ticket-date {
        font-size: 9px;
      }

      .ticket-divider {
        width: 100%;
        margin: 1mm 0 0.6mm;
        font-family: "Courier New", Consolas, monospace;
        font-size: 10px;
        font-weight: 700;
        letter-spacing: -0.1px;
        white-space: nowrap;
        overflow: hidden;
      }

      .ticket-section {
        margin-top: 0.5mm;
      }

      .ticket-line {
        display: grid;
        grid-template-columns: minmax(0, 1fr) auto;
        column-gap: 1.2mm;
        align-items: start;
        width: 100%;
      }

      .ticket-left {
        min-width: 0;
        word-break: break-word;
      }

      .ticket-right {
        white-space: nowrap;
        text-align: right;
        justify-self: end;
      }

      .ticket-item {
        margin-top: 0.7mm;
      }

      .ticket-item:first-child {
        margin-top: 0;
      }

      .ticket-note {
        margin-top: 0.2mm;
        padding-left: 1.5mm;
        font-size: 9px;
      }

      .ticket-total {
        font-weight: 700;
      }
    </style>
  </head>
  <body>
    <main class="ticket">
      <header class="ticket-header">
        <p class="ticket-business-name">${escapeHtml(settings.nombreNegocio)}</p>
        <p>${escapeHtml(settings.direccion)}</p>
        <p class="ticket-phone">${escapeHtml(settings.telefono)}</p>
      </header>

      <p class="ticket-divider">${separator()}</p>

      <section class="ticket-section">
        <div class="ticket-line">
          <span class="ticket-left">Venta #${sale.numeroVenta}</span>
          <span class="ticket-right">${escapeHtml(formatDateTime(sale.fecha))}</span>
        </div>
        <p>Cajero: ${escapeHtml(sale.cajero.nombre)}</p>
      </section>

      <p class="ticket-divider">${separator()}</p>

      <section class="ticket-section">
        ${itemsHtml}
      </section>

      <p class="ticket-divider">${separator()}</p>

      <section class="ticket-section">
        ${summaryRows}
      </section>

      <p class="ticket-divider">${separator()}</p>

      <footer class="ticket-footer">
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
