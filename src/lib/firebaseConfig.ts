// For Firebase JS SDK v7.20.0 and later, measurementId is optional
import { initializeApp, getApps, getApp } from 'firebase/app';

const firebaseConfig = {
    apiKey: "AIzaSyDHCjh8BFlognDHWyZ9dUk0ph4oj2vozO8",
    authDomain: "bactrivia.firebaseapp.com",
    databaseURL: "https://bactrivia-default-rtdb.firebaseio.com",
    projectId: "bactrivia",
    storageBucket: "bactrivia.firebasestorage.app",
    messagingSenderId: "1068146275630",
    appId: "1:1068146275630:web:b58dc1509717b52d4d76bf",
    measurementId: "G-PB8L11RL1L"
};

// Inicializar Firebase (asegurándose que no se inicialice múltiples veces)
let app;
if (!getApps().length) {
    app = initializeApp(firebaseConfig);
} else {
    app = getApp();
}

// Exportar la instancia inicializada si la necesitas en otros lugares
export const firebaseApp = app;
// export const db = getFirestore(app); // Solo si usas Firestore desde el cliente
// export const auth = getAuth(app);   // Solo si usas Firebase Auth desde el cliente

// Por ahora, solo inicializar es suficiente ya que interactuamos vía backend
// export {}; // Exportar algo para que sea tratado como módulo