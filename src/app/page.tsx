// app/page.tsx
'use client';
import React from 'react';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import useUserStore from '@/lib/store/userStore'; // Importar para lógica inicial
import { useRouter } from 'next/navigation'; // Para redirección si es necesario

// Un componente simple que muestra el contenido si está autenticado (perfil)
// O nada si no lo está (ProtectedRoute redirigirá)
function RootContent() {
    const router = useRouter();
    const isAuthenticated = useUserStore((state) => state.isAuthenticated);

    // Si por alguna razón ProtectedRoute permite renderizar esto sin estar autenticado,
    // forzamos redirección (aunque no debería pasar con el ProtectedRoute corregido).
    React.useEffect(() => {
        if (isAuthenticated) {
            router.replace('/profile');
        } else {
            // ProtectedRoute ya debería haber redirigido a /login
        }
    }, [isAuthenticated, router]);

    // Si está autenticado, podría mostrar brevemente un loader antes de ir a perfil
    if (isAuthenticated) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <p>Cargando perfil...</p>
            </div>
        );
    }

    // Si no está autenticado, ProtectedRoute maneja la redirección/loader
    return null;

}

export default function HomePage() {
    // Simplemente envolvemos un contenido mínimo (o null) con ProtectedRoute.
    // ProtectedRoute decidirá si muestra sus hijos (que redirigen a /profile)
    // o si redirige a /login.
    return (
        <ProtectedRoute>
            <RootContent />
        </ProtectedRoute>
    );
}