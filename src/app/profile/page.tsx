// src/app/profile/page.tsx
// ACTUALIZADO: renderCollectedItems ahora usa <img> para los SVGs externos.
'use client';
import React from 'react';
import Button from '@/components/ui/Button';
import { useRouter } from 'next/navigation';
import useUserStore from '@/lib/store/userStore';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import Image from 'next/image'; // Importar el componente Image de Next.js

// --- Componente Interno con Lógica y UI del Perfil ---
function ProfileContent() {
    const router = useRouter();

    // Seleccionar datos del store individualmente para evitar re-renders innecesarios
    const usuarioId = useUserStore((state) => state.usuarioId);
    const nombre = useUserStore((state) => state.nombre);
    const apellido = useUserStore((state) => state.apellido);
    const puntos = useUserStore((state) => state.puntos);
    const itemsCollected = useUserStore((state) => state.itemsCollected); // Leer array del store
    const logout = useUserStore((state) => state.logout);

    const handlePlayClick = () => router.push('/play'); // Ruta actualizada
    const handleLogoutClick = () => {
        console.log('Cerrando sesión...');
        logout(); // Llamar a la acción del store. ProtectedRoute manejará la redirección.
    };

    if (!usuarioId && typeof window !== 'undefined') { //typeof window !== 'undefined' para evitar error de hidratación si se renderiza en server
        // ProtectedRoute debería manejar esto, pero es un fallback.
        return (
            <div className="flex items-center justify-center min-h-screen">
                <p>Cargando perfil...</p>
            </div>
        );
    }

    // Helper para obtener la URL del archivo SVG basado en la categoría
    const getCategorySvgUrl = (category: string | undefined): string => {
        if (!category) return '/icons/default.svg'; // Un SVG por defecto si no hay categoría
        const categoryLower = category.toLowerCase();
        if (categoryLower.includes('ahorro')) return '/icons/ahorro.svg';
        if (categoryLower.includes('tarjeta')) return '/icons/tarjeta.svg';
        if (categoryLower.includes('casa')) return '/icons/casa.svg';
        if (categoryLower.includes('carro')) return '/icons/carro.svg';

        // Fallback si la categoría no coincide con un SVG conocido,
        // podrías tener un SVG genérico o intentar normalizar el nombre.
        // Por ahora, un default.svg es una buena práctica.
        console.warn(`No se encontró un SVG específico para la categoría: ${category}, usando default.`);
        return `/icons/${categoryLower}.svg`; // Intenta usar el nombre de categoría directamente (ej. si tienes "finanzas.svg")
        // O mejor, un default genérico:
        // return '/icons/default-emoji.svg';
    };


    // Función para renderizar los íconos SVG de los items coleccionados usando <img>
    const renderCollectedItems = () => {
        const itemsToShow = itemsCollected?.filter(item => item.answeredCorrectly) || [];

        if (itemsToShow.length === 0) {
            return <p className="text-sm text-gray-500 italic">Aún no has atrapado ningún emoji.</p>;
        }

        // Renderizar SVG para cada item
        return itemsToShow.map((item, index) => {
            const svgUrl = getCategorySvgUrl(item.category);
            // Ajusta width y height según necesites para la "versión pequeña"
            const iconSize = 24; // 24px (equivalente a w-6 h-6 en Tailwind)

            return (
                <div
                    key={`${item.triviaId}-${item.totemId}-${index}`} // Clave más única
                    className="p-1 bg-gray-200 rounded-md shadow-sm flex items-center justify-center"
                    title={`Categoría: ${item.category}`}
                    style={{ width: `${iconSize + 8}px`, height: `${iconSize + 8}px` }} // Contenedor un poco más grande que el ícono
                >
                    <Image
                        src={svgUrl}
                        alt={item.category || 'Emoji coleccionado'}
                        width={iconSize}
                        height={iconSize}
                        // onError para manejar si un SVG no carga (opcional pero recomendado)
                        onError={(e) => {
                            console.warn(`Error al cargar SVG: ${svgUrl}`);
                            // Podrías cambiar el src a un SVG de fallback aquí si es necesario
                            // e.currentTarget.src = '/icons/default-error.svg';
                        }}
                    />
                </div>
            );
        });
    };

    // --- Renderizado del Perfil ---
    // return (
    //     <div className="container mx-auto p-4 pt-10 max-w-lg">
    //         <div className="bg-white shadow-xl rounded-lg p-6">
    //             {/* Sección de Información del Usuario */}
    //             <div className="text-center mb-4">
    //                 <div className="w-16 h-16 rounded-full bg-red-100 mx-auto flex items-center justify-center mb-3 border border-red-200">
    //                     <span className="text-3xl text-red-600 font-semibold">{nombre?.charAt(0).toUpperCase()}</span>
    //                 </div>
    //                 <h2 className="text-2xl font-semibold text-gray-800">
    //                     {nombre}
    //                 </h2>
    //                 <p className="text-sm text-gray-500">{usuarioId}</p>
    //             </div>
    //
    //             {/* Sección de Puntos */}
    //             <div className="mb-6 text-center p-4 bg-red-50 rounded-lg border border-red-100">
    //                 <p className="text-3xl font-bold text-red-600">{puntos ?? 0}</p>
    //                 <p className="text-sm text-gray-600 uppercase tracking-wide">Puntos</p>
    //             </div>
    //
    //             {/* Sección de Emojis Atrapados */}
    //             <div className="mb-8">
    //                 <h3 className="text-lg font-medium text-gray-700 mb-3 text-center">Emojis Atrapados</h3>
    //                 <div className="flex flex-wrap gap-3 justify-center min-h-[60px] bg-gray-100 p-3 rounded-lg border border-gray-200">
    //                     {renderCollectedItems()}
    //                 </div>
    //             </div>
    //
    //             {/* Botones de Acción */}
    //             <div className="flex flex-col space-y-3">
    //                 <Button onClick={handlePlayClick} variant="primary" className="w-full py-3 text-base">
    //                     ¡A Jugar! (Ir a AR)
    //                 </Button>
    //                 <Button onClick={handleLogoutClick} variant="secondary" className="w-full py-3 text-base">
    //                     Cerrar Sesión
    //                 </Button>
    //             </div>
    //         </div>
    //     </div>
    // );

    return (
        <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4 relative">
            <div className="absolute top-4 z-10">
                <Image src="/logos/bactrivia_logo.svg" alt="BAC Trivia Logo" width={100} height={35} />
            </div>
            <div className="w-full max-w-sm bg-red-600 rounded-xl shadow-2xl overflow-hidden"> {/* Cabecera ROJA */}
                <div className="p-6 text-center text-white"> {/* Texto Blanco en cabecera */}
                    <div className="mb-3">
                        <p className="text-5xl font-bold">{puntos ?? 0}</p>
                        <p className="text-sm uppercase tracking-wide">Puntos</p>
                    </div>
                    <h2 className="text-2xl font-semibold">
                        {nombre}
                    </h2>
                    <p className="text-xs opacity-80">{usuarioId}</p>
                </div>

                <div className="bg-white p-6 rounded-b-xl text-gray-800"> {/* Contenido blanco, texto base oscuro */}
                    <div className="mb-8">
                        <h3 className="text-lg font-medium text-gray-900 mb-3 text-center"> {/* Texto oscuro */}
                            Emojis Atrapados
                        </h3>
                        <div className="flex flex-wrap gap-3 justify-center min-h-[60px] bg-gray-100 p-3 rounded-lg border border-gray-200">
                            {renderCollectedItems()}
                        </div>
                    </div>

                    <div className="flex flex-col space-y-3">
                        <Button
                            onClick={handlePlayClick}
                            className="w-full py-3 text-lg bg-yellow-400 hover:bg-yellow-500 text-black font-semibold"
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