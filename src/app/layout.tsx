// app/layout.tsx
import type { Metadata } from "next";
import "./globals.css"; // Importa Tailwind
import GlobalAppDisabledModal from "@/components/ui/GlobalAppDisabledModal";
export const metadata: Metadata = {
  title: "BAC Trivia App",
  description: "Juego de Trivia con Realidad Aumentada",
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" data-oid="qr:t3.9">
      <body
        className="w-auto h-auto flex flex-col justify-between items-center"
        data-oid="0llllp-"
      >
        {/* Aquí se puede añadir un Navbar/Header/Footer global en caso de ser necesario */}
        <main
          className="min-h-screen w-full h-full bg-red-500"
          data-oid="wd3wh43"
        >
          {" "}
          {/* Fondo base */}
          {children}
        </main>
        <GlobalAppDisabledModal data-oid="w1q9l8m" />{" "}
        {/* Modal disponible globalmente */}
      </body>
    </html>
  );
}
