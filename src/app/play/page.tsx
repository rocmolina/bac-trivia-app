// src/app/play/page.tsx
'use client';

import React, { useState, useEffect, useRef, useCallback, Suspense, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import Button from '@/components/ui/Button';
import { Html5QrcodeScanner, Html5QrcodeResult } from 'html5-qrcode';

import { Canvas, useThree, useFrame, ThreeEvent } from '@react-three/fiber';
import { Svg } from '@react-three/drei';
import * as THREE from 'three';
import { XR, useXR, createXRStore } from '@react-three/xr'; // XRStore no es necesario importar aquí

// --- Interfaces ---
interface PlacedObjectData {
    position: THREE.Vector3Tuple;
    quaternion: THREE.QuaternionTuple;
    category: string;
    id: number;
    qrData: string;
}

interface PlacedEmojiProps {
    position: THREE.Vector3Tuple;
    quaternion: THREE.QuaternionTuple;
    category: string;
    onClick: () => void;
    scale?: number;
}

// --- Componente para el "Emoji" AR (SVG en un Plano) ---
const PlacedEmoji: React.FC<PlacedEmojiProps> = ({ position, quaternion, category, onClick, scale = 0.4 }) => {
    const groupRef = useRef<THREE.Group>(null);
    let svgUrl = '/icons/default.svg'; // Asegúrate que este exista en /public/icons/
    switch (category?.toLowerCase()) {
        case 'ahorro': svgUrl = '/icons/ahorro.svg'; break;
        case 'tarjeta': svgUrl = '/icons/tarjeta.svg'; break;
        case 'casa': svgUrl = '/icons/casa.svg'; break;
        case 'carro': svgUrl = '/icons/carro.svg'; break;
    }

    const handleClick = (event: ThreeEvent<MouseEvent>) => {
        event.stopPropagation();
        onClick();
    };

    return (
        <group
            ref={groupRef}
            position={position}
            quaternion={new THREE.Quaternion().fromArray(quaternion)}
            onClick={handleClick}
        >
            <Suspense fallback={<mesh><boxGeometry args={[scale, scale, 0.01]} /><meshBasicMaterial color="purple" wireframe={true} /></mesh>}>
                <Svg
                    src={svgUrl}
                    scale={scale}
                    position={[0, 0, 0.01]} // Pequeño offset en Z para evitar z-fighting
                />
            </Suspense>
            <mesh rotation-x={-Math.PI / 2} position={[0, -scale / 2 - 0.02, 0]} renderOrder={-1}> {/* Renderizar sombra detrás */}
                <circleGeometry args={[scale * 0.4, 16]} />
                <meshBasicMaterial color="#000000" transparent={true} opacity={0.3} depthWrite={false}/>
            </mesh>
        </group>
    );
};

// --- Componente de la Escena AR ---
interface ARContentSceneProps {
    onPlaceObject: (pose: { position: THREE.Vector3Tuple; quaternion: THREE.QuaternionTuple }) => void;
    placedObjectData: PlacedObjectData | null;
    onObjectTap: (objectData: PlacedObjectData) => void;
    reticleRef: React.RefObject<THREE.Mesh | null>;
    activeHitTestSource: XRHitTestSource | null;
}

const ARContentScene: React.FC<ARContentSceneProps> = ({ onPlaceObject, placedObjectData, onObjectTap, reticleRef, activeHitTestSource }) => {
    const { gl, camera } = useThree();
    const session = useXR((state) => state.session);
    const isPresenting = !!session;

    useFrame((state, delta, xrFrame) => {
        if (!reticleRef.current) return;
        const player = camera.parent;

        if (!isPresenting || !player || !xrFrame) {
            reticleRef.current.visible = false;
            return;
        }
        if (!activeHitTestSource) {
            reticleRef.current.visible = false;
            return;
        }

        const hitTestResults = xrFrame.getHitTestResults(activeHitTestSource);
        if (hitTestResults.length > 0) {
            const hit = hitTestResults[0];
            const currentReferenceSpace = gl.xr.getReferenceSpace();
            if (currentReferenceSpace) {
                const hitPose = hit.getPose(currentReferenceSpace);
                if (hitPose) {
                    reticleRef.current.visible = true;
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    reticleRef.current.position.copy(hitPose.transform.position as any);
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    reticleRef.current.quaternion.copy(hitPose.transform.orientation as any);
                } else { reticleRef.current.visible = false; }
            } else { reticleRef.current.visible = false; }
        } else { reticleRef.current.visible = false; }
    });

    useEffect(() => {
        const currentSession = session;
        if (!currentSession) return;
        const handleSelect = () => {
            if (reticleRef.current?.visible) {
                onPlaceObject({
                    position: reticleRef.current.position.toArray() as THREE.Vector3Tuple,
                    quaternion: reticleRef.current.quaternion.toArray() as THREE.QuaternionTuple,
                });
            }
        };
        currentSession.addEventListener('select', handleSelect);
        return () => { currentSession.removeEventListener('select', handleSelect); };
    }, [session, onPlaceObject, reticleRef]);

    return (
        <>
            <ambientLight intensity={1.8} />
            <directionalLight position={[2, 8, 5]} intensity={1.5} castShadow={true}/>
            <mesh ref={reticleRef} visible={false}>
                <ringGeometry args={[0.07, 0.1, 24]} />
                <meshBasicMaterial color="yellow" transparent={true} opacity={0.8} side={THREE.DoubleSide} depthTest={false} />
            </mesh>
            {placedObjectData && (
                <PlacedEmoji
                    key={placedObjectData.id}
                    position={placedObjectData.position}
                    quaternion={placedObjectData.quaternion}
                    category={placedObjectData.category}
                    onClick={() => onObjectTap(placedObjectData)}
                />
            )}
        </>
    );
};

// --- Componente Principal de la Página de Juego ---
function JugarContent() {
    const router = useRouter();
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [scanResult, setScanResult] = useState<Html5QrcodeResult | null>(null);
    const [currentQrData, setCurrentQrData] = useState<string | null>(null);
    const [isScanning, setIsScanning] = useState(false);
    const [manualError, setManualError] = useState<string | null>(null);
    const [arMessage, setArMessage] = useState<string>("Apunta al QR del tótem para iniciar.");

    const scannerRef = useRef<Html5QrcodeScanner | null>(null);
    const QR_READER_ELEMENT_ID = "qr-reader-container";

    const [isARSupported, setIsARSupported] = useState<boolean | null>(null);
    const [activeXrSession, setActiveXrSession] = useState<XRSession | null>(null);
    const [manualHitTestSource, setManualHitTestSource] = useState<XRHitTestSource | null>(null);
    const [placedObjectData, setPlacedObjectData] = useState<PlacedObjectData | null>(null);

    const reticleRef = useRef<THREE.Mesh | null>(null);
    const xrStore = useMemo(() => createXRStore(), []);


    useEffect(() => {
        if (typeof navigator !== 'undefined' && 'xr' in navigator) {
            navigator.xr?.isSessionSupported('immersive-ar').then((supported) => {
                setIsARSupported(supported);
                if (!supported) setArMessage("Realidad Aumentada no soportada en este navegador/dispositivo.");
            }).catch(err => { setIsARSupported(false); setArMessage("Error verificando AR."); console.error(err);});
        } else { setIsARSupported(false); setArMessage("WebXR no disponible."); }
    }, []);

    const isScanningRef = useRef(isScanning);
    useEffect(() => { isScanningRef.current = isScanning; }, [isScanning]);

    const stopScanning = useCallback(() => {
        if (scannerRef.current) {
            scannerRef.current.clear().catch(console.error).finally(() => {
                setIsScanning(false); isScanningRef.current = false; scannerRef.current = null;
                const qrContainer = document.getElementById(QR_READER_ELEMENT_ID);
                if (qrContainer) qrContainer.innerHTML = ""; // Limpiar el contenido del div
            });
        } else { setIsScanning(false); isScanningRef.current = false; }
    }, []);

    const startScanning = useCallback(() => {
        setManualError(null); setScanResult(null); setPlacedObjectData(null); setCurrentQrData(null);
        setArMessage("Iniciando escáner QR..."); // Mensaje mientras inicia
        try {
            if (scannerRef.current) { scannerRef.current.clear().catch(console.error); scannerRef.current = null; }
            const config = { fps: 10, qrbox: { width: 250, height: 250 }, supportedScanTypes: [0]};
            const html5QrCodeScanner = new Html5QrcodeScanner(QR_READER_ELEMENT_ID, config, false);
            const qrCodeSuccessCallback = (decodedText: string, result: Html5QrcodeResult) => {
                if (isScanningRef.current) { // Verificar con la ref para evitar múltiples llamadas
                    console.log(`QR Detectado! Texto: ${decodedText}`);
                    stopScanning();
                    setScanResult(result);
                    setCurrentQrData(decodedText);
                    setArMessage("QR escaneado correctamente. Iniciando AR...");
                }
            };
            html5QrCodeScanner.render(qrCodeSuccessCallback, (errorMessage) => {
                console.warn("QR Scan Error (ignorable):", errorMessage);
            });
            scannerRef.current = html5QrCodeScanner;
            setIsScanning(true); isScanningRef.current = true;
            setArMessage("Escaneando código QR..."); // Mensaje mientras está activo
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (err: any) {
            console.error("Error al iniciar QR Scanner:", err);
            setManualError(`Error al iniciar escáner: ${err.message || String(err)}`);
            setIsScanning(false); isScanningRef.current = false;
            setArMessage("Error con el escáner QR. Intenta de nuevo.");
        }
    }, [stopScanning]);

    useEffect(() => {
        // Limpieza del escáner al desmontar el componente
        return () => {
            if (scannerRef.current) {
                stopScanning();
            }
        };
    }, [stopScanning]);

    const handleSessionEnd = useCallback(() => {
        console.log("AR Session ended handler in JugarContent");
        setActiveXrSession(null);
        setManualHitTestSource(null);
        setPlacedObjectData(null);
        setCurrentQrData(null); // Permite re-escanear
        setArMessage("Sesión AR finalizada. Escanea un QR para iniciar de nuevo.");
        setScanResult(null);
        xrStore.setState({ session: undefined }); // Resetear store XR
    }, [xrStore]);

    const handleSessionStart = useCallback(async (session: XRSession) => {
        console.log("AR Session granted by manual request:", session);
        setActiveXrSession(session);
        xrStore.setState({ session: session });
        setArMessage("¡Sesión AR iniciada! Toca una superficie para colocar el emoji.");

        session.addEventListener('end', handleSessionEnd);

        try {
            const viewerSpace = await session.requestReferenceSpace('viewer');
            const newHitTestSource = await session.requestHitTestSource?.({ space: viewerSpace });
            if (newHitTestSource) {
                setManualHitTestSource(newHitTestSource);
                xrStore.setState({ session: session }); // Actualizar store XR
                console.log("Manual Hit Test Source created and stored.");
            } else {
                setArMessage("Detección de superficies (hit-test) no disponible.");
                console.warn("Manual Hit Test Source creation failed.");
            }
        } catch (error) {
            console.error("Error setting up hit-test:", error);
            setArMessage("Error configurando detección de superficies.");
            session.end().catch(console.error);
        }
    }, [handleSessionEnd, xrStore]);

    useEffect(() => {
        if (currentQrData && !activeXrSession && isARSupported === true) {
            const requestSessionAndSetup = async () => {
                try {
                    setArMessage("Solicitando sesión AR...");
                    const session = await navigator.xr?.requestSession('immersive-ar', {
                        requiredFeatures: ['hit-test', 'local', 'dom-overlay'],
                        domOverlay: { root: document.body }
                    });
                    if (session) {
                        await handleSessionStart(session);
                    }
                } catch (err) {
                    console.error("Error requesting AR session manually:", err);
                    setArMessage("No se pudo iniciar la sesión AR. Intenta de nuevo.");
                    setCurrentQrData(null); // Permitir re-escanear
                }
            };
            void requestSessionAndSetup();
        }
    }, [currentQrData, activeXrSession, isARSupported, handleSessionStart]);

    const handlePlaceObject = useCallback((pose: { position: THREE.Vector3Tuple; quaternion: THREE.QuaternionTuple }) => {
        if (!currentQrData) return;
        const categoryMatch = currentQrData.match(/_(Ahorro|Tarjeta|Casa|Carro)/i);
        const category = categoryMatch ? categoryMatch[1] : 'Default';
        setPlacedObjectData({
            id: Date.now(), position: pose.position, quaternion: pose.quaternion,
            category: category, qrData: currentQrData
        });
        setArMessage(`¡${category} listo! Toca el emoji para la trivia.`);
    }, [currentQrData]);

    const handleObjectTap = (tappedObjectData: PlacedObjectData) => {
        if (!tappedObjectData.qrData) { setArMessage("Error: QR data missing."); return; }
        setArMessage(`¡${tappedObjectData.category} capturado! Cargando trivia...`);
        // TODO: Implementar animación de "captura" aquí (Día 4 o 5)
        router.push(`/trivia?qrCodeData=${encodeURIComponent(tappedObjectData.qrData)}`);
    };

    // --- Renderizado Principal ---
    return (
        <div className="relative w-screen h-screen overflow-hidden bg-gray-900 text-white select-none flex flex-col"> {/* Flex col para header y contenido */}
            {/* Header */}
            <header className="w-full z-20 p-3 flex justify-between items-center bg-gradient-to-b from-black/70 to-transparent shrink-0">
                <h1 className="text-lg sm:text-xl font-semibold">BAC Trivia - {activeXrSession ? "Modo AR" : "Modo Escaneo"}</h1>
                {activeXrSession ? ( <Button onClick={() => activeXrSession.end().catch(console.error)} variant="secondary" size="sm" className="bg-white/20 hover:bg-white/30 text-white border-white/30">Salir AR</Button> )
                    : ( <Button onClick={() => router.push('/profile')} variant="secondary" size="sm" className="bg-white/20 hover:bg-white/30 text-white border-white/30">Perfil</Button> )}
            </header>

            {/* Contenido Principal (Escáner o Canvas AR) */}
            <main className="flex-grow relative">
                {!activeXrSession && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center p-4 z-10 text-center">
                        {isARSupported === null && <p className="text-lg animate-pulse">Verificando soporte AR...</p>}
                        {isARSupported === false && <p className="text-red-400 text-lg">{arMessage}</p>}
                        {isARSupported === true && (
                            <>
                                {!isScanning && !currentQrData && (
                                    <>
                                        <p className="mb-6 text-gray-300 text-lg">{arMessage}</p>
                                        <Button onClick={startScanning} variant="primary" size="lg" className="shadow-lg px-8 py-3">Escanear Código QR</Button>
                                        {manualError && <p className="mt-4 text-red-400 text-sm">{manualError}</p>}
                                    </>
                                )}
                                {/* Contenedor del Lector QR */}
                                <div id={QR_READER_ELEMENT_ID} className={`w-full max-w-[300px] sm:max-w-[350px] aspect-square rounded-lg overflow-hidden bg-gray-800 shadow-xl border-2 border-gray-600 ${isScanning ? 'block' : 'hidden'}`}>
                                    {/* La librería html5-qrcode inserta el video aquí */}
                                </div>
                                {isScanning && (<Button onClick={stopScanning} variant="secondary" size="md" className="mt-6 bg-white/20 hover:bg-white/30 text-white border-white/30">Cancelar Escaneo</Button>)}
                                {/* Mensaje después de escanear y antes de iniciar AR */}
                                {currentQrData && !activeXrSession && (
                                    <p className="mt-4 text-green-400 animate-pulse">{arMessage}</p>
                                )}
                            </>
                        )}
                    </div>
                )}

                {/* Contenido AR (Canvas y Mensaje Flotante) */}
                {activeXrSession && isARSupported === true && (
                    <>
                        <div className="absolute bottom-5 left-1/2 transform -translate-x-1/2 z-20 p-3 bg-black bg-opacity-75 rounded-lg shadow-lg max-w-[90%]">
                            <p className="text-sm text-center text-gray-100">{arMessage}</p>
                        </div>
                        <Canvas style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 0 }} >
                            <XR store={xrStore}> {/* Pasar el store XR creado */}
                                <ARContentScene
                                    onPlaceObject={handlePlaceObject}
                                    placedObjectData={placedObjectData}
                                    onObjectTap={handleObjectTap}
                                    reticleRef={reticleRef}
                                    activeHitTestSource={manualHitTestSource}
                                />
                            </XR>
                        </Canvas>
                    </>
                )}
            </main>
        </div>
    );
}

// --- Componente de Página Exportado ---
export default function PlayPage() {
    return (
        <ProtectedRoute>
            <JugarContent />
        </ProtectedRoute>
    );
}
