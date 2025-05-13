// src/lib/services/api.ts
import axios from 'axios';

const baseURL = process.env.NEXT_PUBLIC_API_BASE_URL;
console.log("API Base URL from Env:", baseURL);

const apiClient = axios.create({
    baseURL: baseURL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// --- Tipos para Respuestas ---
interface RegisterResponse {
    firestoreId: string;
    usuarioId: string;
    message: string;
}

interface UserProfileData {
    firestoreId: string | null;
    usuarioId: string | null;
    nombre: string | null;
    apellido: string | null;
    puntos: number;
    itemsCollected: CollectedItem[]; // USAR EL TIPO DEFINIDO ABAJO
    lastPlayedTotem: Record<string, LastPlayedTotemInfo>; // USAR EL TIPO DEFINIDO ABAJO
}

type LoginResponse = UserProfileData & { firestoreId: string }; // firestoreId siempre vendrá

interface GetTriviaResponse {
    triviaId?: string;
    category?: string;
    questionText?: string;
    options?: string[];
    totemId?: string; // ID del documento del tótem
    status?: 'wait' | 'category_completed' | 'no_questions_found';
    message?: string;
    cooldown_seconds_left?: number;
}

// NUEVO: Tipos para itemsCollected y lastPlayedTotem (deben coincidir con el backend)
export interface CollectedItem {
    triviaId: string;
    totemId: string;
    qrCodeData: string;
    category: string;
    answeredCorrectly: boolean;
    timestamp: string; // ISO String o Firestore Timestamp (string para simplicidad en frontend)
    pointsGained: number;
}

export interface LastPlayedTotemInfo {
    timestamp: string; // ISO String
    attemptCorrect: boolean;
    triviaId: string;
}


// NUEVO: Tipo para la respuesta de submitTriviaAnswer
export interface SubmitTriviaResponse {
    correct: boolean;
    pointsGained: number;
    newTotalPoints: number; // Puntos totales actualizados del usuario
    message?: string;
    collectedItem?: CollectedItem | null; // El ítem que se acaba de recolectar (si fue correcto)
}


// --- Funciones API Exportadas ---
export const register = async (userData: { nombre: string; apellido: string; cedula: string }): Promise<RegisterResponse> => {
    const endpoint = '/registerUser';
    try {
        const response = await apiClient.post<RegisterResponse>(endpoint, userData);
        return response.data;
    } catch (error: any) {
        console.error('API Register Error:', error.response?.data || error.message);
        throw error.response?.data || error;
    }
};

export const login = async (usuarioId: string): Promise<LoginResponse> => {
    const endpoint = '/loginUser';
    const payload = { usuarioId };
    try {
        const response = await apiClient.post<LoginResponse>(endpoint, payload);
        return response.data;
    } catch (error: any) {
        console.error('API Login Error:', error.response?.data || error.message);
        throw error.response?.data || error;
    }
};

export const getTriviaQuestion = async (userFirestoreId: string, qrCodeData: string): Promise<GetTriviaResponse> => {
    const endpoint = '/getTriviaQuestion';
    const payload = { userFirestoreId, qrCodeData };
    try {
        const response = await apiClient.post<GetTriviaResponse>(endpoint, payload);
        return response.data;
    } catch (error: any) {
        console.error('API getTriviaQuestion Error:', error.response?.data || error.message);
        if (error.response?.data) return error.response.data; // Devolver data de error de la API si existe
        throw error; // Si no, lanzar el error de red
    }
};

// MODIFICADO: submitTriviaAnswer para llamar a la API real
export const submitTriviaAnswer = async (
    userFirestoreId: string,
    triviaId: string,
    selectedOptionIndex: number,
    totemId: string, // ID del documento del tótem donde se jugó
    qrCodeData: string // Dato del QR del tótem
): Promise<SubmitTriviaResponse> => {
    const endpoint = '/submitTriviaAnswer';
    const payload = { userFirestoreId, triviaId, selectedOptionIndex, totemId, qrCodeData };
    console.log('API submitTriviaAnswer Request:', apiClient.defaults.baseURL + endpoint, payload);
    try {
        const response = await apiClient.post<SubmitTriviaResponse>(endpoint, payload);
        console.log('API submitTriviaAnswer Response:', response.data);
        return response.data;
    } catch (error: any) {
        console.error('API submitTriviaAnswer Error:', error.response?.data || error.message);
        // Devolver el objeto de error de la API si existe, para que el componente lo maneje
        if (error.response?.data) {
            throw error.response.data; // Lanzar el error de la API para ser atrapado en el componente
        }
        throw error; // Si no hay respuesta de la API (error de red), lanzar el error
    }
};