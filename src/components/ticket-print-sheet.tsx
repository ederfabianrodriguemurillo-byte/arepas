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

const TICKET_LINE_WIDTH = 32;

function separator() {
  return "-".repeat(TICKET_LINE_WIDTH);
}

function formatTicketCop(value: number) {
  return `$${value}`;
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

function centerLine(value: string) {
  const clean = value.trim();
  if (clean.length >= TICKET_LINE_WIDTH) {
    return clean.slice(0, TICKET_LINE_WIDTH);
  }

  const leftPad = Math.floor((TICKET_LINE_WIDTH - clean.length) / 2);
  return `${" ".repeat(leftPad)}${clean}`;
}

function wrapLine(value: string, width = TICKET_LINE_WIDTH) {
  const text = value.replace(/\s+/g, " ").trim();
  if (!text) {
    return [""];
  }

  const words = text.split(" ");
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    if (!current) {
      current = word;
      continue;
    }

    if (`${current} ${word}`.length <= width) {
      current = `${current} ${word}`;
      continue;
    }

    lines.push(current);
    current = word;
  }

  if (current) {
    lines.push(current);
  }

  return lines;
}

function formatKeyValueLine(label: string, value: string, valueWidth = 8) {
  const safeValue = value.trim();
  const safeLabel = label.trim();
  const labelWidth = Math.max(1, TICKET_LINE_WIDTH - valueWidth - 1);
  const labelLines = wrapLine(safeLabel, labelWidth);
  const valueLines = wrapLine(safeValue, valueWidth);
  const lineCount = Math.max(labelLines.length, valueLines.length);
  const lines: string[] = [];

  for (let index = 0; index < lineCount; index += 1) {
    const left = (labelLines[index] || "").padEnd(labelWidth, " ");
    const right = valueLines[index] || "";
    lines.push(`${left} ${right.padStart(valueWidth, " ")}`);
  }

  return lines;
}

function renderTicketHtml(sale: PrintableSale, settings: TicketSettings) {
  const itemLines = sale.items.flatMap((item) => {
    const itemName = `${item.cantidad} x ${item.nombreProducto}${item.nombreVariante ? ` (${item.nombreVariante})` : ""}`;
    const lines = formatKeyValueLine(itemName, formatTicketCop(item.totalLinea), 8);

    if (item.observacion) {
      lines.push(...wrapLine(`Obs: ${item.observacion}`, TICKET_LINE_WIDTH));
    }

    return lines;
  });

  const footerMessageLines = wrapLine(settings.mensajeTicket, TICKET_LINE_WIDTH).map(centerLine);
  const detailLines = [
    ...wrapLine(settings.direccion, TICKET_LINE_WIDTH),
    ...wrapLine(settings.telefono, TICKET_LINE_WIDTH),
    ...wrapLine(formatDateTime(sale.fecha), TICKET_LINE_WIDTH),
    ...formatKeyValueLine("Venta", `#${sale.numeroVenta}`, 8),
    ...wrapLine(`Cajero: ${sale.cajero.nombre}`, TICKET_LINE_WIDTH),
  ];

  const totalsLines = [
    ...formatKeyValueLine("Subtotal", formatTicketCop(sale.subtotal), 8),
    ...formatKeyValueLine("TOTAL", formatTicketCop(sale.total), 8),
    ...formatKeyValueLine("Pago", paymentMethodTicketLabel(sale.metodoPago), 8),
    ...(sale.montoRecibido !== null ? formatKeyValueLine("Recibido", formatTicketCop(sale.montoRecibido), 8) : []),
    ...(sale.cambio !== null ? formatKeyValueLine("Cambio", formatTicketCop(sale.cambio), 8) : []),
  ];

  const ticketText = [
    centerLine(settings.nombreNegocio),
    separator(),
    ...detailLines,
    separator(),
    ...itemLines,
    separator(),
    ...totalsLines,
    separator(),
    ...footerMessageLines,
  ].join("\n");

  return `<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=58mm, initial-scale=1, maximum-scale=1" />
    <title>Ticket ${sale.numeroVenta}</title>
    <style>
      @page {
        size: 58mm auto;
        margin: 0;
      }

      html, body {
        width: 58mm;
        min-width: 58mm;
        max-width: 58mm;
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
        width: 58mm;
        min-width: 58mm;
        max-width: 58mm;
        margin: 0;
        padding: 0.6mm 0.6mm 0.5mm;
        font-size: 9px;
        line-height: 1.16;
        transform: scale(1);
        zoom: 1;
        box-sizing: border-box;
      }

      p,
      pre {
        margin: 0;
      }

      .ticket-text {
        width: 100%;
        white-space: pre-wrap;
        word-break: normal;
        overflow-wrap: normal;
        font-family: "Courier New", Consolas, monospace;
        font-size: 9px;
        font-weight: 700;
      }
    </style>
  </head>
  <body>
    <main class="ticket">
      <pre class="ticket-text">${escapeHtml(ticketText)}</pre>
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
