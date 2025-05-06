// app/profile/page.tsx
'use client';

import React from 'react';
import Button from '@/components/ui/Button';
import { useRouter } from 'next/navigation';
// import useUserStore from '@/lib/store/userStore'; // Se creará después

export default function ProfilePage() {
    const router = useRouter();
    // const { user, logout } = useUserStore(); // Obtener datos y acción del store

    // --- Placeholder Data ---
    const user = {
        usuarioId: 'Usuario-Demo-1',
        nombre: 'Demo',
        apellido: 'User',
        puntos: 0,
        itemsCollected: []
    };
    const logout = () => {
        alert("Simulando cierre de sesión...");
        router.push('/login');
    }
    // --- End Placeholder ---

    // Añadir lógica para proteger la ruta si el usuario no está logueado (en Día 2)
    // if (!user) {
    //   // Idealmente esto se maneja con un HOC, middleware o en un layout protegido
    //   if (typeof window !== 'undefined') router.push('/login');
    //   return <div>Redirigiendo...</div>; // O un loader
    // }

    const handlePlayClick = () => {
        router.push('/jugar');
    };

    const handleLogoutClick = () => {
        logout(); // Limpiar store y redirigir
    };

    return (
        <div className="container mx-auto p-4 pt-10 max-w-lg">
            <div className="bg-white shadow-md rounded-lg p-6">
                <div className="text-center mb-4">
                    {/* Puedes añadir un avatar o icono */}
                    <h2 className="text-2xl font-semibold text-gray-800">
                        {user?.nombre} {user?.apellido}
                    </h2>
                    <p className="text-sm text-gray-500">{user?.usuarioId}</p>
                </div>

                <div className="mb-6 text-center">
                    <p className="text-lg font-bold text-red-600">{user?.puntos ?? 0}</p>
                    <p className="text-sm text-gray-600">Puntos Acumulados</p>
                </div>

                <div className="mb-6">
                    <h3 className="text-lg font-medium text-gray-700 mb-2">Emojis Atrapados:</h3>
                    <div className="flex flex-wrap gap-2 justify-center min-h-[50px] bg-gray-100 p-2 rounded">
                        {user?.itemsCollected && user.itemsCollected.length > 0 ? (
                            user.itemsCollected.map((item: any, index: number) => (
                                <span key={index} className="text-2xl"> {/* Placeholder: Mostrar emoji real o icono */}
                                    {item.category === 'Ahorro' ? '🐷' :
                                        item.category === 'Tarjeta' ? '💳' :
                                            item.category === 'Casa' ? '🏠' :
                                                item.category === 'Carro' ? '🚗' : '?'}
                </span>
                            ))
                        ) : (
                            <p className="text-sm text-gray-500 italic">Aún no has atrapado ninguno.</p>
                        )}
                    </div>
                </div>

                <div className="flex flex-col space-y-3">
                    <Button onClick={handlePlayClick} variant="primary" className="w-full">
                        ¡A Jugar! (Ir a AR)
                    </Button>
                    <Button onClick={handleLogoutClick} variant="secondary" className="w-full">
                        Cerrar Sesión
                    </Button>
                </div>
            </div>
        </div>
    );
}