// lib/services/api.ts
import axios from 'axios';

const apiClient = axios.create({
    baseURL: process.env.NEXT_PUBLIC_API_BASE_URL, // Tomado de .env.local o Vercel Env Vars
    headers: {
        'Content-Type': 'application/json',
    },
});

// Tipos para las respuestas (puedes definirlos mejor)
interface RegisterResponse {
    firestoreId: string;
    usuarioId: string;
    message: string;
}

interface LoginResponse {
    firestoreId: string;
    usuarioId: string;
    nombre: string;
    apellido: string;
    puntos: number;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    itemsCollected: any[]; // Definir tipo específico después
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    lastPlayedTotem: any; // Definir tipo específico después
}

// Función de Registro
export const register = async (userData: { nombre: string; apellido: string; cedula: string }): Promise<RegisterResponse> => {
    try {
        const response = await apiClient.post<RegisterResponse>('/registerUser', userData);
        return response.data;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
        console.error('API Register Error:', error.response?.data || error.message);
        // Re-lanzar para manejo en el componente o devolver un objeto de error estandarizado
        throw error;
    }
};

// Función de Login
export const login = async (usuarioId: string): Promise<LoginResponse> => {
    try {
        const response = await apiClient.post<LoginResponse>('/loginUser', { usuarioId });
        return response.data;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
        console.error('API Login Error:', error.response?.data || error.message);
        throw error;
    }
};

// Añadir aquí más llamadas API a medida que se necesiten (getTrivia, submitAnswer, etc.)