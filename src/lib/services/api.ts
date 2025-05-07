// src/lib/services/api.ts
import axios from 'axios';

const baseURL = process.env.NEXT_PUBLIC_API_BASE_URL;
console.log("API Base URL from Env:", baseURL); // Verificar que esto muestre la URL correcta

const apiClient = axios.create({
    baseURL: baseURL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// --- Tipos para Respuestas ---
interface RegisterResponse {
    firestoreId: string;
    usuarioId: string; // El Nombre-Numero generado
    message: string;
}

// Asumiendo que UserProfile está definida en userStore.ts y la importas o la redefines aquí
// import { UserProfile } from '@/lib/store/userStore'; -> Si la exportaste
// O definirla aquí:
interface UserProfileData {
    firestoreId: string | null;
    usuarioId: string | null;
    nombre: string | null;
    apellido: string | null;
    puntos: number;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    itemsCollected: any[]; // TODO: Definir tipo
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    lastPlayedTotem: any; // TODO: Definir tipo
}

// Usar Omit para la respuesta de login si no devuelve isAuthenticated
type LoginResponse = Omit<UserProfileData, 'firestoreId'> & { firestoreId: string }; // Asegurar que firestoreId siempre esté

// NUEVO: Tipo para la respuesta de getTriviaQuestion
interface GetTriviaResponse {
    // Caso éxito con pregunta
    triviaId?: string;
    category?: string;
    questionText?: string;
    options?: string[];
    totemId?: string;
    // Caso estados especiales
    status?: 'wait' | 'category_completed' | 'no_questions_found';
    message?: string; // Mensaje de la API para estados especiales o errores
    cooldown_seconds_left?: number;
}


// --- Funciones API Exportadas ---

// Función de Registro
export const register = async (userData: { nombre: string; apellido: string; cedula: string }): Promise<RegisterResponse> => {
    const endpoint = '/registerUser';
    console.log('API Register Request:', apiClient.defaults.baseURL + endpoint, userData);
    try {
        const response = await apiClient.post<RegisterResponse>(endpoint, userData);
        console.log('API Register Response:', response.data);
        return response.data;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
        console.error('API Register Error:', error.response?.data || error.message);
        throw error;
    }
};

// Función de Login
export const login = async (usuarioId: string): Promise<LoginResponse> => {
    const endpoint = '/loginUser';
    const payload = { usuarioId };
    console.log('API Login Request:', apiClient.defaults.baseURL + endpoint, payload);
    try {
        const response = await apiClient.post<LoginResponse>(endpoint, payload);
        console.log('API Login Response:', response.data);
        return response.data;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
        console.error('API Login Error:', error.response?.data || error.message);
        throw error;
    }
};

// **NUEVA FUNCIÓN:** Obtener Pregunta de Trivia
export const getTriviaQuestion = async (userFirestoreId: string, qrCodeData: string): Promise<GetTriviaResponse> => {
    const endpoint = '/getTriviaQuestion';
    const payload = { userFirestoreId, qrCodeData };
    console.log('API getTriviaQuestion Request:', apiClient.defaults.baseURL + endpoint, payload);
    try {
        const response = await apiClient.post<GetTriviaResponse>(endpoint, payload);
        console.log('API getTriviaQuestion Response:', response.data);
        return response.data;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
        console.error('API getTriviaQuestion Error:', error.response?.data || error.message);
        // Devolver el objeto de error de la API si existe, para que el componente lo maneje
        if (error.response?.data) {
            return error.response.data;
        }
        // Si no hay respuesta de la API (error de red), lanzar el error
        throw error;
    }
};

// **PLACEHOLDER:** Enviar Respuesta de Trivia (Implementar lógica completa después)
export const submitTriviaAnswer = async (userFirestoreId: string, triviaId: string, selectedOptionIndex: number): Promise<{ correct: boolean; pointsGained: number; message?: string }> => {
    const endpoint = '/submitTriviaAnswer'; // Asume que crearás esta función en backend
    const payload = { userFirestoreId, triviaId, selectedOptionIndex };
    console.log('API submitTriviaAnswer Request (SIMULATED for now):', apiClient.defaults.baseURL + endpoint, payload);
    try {
        // --- SIMULACIÓN ---
        await new Promise(resolve => setTimeout(resolve, 500)); // Simular red
        const isCorrectMock = selectedOptionIndex === 2; // Simular que C es correcta
        const response = {
            correct: isCorrectMock,
            pointsGained: isCorrectMock ? 3 : 0,
            message: isCorrectMock ? "¡Respuesta Correcta!" : "Respuesta Incorrecta."
        };
        console.log('API submitTriviaAnswer Response (SIMULATED):', response);
        return response;
        // --- FIN SIMULACIÓN ---

        // --- CÓDIGO REAL (cuando se implemente la Cloud Function) ---
        // const response = await apiClient.post<{ correct: boolean; pointsGained: number; message?: string }>(endpoint, payload);
        // return response.data;
        // --- FIN CÓDIGO REAL ---

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
        console.error('API submitTriviaAnswer Error:', error.response?.data || error.message);
        throw error; // O devuelve un objeto de error estandarizado
    }
};