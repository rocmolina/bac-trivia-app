// app/trivia/page.tsx
import React, { Suspense } from 'react';
import TriviaWorkflow from '@/components/trivia/TriviaWorkflow'; // Ajusta la ruta si es necesario

// Componente de Fallback para Suspense (puedes hacerlo más elaborado)
function TriviaLoadingFallback() {
    return (
        <div className="flex items-center justify-center min-h-screen">
            <p className="text-xl text-gray-700">Cargando página de trivia...</p>
            {/* Puedes poner un spinner real aquí */}
        </div>
    );
}

export default function TriviaPageContainer() {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4">
            <Suspense fallback={<TriviaLoadingFallback />}>
                <TriviaWorkflow />
            </Suspense>
        </div>
    );
}