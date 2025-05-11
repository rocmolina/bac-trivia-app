// src/app/play/page.tsx
'use client';

import React, { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import Button from '@/components/ui/Button';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import useUserStore from '@/lib/store/userStore';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { Html5QrcodeScanner, Html5QrcodeScanType, Html5QrcodeSupportedFormats, Html5QrcodeResult } from 'html5-qrcode';
import ARCoreExperience from '@/components/ar/ARCoreExperience';

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

    const [scannedData, setScannedData] = useState<string | null>(null);
    const [arSession, setARSession] = useState<XRSession | null>(null);
    const [arError, setArError] = useState<string | null>(null);
    const [showScanDataAndAROption, setShowScanDataAndAROption] = useState(false);
    const [shouldRenderScannerContainer, setShouldRenderScannerContainer] = useState(false);

    const qrcodeRegionId = "bac-qr-scanner-region";
    const html5QrCodeScannerRef = useRef<Html5QrcodeScanner | null>(null);
    const arDomOverlayRef = useRef<HTMLDivElement>(null);

    const stopScanner = useCallback(() => {
        if (html5QrCodeScannerRef.current) {
            try {
                html5QrCodeScannerRef.current.clear().catch(err => console.warn("Advertencia al limpiar el escáner:", err));
            } catch (e) { console.warn("Excepción al limpiar el escáner:", e); }
            html5QrCodeScannerRef.current = null;
        }
        // No cambiar shouldRenderScannerContainer aquí directamente
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
                        setScannedData(decodedText);
                        setShowScanDataAndAROption(true);
                        setShouldRenderScannerContainer(false);
                        stopScanner();
                    },
                    () => {} // Error callback (ignorado)
                );
                html5QrCodeScannerRef.current = scannerInstance;
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
            } catch (error: any) {
                setArError(`Error del escáner QR: ${error.message || error.toString()}`);
                setShouldRenderScannerContainer(false);
            }
        }
    }, [shouldRenderScannerContainer, stopScanner]);

    useEffect(() => {
        return () => {
            stopScanner();
            if (arSession) { // && arSession.ended === false) {
                arSession.end().catch(console.warn);
            }
        };
    }, [stopScanner, arSession]);

    const handleScanButtonClick = () => {
        setScannedData(null);
        if (arSession) {
            arSession.end().catch(console.warn);
            setARSession(null);
        }
        setShowScanDataAndAROption(false);
        setArError(null);
        setShouldRenderScannerContainer(true);
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
            console.log("PlayPage: Solicitando sesión AR con features...");
            const session = await navigator.xr.requestSession('immersive-ar', {
                requiredFeatures: ['dom-overlay', 'hit-test'], // 'hit-test' es crucial.
                // 'local-floor' y 'viewer' son tipos de reference space, no features directas de sesión,
                // pero 'hit-test' depende de que el sistema pueda proveerlos.
                // ARButton.js de Three a menudo añade 'local-floor' a optionalFeatures.
                optionalFeatures: ['local', 'viewer', 'local-floor'], // Ser más permisivo
                // domOverlay es requerido para el botón de salir y otros elementos UI en AR.
                domOverlay: { root: arDomOverlayRef.current }
            });

            console.log("PlayPage: Sesión AR obtenida:", session);
            setARSession(session);
            setShowScanDataAndAROption(false);
            setShouldRenderScannerContainer(false); // Asegurar que el scanner no esté visible
            setArError(null);

            session.addEventListener('end', () => {
                console.log("PlayPage: Sesión AR terminada (evento 'end' en play/page).");
                setARSession(null);
                // Si teníamos datos escaneados previamente, volvemos a mostrar la opción de entrar a AR
                if (scannedData) {
                    setShowScanDataAndAROption(true);
                }
                // No reiniciar el escáner automáticamente a menos que el usuario lo pida
            });
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (error: any) {
            console.error("PlayPage: Error al solicitar sesión AR:", error);
            setArError(`No se pudo iniciar AR: ${error.message || error.toString()}. Verifica compatibilidad y permisos.`);
            setARSession(null);
            setShowScanDataAndAROption(true); // Permitir al usuario reintentar si tenía datos
        }
    };

    const handleExitARRequest = useCallback(() => { // Renombrado para claridad
        if (arSession) { // && arSession.ended === false) {
            arSession.end().catch(e => console.warn("PlayPage: Error al llamar a session.end():", e));
            // El listener 'end' de la sesión se encargará de setARSession(null) y actualizar UI.
        } else {
            // Si no hay sesión o ya terminó, solo actualizar UI para volver al estado de escaneo/opciones AR
            setARSession(null);
            if (scannedData) {
                setShowScanDataAndAROption(true);
            } else {
                setShouldRenderScannerContainer(false); // Ocultar scanner si no hay datos y se "sale" de un estado no-AR
            }
        }
    }, [arSession, scannedData]);

    if (!user.isAuthenticated || !user.firestoreId) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center">
                <p>Debes iniciar sesión para jugar.</p>
                <Button onClick={() => router.push('/login')} className="mt-4">Ir a Login</Button>
            </div>
        );
    }

    // Botón superior derecho dinámico
    const TopRightButton = () => {
        if (arSession) {
            // No necesitamos este botón aquí si el overlay maneja el "Salir de AR"
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

            <div
                id="ar-dom-overlay-container"
                ref={arDomOverlayRef}
                style={{
                    position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
                    pointerEvents: arSession ? 'auto' : 'none',
                    zIndex: arSession ? 30 : -1,
                    display: 'flex', justifyContent: 'flex-end', alignItems: 'flex-start', padding: '20px',
                }}
            >
                {arSession && (
                    <Button
                        onClick={handleExitARRequest}
                        variant="secondary"
                        size="sm"
                        className="bg-white/90 hover:bg-white text-red-600 border-red-300 hover:border-red-500 flex items-center"
                        style={{ pointerEvents: 'auto' }}
                    >
                        <XMarkIcon className="h-5 w-5 mr-1" />
                        Salir de AR
                    </Button>
                )}
            </div>

            {!arSession && (
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
                                onClick={handleEnterAR}
                                className="bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded-lg shadow-md text-lg w-full"
                            >
                                Iniciar Experiencia AR
                            </Button>

                            <Button
                                onClick={handleScanButtonClick}
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

            {arSession && scannedData && (
                <ARCoreExperience
                    activeSession={arSession}
                    qrCodeData={scannedData}
                    onExit={handleExitARRequest}
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