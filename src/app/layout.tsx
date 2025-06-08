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
    <html lang="es" data-oid="_u.bvgw">
      <body
        className="w-auto h-auto flex flex-col justify-between items-center"
        data-oid="qnc3-1c"
      >
        {/* Aquí se puede añadir un Navbar/Header/Footer global en caso de ser necesario */}
        <main
          className="min-h-screen w-full h-full bg-red-500"
          data-oid="g4hii-z"
        >
          {" "}
          {/* Fondo base */}
          {children}
        </main>
        <GlobalAppDisabledModal data-oid="fpct43d" />{" "}
        {/* Modal disponible globalmente */}
      </body>
    </html>
  );
}
