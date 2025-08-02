// src/app/profile/page.tsx
"use client";

import React from "react";
import Button from "@/components/ui/Button";
import { useRouter } from "next/navigation";
import useUserStore from "@/lib/store/userStore";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import Image from "next/image";
import {
  POINTS_PER_TRIVIA_CORRECT,
  CATEGORIES,
  CategoryId,
} from "@/lib/constants"; // Importar constantes

// --- Componente Interno con Lógica y UI del Perfil ---
function ProfileContent() {
  const router = useRouter();

  const usuarioId = useUserStore((state) => state.usuarioId);
  const nombre = useUserStore((state) => state.nombre);
  const apellido = useUserStore((state) => state.apellido);
  const puntosTotales = useUserStore((state) => state.puntos); // Puntos totales del usuario
  const itemsCollected = useUserStore((state) => state.itemsCollected);
  const logout = useUserStore((state) => state.logout);

  const handlePlayClick = () => router.push("/play");
  const handleLogoutClick = () => {
    logout();
    // ProtectedRoute se encargará de la redirección a /login
  };

  if (!usuarioId && typeof window !== "undefined") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Cargando perfil...</p>
      </div>
    );
  }

  // Función para calcular puntos por categoría
  const calculatePointsForCategory = (category: CategoryId): number => {
    if (!itemsCollected) return 0;

    return itemsCollected
      .filter(
        (item) =>
          item.category?.toLowerCase() === category.toLowerCase() &&
          item.answeredCorrectly,
      )
      .reduce((total, item) => total + (item.pointsGained || 0), 0);
  };

  // Componente para renderizar cada categoría con su puntaje e imagen
  const CategoryDisplay: React.FC<{
    category: (typeof CATEGORIES)[number];
  }> = ({ category }) => {
    const pointsForThisCategory = calculatePointsForCategory(category.id);
    const imageSize = 96; // Tamaño de la imagen SVG (ej. w-16 h-16) - un poco más grande
    const categoryName =
      category.name === "Carro"
        ? "Auto BAC"
        : (category.name === "Casa" ? category.name + " BAC" : category.name);

    return (
      <div className="flex flex-col items-center justify-center rounded-lg shadow-md bg-red-100 p-2">
        {/* Puntaje por categoría */}

        <div className="h-1/2">
          <Image
            src={category.svgUrl}
            alt={category.name}
            width={imageSize}
            height={imageSize}
            onError={() => {
              console.warn(`Error al cargar SVG: ${category.svgUrl}`);
            }}
            className="h-full"
          />
        </div>

        <p className="mt-2 text-center text-gray-700 text-[16px] font-bold">
          {categoryName}
        </p>
        <div className="relative mb-2 text-black text-[16px] font-medium w-[20px] text-center">
          {pointsForThisCategory}
        </div>
        {/* Imagen de la categoría */}
      </div>
    );
  };
  return (
    <div className="h-full w-full flex flex-col items-center">
      <div className="h-[300px] w-full relative flex flex-col items-center justify-center">
        <Image
          src="/logos/lightrays.png"
          alt="BAC Trivia Logo"
          width={80}
          height={35}
          className="w-full z-0 top-1/2 -translate-y-1/2 absolute"
        />

        <Image
          src="/logos/bactrivia_logo.svg"
          alt="BAC Trivia Logo"
          width={80}
          height={35}
          className="w-[128px] z-10 relative"
        />
      </div>

      <div className="w-full max-w-[1000px] flex flex-1 flex-col bg-white p-4 rounded-tl-[12px] rounded-tr-[12px] items-stretch justify-between gap-[24px] relative">
        {/* Sección de Puntajes por Categoría */}

        <div>
          <h2 className="text-2xl font-semibold text-center text-[#000000]">
            {nombre} {apellido}
          </h2>
          <p className="font-bold text-[48px] text-center leading-[60px] text-[#000000]">
            {puntosTotales ?? 0} pts
          </p>
        </div>
        <div className="flex flex-1 flex-col">
          <h3 className="text-sm font-semibold text-gray-900 mb-4 text-center">
            Puntos por Categoría
          </h3>
          {/* Grid para las 4 categorías */}
          <div className="h-full grid grid-cols-2 gap-5">
            {CATEGORIES.map((cat) => (
              <CategoryDisplay key={cat.id} category={cat} />
            ))}
          </div>
        </div>

        {/* Botones de Acción */}
        <div className="flex flex-col space-y-3 mt-0">
          <Button
            onClick={handlePlayClick}
            className="w-full py-3 text-lg bg-red-600 hover:bg-red-700 text-black font-semibold"
          >
            ¡A Jugar!
          </Button>
          <Button
            onClick={handleLogoutClick}
            variant="secondary"
            className="w-full py-2.5 text-sm text-red-600 hover:bg-red-100 border border-red-200 hover:border-red-300"
          >
            Cerrar Sesión
          </Button>
        </div>
      </div>
    </div>
  );
} // --- Componente de Página Exportado ---
export default function ProfilePage() {
  return (
    <ProtectedRoute>
      <ProfileContent />
    </ProtectedRoute>
  );
}
