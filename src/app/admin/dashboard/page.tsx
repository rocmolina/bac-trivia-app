// src/app/admin/dashboard/page.tsx
'use client';

import React, { useEffect, useState }  from 'react';
import { useRouter } from 'next/navigation';
import useAdminStore from '@/lib/store/adminStore';
import { getUsersWithScoresApi, UserScoreData, getAppStatusApi, setAppStatusApi } from '@/lib/services/api';
import Button from '@/components/ui/Button';
import Image from 'next/image'; // <--- IMPORTAR Image

// ProtectedAdminRoute (sin cambios, ya es robusta)
const ProtectedAdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const router = useRouter();
    const isAdminAuthenticated = useAdminStore((state) => state.isAdminAuthenticated);
    const [isHydrated, setIsHydrated] = useState(false);

    useEffect(() => {
        const unsubFinishHydration = useAdminStore.persist.onFinishHydration(() => setIsHydrated(true));
        if (useAdminStore.persist.hasHydrated()) setIsHydrated(true);
        return () => unsubFinishHydration();
    }, []);

    useEffect(() => {
        if (isHydrated && !isAdminAuthenticated) router.replace('/admin/login');
    }, [isHydrated, isAdminAuthenticated, router]);

    if (!isHydrated) return <div className="flex items-center justify-center min-h-screen"><p>Verificando acceso admin (hidratando)...</p></div>;
    if (isAdminAuthenticated) return <>{children}</>;
    return <div className="flex items-center justify-center min-h-screen"><p>Acceso denegado. Redirigiendo a login...</p></div>;
};

// Contenido del Dashboard
function AdminDashboardContent() {
    const adminNombre = useAdminStore((state) => state.adminNombre);
    const logoutAdmin = useAdminStore((state) => state.logoutAdmin);

    const [users, setUsers] = useState<UserScoreData[]>([]);
    const [isLoadingUsers, setIsLoadingUsers] = useState(true);
    const [usersError, setUsersError] = useState<string | null>(null);

    const [isAppActive, setIsAppActive] = useState(true);
    const [isLoadingStatus, setIsLoadingStatus] = useState(true);
    const [statusError, setStatusError] = useState<string | null>(null);
    const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

    useEffect(() => {
        const fetchInitialData = async () => {
            setIsLoadingUsers(true); setUsersError(null);
            try {
                const fetchedUsers = await getUsersWithScoresApi();
                setUsers(fetchedUsers);
            } catch (err: any) { setUsersError(err.error || err.message || 'Error al cargar usuarios.');
            } finally { setIsLoadingUsers(false); }

            setIsLoadingStatus(true); setStatusError(null);
            try {
                const appStatusResponse = await getAppStatusApi();
                setIsAppActive(appStatusResponse.isAppActive);
            } catch (err: any) { setStatusError(err.error || err.message || 'Error al cargar estado de app.');
            } finally { setIsLoadingStatus(false); }
        };
        void fetchInitialData();
    }, []);

    const handleLogout = () => logoutAdmin();

    const handleToggleAppStatus = async () => {
        setIsUpdatingStatus(true); setStatusError(null);
        const newStatus = !isAppActive;
        try {
            await setAppStatusApi({ isActive: newStatus });
            setIsAppActive(newStatus);
            alert(`Estado de la aplicación: ${newStatus ? 'ACTIVA' : 'DESACTIVADA'}`);
        } catch (err: any) {
            setStatusError(err.error || err.message || 'Error al cambiar estado.');
            alert(`Error al cambiar estado: ${err.error || err.message || 'Error desconocido'}`);
        } finally { setIsUpdatingStatus(false); }
    };

    return (
        <div className="container mx-auto p-4 sm:p-6 lg:p-8 bg-gray-100 min-h-screen relative text-gray-800">
            <div className="absolute top-4 right-4 sm:top-6 sm:right-6 z-10">
                <Image
                    src="/logos/bactrivia_logo.svg"
                    alt="BAC Trivia Logo"
                    width={60}
                    height={20}
                />
            </div>

            <header className="mb-8 flex flex-wrap justify-between items-start gap-4 pb-4 border-b border-gray-300">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Dashboard de Admin</h1>
                    {adminNombre && <p className="text-gray-700 mt-1">Bienvenido, <span className="font-semibold">{adminNombre}</span></p>}
                </div>
                <Button onClick={handleLogout} variant="secondary" size="md" className="bg-red-100 hover:bg-red-200 text-red-700 border border-red-300 hover:border-red-400">
                    Cerrar Sesión Admin
                </Button>
            </header>

            <section className="mb-10 p-6 bg-white shadow-xl rounded-lg border border-gray-200">
                <h2 className="text-xl font-semibold text-gray-800 mb-4">Control de Estado de la Aplicación</h2>
                {isLoadingStatus && <p className="text-gray-500">Cargando estado...</p>}
                {statusError && <p className="text-red-600 bg-red-50 p-3 rounded-md">{statusError}</p>}
                {!isLoadingStatus && !statusError && (
                    <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-3 sm:space-y-0 sm:space-x-4">
                        <Button
                            onClick={handleToggleAppStatus}
                            isLoading={isUpdatingStatus}
                            disabled={isUpdatingStatus || isLoadingStatus}
                            className={`px-6 py-3 text-base font-medium rounded-md transition-colors w-full sm:w-auto
                                        ${isAppActive
                                ? 'bg-red-500 hover:bg-red-600 text-white'
                                : 'bg-green-500 hover:bg-green-600 text-white'}`}
                        >
                            {isUpdatingStatus
                                ? 'Actualizando...'
                                : (isAppActive ? 'Desactivar Aplicación (Usuarios)' : 'Activar Aplicación (Usuarios)')}
                        </Button>
                        <p className={`text-lg font-semibold p-3 rounded-md ${isAppActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                            Estado Actual: {isAppActive ? 'Activada' : 'Desactivada'}
                        </p>
                    </div>
                )}
                <p className="text-xs text-gray-500 mt-3">Esta opción controla si los usuarios (no administradores) pueden acceder y usar las funciones principales de la aplicación.</p>
            </section>

            <section>
                <h2 className="text-2xl font-semibold text-gray-800 mb-4">Tabla de Jugadores</h2>
                {isLoadingUsers && <p className="text-center text-lg text-gray-600 py-8">Cargando usuarios...</p>}
                {usersError && <p className="text-center text-red-600 bg-red-100 p-4 rounded-md">{usersError}</p>}
                {!isLoadingUsers && !usersError && (
                    <div className="bg-white shadow-xl rounded-lg overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-300">
                            <thead className="bg-red-700">
                            <tr>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">Usuario ID</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">Puntos</th>
                            </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                            {users.length === 0 ? (
                                <tr><td colSpan={4} className="px-6 py-4 text-sm text-gray-500 text-center">No hay usuarios.</td></tr>
                            ) : (
                                users.map((user) => (
                                    <tr key={user.firestoreId} className="hover:bg-red-50 transition-colors duration-150">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{user.usuarioId}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-red-700">{user.puntos}</td>
                                    </tr>
                                ))
                            )}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>
        </div>
    );
}

export default function AdminDashboardPage() {
    return (
        <ProtectedAdminRoute>
            <AdminDashboardContent />
        </ProtectedAdminRoute>
    );
}