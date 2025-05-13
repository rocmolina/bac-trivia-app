// src/app/admin/dashboard/page.tsx
'use client';

import React, { useEffect, useState }  from 'react';
import { useRouter } from 'next/navigation';
import useAdminStore from '@/lib/store/adminStore';
import { getUsersWithScoresApi, UserScoreData } from '@/lib/services/api';
import Button from '@/components/ui/Button';
// import { shallow } from 'zustand/shallow'; // Opción si se selecciona un objeto

// ProtectedAdminRoute (sin cambios respecto a la última versión que te di, ya era robusta)
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
    }, []);

    useEffect(() => {
        // console.log(`ProtectedAdminRoute: Effect check - isHydrated: ${isHydrated}, isAdminAuthenticated: ${isAdminAuthenticated}`);
        if (isHydrated && !isAdminAuthenticated) {
            // console.log("ProtectedAdminRoute: Hydrated but not authenticated, redirecting to /admin/login");
            router.replace('/admin/login');
        }
    }, [isHydrated, isAdminAuthenticated, router]);

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
    // console.log("ProtectedAdminRoute: Hydrated but not authenticated, waiting for redirect effect or rendering redirect message.");
    return (
        <div className="flex items-center justify-center min-h-screen">
            <p>Acceso denegado. Redirigiendo a login...</p>
        </div>
    );
};


// AdminDashboardContent (CORREGIDA LA SELECCIÓN DEL STORE)
function AdminDashboardContent() {
    const router = useRouter();
    // CORRECCIÓN: Seleccionar individualmente o usar shallow si se agrupa.
    // Opción 1: Seleccionar individualmente (preferido si son pocos)
    const adminNombre = useAdminStore((state) => state.adminNombre);
    const logoutAdmin = useAdminStore((state) => state.logoutAdmin);

    // Opción 2: Si necesitas agruparlos y son muchos, usa shallow
    // const { adminNombre, logoutAdmin } = useAdminStore(
    //     (state) => ({
    //         adminNombre: state.adminNombre,
    //         logoutAdmin: state.logoutAdmin,
    //     }),
    //     shallow // <-- Importar shallow de zustand/shallow
    // );

    const [users, setUsers] = useState<UserScoreData[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchUsers = async () => {
            setIsLoading(true);
            setError(null);
            try {
                console.log("AdminDashboardContent: Fetching users...");
                const fetchedUsers = await getUsersWithScoresApi();
                console.log("AdminDashboardContent: Users fetched", fetchedUsers);
                setUsers(fetchedUsers);
            } catch (err: any) {
                console.error("AdminDashboardContent: Error fetching users", err);
                setError(err.message || 'Error al cargar la lista de usuarios.');
            } finally {
                setIsLoading(false);
            }
        };
        void fetchUsers();
    }, []); // El array vacío asegura que fetchUsers se llame solo una vez al montar

    const handleLogout = () => {
        logoutAdmin();
        // La redirección será manejada por ProtectedAdminRoute al cambiar isAdminAuthenticated
    };

    // El resto del JSX de AdminDashboardContent no cambia...
    return (
        <div className="container mx-auto p-4 sm:p-6 lg:p-8">
            <header className="mb-8 flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800">Dashboard de Admin</h1>
                    {adminNombre && <p className="text-gray-600">Bienvenido, {adminNombre}</p>}
                </div>
                <Button onClick={handleLogout} variant="secondary" size="sm">
                    Cerrar Sesión Admin
                </Button>
            </header>

            {isLoading && <p className="text-center text-lg text-gray-600">Cargando usuarios...</p>}
            {error && <p className="text-center text-red-600 bg-red-100 p-3 rounded-md">{error}</p>}

            {!isLoading && !error && (
                <div className="bg-white shadow-xl rounded-lg overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-red-600">
                        <tr>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">Usuario ID</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">Nombre Completo</th>
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
                                <tr key={user.firestoreId} className="hover:bg-red-50 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{user.usuarioId}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{user.nombre} {user.apellido}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-red-700">{user.puntos}</td>
                                </tr>
                            ))
                        )}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

// Exportación de la página (sin cambios)
export default function AdminDashboardPage() {
    return (
        <ProtectedAdminRoute>
            <AdminDashboardContent />
        </ProtectedAdminRoute>
    );
}