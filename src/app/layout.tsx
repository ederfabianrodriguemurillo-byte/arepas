import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Arepas Stefania POS",
  description: "Sistema POS completo para arepas con panel administrativo, ventas e impresión térmica.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="h-full">
      <body className="min-h-full">{children}</body>
    </html>
  );
}
