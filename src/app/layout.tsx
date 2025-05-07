// app/layout.tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css"; // Importa Tailwind

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
    title: "BAC Trivia App",
    description: "Juego de Trivia con Realidad Aumentada",
};

export default function RootLayout({
                                       children,
                                   }: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="es">
        <body className={inter.className}>
        {/* Aquí se puede añadir un Navbar/Header/Footer global en caso de ser necesario */}
        <main className="min-h-screen bg-gray-100"> {/* Fondo base */}
            {children}
        </main>
        </body>
        </html>
    );
}