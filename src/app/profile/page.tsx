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
      <div
        className="flex items-center justify-center min-h-screen"
        data-oid="7d6-nk4"
      >
        <p data-oid="2y2v-2n">Cargando perfil...</p>
      </div>
    );
  }

  // Función para calcular puntos por categoría
  const calculatePointsForCategory = (category: CategoryId): number => {
    if (!itemsCollected) return 0;

    const categoryItems = itemsCollected.filter(
      (item) =>
        item.category?.toLowerCase() === category.toLowerCase() &&
        item.answeredCorrectly,
    );
    // Usamos POINTS_PER_TRIVIA_CORRECT, o podrías usar item.pointsGained si cada item ya lo tiene
    return categoryItems.length * POINTS_PER_TRIVIA_CORRECT;
  };

  // Componente para renderizar cada categoría con su puntaje e imagen
  const CategoryDisplay: React.FC<{
    category: (typeof CATEGORIES)[number];
  }> = ({ category }) => {
    const pointsForThisCategory = calculatePointsForCategory(category.id);
    const imageSize = 96; // Tamaño de la imagen SVG (ej. w-16 h-16) - un poco más grande
    const categoryName =
      category.name === "Carro" || category.name === "Casa"
        ? category.name + " BAC"
        : category.name;

    return (
      <div
        className="flex flex-col items-center justify-center rounded-lg shadow-md bg-red-100 p-[10px] min-h-[150px] pt-[10px] pb-[10px]"
        data-oid="2zja71j"
      >
        {/* Puntaje por categoría */}

        <div
          className={`w-[<span class="math-inline">\{imageSize\}px\] h\-\[</span>{imageSize}px] flex items-center justify-center`}
          data-oid="9dx91bs"
        >
          <Image
            src={category.svgUrl}
            alt={category.name}
            width={imageSize}
            height={imageSize}
            onError={() => {
              console.warn(`Error al cargar SVG: ${category.svgUrl}`);
            }}
            className="h-[72px]"
            data-oid="xs.tv_t"
          />
        </div>

        <p
          className="mt-2 text-center text-gray-700 text-[16px] font-bold"
          data-oid="lzp_93w"
        >
          {categoryName}
        </p>
        <div
          className="relative mb-2 text-black text-[16px] font-medium w-[20px] text-center"
          data-oid="aj-k5ox"
        >
          {pointsForThisCategory}
        </div>
        {/* Imagen de la categoría */}
      </div>
    );
  };
  return (
    <div
      className="min-h-screen flex items-center flex-col justify-start h-screen w-full fixed top-auto right-auto bottom-auto left-auto"
      data-oid="8:-aiaa"
    >
      <div
        className="flex items-center right-0 bottom-0 left-0 top-0 relative w-full justify-center p-[24px] h-full"
        data-oid="vjiz0g-"
      >
        <Image
          src="/logos/lightrays.png"
          alt="BAC Trivia Logo"
          width={80}
          height={35}
          className="w-full h-[408px] absolute -top-20 z-0"
          data-oid="79za12l"
        />

        <Image
          src="/logos/bactrivia_logo.svg"
          alt="BAC Trivia Logo"
          width={80}
          height={35}
          className="w-[128px] z-10"
          data-oid=".ojbcgq"
        />
      </div>

      <div
        className="bg-white p-6 rounded-b-xl text-gray-800 flex-col rounded-tl-[12px] rounded-tr-[12px] rounded-bl-none rounded-br-none w-full flex items-stretch justify-between gap-[24px] top-0 right-0 bottom-0 left-0 relative h-fit"
        data-oid="dkc3uuf"
      >
        {/* Sección de Puntajes por Categoría */}

        <div data-oid="hqzcks5">
          <h2 className="text-2xl font-semibold text-center" data-oid="52lcbk4">
            {nombre} {apellido}
          </h2>
          <p
            className="font-bold text-[48px] text-center leading-[60px]"
            data-oid="h74nq83"
          >
            {puntosTotales ?? 0} pts
          </p>
        </div>
        <div className="m-0 h-fit-content" data-oid="efigot0">
          <h3
            className="text-sm font-semibold text-gray-900 mb-4 text-center"
            data-oid="wendx7d"
          >
            Puntos por Categoría
          </h3>
          {/* Grid para las 4 categorías */}
          <div
            className="grid grid-cols-2 sm:grid-cols-4 sm:gap-4 w-full gap-[24px]"
            data-oid="eio07if"
          >
            {CATEGORIES.map((cat) => (
              <CategoryDisplay key={cat.id} category={cat} data-oid="ck4t8nt" />
            ))}
          </div>
        </div>

        {/* Botones de Acción */}
        <div className="flex flex-col space-y-3 mt-0" data-oid="7w7t8s_">
          <Button
            onClick={handlePlayClick}
            className="w-full py-3 text-lg bg-red-600 hover:bg-red-700 text-black font-semibold"
            data-oid="mnzmc.n"
          >
            ¡A Jugar!
          </Button>
          <Button
            onClick={handleLogoutClick}
            variant="secondary"
            className="w-full py-2.5 text-sm text-red-600 hover:bg-red-100 border border-red-200 hover:border-red-300"
            data-oid="g87sfvw"
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
    <ProtectedRoute data-oid="km93ig3">
      <ProfileContent data-oid="13anwai" />
    </ProtectedRoute>
  );
}
