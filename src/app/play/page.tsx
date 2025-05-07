// app/jugar/page.tsx
'use client';

import React from 'react';
import { useRouter } from 'next/navigation'; // Para el botón de volver
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import ARSceneWrapper from '@/components/ar/ARSceneWrapper'; // El canvas de R3F
import { PlaceholderCube } from '@/components/ar/PlaceholderCube'; // El cubo de prueba
import Button from '@/components/ui/Button'; // Nuestro componente botón

// Contenido principal de la página de juego
function JugarContent() {
    const router = useRouter();

    // Lógica futura para iniciar sesión WebXR, escanear QR, etc. irá aquí.
    // Por ahora, solo mostramos la escena y un UI placeholder.

    return (
        <div className="relative w-screen h-screen overflow-hidden">
            {/* Overlay UI para controles, información, etc. */}
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10 }} className="p-4 flex justify-between items-center bg-black bg-opacity-30">
                <div>
                    <h1 className="text-xl font-bold text-white">Modo AR - BAC Trivia</h1>
                    <p className="text-sm text-gray-200">Apunta, coloca y atrapa el Emoji!</p>
                    {/* Aquí irá el componente del lector QR y los botones de interacción AR en el Día 3 */}
                </div>
                <Button onClick={() => router.push('/profile')} variant="secondary" size="sm" className="text-xs">
                    Volver al Perfil
                </Button>
            </div>

            {/* Visor del Lector QR (placeholder, la librería lo manejará) */}
            {/* <div id="qr-reader-container" style={{ width: '80%', maxWidth: '400px', margin: '20px auto', border: '1px solid #fff' }}>
        <p className="text-white text-center p-2">El lector QR se mostrará aquí.</p>
      </div> */}
            {/* El ID "qr-reader-container" es un ejemplo para html5-qrcode */}


            {/* Canvas para la escena 3D de React Three Fiber */}
            {/* ARSceneWrapper ya tiene position:fixed y z-index:-1, así que está detrás del UI */}
            <ARSceneWrapper>
                <PlaceholderCube /> {/* El cubo se muestra hasta que tengamos Emojis y lógica de colocación */}
                {/* Aquí se renderizarán los Emojis 3D una vez colocados */}
            </ARSceneWrapper>

            {/* Más elementos UI, como un botón para "Colocar Emoji" después de escanear, etc. */}
            <div style={{ position: 'absolute', bottom: 20, left: '50%', transform: 'translateX(-50%)', zIndex: 10 }}>
                {/* Ejemplo: <Button onClick={handlePlaceEmoji}>Colocar Emoji</Button> */}
                {/* Este botón se activaría después de un escaneo QR exitoso */}
            </div>
        </div>
    );
}

// Exportación de la página envuelta en ProtectedRoute
export default function JugarPage() {
    return (
        <ProtectedRoute>
            <JugarContent />
        </ProtectedRoute>
    );
}