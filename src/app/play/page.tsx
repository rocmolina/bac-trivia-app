'use client';

import React, { useState, useEffect, useRef, useCallback, Suspense, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import Button from '@/components/ui/Button';
import { Html5QrcodeScanner, Html5QrcodeResult } from 'html5-qrcode';

import { Canvas, useThree, useFrame, ThreeEvent } from '@react-three/fiber';
import { Svg } from '@react-three/drei';
import * as THREE from 'three';
import { XR, useXR, createXRStore } from '@react-three/xr';

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

const PlacedEmoji: React.FC<PlacedEmojiProps> = ({ position, quaternion, category, onClick, scale = 0.4 }) => {
    const groupRef = useRef<THREE.Group>(null);
    let svgUrl = '/icons/default.svg';
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
                    position={[0, 0, 0.01]}
                />
            </Suspense>
            <mesh rotation-x={-Math.PI / 2} position={[0, -scale / 2 - 0.02, 0]} renderOrder={-1}>
                <circleGeometry args={[scale * 0.4, 16]} />
                <meshBasicMaterial color="#000000" transparent={true} opacity={0.3} depthWrite={false}/>
            </mesh>
        </group>
    );
};

interface ARContentSceneProps {
    onPlaceObject: (pose: { position: THREE.Vector3Tuple; quaternion: THREE.QuaternionTuple }) => void;
    placedObjectData: PlacedObjectData | null;
    onObjectTap: (objectData: PlacedObjectData) => void;
    reticleRef: React.RefObject<THREE.Mesh | null>;
    activeHitTestSourceFromParent: XRHitTestSource | null;
}

const ARContentScene: React.FC<ARContentSceneProps> = ({ onPlaceObject, placedObjectData, onObjectTap, reticleRef, activeHitTestSourceFromParent }) => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { gl, camera } = useThree();
    const session = useXR((state) => state.session);
    const isPresenting = !!session;

    useEffect(() => {
        console.log("ARContentScene Update:", { sessionAvailable: !!session, isPresenting, activeHitTestSourceFromParent });
        if (isPresenting && !session) {
            console.warn("ARContentScene: isPresenting is true, but session is null!");
        }
    }, [session, isPresenting, activeHitTestSourceFromParent]);

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    useFrame((state) => {
        const xrFrame = gl.xr.getFrame?.();
        if (!reticleRef.current) return;

        if (!isPresenting || !xrFrame) {
            reticleRef.current.visible = false;
            return;
        }

        if (!activeHitTestSourceFromParent) {
            reticleRef.current.visible = false;
            return;
        }

        const hitTestResults = xrFrame.getHitTestResults(activeHitTestSourceFromParent);
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
                    return;
                }
            }
        }

        reticleRef.current.visible = false;
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
            {isPresenting && (
                <mesh position={[0, 0.1, -0.8]} scale={0.1}>
                    <boxGeometry args={[0.1, 0.1, 0.1]} />
                    <meshStandardMaterial color="magenta" />
                </mesh>
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
    const [showArButton, setShowArButton] = useState(false);

    const scannerRef = useRef<Html5QrcodeScanner | null>(null);
    const QR_READER_ELEMENT_ID = "qr-reader-container";

    const [isARSupported, setIsARSupported] = useState<boolean | null>(null);
    const [activeXrSessionObject, setActiveXrSessionObject] = useState<XRSession | null>(null);
    const [manualHitTestSource, setManualHitTestSource] = useState<XRHitTestSource | null>(null);
    const [placedObjectData, setPlacedObjectData] = useState<PlacedObjectData | null>(null);

    const reticleRef = useRef<THREE.Mesh | null>(null);
    const xrStore = useMemo(() => {
        console.log("JugarContent: Creating XR Store");
        return createXRStore();
    }, []);


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
                if (qrContainer) qrContainer.innerHTML = "";
            });
        } else { setIsScanning(false); isScanningRef.current = false; }
    }, []);

    const startScanning = useCallback(() => {
        setManualError(null); setScanResult(null); setPlacedObjectData(null); setCurrentQrData(null);
        setShowArButton(false);
        setArMessage("Iniciando escáner QR...");
        try {
            if (scannerRef.current) { scannerRef.current.clear().catch(console.error); scannerRef.current = null; }
            const config = { fps: 10, qrbox: { width: 250, height: 250 }, supportedScanTypes: [0]};
            const html5QrCodeScanner = new Html5QrcodeScanner(QR_READER_ELEMENT_ID, config, false);
            const qrCodeSuccessCallback = (decodedText: string, result: Html5QrcodeResult) => {
                if (isScanningRef.current) {
                    console.log(`QR Detectado! Texto: ${decodedText}`);
                    stopScanning();
                    setScanResult(result);
                    setCurrentQrData(decodedText);
                    setArMessage(`QR Escaneado: ${decodedText}. Presiona "Iniciar AR".`);
                    setShowArButton(true);
                }
            };
            html5QrCodeScanner.render(qrCodeSuccessCallback, (errorMessage) => { console.warn("QR Scan Error (ignorable):", errorMessage); });
            scannerRef.current = html5QrCodeScanner;
            setIsScanning(true); isScanningRef.current = true;
            setArMessage("Escaneando código QR...");
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (err: any) {
            console.error("Error al iniciar QR Scanner:", err);
            setManualError(`Error al iniciar escáner: ${err.message || String(err)}`);
            setIsScanning(false); isScanningRef.current = false;
            setArMessage("Error con el escáner QR. Intenta de nuevo.");
        }
    }, [stopScanning]);

    useEffect(() => () => stopScanning(), [stopScanning]);

    const handleSessionEnd = useCallback(() => {
        console.log("JugarContent: handleSessionEnd called");
        setActiveXrSessionObject(null);
        setManualHitTestSource(null);
        setPlacedObjectData(null);
        setArMessage("Sesión AR finalizada. Puedes iniciarla de nuevo o escanear otro QR.");
        setShowArButton(!!currentQrData);
        // Actualizar el store de @react-three/xr para reflejar que no hay sesión
        // y limpiar el hitTestSource.
        // El store de @react-three/xr espera un objeto parcial de XRState.
        // 'isPresenting' y 'hitTestSource' no son propiedades directas de XRState que podamos setear así.
        // Solo 'session' y 'mode' son las principales.
        xrStore.setState({ session: undefined, mode: null });
    }, [xrStore, currentQrData]);

    const handleSessionStart = useCallback(async (session: XRSession) => {
        console.log("JugarContent: handleSessionStart called with session:", session);
        setActiveXrSessionObject(session); // Guardar la sesión nativa

        // Actualizar el store de @react-three/xr con la nueva sesión.
        // Esto permitirá que useXR() en ARContentScene obtenga la sesión y derive isPresenting.
        xrStore.setState({ session: session, mode: 'immersive-ar' });
        setShowArButton(false);

        session.addEventListener('end', handleSessionEnd);

        try {
            console.log("JugarContent: Requesting viewer reference space...");
            const viewerSpace = await session.requestReferenceSpace('viewer');
            console.log("JugarContent: Viewer space obtained:", viewerSpace);
            console.log("JugarContent: Requesting hit-test source...");
            const newHitTestSource = await session.requestHitTestSource?.({ space: viewerSpace });

            if (newHitTestSource) {
                setManualHitTestSource(newHitTestSource); // Guardar para pasarlo a ARContentScene
                // No necesitamos setear hitTestSource en el xrStore, ya que no es una propiedad de XRState.
                // Lo pasaremos como prop a ARContentScene.
                console.log("JugarContent: Manual Hit Test Source created and stored locally:", newHitTestSource);
                setArMessage("¡Sesión AR iniciada! Toca una superficie para colocar el emoji.");
            } else {
                setArMessage("Detección de superficies (hit-test) no disponible en esta sesión.");
                console.warn("JugarContent: Manual Hit Test Source creation failed.");
                // No terminar la sesión aquí necesariamente, podría ser un problema temporal o de features
            }
        } catch (error) {
            console.error("JugarContent: Error setting up hit-test source:", error);
            setArMessage("Error configurando detección de superficies: " + error);
            // Terminar la sesión si el hit-test es crucial y falla
            session.end().catch(console.error);
        }
    }, [handleSessionEnd, xrStore]);

    const onClickInitiateARSession = useCallback(async () => {
        if (!currentQrData || activeXrSessionObject || isARSupported !== true) {
            console.warn("onClickInitiateARSession: Pre-conditions not met.", { currentQrData, activeXrSessionObject, isARSupported });
            setArMessage("No se puede iniciar AR. Escanea un QR primero o verifica el soporte AR.");
            return;
        }
        try {
            setShowArButton(false);
            setArMessage("Solicitando sesión AR...");
            const session = await navigator.xr?.requestSession('immersive-ar', {
                requiredFeatures: ['hit-test', 'local-floor', 'dom-overlay'],
                domOverlay: { root: document.body }
            });
            if (session) {
                await handleSessionStart(session);
            } else {
                setArMessage("No se pudo obtener la sesión AR. Intenta de nuevo.");
                setShowArButton(true);
            }
        } catch (err) {
            console.error("onClickInitiateARSession: Error requesting AR session:", err);
            setArMessage(`No se pudo iniciar la sesión AR: ${err instanceof Error ? err.message : String(err)}`);
            setShowArButton(true);
        }
    }, [currentQrData, activeXrSessionObject, isARSupported, handleSessionStart]);


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
        router.push(`/trivia?qrCodeData=${encodeURIComponent(tappedObjectData.qrData)}`);
    };

    // --- Renderizado Principal ---
    return (
        <div className="relative w-screen h-screen overflow-hidden bg-gray-900 text-white select-none flex flex-col">
            <header className="w-full z-20 p-3 flex justify-between items-center bg-gradient-to-b from-black/70 to-transparent shrink-0">
                <h1 className="text-lg sm:text-xl font-semibold">BAC Trivia - {activeXrSessionObject ? "Modo AR" : "Modo Escaneo"}</h1>
                {activeXrSessionObject ? ( <Button onClick={() => activeXrSessionObject.end().catch(console.error)} variant="secondary" size="sm" className="bg-white/20 hover:bg-white/30 text-white border-white/30">Salir AR</Button> )
                    : ( <Button onClick={() => router.push('/profile')} variant="secondary" size="sm" className="bg-white/20 hover:bg-white/30 text-white border-white/30">Perfil</Button> )}
            </header>

            <main className="flex-grow relative">
                {!activeXrSessionObject && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center p-4 z-10 text-center">
                        {isARSupported === null && <p className="text-lg animate-pulse">Verificando soporte AR...</p>}
                        {isARSupported === false && <p className="text-red-400 text-lg">{arMessage}</p>}
                        {isARSupported === true && (
                            <>
                                {!isScanning && !showArButton && (
                                    <>
                                        <p className="mb-6 text-gray-300 text-lg">{arMessage}</p>
                                        <Button onClick={startScanning} variant="primary" size="lg" className="shadow-lg px-8 py-3">Escanear Código QR</Button>
                                        {manualError && <p className="mt-4 text-red-400 text-sm">{manualError}</p>}
                                    </>
                                )}
                                <div id={QR_READER_ELEMENT_ID} className={`w-full max-w-[300px] sm:max-w-[350px] aspect-square rounded-lg overflow-hidden bg-gray-800 shadow-xl border-2 border-gray-600 ${isScanning ? 'block' : 'hidden'}`}></div>
                                {isScanning && (<Button onClick={stopScanning} variant="secondary" size="md" className="mt-6 bg-white/20 hover:bg-white/30 text-white border-white/30">Cancelar Escaneo</Button>)}
                                {showArButton && currentQrData && !activeXrSessionObject && (
                                    <div className="mt-6 flex flex-col items-center gap-4">
                                        <p className="text-green-400">{arMessage}</p>
                                        <Button onClick={onClickInitiateARSession} variant="primary" size="lg" className="shadow-lg px-8 py-3">
                                            Iniciar Experiencia AR
                                        </Button>
                                        <Button onClick={startScanning} variant="secondary" size="sm" className="bg-white/20 hover:bg-white/30 text-white border-white/30">
                                            Escanear Otro QR
                                        </Button>
                                    </div>
                                )}
                                {currentQrData && !activeXrSessionObject && !showArButton && (
                                    <p className="mt-4 text-blue-400 animate-pulse">{arMessage}</p>
                                )}
                            </>
                        )}
                    </div>
                )}

                {activeXrSessionObject && isARSupported === true && (
                    <>
                        <div className="absolute bottom-5 left-1/2 transform -translate-x-1/2 z-20 p-3 bg-black bg-opacity-75 rounded-lg shadow-lg max-w-[90%]">
                            <p className="text-sm text-center text-gray-100">{arMessage}</p>
                        </div>
                        <Canvas style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 0 }} >
                            <XR store={xrStore}>
                                <ARContentScene
                                    onPlaceObject={handlePlaceObject}
                                    placedObjectData={placedObjectData}
                                    onObjectTap={handleObjectTap}
                                    reticleRef={reticleRef}
                                    activeHitTestSourceFromParent={manualHitTestSource} // Pasar el hitTestSource creado manualmente
                                />
                            </XR>
                        </Canvas>
                    </>
                )}
            </main>
        </div>
    );
}

export default function PlayPage() {
    return (
        <ProtectedRoute>
            <JugarContent />
        </ProtectedRoute>
    );
}