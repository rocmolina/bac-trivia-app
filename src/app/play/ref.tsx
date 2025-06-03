// src/app/play/page.tsx
'use client';

import React, { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import Button from '@/components/ui/Button';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import useUserStore from '@/lib/store/userStore';
import { Html5QrcodeScanner, Html5QrcodeScanType, Html5QrcodeSupportedFormats } from 'html5-qrcode'; // Eliminado Html5QrcodeResult ya que no se usa explícitamente
import ARCoreExperience from '@/components/ar/ARCoreExperience';
import Image from 'next/image';

// --- ICONOS SVG ---
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

// NUEVO: Icono para "QR no válido"
const ExclamationTriangleIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props} >
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
    </svg>
);

// NUEVO: Icono para "QR Válido"
const CheckCircleIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);


function PlayPageContent() {
    const router = useRouter();
    const user = useUserStore((state) => state);

    const [scannedData, setScannedData] = useState<string | null>(null);
    const [arSession, setARSession] = useState<XRSession | null>(null);
    const [arError, setArError] = useState<string | null>(null); // Para errores generales de AR o escáner

    // MODIFICADO: showScanDataAndAROption se usará para mostrar la pantalla de QR Válido
    // Su nombre anterior era un poco largo, pero mantenemos la lógica.
    const [showQrResultScreen, setShowQrResultScreen] = useState(false);

    // NUEVO ESTADO: para el resultado de la validación del QR
    const [isValidQr, setIsValidQr] = useState<boolean | null>(null); // null: no validado, true: válido, false: inválido

    const [shouldRenderScannerContainer, setShouldRenderScannerContainer] = useState(false);

    const qrcodeRegionId = "bac-qr-scanner-region";
    const html5QrCodeScannerRef = useRef<Html5QrcodeScanner | null>(null);
    const arDomOverlayRef = useRef<HTMLDivElement>(null);

    // Función de validación del QR
    const validateQrData = (data: string): boolean => {
        if (!data) return false;
        // Expresión regular para el formato: TOTEM<NN>_<Categoria>_INFO
        // donde NN es 01, 02, 03, o 04
        // y Categoria es Ahorro, Tarjeta, Casa, o Carro
        const pattern = /^TOTEM(0[1-4])_(Ahorro|Tarjeta|Casa|Carro)_INFO$/;
        const match = data.match(pattern);

        if (!match) {
            console.log("ValidateQR: No coincide con el patrón general.");
            return false;
        }

        const numberStr = match[1]; // "01", "02", "03", "04"
        const categoryStr = match[2]; // "Ahorro", "Tarjeta", "Casa", "Carro"

        const categoryMap: Record<string, string> = {
            "01": "Ahorro",
            "02": "Tarjeta",
            "03": "Casa",
            "04": "Carro",
        };

        return categoryMap[numberStr] === categoryStr;
    };


    const stopScanner = useCallback(() => {
        if (html5QrCodeScannerRef.current) {
            try {
                html5QrCodeScannerRef.current.clear().catch(err => console.warn("PlayPage: Advertencia al limpiar el escáner:", err));
            } catch (e) { console.warn("PlayPage: Excepción al limpiar el escáner:", e); }
            html5QrCodeScannerRef.current = null;
        }
    }, []);

    // Función para resetear al estado inicial de "¡A Jugar!"
    const resetToScanInitialScreen = useCallback(() => {
        stopScanner();
        setScannedData(null);
        setShowQrResultScreen(false); // Ocultar pantalla de resultado de QR
        setIsValidQr(null);          // Resetear validación
        setARSession(null);
        setArError(null);            // Limpiar errores generales
        setShouldRenderScannerContainer(false);
    }, [stopScanner]);


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
                    (decodedText) => { // Éxito al escanear
                        console.log("PlayPage: QR Escaneado:", decodedText);
                        setArError(null); // Limpiar errores previos de AR/escáner
                        const isValid = validateQrData(decodedText);
                        setScannedData(decodedText); // Guardar siempre el dato escaneado
                        setIsValidQr(isValid);       // Guardar resultado de la validación
                        setShowQrResultScreen(true); // Mostrar la pantalla de resultado (válido o inválido)
                        setShouldRenderScannerContainer(false); // Ocultar el scanner
                        stopScanner();
                    },
                    (errorMessage) => {
                        console.warn("PlayPage: Error de scanner QR (puede ignorarse si es solo 'no QR found'):", errorMessage);
                    }
                );
                html5QrCodeScannerRef.current = scannerInstance;
            } catch (error: any) {
                setArError(`Error del escáner QR: ${error.message || error.toString()}`);
                setShouldRenderScannerContainer(false);
            }
        }
    }, [shouldRenderScannerContainer, stopScanner]);

    useEffect(() => { // Limpieza general
        return () => {
            stopScanner();
            if (arSession) { // && arSession.ended === false) {
                arSession.end().catch(err => console.warn("PlayPage: Error al terminar sesión AR en desmontaje:", err));
            }
        };
    }, [stopScanner, arSession]);

    const handleScanButtonClick = () => { // Botón principal "Escanear QR"
        if (arSession) { // && arSession.ended === false) {
            arSession.end().catch(resetToScanInitialScreen);
        } else {
            resetToScanInitialScreen();
        }
        setShouldRenderScannerContainer(true);
    };

    // Botón "Escanear Otro QR" (usado en la pantalla de resultado de QR válido)
    const handleScanAnotherQrButton = () => {
        resetToScanInitialScreen();
        setShouldRenderScannerContainer(true); // Reabrir el escáner
    };

    // Botón "Continuar" después de un QR inválido
    const handleContinueAfterInvalidQr = () => {
        resetToScanInitialScreen(); // Vuelve a la pantalla "¡A Jugar!"
    };


    const handleEnterAR = async () => { // Llamado desde el botón "Iniciar Experiencia AR"
        if (!scannedData || !isValidQr) { // Solo proceder si el QR es válido
            setArError("No se puede iniciar AR con un QR no válido o no escaneado.");
            return;
        }
        if (!navigator.xr) {
            setArError("WebXR no es compatible con este navegador.");
            return;
        }
        if (!arDomOverlayRef.current) {
            setArError("Elemento DOM Overlay para AR no encontrado.");
            return;
        }

        setArError(null); // Limpiar errores antes de intentar

        try {
            console.log("PlayPage: Solicitando sesión AR immersive-ar...");
            const session = await navigator.xr.requestSession('immersive-ar', {
                requiredFeatures: ['dom-overlay', 'hit-test'],
                optionalFeatures: ['local', 'local-floor', 'viewer'],
                domOverlay: { root: arDomOverlayRef.current }
            });

            console.log("PlayPage: Sesión AR obtenida:", session);
            setARSession(session);
            setShowQrResultScreen(false); // Ocultar pantalla de resultado de QR al entrar a AR
            // setShouldRenderScannerContainer(false); // Ya debería estar false

            session.addEventListener('end', () => {
                console.log("PlayPage: Sesión AR terminada (evento 'end').");
                resetToScanInitialScreen(); // Volver a la pantalla "¡A Jugar!"
            });
        } catch (error: any) {
            console.error("PlayPage: Error al solicitar sesión AR:", error);
            let message = error.message || error.toString();
            if (error.name === "NotSupportedError") message = "Este dispositivo o navegador no soporta AR.";
            else if (error.name === "SecurityError") message = "Permiso para AR denegado. Revisa HTTPS y permisos.";
            setArError(`No se pudo iniciar AR: ${message}`);
            setARSession(null);
            // Mantener setShowQrResultScreen(true) y scannedData para que el usuario vea el error en contexto.
        }
    };

    const handleExitARRequest = useCallback(() => {
        if (arSession) { // && arSession.ended === false) {
            arSession.end().catch(console.warn);
            // El listener 'end' de la sesión se encargará de resetToScanInitialScreen
        } else {
            resetToScanInitialScreen();
        }
    }, [arSession, resetToScanInitialScreen]);


    if (!user.isAuthenticated || !user.firestoreId) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center">
                <p>Debes iniciar sesión para jugar.</p>
                <Button onClick={() => router.push('/login')} className="mt-4 bg-red-600 hover:bg-red-700 text-white">Ir a Login</Button>
            </div>
        );
    }

    const TopRightButton = () => {
        if (arSession || shouldRenderScannerContainer || showQrResultScreen ) { // Ocultar si está en cualquier estado post-inicial
            return null;
        }
        return (
            <Button onClick={() => router.push('/profile')} variant="secondary" size="sm" className="!absolute top-4 right-4 z-20 flex items-center bg-white/90 hover:bg-white shadow-md px-3 py-1.5" aria-label="Ir al perfil">
                <UserCircleIcon className="h-5 w-5 mr-1.5 text-gray-700" /><span className="text-gray-700">Perfil</span>
            </Button>
        );
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center bg-gray-100 relative">
            <TopRightButton />

            <div id="ar-dom-overlay-container" ref={arDomOverlayRef} style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: arSession ? 'auto' : 'none', zIndex: arSession ? 30 : -1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-start', alignItems: 'flex-end', padding: '16px', gap: '12px' }}>
                {arSession && (
                    <>
                        <Button onClick={handleExitARRequest} variant="secondary" size="sm" className="bg-white/80 hover:bg-white text-red-600 border-red-300 hover:border-red-500 flex items-center shadow-lg px-3 py-1.5" style={{ pointerEvents: 'auto' }}>
                            <XMarkIcon className="h-5 w-5 mr-1.5" /> Salir de AR
                        </Button>
                        {/* El botón "Escanear Otro QR" ya no es necesario aquí, se accede desde la pantalla de resultado de QR válido o QR inválido */}
                    </>
                )}
            </div>

            {/* PANTALLA INICIAL o MOSTRANDO SCANNER */}
            {!arSession && !showQrResultScreen && (
                <>
                    <div className="mb-8"> <Image src="/logos/bactrivia_logo.svg" alt="BAC Trivia Logo" width={140} height={40} priority /> </div>
                    <h1 className="text-2xl font-semibold text-gray-700 mb-4">¡A Jugar!</h1>
                    {!shouldRenderScannerContainer && (
                        <>
                            <p className="text-gray-600 mb-6 max-w-xs">Presiona Escanear QR y apunta tu cámara al código del tótem.</p>
                            <Button onClick={handleScanButtonClick} className="mb-4 bg-red-600 hover:bg-red-700 text-white text-lg px-8 py-3" size="lg">Escanear QR</Button>
                        </>
                    )}
                    {shouldRenderScannerContainer && ( <div id={qrcodeRegionId} className="w-full max-w-xs sm:max-w-sm md:max-w-md mx-auto border-2 border-red-300 rounded-lg overflow-hidden shadow-lg my-4 p-1 bg-white"></div> )}
                    {arError && <p className="mt-4 p-3 bg-red-100 text-red-700 border border-red-300 rounded-md w-full max-w-md">{arError}</p>}
                </>
            )}

            {/* PANTALLA DE RESULTADO DEL QR (VÁLIDO O INVÁLIDO) */}
            {showQrResultScreen && !arSession && (
                isValidQr === true && scannedData ? ( // QR Válido
                    <div className="flex flex-col items-center justify-center text-center p-6">
                        <div className="mb-6 p-6 bg-white rounded-lg shadow-xl w-full max-w-md">
                            <CheckCircleIcon className="w-16 h-16 text-green-500 mx-auto mb-4" />
                            <p className="text-xl font-semibold mb-2 text-gray-800">¡QR Válido Escaneado!</p>
                            <p className="text-gray-600 my-4">¿Listo para la Realidad Aumentada?</p>
                            <Button onClick={handleEnterAR} className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded-lg shadow-md text-lg mb-3">
                                Iniciar Experiencia AR
                            </Button>
                            <Button onClick={handleScanAnotherQrButton} variant="secondary" className="w-full py-2.5">
                                Escanear Otro QR
                            </Button>
                        </div>
                        {arError && <p className="mt-4 text-red-500 p-3 bg-red-50 rounded-md">{arError}</p>}
                    </div>
                ) : isValidQr === false ? ( // QR Inválido
                    <div className="flex flex-col items-center justify-center text-center p-6">
                        <div className="mb-6 p-6 bg-white rounded-lg shadow-xl w-full max-w-md">
                            <ExclamationTriangleIcon className="w-16 h-16 text-red-500 mx-auto mb-4" />
                            <p className="text-xl font-semibold text-red-700 mb-3">{arError || "¡QR no válido!"}</p> {/* Mostrar arError si existe, sino el mensaje genérico */}
                            <p className="text-gray-600 mb-6 px-2">
                                El código QR escaneado no es reconocido. Por favor, intenta con un QR de tótem oficial BAC Trivia.
                            </p>
                            <Button onClick={handleContinueAfterInvalidQr} className="w-full bg-gray-500 hover:bg-gray-600 text-white font-bold py-3 px-6 rounded-lg shadow-md text-lg">
                                Continuar
                            </Button>
                        </div>
                    </div>
                ) : null // No mostrar nada si isValidQr es null (aún no se ha validado)
            )}


            {arSession && scannedData && isValidQr === true && ( // Solo entrar a AR si el QR fue válido
                <ARCoreExperience activeSession={arSession} qrCodeData={scannedData} onExit={handleExitARRequest} />
            )}
        </div>
    );
}

export default function PlayPageContainer() {
    return (
        <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><p>Cargando página de juego...</p></div>}>
            <ProtectedRoute>
                <PlayPageContent />
            </ProtectedRoute>
        </Suspense>
    );
}