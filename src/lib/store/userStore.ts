// lib/store/userStore.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { CollectedItem, LastPlayedTotemInfo } from '@/lib/services/api'; // Importar tipos

export interface UserProfile {
    firestoreId: string | null;
    usuarioId: string | null;
    nombre: string | null;
    apellido: string | null;
    puntos: number;
    itemsCollected: CollectedItem[]; // Usar el tipo importado
    lastPlayedTotem: Record<string, LastPlayedTotemInfo>; // Usar el tipo importado
}

interface UserState extends UserProfile {
    isAuthenticated: boolean;
}

interface UserActions {
    login: (userData: UserProfile) => void;
    logout: () => void;
    setPuntos: (puntos: number) => void;
    addCollectedItem: (collectedItem: CollectedItem) => void; // Nueva acción
    // setLastPlayedTotem: (totemId: string, info: LastPlayedTotemInfo) => void; // Opcional, si se actualiza granularmente
    // O, más simple, el login refresca todo el lastPlayedTotem
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
                ...userData, // userData ya debería venir con itemsCollected y lastPlayedTotem actualizados desde el backend
                isAuthenticated: true,
            }),
            logout: () => set({
                ...initialState,
                isAuthenticated: false,
            }),
            setPuntos: (puntos) => set((state) => ({ ...state, puntos })),
            addCollectedItem: (collectedItem) => set((state) => ({
                ...state,
                // Evitar duplicados si el backend ya lo añadió y el login actualizó
                // O asumir que esta acción es la fuente de verdad después de una respuesta correcta
                itemsCollected: [...state.itemsCollected.filter(item => item.triviaId !== collectedItem.triviaId || item.totemId !== collectedItem.totemId), collectedItem],
            })),
            // Ejemplo de cómo se podría actualizar lastPlayedTotem granularmente, aunque login podría ser suficiente
            // setLastPlayedTotem: (totemId, info) => set((state) => ({
            //     ...state,
            //     lastPlayedTotem: {
            //         ...state.lastPlayedTotem,
            //         [totemId]: info,
            //     }
            // })),
        }),
        {
            name: 'bac-user-auth-storage',
            storage: createJSONStorage(() => localStorage),
        }
    )
);

export default useUserStore;