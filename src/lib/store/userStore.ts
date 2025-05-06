// lib/store/userStore.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware'; // Para persistir en localStorage

// Definir el tipo para el usuario logueado
interface UserState {
    firestoreId: string | null;
    usuarioId: string | null;
    nombre: string | null;
    apellido: string | null;
    puntos: number;
    // Añadir más campos si son necesarios en el estado global
    isAuthenticated: boolean;
}

// Definir las acciones
interface UserActions {
    login: (userData: Omit<UserState, 'isAuthenticated'>) => void; // Omit<...> porque isAuthenticated se deriva
    logout: () => void;
    setPuntos: (puntos: number) => void; // Ejemplo de acción para actualizar estado
}

// Estado inicial
const initialState: Omit<UserState, 'isAuthenticated'> = {
    firestoreId: null,
    usuarioId: null,
    nombre: null,
    apellido: null,
    puntos: 0,
};

// Crear el store con persistencia en localStorage
const useUserStore = create<UserState & UserActions>()(
    persist(
        (set) => ({
            // Estado inicial con isAuthenticated
            ...initialState,
            isAuthenticated: false, // Se inicializa como no autenticado

            // Acción de Login
            login: (userData) => set({
                ...userData,
                isAuthenticated: true, // Marcar como autenticado
            }),

            // Acción de Logout
            logout: () => set({
                ...initialState, // Resetear a estado inicial
                isAuthenticated: false,
            }),

            // Acción de ejemplo para actualizar puntos
            setPuntos: (puntos) => set({ puntos }),

        }),
        {
            name: 'user-auth-storage', // Nombre de la clave en localStorage
            storage: createJSONStorage(() => localStorage), // Usa localStorage
            // Opcional: puedes elegir qué partes del estado persistir
            // partialize: (state) => ({ usuarioId: state.usuarioId, isAuthenticated: state.isAuthenticated }),
        }
    )
);

export default useUserStore;