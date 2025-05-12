// src/app/play/page.tsx
'use client';

import React, { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import Button from '@/components/ui/Button';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import useUserStore from '@/lib/store/userStore';
import { Html5QrcodeScanner, Html5QrcodeScanType, Html5QrcodeSupportedFormats, Html5QrcodeResult } from 'html5-qrcode';
import ARCoreExperience from '@/components/ar/ARCoreExperience'; // Asegúrate que la ruta sea correcta

// Iconos (sin cambios)
const UserCircleIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" {...props}>
        <path fillRule="evenodd" d="M18.685 19.097A9.723 9.723 0 0 0 21.75 12c0-5.385-4.365-9.75-9.75-9.75S2.25 6.615 2.25 12a9.723 9.723 0 0 0 3.065 7.097A9.716 9.716 0 0 0 12 21.75a9.716 9.716 0 0 0 6.685-2.653Zm-12.54-1.285A7.486 7.486 0 0 1 12 15a7.486 7.486 0 0 1 5.855 2.812A8.224 8.224 0 0 1 12 20.25a8.224 8.224 0 0 1-5.855-2.438ZM15.75 9a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z" clipRule="evenodd" />
    </svg>
);

const XMarkIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" {...props}>
        <path fillRule="evenodd" d="M5.47 5.47a.75.75 0 0 1 1.06 0L12 10.94l5.47-5.47a.75.75 0 1 1 1.06 1.06L13.06 12l5.47 5.47a.75.75 0 1 1-1.06 1.06L12 13.06l-5.47 5.47a.75.75 0 0 1-1.06-1.06L10.94 12 5.47 6.53a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
    </svg>
);


function PlayPageContent() {
    const router = useRouter();
    const user = useUserStore((state) => state);

    const [scannedData, setScannedData] = useState<string | null>(null); // qrCodeData del tótem
    const [arSession, setARSession] = useState<XRSession | null>(null);
    const [arError, setArError] = useState<string | null>(null);
    const [showScanDataAndAROption, setShowScanDataAndAROption] = useState(false);
    const [shouldRenderScannerContainer, setShouldRenderScannerContainer] = useState(false);

    const qrcodeRegionId = "bac-qr-scanner-region";
    const html5QrCodeScannerRef = useRef<Html5QrcodeScanner | null>(null);
    const arDomOverlayRef = useRef<HTMLDivElement>(null); // Para el botón de "Salir de AR"

    const stopScanner = useCallback(() => {
        if (html5QrCodeScannerRef.current) {
            try {
                html5QrCodeScannerRef.current.clear().catch(err => console.warn("Advertencia al limpiar el escáner:", err));
            } catch (e) { console.warn("Excepción al limpiar el escáner:", e); }
            html5QrCodeScannerRef.current = null;
        }
    }, []);

    useEffect(() => {
        if (shouldRenderScannerContainer && !html5QrCodeScannerRef.current) {
            if (!document.getElementById(qrcodeRegionId)) {
                console.error("PlayPage: El div para el scanner QR no está montado todavía.");
                setArError("Error al preparar escáner. Haz clic de nuevo en 'Escanear QR'.");
                setShouldRenderScannerContainer(false);
                return;
            }
            try {
                const scannerInstance = new Html5QrcodeScanner( qrcodeRegionId, {
                    fps: 10, qrbox: (w,h) => ({width:Math.min(w,h)*0.7,height:Math.min(w,h)*0.7}),
                    rememberLastUsedCamera: true, supportedScanTypes: [Html5QrcodeScanType.SCAN_TYPE_CAMERA],
                    formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
                },false );
                scannerInstance.render(
                    (decodedText) => {
                        console.log("PlayPage: QR Scaneado:", decodedText);
                        setScannedData(decodedText);
                        setShowScanDataAndAROption(true);
                        setShouldRenderScannerContainer(false); // Ocultar el scanner
                        stopScanner();
                    },
                    (errorMessage) => {
                        // console.warn("PlayPage: Error de escaner QR (puede ignorarse si es solo 'no QR found'):", errorMessage);
                    }
                );
                html5QrCodeScannerRef.current = scannerInstance;
            } catch (error: any) {
                setArError(`Error del escáner QR: ${error.message || error.toString()}`);
                setShouldRenderScannerContainer(false);
            }
        }
    }, [shouldRenderScannerContainer, stopScanner]);

    useEffect(() => {
        return () => {
            stopScanner();
            if (arSession) { // && arSession.ended === false) { // Verificar si la sesión no ha terminado ya
                console.log("PlayPage: Desmontando, intentando terminar sesión AR activa.");
                arSession.end().catch(err => console.warn("PlayPage: Error al terminar sesión AR en desmontaje:", err));
            }
        };
    }, [stopScanner, arSession]);

    const handleScanButtonClick = () => {
        setScannedData(null);
        if (arSession) { // && arSession.ended === false) {
            arSession.end().catch(err => console.warn("PlayPage: Error al terminar sesión AR para nuevo escaneo:", err));
            // El listener 'end' de la sesión debería encargarse de setARSession(null)
        } else {
            setARSession(null); // Asegurarse que se limpia si no había sesión o ya había terminado
        }
        setShowScanDataAndAROption(false);
        setArError(null);
        setShouldRenderScannerContainer(true); // Mostrar el scanner
    };

    const handleEnterAR = async () => {
        if (!scannedData) {
            setArError("No hay datos de QR escaneados para iniciar AR.");
            return;
        }
        if (!navigator.xr) {
            setArError("WebXR no es compatible con este navegador.");
            return;
        }
        if (!arDomOverlayRef.current) {
            setArError("Elemento DOM Overlay para AR no encontrado. (arDomOverlayRef)");
            return;
        }

        try {
            console.log("PlayPage: Solicitando sesión AR immersive-ar...");
            const session = await navigator.xr.requestSession('immersive-ar', {
                requiredFeatures: ['dom-overlay', 'hit-test'],
                optionalFeatures: ['local', 'local-floor', 'viewer'], // local-floor es ideal
                domOverlay: { root: arDomOverlayRef.current } // Para el botón "Salir de AR"
            });

            console.log("PlayPage: Sesión AR obtenida:", session);
            setARSession(session); // Esto disparará el renderizado de ARCoreExperience
            setShowScanDataAndAROption(false); // Ocultar opciones de escaneo/inicio AR
            setShouldRenderScannerContainer(false); // Asegurar que el scanner no esté visible
            setArError(null);

            session.addEventListener('end', () => {
                console.log("PlayPage: Sesión AR terminada (evento 'end' recibido en play/page).");
                setARSession(null);
                if (scannedData) { // Si teníamos datos, volvemos a mostrar la opción de (re)entrar
                    setShowScanDataAndAROption(true);
                }
                // No reiniciar el escáner automáticamente
            });
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (error: any) {
            console.error("PlayPage: Error al solicitar sesión AR:", error);
            let message = error.message || error.toString();
            if (error.name === "NotSupportedError") {
                message = "Este dispositivo o navegador no soporta la sesión AR solicitada.";
            } else if (error.name === "SecurityError") {
                message = "Se denegó el permiso para acceder a la cámara o sensores para AR. Asegúrate que la página se sirve por HTTPS.";
            }
            setArError(`No se pudo iniciar AR: ${message}`);
            setARSession(null);
            setShowScanDataAndAROption(true); // Permitir reintentar si tenía datos
        }
    };

    // Esta función es llamada por ARCoreExperience cuando el usuario quiere salir o la sesión termina internamente.
    const handleExitARRequest = useCallback(() => {
        console.log("PlayPage: handleExitARRequest llamado.");
        if (arSession) { // && arSession.ended === false) {
            console.log("PlayPage: Hay una sesión AR activa, intentando terminarla.");
            arSession.end().catch(e => console.warn("PlayPage: Error al llamar a session.end() desde handleExitARRequest:", e));
            // El listener 'end' de la sesión (configurado en handleEnterAR)
            // se encargará de hacer setARSession(null) y actualizar la UI.
        } else {
            console.log("PlayPage: No hay sesión AR activa o ya terminó. Solo actualizando UI.");
            setARSession(null); // Asegurar que se limpia el estado
            if (scannedData) {
                setShowScanDataAndAROption(true); // Volver a mostrar opciones si había un QR
            } else {
                // Volver al estado inicial de pedir escanear
                setShowScanDataAndAROption(false);
                setShouldRenderScannerContainer(false);
            }
        }
    }, [arSession, scannedData]);


    if (!user.isAuthenticated || !user.firestoreId) {
        // ... (sin cambios)
        return (
            <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center">
                <p>Debes iniciar sesión para jugar.</p>
                <Button onClick={() => router.push('/login')} className="mt-4">Ir a Login</Button>
            </div>
        );
    }

    const TopRightButton = () => {
        // ... (sin cambios)
        if (arSession) {
            return null;
        }
        return (
            <Button
                onClick={() => router.push('/profile')}
                variant="secondary"
                size="sm"
                className="!absolute top-4 right-4 z-20 flex items-center bg-white/80 hover:bg-white"
                aria-label="Ir al perfil"
            >
                <UserCircleIcon className="h-5 w-5 mr-1" />
                Perfil
            </Button>
        );
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center bg-gray-100 relative">
            <TopRightButton />

            {/* Contenedor para el overlay de DOM de WebXR (botón Salir de AR) */}
            <div
                id="ar-dom-overlay-container"
                ref={arDomOverlayRef}
                style={{
                    position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
                    pointerEvents: arSession ? 'auto' : 'none', // Solo interactuable si hay sesión AR
                    zIndex: arSession ? 30 : -1, // Encima de todos, si hay sesión AR
                    display: 'flex', justifyContent: 'flex-end', alignItems: 'flex-start', padding: '20px',
                }}
            >
                {arSession && ( // Mostrar botón "Salir de AR" solo si hay sesión
                    <Button
                        onClick={handleExitARRequest} // Llama a la función para terminar la sesión
                        variant="secondary"
                        size="sm"
                        className="bg-white/90 hover:bg-white text-red-600 border-red-300 hover:border-red-500 flex items-center"
                        style={{ pointerEvents: 'auto' }} // Asegurar que el botón sea clickeable
                    >
                        <XMarkIcon className="h-5 w-5 mr-1" />
                        Salir de AR
                    </Button>
                )}
            </div>

            {!arSession && ( // Mostrar UI de escaneo/opciones si NO hay sesión AR
                <>
                    <h1 className="text-3xl font-bold text-red-700 mb-4 mt-12 sm:mt-0">BAC Trivia - ¡A Jugar!</h1>

                    {!showScanDataAndAROption && !shouldRenderScannerContainer && (
                        <>
                            <p className="text-gray-600 mb-6">Escanea un código QR para comenzar la aventura.</p>
                            <Button onClick={handleScanButtonClick} className="mb-4" size="lg">
                                Escanear QR
                            </Button>
                        </>
                    )}

                    {shouldRenderScannerContainer && (
                        <div id={qrcodeRegionId} className="w-full max-w-xs sm:max-w-sm md:max-w-md mx-auto border-2 border-red-300 rounded-lg overflow-hidden shadow-lg my-4 p-1 bg-white">
                            {/* Html5QrcodeScanner se adjuntará aquí */}
                        </div>
                    )}

                    {showScanDataAndAROption && scannedData && (
                        <div className="mt-6 p-4 bg-white rounded-lg shadow-md w-full max-w-md">
                            <p className="text-lg font-semibold mb-2">¡QR Escaneado!</p>
                            <p className="text-md text-gray-700 mb-1 break-words">
                                Tótem: <span className="font-mono bg-gray-200 px-2 py-1 rounded">{scannedData}</span>
                            </p>
                            <p className="text-sm text-gray-500 mb-4">¿Listo para la Realidad Aumentada?</p>

                            <Button
                                onClick={handleEnterAR} // Llama a la función para iniciar AR
                                className="bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded-lg shadow-md text-lg w-full"
                            >
                                Iniciar Experiencia AR
                            </Button>

                            <Button
                                onClick={handleScanButtonClick} // Permite escanear otro QR
                                variant="secondary"
                                className="mt-3 w-full"
                            >
                                Escanear Otro QR
                            </Button>
                        </div>
                    )}

                    {arError && <p className="mt-4 p-3 bg-red-100 text-red-700 border border-red-300 rounded-md w-full max-w-md">{arError}</p>}
                </>
            )}

            {/* Renderizar la experiencia AR solo si hay una sesión activa y datos escaneados */}
            {arSession && scannedData && (
                <ARCoreExperience
                    activeSession={arSession}
                    qrCodeData={scannedData} // Pasar el QR escaneado a la experiencia AR
                    onExit={handleExitARRequest} // Pasar la función para manejar la salida de AR
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