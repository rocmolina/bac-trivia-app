// src/app/admin/dashboard/page.tsx
'use client';

import React, { useEffect, useState }  from 'react';
import { useRouter } from 'next/navigation';
import useAdminStore from '@/lib/store/adminStore';
import { getUsersWithScoresApi, UserScoreData, getAppStatusApi, setAppStatusApi } from '@/lib/services/api';
import Button from '@/components/ui/Button';
// import { shallow } from 'zustand/shallow'; // Habilitar si se usa la Opción 2 para seleccionar del store

// Componente para proteger la ruta del dashboard
const ProtectedAdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const router = useRouter();
    const isAdminAuthenticated = useAdminStore((state) => state.isAdminAuthenticated);
    const [isHydrated, setIsHydrated] = useState(false);

    useEffect(() => {
        const unsubFinishHydration = useAdminStore.persist.onFinishHydration(() => {
            // console.log("AdminStore hydration finished via onFinishHydration.");
            setIsHydrated(true);
        });

        if (useAdminStore.persist.hasHydrated()) {
            // console.log("AdminStore was already hydrated on mount.");
            setIsHydrated(true);
        }

        return () => {
            unsubFinishHydration();
        };
    }, []); // Efecto de montaje para la hidratación

    useEffect(() => {
        // console.log(`ProtectedAdminRoute: Effect check - isHydrated: ${isHydrated}, isAdminAuthenticated: ${isAdminAuthenticated}`);
        if (isHydrated && !isAdminAuthenticated) {
            // console.log("ProtectedAdminRoute: Hydrated but not authenticated, redirecting to /admin/login");
            router.replace('/admin/login');
        }
    }, [isHydrated, isAdminAuthenticated, router]); // Dependencias para la lógica de redirección

    if (!isHydrated) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <p>Verificando acceso admin (hidratando)...</p>
            </div>
        );
    }

    if (isAdminAuthenticated) { // Solo renderizar hijos si está autenticado E hidratado
        // console.log("ProtectedAdminRoute: Hydrated and authenticated, rendering children.");
        return <>{children}</>;
    }

    // console.log("ProtectedAdminRoute: Hydrated but not authenticated, rendering redirect message / being redirected.");
    return ( // Mensaje mientras ocurre la redirección del useEffect
        <div className="flex items-center justify-center min-h-screen">
            <p>Acceso denegado. Redirigiendo a login...</p>
        </div>
    );
};


// Contenido del Dashboard
function AdminDashboardContent() {
    const router = useRouter(); // Aunque no se usa directamente para navegación, es común tenerlo.

    // CORRECCIÓN: Seleccionar individualmente del store para evitar bucles.
    const adminNombre = useAdminStore((state) => state.adminNombre);
    const logoutAdmin = useAdminStore((state) => state.logoutAdmin);

    // Estados para la lista de usuarios
    const [users, setUsers] = useState<UserScoreData[]>([]);
    const [isLoadingUsers, setIsLoadingUsers] = useState(true);
    const [usersError, setUsersError] = useState<string | null>(null);

    // Estados para el control de "Activar/Desactivar App"
    const [isAppActive, setIsAppActive] = useState(true); // Asumir activo inicialmente o leer de API
    const [isLoadingStatus, setIsLoadingStatus] = useState(true);
    const [statusError, setStatusError] = useState<string | null>(null);
    const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

    // useEffect para cargar datos iniciales (usuarios y estado de la app)
    useEffect(() => {
        const fetchInitialData = async () => {
            // Cargar usuarios
            setIsLoadingUsers(true);
            setUsersError(null);
            try {
                console.log("AdminDashboardContent: Fetching users...");
                const fetchedUsers = await getUsersWithScoresApi();
                console.log("AdminDashboardContent: Users fetched");
                setUsers(fetchedUsers);
            } catch (err: any) {
                console.error("AdminDashboardContent: Error fetching users", err);
                setUsersError(err.error || err.message || 'Error al cargar la lista de usuarios.');
            } finally {
                setIsLoadingUsers(false);
            }

            // Cargar estado actual de la aplicación
            setIsLoadingStatus(true);
            setStatusError(null);
            try {
                console.log("AdminDashboardContent: Fetching app status...");
                const appStatusResponse = await getAppStatusApi();
                console.log("AdminDashboardContent: App status fetched", appStatusResponse);
                setIsAppActive(appStatusResponse.isAppActive);
            } catch (err: any) {
                console.error("AdminDashboardContent: Error fetching app status", err);
                setStatusError(err.error || err.message || 'Error al cargar el estado de la aplicación.');
                // Considerar un estado por defecto si falla la carga del estado, ej: true
                // setIsAppActive(true); // O manejar el error de forma más visible
            } finally {
                setIsLoadingStatus(false);
            }
        };
        void fetchInitialData();
    }, []); // Array de dependencias vacío para que se ejecute solo al montar

    // Manejador para el logout del admin
    const handleLogout = () => {
        logoutAdmin();
        // ProtectedAdminRoute se encargará de la redirección a /admin/login
        // cuando isAdminAuthenticated cambie a false.
    };

    // Manejador para cambiar el estado de la aplicación (Activar/Desactivar)
    const handleToggleAppStatus = async () => {
        setIsUpdatingStatus(true);
        setStatusError(null);
        const newStatus = !isAppActive;
        try {
            console.log(`AdminDashboardContent: Setting app status to ${newStatus}`);
            await setAppStatusApi({ isActive: newStatus });
            setIsAppActive(newStatus); // Actualizar estado local
            alert(`El estado de la aplicación ha sido cambiado a: ${newStatus ? 'ACTIVA' : 'DESACTIVADA'}`);
        } catch (err: any) {
            console.error("AdminDashboardContent: Error setting app status", err);
            setStatusError(err.error || err.message || 'Error al cambiar el estado de la aplicación.');
            alert(`Error al cambiar el estado de la aplicación: ${err.error || err.message || 'Error desconocido'}`);
            // Revertir el estado local si la API falla (opcional, o re-fetch status)
            // setIsAppActive(!newStatus);
        } finally {
            setIsUpdatingStatus(false);
        }
    };

    return (
        <div className="container mx-auto p-4 sm:p-6 lg:p-8 bg-gray-50 min-h-screen">
            {/* Cabecera del Dashboard */}
            <header className="mb-8 flex flex-wrap justify-between items-center gap-4 pb-4 border-b border-gray-200">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800">Dashboard de Admin</h1>
                    {adminNombre && <p className="text-gray-600 mt-1">Bienvenido, <span className="font-semibold">{adminNombre}</span></p>}
                </div>
                <Button onClick={handleLogout} variant="secondary" size="md" className="!bg-red-100 hover:!bg-red-200 !text-red-700 border !border-red-300">
                    Cerrar Sesión Admin
                </Button>
            </header>

            {/* Sección para Activar/Desactivar App */}
            <section className="mb-10 p-6 bg-white shadow-xl rounded-lg border border-gray-200">
                <h2 className="text-xl font-semibold text-gray-700 mb-4">Control de Estado de la Aplicación</h2>
                {isLoadingStatus && <p className="text-gray-500">Cargando estado actual de la aplicación...</p>}
                {statusError && <p className="text-red-600 bg-red-50 p-3 rounded-md">{statusError}</p>}
                {!isLoadingStatus && !statusError && (
                    <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-3 sm:space-y-0 sm:space-x-4">
                        <Button
                            onClick={handleToggleAppStatus}
                            isLoading={isUpdatingStatus}
                            disabled={isUpdatingStatus || isLoadingStatus}
                            className={`px-6 py-3 text-base font-medium rounded-md transition-colors w-full sm:w-auto
                                        ${isAppActive
                                ? 'bg-red-500 hover:bg-red-600 text-white' // Estilo para "Desactivar"
                                : 'bg-green-500 hover:bg-green-600 text-white'}`} // Estilo para "Activar"
                        >
                            {isUpdatingStatus
                                ? 'Actualizando...'
                                : (isAppActive ? 'Desactivar Aplicación (Usuarios)' : 'Activar Aplicación (Usuarios)')}
                        </Button>
                        <p className={`text-lg font-semibold p-3 rounded-md ${isAppActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                            Estado Actual: {isAppActive ? 'Activada' : 'Desactivada'}
                        </p>
                    </div>
                )}
                <p className="text-xs text-gray-500 mt-3">Esta opción controla si los usuarios pueden acceder y usar la aplicación. Las funciones de administrador siempre estarán disponibles.</p>
            </section>

            {/* Tabla de Usuarios */}
            <section>
                <h2 className="text-2xl font-semibold text-gray-700 mb-4">Tabla de Jugadores</h2>
                {isLoadingUsers && <p className="text-center text-lg text-gray-600 py-8">Cargando usuarios...</p>}
                {usersError && <p className="text-center text-red-600 bg-red-100 p-4 rounded-md">{usersError}</p>}
                {!isLoadingUsers && !usersError && (
                    <div className="bg-white shadow-xl rounded-lg overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-red-700">
                            <tr>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">Usuario ID</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">Puntos</th>
                            </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                            {users.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                                        No hay usuarios registrados.
                                    </td>
                                </tr>
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

// Componente de página exportado
export default function AdminDashboardPage() {
    return (
        <ProtectedAdminRoute>
            <AdminDashboardContent />
        </ProtectedAdminRoute>
    );
}