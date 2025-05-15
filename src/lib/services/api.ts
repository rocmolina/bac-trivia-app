// src/lib/services/api.ts
import axios from 'axios';
import useAppStatusStore from '@/lib/store/appStatusStore';

const baseURL = process.env.NEXT_PUBLIC_API_BASE_URL;
console.log("API Base URL from Env:", baseURL);

const apiClient = axios.create({
    baseURL: baseURL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Interceptor de respuesta
apiClient.interceptors.response.use(
    (response) => {
        // Cualquier código de estado que este dentro del rango de 2xx causa la ejecución de esta función
        return response;
    },
    (error) => {
        // Cualquier código de estado que este fuera del rango de 2xx causa la ejecución de esta función
        if (error.response && error.response.status === 503) {
            // La aplicación está desactivada.
            console.warn("API Interceptor: Recibido error 503 (App Desactivada).");
            // Usar el store para abrir el modal global
            const { showAppDisabledModal } = useAppStatusStore.getState();
            showAppDisabledModal(); // Función definida en el store
        }
        // Es importante devolver la promesa rechazada para que el .catch() original de la llamada siga funcionando
        return Promise.reject(error);
    }
);

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

// --- Nuevos Tipos para Admin ---
export interface AdminLoginPayload {
    adminId: string;
    password_login: string;
}

export interface AdminLoginResponse {
    message: string;
    adminId?: string;
    nombre?: string;
}

export interface UserScoreData {
    firestoreId: string;
    usuarioId: string | null;
    nombre: string | null;
    apellido: string | null;
    cedula: string | null;
    puntos: number;
}

// --- Nuevos Tipos para App Status ---
export interface AppStatusResponse {
    isAppActive: boolean;
    message?: string; // Podría usarse para el mensaje del backend
}

export interface SetAppStatusPayload {
    isActive: boolean;
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

// --- Nuevas Funciones API para Admin ---

export const loginAdminApi = async (payload: { adminId: string, password: string }): Promise<AdminLoginResponse> => {
    const endpoint = '/loginAdmin';
    // El payload que se envía a la API debe tener la clave 'password'
    const apiPayload = { adminId: payload.adminId, password: payload.password };
    console.log('API Admin Login Request:', apiClient.defaults.baseURL + endpoint, apiPayload);
    try {
        const response = await apiClient.post<AdminLoginResponse>(endpoint, apiPayload);
        console.log('API Admin Login Response:', response.data);
        return response.data;
    } catch (error: any) {
        console.error('API Admin Login Error:', error.response?.data || error.message);
        throw error.response?.data || error; // Lanzar el error para que el componente lo maneje
    }
};

export const getUsersWithScoresApi = async (): Promise<UserScoreData[]> => {
    const endpoint = '/getUsersWithScores';
    // TODO: Idealmente, aquí se enviaría un token de admin si se implementara
    console.log('API Get Users Request:', apiClient.defaults.baseURL + endpoint);
    try {
        const response = await apiClient.get<UserScoreData[]>(endpoint); // Asumiendo GET y sin payload por ahora
        console.log('API Get Users Response:', response.data);
        return response.data;
    } catch (error: any) {
        console.error('API Get Users Error:', error.response?.data || error.message);
        throw error.response?.data || error;
    }
};

// --- Nuevas Funciones API para App Status ---
export const getAppStatusApi = async (): Promise<AppStatusResponse> => {
    const endpoint = '/getAppStatus';
    try {
        const response = await apiClient.get<AppStatusResponse>(endpoint);
        console.log('API Get App Status Response:', response.data);
        return response.data;
    } catch (error: any) {
        console.error('API Get App Status Error:', error.response?.data || error.message);
        // Si falla, asumimos que está activa para no bloquear al admin innecesariamente,
        // pero el admin debería poder setearlo.
        // O lanzar el error para que el dashboard lo maneje.
        throw error.response?.data || error;
    }
};


export const setAppStatusApi = async (payload: SetAppStatusPayload): Promise<{ message: string }> => {
    const endpoint = '/setAppStatus';
    // TODO: Idealmente, esta llamada debería estar autenticada para que solo admins la hagan.
    // El backend debería verificar el token/sesión del admin.
    console.log('API Set App Status Request:', apiClient.defaults.baseURL + endpoint, payload);
    try {
        const response = await apiClient.post<{ message: string }>(endpoint, payload);
        console.log('API Set App Status Response:', response.data);
        return response.data;
    } catch (error: any) {
        console.error('API Set App Status Error:', error.response?.data || error.message);
        throw error.response?.data || error;
    }
};