// src/lib/store/adminStore.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface AdminState {
    isAdminAuthenticated: boolean;
    adminId: string | null;
    adminNombre: string | null;
    loginAdmin: (adminId: string, nombre: string) => void;
    logoutAdmin: () => void;
}

const useAdminStore = create<AdminState>()(
    persist(
        (set) => ({
            isAdminAuthenticated: false,
            adminId: null,
            adminNombre: null,
            loginAdmin: (adminId, nombre) => set({
                isAdminAuthenticated: true,
                adminId: adminId,
                adminNombre: nombre,
            }),
            logoutAdmin: () => set({
                isAdminAuthenticated: false,
                adminId: null,
                adminNombre: null,
            }),
        }),
        {
            name: 'bac-admin-auth-storage', // Nombre único para el localStorage
            storage: createJSONStorage(() => localStorage), // O sessionStorage
        }
    )
);

export default useAdminStore;