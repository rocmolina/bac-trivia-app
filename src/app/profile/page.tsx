// app/profile/page.tsx
'use client';
import React from 'react';
import Button from '@/components/ui/Button';
import { useRouter } from 'next/navigation';
import useUserStore from '@/lib/store/userStore';
import ProtectedRoute from '@/components/auth/ProtectedRoute'; // Importar

function ProfileContent() { // Mover el contenido a un componente hijo
    const router = useRouter();
    const user = useUserStore((state) => ({
        usuarioId: state.usuarioId,
        nombre: state.nombre,
        apellido: state.apellido,
        puntos: state.puntos,
        itemsCollected: [], // TODO: Obtener del store o API
    }));
    const logout = useUserStore((state) => state.logout);

    const handlePlayClick = () => router.push('/play');
    const handleLogoutClick = () => {
        logout();
        router.push('/login'); // Asegurarse de redirigir tras logout
    };

    return (
        <div className="container mx-auto p-4 pt-10 max-w-lg">
            {/* ... (El mismo JSX de la página de perfil que tenías antes, usando 'user.') ... */}
            <div className="bg-white shadow-md rounded-lg p-6">
                <div className="text-center mb-4">
                    <h2 className="text-2xl font-semibold text-gray-800">
                        {user?.nombre} {user?.apellido}
                    </h2>
                    <p className="text-sm text-gray-500">{user?.usuarioId}</p>
                </div>
                <div className="mb-6 text-center">
                    <p className="text-lg font-bold text-red-600">{user?.puntos ?? 0}</p>
                    <p className="text-sm text-gray-600">Puntos Acumulados</p>
                </div>
                {/* ... resto del JSX de perfil ... */}
                <div className="flex flex-col space-y-3 mt-6">
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

export default function ProfilePage() { // Este es el componente de página
    return (
        <ProtectedRoute>
            <ProfileContent />
        </ProtectedRoute>
    );
}