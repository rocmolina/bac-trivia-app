// src/app/admin/dashboard/page.tsx
"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import useAdminStore from "@/lib/store/adminStore";
import {
  getAppStatusApi,
  setAppStatusApi,
  UserScoreData, // Esta interfaz ya debería incluir firestoreId, nombre, apellido, usuarioId, puntos
  updateUserFromAdminApi,
} from "@/lib/services/api";
import Button from "@/components/ui/Button";
import Image from "next/image";
import { db } from "@/lib/firebaseConfig";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  DocumentData,
  QueryDocumentSnapshot,
} from "firebase/firestore";
import EditUserModal from "@/components/admin/EditUserModal";

// ProtectedAdminRoute (Sin cambios)
const ProtectedAdminRoute: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const router = useRouter();
  const isAdminAuthenticated = useAdminStore(
    (state) => state.isAdminAuthenticated,
  );
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    const unsubFinishHydration = useAdminStore.persist.onFinishHydration(() =>
      setIsHydrated(true),
    );
    if (useAdminStore.persist.hasHydrated()) setIsHydrated(true);
    return () => unsubFinishHydration();
  }, []);

  useEffect(() => {
    if (isHydrated && !isAdminAuthenticated) router.replace("/admin/login");
  }, [isHydrated, isAdminAuthenticated, router]);

  if (!isHydrated)
    return (
      <div
        className="flex items-center justify-center min-h-screen"
        data-oid="ekx4qlg"
      >
        <p data-oid="reyodb3">Verificando acceso admin (hidratando)...</p>
      </div>
    );

  if (isAdminAuthenticated) return <>{children}</>;
  return (
    <div
      className="flex items-center justify-center min-h-screen"
      data-oid="_voizj."
    >
      <p data-oid="5nwsf_t">Acceso denegado. Redirigiendo a login...</p>
    </div>
  );
};

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

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedUserForEdit, setSelectedUserForEdit] =
    useState<UserScoreData | null>(null);
  const [isUpdatingUser, setIsUpdatingUser] = useState(false); // Estado de carga para la actualización del usuario
  const [updateUserError, setUpdateUserError] = useState<string | null>(null); // Error específico de la actualización del usuario

  useEffect(() => {
    if (!db) {
      setUsersError("Error: Conexión a Firestore no disponible.");
      setIsLoadingUsers(false);
      return;
    }
    setIsLoadingUsers(true);
    const usersQuery = query(
      collection(db, "users"),
      orderBy("puntos", "desc"),
    );
    const unsubscribeUsers = onSnapshot(
      usersQuery,
      (querySnapshot) => {
        const fetchedUsers: UserScoreData[] = [];
        querySnapshot.forEach((doc: QueryDocumentSnapshot<DocumentData>) => {
          const userData = doc.data();
          fetchedUsers.push({
            firestoreId: doc.id,
            usuarioId: userData.usuarioId,
            nombre: userData.nombre, // Necesario para el popup
            apellido: userData.apellido, // Necesario para mostrar en el popup
            cedula: userData.cedula, // Se mantiene en UserScoreData pero no se muestra en tabla
            puntos: userData.puntos || 0,
          });
        });
        setUsers(fetchedUsers);
        setIsLoadingUsers(false);
        setUsersError(null);
      },
      (error) => {
        console.error("AdminDashboard: Error escuchando usuarios: ", error);
        setUsersError("Error al cargar la lista de usuarios en tiempo real.");
        setIsLoadingUsers(false);
      },
    );

    const fetchAppStatus = async () => {
      setIsLoadingStatus(true);
      setStatusError(null);
      try {
        const appStatusResponse = await getAppStatusApi();
        setIsAppActive(appStatusResponse.isAppActive);
      } catch (err: any) {
        setStatusError(
          err.error || err.message || "Error al cargar estado de app.",
        );
      } finally {
        setIsLoadingStatus(false);
      }
    };
    void fetchAppStatus();

    return () => unsubscribeUsers();
  }, []);

  const handleLogout = () => logoutAdmin();
  const handleToggleAppStatus = async () => {
    setIsUpdatingStatus(true);
    setStatusError(null);
    const newStatus = !isAppActive;
    try {
      await setAppStatusApi({ isActive: newStatus });
      setIsAppActive(newStatus);
      alert(`Estado de la aplicación: ${newStatus ? "ACTIVA" : "DESACTIVADA"}`);
    } catch (err: any) {
      setStatusError(err.error || err.message || "Error al cambiar estado.");
      alert(
        `Error al cambiar estado: ${err.error || err.message || "Error desconocido"}`,
      );
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const openEditModal = (user: UserScoreData) => {
    setSelectedUserForEdit(user);
    setUpdateUserError(null); // Limpiar error previo al abrir
    setIsEditModalOpen(true);
  };

  const closeEditModal = () => {
    setSelectedUserForEdit(null);
    setIsEditModalOpen(false);
    setUpdateUserError(null); // Limpiar error al cerrar
  };

  const handleUpdateUser = useCallback(
    async (userFirestoreId: string, newNombre: string) => {
      setIsUpdatingUser(true);
      setUpdateUserError(null);
      try {
        const response = await updateUserFromAdminApi(
          userFirestoreId,
          newNombre,
        );
        // console.log("Usuario actualizado:", response.message);
        // La tabla se actualiza en tiempo real por el listener onSnapshot.
        // Cerramos el modal en éxito.
        closeEditModal();
        alert(response.message || "Usuario actualizado correctamente."); // Feedback al admin
      } catch (err: any) {
        console.error("Error actualizando usuario desde dashboard:", err);
        setUpdateUserError(
          err.message ||
            err.error ||
            "Ocurrió un error al actualizar el usuario.",
        );
        // No cerrar el modal en caso de error para que el admin vea el mensaje y pueda reintentar o cancelar.
      } finally {
        setIsUpdatingUser(false);
      }
    },
    [],
  ); // Sin dependencias que cambien frecuentemente

  return (
    <div
      className="container mx-auto p-4 sm:p-6 lg:p-8 bg-gray-100 min-h-screen relative text-gray-800"
      data-oid="tvfzh:j"
    >
      <div
        className="absolute top-4 right-4 sm:top-28 sm:right-6 z-10"
        data-oid="wj6mmwk"
      >
        <Image
          src="/logos/bactrivia_logo.svg"
          alt="BAC Trivia Logo"
          width={100}
          height={40}
          data-oid="a6-97_d"
        />
      </div>

      <header
        className="mb-8 flex flex-wrap justify-between items-start gap-4 pb-4 border-b border-gray-300"
        data-oid=":hjepbz"
      >
        <div data-oid="zyvd010">
          <h1 className="text-3xl font-bold text-gray-900" data-oid="7zkbxbx">
            Admin Dashboard
          </h1>
          {adminNombre && (
            <p className="text-gray-700 mt-1" data-oid="grq.kuu">
              Bienvenido,{" "}
              <span className="font-semibold" data-oid=".8ccyc6">
                {adminNombre}
              </span>
            </p>
          )}
        </div>
        <Button
          onClick={handleLogout}
          variant="secondary"
          size="md"
          className="bg-red-100 hover:bg-red-200 text-red-700 border border-red-300 hover:border-red-400"
          data-oid="5vogmsw"
        >
          Cerrar Sesión Admin
        </Button>
      </header>

      <section
        className="mb-10 p-6 bg-white shadow-xl rounded-lg border border-gray-200"
        data-oid="g.hqwn2"
      >
        <h2
          className="text-xl font-semibold text-gray-800 mb-4"
          data-oid="z1zm.pi"
        >
          Control de Estado de la Aplicación
        </h2>
        {isLoadingStatus && (
          <p className="text-gray-500" data-oid="t3k65ai">
            Cargando estado...
          </p>
        )}
        {statusError && (
          <p
            className="text-red-600 bg-red-50 p-3 rounded-md"
            data-oid="2rh3y2d"
          >
            {statusError}
          </p>
        )}
        {!isLoadingStatus && !statusError && (
          <div
            className="flex flex-col sm:flex-row items-start sm:items-center space-y-3 sm:space-y-0 sm:space-x-4"
            data-oid="5-fu04-"
          >
            <Button
              onClick={handleToggleAppStatus}
              isLoading={isUpdatingStatus}
              disabled={isUpdatingStatus || isLoadingStatus}
              className={`px-6 py-3 text-base font-medium rounded-md transition-colors w-full sm:w-auto
                                        ${
                                          isAppActive
                                            ? "bg-red-500 hover:bg-red-600 text-white"
                                            : "bg-green-500 hover:bg-green-600 text-white"
                                        }`}
              data-oid="qdoql8b"
            >
              {isUpdatingStatus
                ? "Actualizando..."
                : isAppActive
                  ? "Desactivar Aplicación (Usuarios)"
                  : "Activar Aplicación (Usuarios)"}
            </Button>
            <p
              className={`text-lg font-semibold p-3 rounded-md ${isAppActive ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}
              data-oid=":ktdzsh"
            >
              Estado Actual: {isAppActive ? "Activada" : "Desactivada"}
            </p>
          </div>
        )}
        <p className="text-xs text-gray-500 mt-3" data-oid="hfeqsuh">
          Esta opción controla si los usuarios (no administradores) pueden
          acceder y usar las funciones principales de la aplicación.
        </p>
      </section>

      <section data-oid="vt6:h.8">
        <h2
          className="text-2xl text-center font-semibold text-gray-800 mb-4"
          data-oid="eilcdkl"
        >
          Tabla de Jugadores
        </h2>
        <h3
          className="text-2xl text-center font-semibold text-gray-800 mb-4"
          data-oid="3d1r55g"
        >
          (En Tiempo Real)
        </h3>
        {isLoadingUsers && (
          <p
            className="text-center text-lg text-gray-600 py-8"
            data-oid=":id_ib7"
          >
            Cargando usuarios...
          </p>
        )}
        {usersError && (
          <p
            className="text-center text-red-600 bg-red-100 p-4 rounded-md"
            data-oid="ddruk6v"
          >
            {usersError}
          </p>
        )}
        {!isLoadingUsers && !usersError && (
          <div
            className="bg-white shadow-xl rounded-lg overflow-x-auto"
            data-oid="py2ovnt"
          >
            <table
              className="min-w-full divide-y divide-gray-300"
              data-oid="6fz7yc8"
            >
              <thead className="bg-red-700" data-oid="x68p01p">
                <tr data-oid="t67m7.t">
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider sticky top-0 bg-red-700 z-10"
                    data-oid="xf039fa"
                  >
                    Usuario ID
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider sticky top-0 bg-red-700 z-10"
                    data-oid="7dtl6uy"
                  >
                    Puntos
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 text-left text-xs font-medium text-white uppercase tracking-wider sticky top-0 bg-red-700 z-10"
                    data-oid="omx4mca"
                  >
                    More
                  </th>
                </tr>
              </thead>
              <tbody
                className="bg-white divide-y divide-gray-200"
                data-oid="8uoavxp"
              >
                {users.length === 0 ? (
                  <tr data-oid="db.dpn6">
                    <td
                      colSpan={3}
                      className="px-6 py-4 text-sm text-gray-500 text-center"
                      data-oid="6tpg0lv"
                    >
                      No hay usuarios.
                    </td>
                  </tr>
                ) : (
                  users.map((user) => (
                    <tr
                      key={user.firestoreId}
                      className="hover:bg-red-50 transition-colors duration-150"
                      data-oid="v587ypi"
                    >
                      <td
                        className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900"
                        data-oid="irv3xyo"
                      >
                        {user.usuarioId}
                      </td>
                      <td
                        className="px-6 py-4 whitespace-nowrap text-sm font-bold text-red-700"
                        data-oid="q:q-7rj"
                      >
                        {user.puntos}
                      </td>
                      <td
                        className="px-4 py-3 whitespace-nowrap text-sm"
                        data-oid="ij.08zz"
                      >
                        <Button
                          onClick={() => openEditModal(user)}
                          size="sm"
                          className="!px-4 !py-1.5 !text-xs bg-blue-600 hover:bg-blue-700 text-white rounded-md shadow-sm"
                          data-oid="00ysjmp"
                        >
                          ...
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <EditUserModal
        user={selectedUserForEdit}
        isOpen={isEditModalOpen}
        onClose={closeEditModal}
        onUpdate={handleUpdateUser}
        isUpdating={isUpdatingUser}
        updateError={updateUserError}
        clearUpdateError={() => setUpdateUserError(null)}
        data-oid="7act_mb"
      />
    </div>
  );
}

export default function AdminDashboardPage() {
  return (
    <ProtectedAdminRoute data-oid="2276uvk">
      <AdminDashboardContent data-oid=".mdb8tn" />
    </ProtectedAdminRoute>
  );
}
// // src/app/admin/dashboard/page.tsx
// 'use client';
//
// import React, { useEffect, useState } from 'react';
// import { useRouter } from 'next/navigation';
// import useAdminStore from '@/lib/store/adminStore';
// // QUITAR getUsersWithScoresApi, ya no la usaremos directamente para la tabla principal
// import { getAppStatusApi, setAppStatusApi, UserScoreData } from '@/lib/services/api';
// import Button from '@/components/ui/Button';
// import Image from 'next/image';
//
// // Importaciones de Firebase para el listener en tiempo real
// import { db } from '@/lib/firebaseConfig'; // Asumiendo que exportas 'db' desde tu firebaseConfig
// import { collection, query, orderBy, onSnapshot, DocumentData, QueryDocumentSnapshot } from 'firebase/firestore';
//
// // ProtectedAdminRoute (sin cambios desde la última versión funcional)
// const ProtectedAdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
//     // ... (código sin cambios)
//     const router = useRouter();
//     const isAdminAuthenticated = useAdminStore((state) => state.isAdminAuthenticated);
//     const [isHydrated, setIsHydrated] = useState(false);
//
//     useEffect(() => {
//         const unsubFinishHydration = useAdminStore.persist.onFinishHydration(() => setIsHydrated(true));
//         if (useAdminStore.persist.hasHydrated()) setIsHydrated(true);
//         return () => unsubFinishHydration();
//     }, []);
//
//     useEffect(() => {
//         if (isHydrated && !isAdminAuthenticated) router.replace('/admin/login');
//     }, [isHydrated, isAdminAuthenticated, router]);
//
//     if (!isHydrated) return <div className="flex items-center justify-center min-h-screen"><p>Verificando acceso admin (hidratando)...</p></div>;
//     if (isAdminAuthenticated) return <>{children}</>;
//     return <div className="flex items-center justify-center min-h-screen"><p>Acceso denegado. Redirigiendo a login...</p></div>;
// };
//
//
// // Contenido del Dashboard (MODIFICADO para Realtime)
// function AdminDashboardContent() {
//     const adminNombre = useAdminStore((state) => state.adminNombre);
//     const logoutAdmin = useAdminStore((state) => state.logoutAdmin);
//
//     // Estado para la lista de usuarios (se actualizará en tiempo real)
//     const [users, setUsers] = useState<UserScoreData[]>([]);
//     const [isLoadingUsers, setIsLoadingUsers] = useState(true); // Para la carga inicial del listener
//     const [usersError, setUsersError] = useState<string | null>(null);
//
//     // Estados para el control de "Activar/Desactivar App" (sin cambios)
//     const [isAppActive, setIsAppActive] = useState(true);
//     const [isLoadingStatus, setIsLoadingStatus] = useState(true);
//     const [statusError, setStatusError] = useState<string | null>(null);
//     const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
//
//     // useEffect para el listener de Firestore en la colección 'users'
//     useEffect(() => {
//         if (!db) {
//             setUsersError("Error: Conexión a Firestore no disponible.");
//             setIsLoadingUsers(false);
//             return;
//         }
//
//         setIsLoadingUsers(true);
//         // Query para obtener usuarios y ordenarlos por puntos de forma descendente
//         const usersQuery = query(collection(db, "users"), orderBy("puntos", "desc"));
//
//         // Establecer el listener en tiempo real
//         const unsubscribe = onSnapshot(usersQuery,
//             (querySnapshot) => {
//                 const fetchedUsers: UserScoreData[] = [];
//                 querySnapshot.forEach((doc: QueryDocumentSnapshot<DocumentData>) => {
//                     const userData = doc.data();
//                     fetchedUsers.push({
//                         firestoreId: doc.id,
//                         usuarioId: userData.usuarioId,
//                         nombre: userData.nombre,
//                         apellido: userData.apellido,
//                         cedula: userData.cedula,
//                         puntos: userData.puntos || 0,
//                     });
//                 });
//                 setUsers(fetchedUsers);
//                 setIsLoadingUsers(false);
//                 setUsersError(null); // Limpiar error si la carga es exitosa
//                 // console.log("AdminDashboard: Usuarios actualizados en tiempo real", fetchedUsers);
//             },
//             (error) => {
//                 console.error("AdminDashboard: Error escuchando cambios en usuarios: ", error);
//                 setUsersError("Error al cargar la lista de usuarios en tiempo real.");
//                 setIsLoadingUsers(false);
//             }
//         );
//
//         // Limpiar el listener cuando el componente se desmonte
//         return () => unsubscribe();
//     }, []); // El array vacío asegura que el listener se establezca solo una vez
//
//     // useEffect para cargar el estado inicial de la app (sin cambios)
//     useEffect(() => {
//         const fetchAppStatus = async () => {
//             setIsLoadingStatus(true); setStatusError(null);
//             try {
//                 const appStatusResponse = await getAppStatusApi();
//                 setIsAppActive(appStatusResponse.isAppActive);
//             } catch (err: any) { setStatusError(err.error || err.message || 'Error al cargar estado de app.');
//             } finally { setIsLoadingStatus(false); }
//         };
//         void fetchAppStatus();
//     }, []);
//
//     const handleLogout = () => logoutAdmin();
//
//     const handleToggleAppStatus = async () => {
//         // ... (lógica sin cambios desde la última versión)
//         setIsUpdatingStatus(true); setStatusError(null);
//         const newStatus = !isAppActive;
//         try {
//             await setAppStatusApi({ isActive: newStatus });
//             setIsAppActive(newStatus);
//             alert(`Estado de la aplicación: ${newStatus ? 'ACTIVA' : 'DESACTIVADA'}`);
//         } catch (err: any) {
//             setStatusError(err.error || err.message || 'Error al cambiar estado.');
//             alert(`Error al cambiar estado: ${err.error || err.message || 'Error desconocido'}`);
//         } finally { setIsUpdatingStatus(false); }
//     };
//
//     return (
//         <div className="container mx-auto p-4 sm:p-6 lg:p-8 bg-gray-100 min-h-screen relative text-gray-800">
//             <div className="absolute top-4 right-4 sm:top-6 sm:right-6 z-10">
//                 <Image src="/logos/bactrivia_logo.svg" alt="BAC Trivia Logo" width={60} height={20}/>
//             </div>
//
//             <header className="mb-8 flex flex-wrap justify-between items-start gap-4 pb-4 border-b border-gray-300">
//                 {/* ... (contenido del header sin cambios) ... */}
//                 <div>
//                     <h1 className="text-3xl font-bold text-gray-900">Dashboard de Admin</h1>
//                     {adminNombre && <p className="text-gray-700 mt-1">Bienvenido, <span className="font-semibold">{adminNombre}</span></p>}
//                 </div>
//                 <Button onClick={handleLogout} variant="secondary" size="md" className="bg-red-100 hover:bg-red-200 text-red-700 border border-red-300 hover:border-red-400">
//                     Cerrar Sesión Admin
//                 </Button>
//             </header>
//
//             {/* Sección para Activar/Desactivar App (sin cambios en su estructura interna) */}
//             <section className="mb-10 p-6 bg-white shadow-xl rounded-lg border border-gray-200">
//                 {/* ... (contenido sin cambios) ... */}
//                 <h2 className="text-xl font-semibold text-gray-800 mb-4">Control de Estado de la Aplicación</h2>
//                 {isLoadingStatus && <p className="text-gray-500">Cargando estado...</p>}
//                 {statusError && <p className="text-red-600 bg-red-50 p-3 rounded-md">{statusError}</p>}
//                 {!isLoadingStatus && !statusError && (
//                     <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-3 sm:space-y-0 sm:space-x-4">
//                         <Button
//                             onClick={handleToggleAppStatus}
//                             isLoading={isUpdatingStatus}
//                             disabled={isUpdatingStatus || isLoadingStatus}
//                             className={`px-6 py-3 text-base font-medium rounded-md transition-colors w-full sm:w-auto
//                                         ${isAppActive
//                                 ? 'bg-red-500 hover:bg-red-600 text-white'
//                                 : 'bg-green-500 hover:bg-green-600 text-white'}`}
//                         >
//                             {isUpdatingStatus
//                                 ? 'Actualizando...'
//                                 : (isAppActive ? 'Desactivar Aplicación (Usuarios)' : 'Activar Aplicación (Usuarios)')}
//                         </Button>
//                         <p className={`text-lg font-semibold p-3 rounded-md ${isAppActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
//                             Estado Actual: {isAppActive ? 'Activada' : 'Desactivada'}
//                         </p>
//                     </div>
//                 )}
//                 <p className="text-xs text-gray-500 mt-3">Esta opción controla si los usuarios (no administradores) pueden acceder y usar las funciones principales de la aplicación.</p>
//             </section>
//
//             {/* Tabla de Usuarios (Ahora se actualiza en tiempo real) */}
//             <section>
//                 <h2 className="text-2xl font-semibold text-gray-800 mb-4">Tabla de Jugadores (En Tiempo Real)</h2>
//                 {isLoadingUsers && <p className="text-center text-lg text-gray-600 py-8">Cargando usuarios...</p>}
//                 {usersError && <p className="text-center text-red-600 bg-red-100 p-4 rounded-md">{usersError}</p>}
//                 {!isLoadingUsers && !usersError && (
//                     <div className="bg-white shadow-xl rounded-lg overflow-x-auto">
//                         <table className="min-w-full divide-y divide-gray-300">
//                             <thead className="bg-red-700">
//                             <tr>
//                                 <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider sticky top-0 bg-red-700 z-10">Usuario ID</th>
//                                 <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider sticky top-0 bg-red-700 z-10">Puntos</th>
//                             </tr>
//                             </thead>
//                             <tbody className="bg-white divide-y divide-gray-200">
//                             {users.length === 0 ? (
//                                 <tr><td colSpan={4} className="px-6 py-4 text-sm text-gray-500 text-center">No hay usuarios registrados o aún no han jugado.</td></tr>
//                             ) : (
//                                 // Los usuarios ya vienen ordenados por puntos desde la query de Firestore
//                                 users.map((user) => (
//                                     <tr key={user.firestoreId} className="hover:bg-red-50 transition-colors duration-150">
//                                         <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{user.usuarioId}</td>
//                                         <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-red-700">{user.puntos}</td>
//                                     </tr>
//                                 ))
//                             )}
//                             </tbody>
//                         </table>
//                     </div>
//                 )}
//             </section>
//         </div>
//     );
// }
//
// // Componente de página exportado (sin cambios)
// export default function AdminDashboardPage() {
//     return (
//         <ProtectedAdminRoute>
//             <AdminDashboardContent />
//         </ProtectedAdminRoute>
//     );
// }
