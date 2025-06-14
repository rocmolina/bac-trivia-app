// src/app/trivia/result/page.tsx
"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Button from "@/components/ui/Button";
import Image from "next/image";
import ProtectedRoute from "@/components/auth/ProtectedRoute"; // Para proteger la ruta
import { CATEGORIES, CategoryId } from "@/lib/constants"; // Importar categorías

// Componente interno para evitar errores de Suspense con useSearchParams directamente en el default export
function TriviaResultContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [isSuccess, setIsSuccess] = useState<boolean | null>(null);
  const [category, setCategory] = useState<CategoryId | null>(null);
  const [pointsGained, setPointsGained] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const successParam = searchParams.get("success");
    const categoryParam = searchParams.get("category") as CategoryId | null;
    const pointsParam = searchParams.get("points");

    if (successParam !== null && categoryParam) {
      setIsSuccess(successParam === "true");
      setCategory(categoryParam);
      setPointsGained(pointsParam ? parseInt(pointsParam, 10) : 0);
    }
    setIsLoading(false);
  }, [searchParams]);

  if (isLoading || isSuccess === null || !category) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 text-gray-700 w-full relative top-auto right-auto bottom-auto left-auto">
        <p className="text-xl animate-pulse">Cargando resultado...</p>
      </div>
    );
  }

  const categoryDetails = CATEGORIES.find(
    (c) => c.id.toLowerCase() === category.toLowerCase(),
  );
  const imageBaseUrl = categoryDetails?.svgUrl || "/icons/default.svg";
  const imageUrl = isSuccess
    ? imageBaseUrl
    : imageBaseUrl.replace(".svg", "_sad.svg");
  // Fallback si no existe la versión _sad, usa la normal
  const finalImageUrl = isSuccess
    ? imageBaseUrl
    : imageBaseUrl.includes("_sad.svg")
      ? imageBaseUrl
      : imageBaseUrl.replace(".svg", "_sad.svg");

  const title = isSuccess ? "¡Excelente Trabajo!" : "¡Oh No!";
  const message = isSuccess
    ? `Has Ganado +${pointsGained} puntos!`
    : "Respuesta Equivocada";
  const bgColor = isSuccess ? "bg-red-500" : "bg-red-700"; // Similar a las imágenes de ejemplo
  const textColor = "text-white";
  const imageContainerBg = "bg-white"; //solicitado por el cliente
  const imageSize = 180; // Tamaño de la imagen SVG de categoría

  return (
    <div
      className={`flex flex-col items-center justify-center min-h-screen ${bgColor} p-6 sm:p-8 transition-colors duration-500 relative`}
    >
      <Image
        width={100}
        height={100}
        alt="Decoration"
        src={isSuccess ? "/logos/confetti.png" : "/logos/degradado.png"}
        className="absolute top-0 w-full left-0 h-[fit-content] z-0"
      />

      {isSuccess && (
        <Image
          width={100}
          height={100}
          src="/logos/lightrays.png"
          alt="Trivia Result"
          className="mb-4 absolute top-0 w-full left-0 h-[378px] z-10"
        />
      )}

      <div
        className={`w-full max-w-md text-center p-8 rounded-2xl shadow-2xl ${imageContainerBg} relative z-20`}
      >
        <div
          className="mb-6 mx-auto flex items-center justify-center"
          style={{ width: imageSize, height: imageSize }}
        >
          <Image
            src={finalImageUrl}
            alt={category || "Categoría"}
            width={imageSize}
            height={imageSize}
            style={{ objectFit: "contain" }} // Fallback si la imagen _sad no carga, se podría intentar la normal.
            // onError={(e) => { if (!isSuccess) e.currentTarget.src = imageBaseUrl; }} // Opcional
          />
        </div>

        <h1
          className={`text-4xl sm:text-5xl font-bold mb-3 text-black`} //Color del texto neutro solicitado por el cliente
        >
          {title}
        </h1>
        <p
          className={`text-xl sm:text-2xl mb-8 text-black`} //Color del texto neutro solicitado por el cliente
        >
          {message}
        </p>

        <div className="space-y-4">
          <Button
            onClick={() => router.push("/play")}
            className="w-full py-3 text-lg bg-red-600 hover:bg-red-700 text-black font-semibold shadow-md"
          >
            Volver a Jugar
          </Button>
          <Button
            onClick={() => router.push("/profile")}
            variant="secondary"
            className="w-full py-3 text-lg bg-white hover:bg-gray-100 text-gray-700 border border-gray-300 shadow-md"
          >
            Ir al Perfil
          </Button>
        </div>
      </div>
    </div>
  );
}
export default function TriviaResultPage() {
  return (
    <ProtectedRoute>
      <Suspense
        fallback={
          <div className="flex items-center justify-center min-h-screen">
            <p>Cargando...</p>
          </div>
        }
      >
        <TriviaResultContent />
      </Suspense>
    </ProtectedRoute>
  );
}
