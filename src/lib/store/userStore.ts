// lib/store/userStore.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface UserProfile { // Exportar para usar en otros lugares
    firestoreId: string | null;
    usuarioId: string | null;
    nombre: string | null;
    apellido: string | null;
    puntos: number;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    itemsCollected: any[]; // TODO: Definir tipo específico
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    lastPlayedTotem: any; // TODO: Definir tipo específico
}

interface UserState extends UserProfile {
    isAuthenticated: boolean;
}

interface UserActions {
    login: (userData: UserProfile) => void; // userData no incluirá isAuthenticated
    logout: () => void;
    setPuntos: (puntos: number) => void;
    //// eslint-disable-next-line @typescript-eslint/no-explicit-any
    //addCollectedItem: (collectedItem: any) => void;
    // TODO: Añadir más acciones, ej: addCollectedItem, updateLastPlayedTotem
}

const initialState: UserProfile = {
    firestoreId: null,
    usuarioId: null,
    nombre: null,
    apellido: null,
    puntos: 0,
    itemsCollected: [],
    lastPlayedTotem: {},
};

const useUserStore = create<UserState & UserActions>()(
    persist(
        (set) => ({
            ...initialState,
            isAuthenticated: false,
            login: (userData) => set({
                ...userData,
                isAuthenticated: true,
            }),
            logout: () => set({
                ...initialState,
                isAuthenticated: false,
            }),
            setPuntos: (puntos) => set((state) => ({ ...state, puntos })),
        }),
        {
            name: 'bac-user-auth-storage',
            storage: createJSONStorage(() => localStorage),
        }
    )
);

export default useUserStore;