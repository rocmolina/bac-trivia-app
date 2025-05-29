// src/app/profile/page.tsx
'use client';

import React from 'react';
import Button from '@/components/ui/Button';
import { useRouter } from 'next/navigation';
import useUserStore from '@/lib/store/userStore';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import Image from 'next/image';
import { POINTS_PER_TRIVIA_CORRECT, CATEGORIES, CategoryId } from '@/lib/constants'; // Importar constantes

// --- Componente Interno con Lógica y UI del Perfil ---
function ProfileContent() {
    const router = useRouter();

    const usuarioId = useUserStore((state) => state.usuarioId);
    const nombre = useUserStore((state) => state.nombre);
    const apellido = useUserStore((state) => state.apellido);
    const puntosTotales = useUserStore((state) => state.puntos); // Puntos totales del usuario
    const itemsCollected = useUserStore((state) => state.itemsCollected);
    const logout = useUserStore((state) => state.logout);

    const handlePlayClick = () => router.push('/play');
    const handleLogoutClick = () => {
        logout();
        // ProtectedRoute se encargará de la redirección a /login
    };

    if (!usuarioId && typeof window !== 'undefined') {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <p>Cargando perfil...</p>
            </div>
        );
    }

    // Función para calcular puntos por categoría
    const calculatePointsForCategory = (category: CategoryId): number => {
        if (!itemsCollected) return 0;

        const categoryItems = itemsCollected.filter(
            item => item.category?.toLowerCase() === category.toLowerCase() && item.answeredCorrectly
        );
        // Usamos POINTS_PER_TRIVIA_CORRECT, o podrías usar item.pointsGained si cada item ya lo tiene
        return categoryItems.length * POINTS_PER_TRIVIA_CORRECT;
    };

    // Componente para renderizar cada categoría con su puntaje e imagen
    const CategoryDisplay: React.FC<{ category: typeof CATEGORIES[number] }> = ({ category }) => {
        const pointsForThisCategory = calculatePointsForCategory(category.id);
        const imageSize = 96; // Tamaño de la imagen SVG (ej. w-16 h-16) - un poco más grande
        const categoryName = category.name === "Carro" || category.name === "Casa" ? category.name+" BAC" : category.name;

        return (
            <div className="flex flex-col items-center p-3 bg-gray-100 rounded-lg shadow-md w-full sm:w-auto">
                {/* Puntaje por categoría */}
                <div className="relative mb-2 text-2xl font-bold text-black">
                    {pointsForThisCategory}
                </div>
                {/* Imagen de la categoría */}
                <div className={`w-[<span class="math-inline">\{imageSize\}px\] h\-\[</span>{imageSize}px] flex items-center justify-center`}>
                    <Image
                        src={category.svgUrl}
                        alt={category.name}
                        width={imageSize}
                        height={imageSize}
                        onError={() => { console.warn(`Error al cargar SVG: ${category.svgUrl}`); }}
                    />
                </div>
                <p className="mt-2 text-xs text-center text-gray-700 font-medium">{categoryName}</p>
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-gray-100 flex items-center justify-center p-2 sm:p-4 relative">

            <div className="w-full max-w-md bg-red-600 rounded-xl shadow-2xl overflow-hidden"> {/* Contenedor principal rojo */}
                {/* Cabecera Roja */}
                <div className="flex items-center justify-center rounded-t-xl">
                    <Image
                        src="/logos/bactrivia_logo.svg"
                        alt="BAC Trivia Logo"
                        width={80}
                        height={35}
                    />
                </div>

                <div className="p-3 text-center text-white">
                    <div className="mb-3">
                        <p className="text-3xl font-bold">{puntosTotales ?? 0} pts</p>
                    </div>
                    <h2 className="text-2xl font-semibold">
                        {nombre}
                    </h2>
                    <p className="text-xs opacity-80">{usuarioId}</p>
                </div>

                {/* Contenido Blanco (Emojis por Categoría y Botones) */}
                <div className="bg-white p-6 rounded-b-xl text-gray-800">
                    {/* Sección de Puntajes por Categoría */}
                    <div className="mb-8">
                        <h3 className="text-sm font-semibold text-gray-900 mb-4 text-center">
                            Puntos por Categoría
                        </h3>
                        {/* Grid para las 4 categorías */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                            {CATEGORIES.map((cat) => (
                                <CategoryDisplay key={cat.id} category={cat} />
                            ))}
                        </div>
                    </div>

                    {/* Botones de Acción */}
                    <div className="flex flex-col space-y-3 mt-6">
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
        </div>
    );
}

// --- Componente de Página Exportado ---
export default function ProfilePage() {
    return (
        <ProtectedRoute>
            <ProfileContent />
        </ProtectedRoute>
    );
}