// components/auth/ProtectedRoute.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import useUserStore from '@/lib/store/userStore';

interface ProtectedRouteProps {
    children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
    const router = useRouter();
    const isAuthenticated = useUserStore((state) => state.isAuthenticated);

    // Estado para rastrear si el componente se ha montado en el cliente
    // y si el store de Zustand se ha rehidratado desde el localStorage.
    const [isClientReady, setIsClientReady] = useState(false);

    useEffect(() => {
        // Este efecto solo se ejecuta en el cliente después del montaje inicial.
        // Aquí es seguro verificar el estado de hidratación de Zustand.

        // Función para verificar la autenticación y redirigir si es necesario
        const checkAuthAndRedirect = () => {
            if (!useUserStore.getState().isAuthenticated) { // Obtener el estado más reciente
                console.log('ProtectedRoute: Usuario no autenticado, redirigiendo a /login');
                router.replace('/login');
            } else {
                console.log('ProtectedRoute: Usuario autenticado.');
                setIsClientReady(true); // Marcar como listo para mostrar contenido
            }
        };

        // Verificar si el store ya se hidrató.
        // El objeto `persist` y sus métodos solo deben usarse si está definido.
        if (useUserStore.persist && typeof useUserStore.persist.hasHydrated === 'function') {
            if (useUserStore.persist.hasHydrated()) {
                console.log('ProtectedRoute: Store ya está hidratado.');
                checkAuthAndRedirect();
            } else {
                console.log('ProtectedRoute: Store no hidratado, esperando onFinishHydration...');
                // Suscribirse al evento de finalización de hidratación
                const unsub = useUserStore.persist.onFinishHydration(() => {
                    console.log('ProtectedRoute: Store hidratado vía onFinishHydration.');
                    checkAuthAndRedirect();
                    unsub(); // Desuscribirse después de la primera ejecución
                });
                // Llamar a rehydrate por si acaso, aunque usualmente es automático.
                // Podría ser necesario si la hidratación automática no se dispara como se espera.
                // useUserStore.persist.rehydrate(); // Usar con precaución, puede causar re-renders
            }
        } else {
            // Fallback si `useUserStore.persist` o `hasHydrated` no están disponibles
            // Esto podría indicar un problema con la configuración del middleware persist.
            // En este caso, podríamos asumir que no está autenticado o mostrar un error.
            // Por ahora, para desarrollo, intentaremos asumir que si no hay persist, no está auth.
            console.warn('ProtectedRoute: useUserStore.persist o hasHydrated no está disponible. Asumiendo no autenticado.');
            if (!isAuthenticated) { // Chequea el estado actual por si acaso
                router.replace('/login');
            } else {
                setIsClientReady(true); // Si está autenticado por alguna razón (ej. login reciente sin recarga)
            }
        }
    }, [router, isAuthenticated]); // Volver a ejecutar si isAuthenticated cambia (ej. después de login/logout)

    // Mostrar un estado de carga mientras se determina el estado de autenticación en el cliente.
    // Esto previene el "flash" de contenido protegido o la página de login si el usuario ya está autenticado.
    if (!isClientReady) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <p>Verificando sesión...</p>
                {/* Aquí podrías colocar un spinner o un loader más elaborado */}
            </div>
        );
    }

    // Si isClientReady es true y el efecto de arriba no redirigió (porque estaba autenticado),
    // entonces renderizamos los hijos.
    return <>{children}</>;
};

export default ProtectedRoute;