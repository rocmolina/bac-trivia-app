// src/app/profile/page.tsx
'use client';
import React from 'react';
import Button from '@/components/ui/Button'; // Ajusta la ruta si es necesario
import { useRouter } from 'next/navigation';
import useUserStore from '@/lib/store/userStore'; // Ajusta la ruta si es necesario
import ProtectedRoute from '@/components/auth/ProtectedRoute'; // Ajusta la ruta si es necesario

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

    // Mostrar loader mientras los datos se hidratan (ProtectedRoute también muestra uno)
    if (!usuarioId) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <p>Cargando perfil...</p>
            </div>
        );
    }

    // Función para renderizar los íconos SVG de los items coleccionados
    const renderCollectedItems = () => {
        // Asumiendo que 'itemsCollected' es un array de objetos como:
        // { triviaId?: string, category: string, totemId?: string, answeredCorrectly?: boolean, timestamp?: string }
        // Filtramos por los respondidos correctamente si existe el campo, sino mostramos todos
        const itemsToShow = itemsCollected?.filter(item => item.answeredCorrectly !== false) || [];

        if (itemsToShow.length === 0) {
            return <p className="text-sm text-gray-500 italic">Aún no has atrapado ningún emoji.</p>;
        }

        // Renderizar SVG para cada item
        return itemsToShow.map((item, index) => {
            let iconSvg: React.ReactNode = null;
            const iconClass = "w-8 h-8 text-gray-700"; // Tamaño y color SVG

            switch (item.category) {
                case 'Ahorro':
                    iconSvg = ( <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={iconClass}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.75A.75.75 0 0 1 3 4.5h.75m0 0h.75A.75.75 0 0 1 4.5 6v.75m0 0v.75A.75.75 0 0 1 3.75 8.25h-.75m0 0h-.75A.75.75 0 0 1 2.25 7.5V6.75m0 0H3.75m0 0h.75m0 0h.75M6 12v5.25A2.25 2.25 0 0 0 8.25 19.5h7.5A2.25 2.25 0 0 0 18 17.25V12m0 0h-1.5m1.5 0a2.25 2.25 0 0 1-2.25 2.25H8.25A2.25 2.25 0 0 1 6 12m0 0a2.25 2.25 0 0 0-2.25 2.25v5.25A2.25 2.25 0 0 0 6 21.75h7.5A2.25 2.25 0 0 0 15.75 19.5V14.25M18 12a2.25 2.25 0 0 0-2.25-2.25H8.25A2.25 2.25 0 0 0 6 12m12 0a2.25 2.25 0 0 1 2.25 2.25v5.25A2.25 2.25 0 0 1 18 21.75h-.75m.75-9h-1.5" /></svg> );
                    break;
                case 'Tarjeta':
                    iconSvg = ( <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={iconClass}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25v10.5A2.25 2.25 0 0 0 4.5 19.5Z" /></svg> );
                    break;
                case 'Casa':
                    iconSvg = ( <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={iconClass}><path strokeLinecap="round" strokeLinejoin="round" d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h7.5" /></svg> );
                    break;
                case 'Carro':
                    iconSvg = ( <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={iconClass}><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h6m-6 0H6m4.125-1.125a1.5 1.5 0 0 1 1.17-1.363l3.876-1.162a1.5 1.5 0 0 0 1.17-1.363V8.25m-7.5 0a1.5 1.5 0 0 1 1.5-1.5h5.25a1.5 1.5 0 0 1 1.5 1.5v3.75m-7.5 0v-.188a1.5 1.5 0 1 1 3 0v.188m-3 0h3m-6.75 0h6.75m-6.75 0H6m6 0h6.75m-6.75 0h6.75m0 0v-.188a1.5 1.5 0 1 0-3 0v.188m3 0h-3m6.75-3.75a1.5 1.5 0 0 0-1.5-1.5h-5.25a1.5 1.5 0 0 0-1.5 1.5v3.75m10.5-3.75a1.5 1.5 0 0 0-1.5-1.5h-5.25a1.5 1.5 0 0 0-1.5 1.5v3.75m7.5-3.75h1.5m-1.5 0h-5.25m5.25 0v3.75" /></svg> );
                    break;
                default:
                    iconSvg = ( <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={iconClass}><path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 5.25h.008v.008H12v-.008Z" /></svg> );
            }
            return (
                <div key={`${item.triviaId || index}`} className="p-1 bg-gray-200 rounded-md shadow-sm" title={`Categoría: ${item.category}`}>
                    {iconSvg}
                </div>
            );
        });
    };

    // --- Renderizado del Perfil ---
    return (
        <div className="container mx-auto p-4 pt-10 max-w-lg">
            <div className="bg-white shadow-xl rounded-lg p-6">
                {/* Sección de Información del Usuario */}
                <div className="text-center mb-4">
                    <div className="w-16 h-16 rounded-full bg-red-100 mx-auto flex items-center justify-center mb-3 border border-red-200">
                        <span className="text-3xl text-red-600 font-semibold">{nombre?.charAt(0).toUpperCase()}</span>
                    </div>
                    <h2 className="text-2xl font-semibold text-gray-800">
                        {nombre} {apellido}
                    </h2>
                    <p className="text-sm text-gray-500">{usuarioId}</p>
                </div>

                {/* Sección de Puntos */}
                <div className="mb-6 text-center p-4 bg-red-50 rounded-lg border border-red-100">
                    <p className="text-3xl font-bold text-red-600">{puntos ?? 0}</p>
                    <p className="text-sm text-gray-600 uppercase tracking-wide">Puntos</p>
                </div>

                {/* Sección de Emojis Atrapados */}
                <div className="mb-8">
                    <h3 className="text-lg font-medium text-gray-700 mb-3 text-center">Emojis Atrapados</h3>
                    <div className="flex flex-wrap gap-3 justify-center min-h-[60px] bg-gray-100 p-3 rounded-lg border border-gray-200">
                        {renderCollectedItems()}
                    </div>
                </div>

                {/* Botones de Acción */}
                <div className="flex flex-col space-y-3">
                    <Button onClick={handlePlayClick} variant="primary" className="w-full py-3 text-base">
                        ¡A Jugar! (Ir a AR)
                    </Button>
                    <Button onClick={handleLogoutClick} variant="secondary" className="w-full py-3 text-base">
                        Cerrar Sesión
                    </Button>
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