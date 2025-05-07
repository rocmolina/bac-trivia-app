// components/auth/ProtectedRoute.tsx
'use client';

import React, { useEffect } from 'react';
import { useRouter }
    from 'next/navigation';
import useUserStore from '@/lib/store/userStore';

interface ProtectedRouteProps {
    children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
    const isAuthenticated = useUserStore((state) => state.isAuthenticated);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const isLoadingAuth = useUserStore.persist.hasHydrated; // Para saber si el store ya se hidrató desde localStorage
    const router = useRouter();

    useEffect(() => {
        // Esperar a que el store se hidrate desde localStorage
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const checkAuth = async () => {
            const storeHydrated = useUserStore.persist.hasHydrated();
            if (!storeHydrated) {
                // Aun no se ha hidratado, esperar un poco o re-subscribir
                // Por simplicidad, si no está hidratado y no está autenticado, redirige.
                // Una solución más robusta podría usar un estado de "loading auth".
                // console.log("Auth state not hydrated yet...");
            }

            if (storeHydrated && !isAuthenticated) {
                console.log('Usuario no autenticado, redirigiendo a login...');
                router.replace('/login');
            }
        };

        // Ejecutar la verificación. Si la hidratación es asíncrona, puede necesitar un pequeño delay
        // o una mejor manera de saber cuándo está listo el estado persistido.
        // Por ahora, la comprobamos en el effect.
        if (!useUserStore.persist.hasHydrated()) {
            const unsub = useUserStore.persist.onFinishHydration(() => {
                console.log("Store hydrated from ProtectedRoute");
                if (!useUserStore.getState().isAuthenticated) {
                    router.replace('/login');
                }
                unsub();
            });
        } else {
            if (!isAuthenticated) {
                router.replace('/login');
            }
        }

    }, [isAuthenticated, router]);

    // Si el store aún no se ha hidratado, o si no está autenticado,
    // podrías mostrar un loader o null para evitar un flash de contenido.
    if (!useUserStore.persist.hasHydrated() || !isAuthenticated) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <p>Verificando autenticación...</p>
            </div>
        ); // O un spinner/loader global
    }

    return <>{children}</>;
};

export default ProtectedRoute;