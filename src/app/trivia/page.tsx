// app/trivia/page.tsx
import React, { Suspense } from "react";
import ProtectedRoute from "@/components/auth/ProtectedRoute"; // Importar
import TriviaWorkflow from "@/components/trivia/TriviaWorkflow"; // Ajusta la ruta si es necesario

// Componente de Fallback para Suspense (puedes hacerlo más elaborado)
function TriviaLoadingFallback() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <p className="text-xl text-gray-700">Cargando página de trivia...</p>
      {/* Puedes poner un spinner real aquí */}
    </div>
  );
}

// Este es el componente que se exporta para la ruta /trivia
function TriviaPageContent() {
  return (
    <div className="flex-col items-center justify-center min-h-screen bg-gray-100 p-4 top-auto right-auto bottom-auto left-auto relative w-full flex h-full">
      {/* Suspense es necesario porque TriviaWorkflow usa useSearchParams */}
      <Suspense fallback={<TriviaLoadingFallback />}>
        <TriviaWorkflow />
      </Suspense>
    </div>
  );
}

// Exportación de la página envuelta en ProtectedRoute
export default function TriviaPageContainer() {
  return (
    <ProtectedRoute>
      <TriviaPageContent />
    </ProtectedRoute>
  );
}
