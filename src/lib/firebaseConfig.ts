// src/lib/firebaseConfig.ts
import { initializeApp, getApps, getApp } from 'firebase/app';

// Leer variables de entorno (prefijo NEXT_PUBLIC_ es crucial)
const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    // databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL, // Solo si usas Realtime Database
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID // Opcional
};

// Validar que las variables existen (opcional pero recomendado)
if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
    console.error("Error: Firebase config environment variables are missing!");
    // Podrías lanzar un error o manejarlo de otra forma
}

// Inicializar Firebase
let app;
if (!getApps().length) {
    app = initializeApp(firebaseConfig);
} else {
    app = getApp();
}

export const firebaseApp = app; // Exportar app si la necesitas directamente
export {}; // Asegurar que es un módulo