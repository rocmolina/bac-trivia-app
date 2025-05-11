// src/app/play/page.tsx
'use client';

import React, { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import Button from '@/components/ui/Button';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import useUserStore from '@/lib/store/userStore';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { Html5QrcodeScanner, Html5QrcodeScanType, Html5QrcodeSupportedFormats, Html5QrcodeResult } from 'html5-qrcode';
import ARCoreExperience from '@/components/ar/ARCoreExperience'; // Componente para la lógica AR

// Icono SVG para el botón de perfil (puedes moverlo a un archivo de iconos si prefieres)
const UserCircleIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" {...props}>
        <path fillRule="evenodd" d="M18.685 19.097A9.723 9.723 0 0 0 21.75 12c0-5.385-4.365-9.75-9.75-9.75S2.25 6.615 2.25 12a9.723 9.723 0 0 0 3.065 7.097A9.716 9.716 0 0 0 12 21.75a9.716 9.716 0 0 0 6.685-2.653Zm-12.54-1.285A7.486 7.486 0 0 1 12 15a7.486 7.486 0 0 1 5.855 2.812A8.224 8.224 0 0 1 12 20.25a8.224 8.224 0 0 1-5.855-2.438ZM15.75 9a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z" clipRule="evenodd" />
    </svg>
);


function PlayPageContent() {
    const router = useRouter();
    const user = useUserStore((state) => state);

    const [scannedData, setScannedData] = useState<string | null>(null);
    const [arSession, setARSession] = useState<XRSession | null>(null);
    const [arError, setArError] = useState<string | null>(null);
    const [showScanDataAndAROption, setShowScanDataAndAROption] = useState(false);

    // Nuevo estado para controlar explícitamente si el contenedor del escáner DEBE estar en el DOM
    const [shouldRenderScannerContainer, setShouldRenderScannerContainer] = useState(false);

    const qrcodeRegionId = "bac-qr-scanner-region"; // ID único
    const html5QrCodeScannerRef = useRef<Html5QrcodeScanner | null>(null);
    const arDomOverlayRef = useRef<HTMLDivElement>(null);

    const stopScanner = useCallback(() => {
        if (html5QrCodeScannerRef.current) {
            try {
                html5QrCodeScannerRef.current.clear().catch(err => console.warn("Advertencia al limpiar el escáner:", err));
            } catch (e) { console.warn("Excepción al limpiar el escáner:", e); }
            html5QrCodeScannerRef.current = null;
            // No cambiar shouldRenderScannerContainer aquí, solo detener la instancia
        }
    }, []);

    // Efecto para inicializar el escáner DESPUÉS de que el contenedor esté en el DOM
    useEffect(() => {
        if (shouldRenderScannerContainer && !html5QrCodeScannerRef.current) {
            // Verificar que el elemento exista realmente
            if (!document.getElementById(qrcodeRegionId)) {
                console.error("PlayPage: El div para el scanner QR no está montado todavía.");
                // Podríamos reintentar o mostrar un error más específico
                // Por ahora, el usuario tendría que volver a hacer clic en "Escanear QR"
                // o podríamos añadir un pequeño delay y reintentar.
                // Para simplicidad, si no está, el usuario debe volver a hacer clic.
                setArError("Error al preparar escáner. Intenta de nuevo.");
                setShouldRenderScannerContainer(false); // Resetear para que el usuario pueda intentarlo de nuevo
                return;
            }

            console.log("PlayPage: Inicializando Html5QrcodeScanner...");
            try {
                const scannerInstance = new Html5QrcodeScanner(
                    qrcodeRegionId,
                    {
                        fps: 10,
                        qrbox: (viewfinderWidth, viewfinderHeight) => {
                            const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
                            const qrboxSize = Math.floor(minEdge * 0.7);
                            return { width: qrboxSize, height: qrboxSize };
                        },
                        rememberLastUsedCamera: true,
                        supportedScanTypes: [Html5QrcodeScanType.SCAN_TYPE_CAMERA],
                        formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
                    },
                    false // verbose
                );

                scannerInstance.render(
                    // eslint-disable-next-line @typescript-eslint/no-unused-vars
                    (decodedText, result) => {
                        console.log(`QR escaneado: ${decodedText}`);
                        setScannedData(decodedText);
                        setShowScanDataAndAROption(true);
                        setShouldRenderScannerContainer(false); // Ocultar el contenedor del escáner
                        stopScanner(); // Detener y limpiar la instancia del escáner
                    },
                    // eslint-disable-next-line @typescript-eslint/no-unused-vars
                    (errorMessage) => {
                        // console.warn(`Error de escaneo QR (ignorado): ${errorMessage}`);
                    }
                );
                html5QrCodeScannerRef.current = scannerInstance;
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
            } catch (error: any) {
                console.error("PlayPage: Error al inicializar Html5QrcodeScanner:", error);
                setArError(`Error del escáner QR: ${error.message || error.toString()}`);
                setShouldRenderScannerContainer(false); // Ocultar si falla
            }
        }
    }, [shouldRenderScannerContainer, stopScanner]); // Depende de si debemos renderizar el escáner

    // Limpieza general al desmontar el componente
    useEffect(() => {
        return () => {
            stopScanner();
            if (arSession) { // && arSession. === false) {
                arSession.end().catch(console.warn);
            }
        };
    }, [stopScanner, arSession]);

    const handleScanButtonClick = () => {
        setScannedData(null);
        if (arSession) {
            arSession.end().catch(console.warn); // Terminar sesión AR si está activa
            setARSession(null);
        }
        setShowScanDataAndAROption(false);
        setArError(null);
        setShouldRenderScannerContainer(true); // Indicar que el contenedor del escáner debe mostrarse
    };

    const handleEnterAR = async () => {
        if (!navigator.xr) {
            setArError("WebXR no es compatible con este navegador.");
            return;
        }
        if (!arDomOverlayRef.current) {
            setArError("Elemento DOM Overlay para AR no encontrado.");
            return;
        }

        try {
            const session = await navigator.xr.requestSession('immersive-ar', {
                requiredFeatures: ['hit-test', 'dom-overlay'],
                domOverlay: { root: arDomOverlayRef.current }
            });
            setARSession(session);
            setShowScanDataAndAROption(false); // Ocultar el botón de iniciar AR
            setArError(null);

            session.addEventListener('end', () => {
                console.log("PlayPage: Sesión AR terminada (evento 'end').");
                setARSession(null);
                // Si teníamos datos escaneados, mostrar de nuevo la opción de entrar a AR
                if (scannedData) {
                    setShowScanDataAndAROption(true);
                }
            });
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (error: any) {
            console.error("PlayPage: Error al solicitar sesión AR:", error);
            setArError(`No se pudo iniciar AR: ${error.message || error.toString()}.`);
            setARSession(null);
        }
    };

    const handleExitARFromExperience = useCallback(() => {
        if (arSession) { //&& arSession.ended === false) {
            arSession.end().catch(e => console.warn("PlayPage: Error al terminar sesión AR desde Experience:", e));
        } else {
            setARSession(null); // Asegurar que el estado local se limpie
            if (scannedData) setShowScanDataAndAROption(true);
        }
    }, [arSession, scannedData]);

    if (!user.isAuthenticated || !user.firestoreId) {
        // Este caso debería ser manejado por ProtectedRoute, pero es un fallback.
        return (
            <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center">
                <p>Debes iniciar sesión para jugar.</p>
                <Button onClick={() => router.push('/login')} className="mt-4">Ir a Login</Button>
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center bg-gray-100 relative">
            {/* Botón para ir al Perfil - siempre visible excepto en modo AR */}
            {!arSession && (
                <Button
                    onClick={() => router.push('/profile')}
                    variant="secondary"
                    size="sm"
                    className="!absolute top-4 right-4 z-20 flex items-center" // Tailwind ! para anular otros estilos si es necesario
                    aria-label="Ir al perfil"
                >
                    <UserCircleIcon className="h-5 w-5 mr-1" />
                    Perfil
                </Button>
            )}

            {/* Contenedor para el DOM Overlay de AR (botón de salir de AR) */}
            <div
                id="ar-dom-overlay-container"
                ref={arDomOverlayRef}
                style={{
                    position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
                    pointerEvents: arSession ? 'auto' : 'none',
                    zIndex: arSession ? 30 : -1, // zIndex alto
                    display: 'flex', justifyContent: 'flex-end', alignItems: 'flex-start', padding: '20px',
                }}
            >
                {arSession && (
                    <Button
                        onClick={handleExitARFromExperience}
                        variant="secondary"
                        size="sm"
                        className="bg-white/80 hover:bg-white" // Estilo para mejor visibilidad sobre la cámara
                        style={{ pointerEvents: 'auto' }}
                    >
                        Salir de AR
                    </Button>
                )}
            </div>

            {/* Contenido principal de la página (escáner o opciones de AR) */}
            {!arSession && (
                <>
                    <h1 className="text-3xl font-bold text-red-700 mb-4 mt-12 sm:mt-0">BAC Trivia - ¡A Jugar!</h1>

                    {!showScanDataAndAROption && !shouldRenderScannerContainer && (
                        <>
                            <p className="text-gray-600 mb-6">Escanea un código QR de los tótems BAC para comenzar la aventura.</p>
                            <Button onClick={handleScanButtonClick} className="mb-4" size="lg">
                                Escanear QR
                            </Button>
                        </>
                    )}

                    {/* Contenedor para el escáner QR, se renderiza basado en shouldRenderScannerContainer */}
                    {shouldRenderScannerContainer && (
                        <div id={qrcodeRegionId} className="w-full max-w-xs sm:max-w-sm md:max-w-md mx-auto border-gray-300 rounded-lg overflow-hidden shadow-lg my-4">
                            {/* Html5QrcodeScanner se adjuntará aquí mediante el useEffect */}
                        </div>
                    )}

                    {showScanDataAndAROption && scannedData && (
                        <div className="mt-6 p-4 bg-white rounded-lg shadow-md">
                            <p className="text-lg font-semibold mb-2">¡QR Escaneado!</p>
                            <p className="text-md text-gray-700 mb-1">
                                <span className="font-mono bg-gray-200 px-2 py-1 rounded break-all">{scannedData}</span>
                            </p>
                            <p className="text-sm text-gray-500 mb-4">Toca abajo para iniciar la Realidad Aumentada.</p>

                            <Button
                                onClick={handleEnterAR}
                                className="bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded-lg shadow-md text-lg"
                            >
                                Iniciar Experiencia AR
                            </Button>

                            <Button
                                onClick={handleScanButtonClick} // Este botón ahora también prepara para escanear
                                variant="secondary"
                                className="mt-3 ml-0 sm:ml-2 sm:mt-0"
                            >
                                Escanear Otro QR
                            </Button>
                        </div>
                    )}

                    {arError && <p className="mt-4 p-3 bg-red-100 text-red-700 border border-red-300 rounded-md">{arError}</p>}
                </>
            )}

            {/* Componente de la experiencia AR, se renderiza solo si hay una sesión activa */}
            {arSession && scannedData && (
                <ARCoreExperience
                    activeSession={arSession}
                    qrCodeData={scannedData}
                    onExit={handleExitARFromExperience}
                />
            )}
        </div>
    );
}

export default function PlayPageContainer() {
    return (
        <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><p>Cargando...</p></div>}>
            <ProtectedRoute>
                <PlayPageContent />
            </ProtectedRoute>
        </Suspense>
    );
}