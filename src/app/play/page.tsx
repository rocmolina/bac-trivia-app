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

function PlayPageContent() {
    const router = useRouter();
    const user = useUserStore((state) => state);

    const [qrScannerActive, setQrScannerActive] = useState(false);
    const [scannedData, setScannedData] = useState<string | null>(null);
    const [arSession, setARSession] = useState<XRSession | null>(null);
    const [arError, setArError] = useState<string | null>(null);
    const [showScanDataAndAROption, setShowScanDataAndAROption] = useState(false);

    const qrcodeRegionId = "html5qr-code-full-region";
    const html5QrCodeScannerRef = useRef<Html5QrcodeScanner | null>(null);
    const arDomOverlayRef = useRef<HTMLDivElement>(null);

    const stopScanner = useCallback(() => {
        if (html5QrCodeScannerRef.current) {
            try {
                html5QrCodeScannerRef.current.clear().catch(console.warn); // Cambiado a console.warn
            } catch (e) { console.warn("Advertencia al detener scanner:", e); }
            html5QrCodeScannerRef.current = null;
            setQrScannerActive(false);
        }
    }, []);

    const startScanner = useCallback(() => {
        if (document.getElementById(qrcodeRegionId)) {
            setQrScannerActive(true);
            setScannedData(null);
            if (arSession) { // Si hay una sesión AR, intentar terminarla antes de escanear
                arSession.end().catch(console.warn);
                setARSession(null);
            }
            setShowScanDataAndAROption(false);
            setArError(null);

            try {
                const scanner = new Html5QrcodeScanner(qrcodeRegionId, {
                    fps: 10,
                    qrbox: (w,h) => ({width: Math.min(w,h)*0.7, height: Math.min(w,h)*0.7}),
                    rememberLastUsedCamera: true,
                    supportedScanTypes: [Html5QrcodeScanType.SCAN_TYPE_CAMERA],
                    formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
                }, false);
                scanner.render(
                    // eslint-disable-next-line @typescript-eslint/no-unused-vars
                    (decodedText, result) => {
                        console.log(`QR escaneado: ${decodedText}`);
                        setScannedData(decodedText);
                        setShowScanDataAndAROption(true);
                        stopScanner();
                    },
                    // eslint-disable-next-line @typescript-eslint/no-unused-vars
                    (errorMessage) => { /* ignorar errores comunes de "not found" */ }
                );
                html5QrCodeScannerRef.current = scanner;
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
            } catch (e: any) {
                setArError(`Error del escáner QR: ${e.message || e.toString()}`);
                setQrScannerActive(false);
            }
        } else {
            setArError("Elemento para escáner QR no encontrado. Recarga.");
        }
    }, [stopScanner, arSession]); // Añadido arSession como dependencia

    // Efecto para manejar la limpieza inicial y al desmontar
    useEffect(() => {
        // No iniciar escáner automáticamente aquí para dar control al usuario con el botón
        return () => {
            stopScanner();
            if (arSession) { // Verificar si la sesión no ha terminado ya
                arSession.end().catch(console.warn);
            }
        };
    }, [stopScanner, arSession]);


    const handleEnterAR = async () => {
        if (!navigator.xr) {
            setArError("WebXR no es compatible con este navegador.");
            return;
        }
        if (!arDomOverlayRef.current) {
            setArError("Elemento DOM Overlay no encontrado (arDomOverlayRef).");
            return;
        }

        try {
            console.log("Solicitando sesión AR...");
            const session = await navigator.xr.requestSession('immersive-ar', {
                requiredFeatures: ['hit-test', 'dom-overlay'],
                domOverlay: { root: arDomOverlayRef.current } // Usar el ref del div
            });
            console.log("Sesión AR obtenida:", session);
            setARSession(session);
            setShowScanDataAndAROption(false);
            setArError(null);

            // Configurar el listener 'end' para la sesión actual
            session.addEventListener('end', () => {
                console.log("Sesión AR terminada (evento 'end' en play/page).");
                setARSession(null);
                if (scannedData) { // Si teníamos datos, volver a mostrar la opción de entrar a AR
                    setShowScanDataAndAROption(true);
                } else {
                    // Si no había datos escaneados y la sesión termina,
                    // podríamos querer volver a mostrar el botón de escanear
                    // o simplemente no hacer nada y dejar que el usuario decida.
                    // Por ahora, no reiniciamos el escáner automáticamente.
                }
            });
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (error: any) {
            console.error("Error al solicitar sesión AR:", error);
            setArError(`No se pudo iniciar AR: ${error.message || error.toString()}. Asegúrate de la compatibilidad y permisos.`);
            setARSession(null);
        }
    };

    // Esta función se pasará a ARCoreExperience para que pueda notificar cuando salir
    const handleExitARFromExperience = useCallback(() => {
        console.log("handleExitARFromExperience llamado en play/page.tsx");
        if (arSession) {
            arSession.end().catch(e => console.warn("Error al intentar terminar la sesión AR desde Experience:", e));
            // El listener 'end' de la sesión se encargará de setARSession(null) y setShowScanDataAndAROption
        } else {
            // Si no hay sesión o ya terminó, solo actualizar UI
            setARSession(null);
            if (scannedData) setShowScanDataAndAROption(true);
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

    return (
        <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center bg-gray-100 relative">
            <div
                id="ar-dom-overlay-container" // ID debe ser único y consistente si se usa en requestSession
                ref={arDomOverlayRef}
                style={{
                    position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
                    pointerEvents: arSession ? 'auto' : 'none',
                    zIndex: arSession ? 20 : -1, // Encima de todo cuando AR está activa
                    display: 'flex', justifyContent: 'flex-end', alignItems: 'flex-start', padding: '20px',
                }}
            >
                {arSession && (
                    <Button
                        onClick={handleExitARFromExperience} // Usar el callback que maneja la salida desde la experiencia AR
                        variant="secondary"
                        size="sm"
                        style={{ pointerEvents: 'auto' }}
                    >
                        Salir de AR
                    </Button>
                )}
            </div>

            {!arSession && (
                <>
                    <h1 className="text-3xl font-bold text-red-700 mb-4">BAC Trivia - ¡A Jugar!</h1>
                    <p className="text-gray-600 mb-6">
                        {scannedData ? "¡QR Escaneado!" : "Escanea un código QR para comenzar."}
                    </p>

                    {!qrScannerActive && !showScanDataAndAROption && (
                        <Button onClick={startScanner} className="mb-4" size="lg">Escanear QR</Button>
                    )}

                    {qrScannerActive && !scannedData && (
                        <div id={qrcodeRegionId} className="w-full max-w-xs sm:max-w-sm md:max-w-md mx-auto border border-gray-300 rounded-lg overflow-hidden shadow-lg"></div>
                    )}

                    {showScanDataAndAROption && scannedData && (
                        <div className="mt-6 p-4 bg-white rounded-lg shadow-md">
                            <p className="text-lg font-semibold mb-2">QR Identificado:</p>
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
                                onClick={() => { setShowScanDataAndAROption(false); setScannedData(null); startScanner(); }}
                                variant="secondary"
                                className="mt-3 ml-0 sm:ml-2 sm:mt-0" // Ajuste para responsive
                            >
                                Escanear Otro QR
                            </Button>
                        </div>
                    )}

                    {arError && <p className="mt-4 p-3 bg-red-100 text-red-700 border border-red-300 rounded-md">{arError}</p>}
                </>
            )}

            {arSession && scannedData && (
                <ARCoreExperience
                    activeSession={arSession}
                    qrCodeData={scannedData}
                    onExit={handleExitARFromExperience} // << --- CORRECCIÓN AQUÍ: pasar la prop onExit
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