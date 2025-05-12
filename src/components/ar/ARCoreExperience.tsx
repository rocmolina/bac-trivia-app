// src/components/ar/ARCoreExperience.tsx
'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useRouter } from 'next/navigation';

// --- Componente para la Retícula ---
interface ReticleProps {
    visible: boolean;
    matrix: THREE.Matrix4 | null;
}
const Reticle: React.FC<ReticleProps> = ({ visible, matrix }) => {
    const reticleRef = useRef<THREE.Mesh>(null);
    useEffect(() => {
        if (reticleRef.current) {
            const isActuallyVisible = !!(visible && matrix);
            if (reticleRef.current.visible !== isActuallyVisible) {
                reticleRef.current.visible = isActuallyVisible;
            }
            if (isActuallyVisible && matrix) { // Solo aplicar matriz si es visible y la matriz existe
                reticleRef.current.matrix.copy(matrix);
            }
        }
    }, [visible, matrix]);

    return (
        <mesh ref={reticleRef} matrixAutoUpdate={false} visible={false} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.05, 0.075, 32]} />
            <meshBasicMaterial color="white" transparent={true} opacity={0.85} depthTest={false} />
        </mesh>
    );
};

// --- Componente para el Objeto Colocado ---
interface PlacedObjectProps {
    matrix: THREE.Matrix4;
    onSelect: () => void;
}
const PlacedObject: React.FC<PlacedObjectProps> = ({ matrix, onSelect }) => {
    const meshRef = useRef<THREE.Mesh>(null!);
    const [isHovered, setIsHovered] = useState(false);
    const [initialColor] = useState(() => new THREE.Color().setHex(Math.random() * 0xffffff));

    useEffect(() => {
        if (meshRef.current && matrix) {
            meshRef.current.matrix.copy(matrix);
        }
    }, [matrix]);

    return (
        <mesh
            ref={meshRef}
            matrixAutoUpdate={false}
            onClick={(event) => {
                event.stopPropagation();
                onSelect();
            }}
            onPointerOver={(e) => { e.stopPropagation(); setIsHovered(true); }}
            onPointerOut={(e) => { e.stopPropagation(); setIsHovered(false);}}
            scale={isHovered ? 1.25 : 1}
        >
            <boxGeometry args={[0.1, 0.1, 0.1]} />
            <meshStandardMaterial roughness={0.7} metalness={0.3} color={isHovered ? 0xff00ff : initialColor} />
        </mesh>
    );
};

// --- Escena Principal de AR ---
interface ARSceneProps {
    activeSession: XRSession;
    qrCodeData: string;
    onExit: () => void;
}
const ARScene: React.FC<ARSceneProps> = ({ activeSession, qrCodeData, onExit }) => {
    const router = useRouter();
    const { gl } = useThree();

    const hitTestSourceRef = useRef<XRHitTestSource | null>(null);
    const [hitTestSourceRequested, setHitTestSourceRequested] = useState(false);

    const reticleMatrixRef = useRef<THREE.Matrix4 | null>(null); // Puede ser null si no hay hit
    const [isReticleVisible, setIsReticleVisible] = useState(false);

    const [placedObjects, setPlacedObjects] = useState<{id: string, matrix: THREE.Matrix4, qrData: string}[]>([]);
    const animationFrameIdRef = useRef<number | null>(null);
    const isSessionEndingRef = useRef(false);
    const xrFrameRef = useRef<XRFrame | null>(null); // Para acceder al frame en el callback de select

    useEffect(() => {
        const currentSession = activeSession;
        isSessionEndingRef.current = false;
        console.log("ARScene: Montado. Preparando sesión en renderer.");
        gl.xr.enabled = true;

        gl.xr.setSession(currentSession)
            .then(() => {
                if (isSessionEndingRef.current) return;
                console.log("ARScene: Sesión XR establecida en renderer OK.");
            })
            .catch(err => {
                if (isSessionEndingRef.current) return;
                console.error("ARScene: Error FATAL en gl.xr.setSession:", err);
                if (!isSessionEndingRef.current) onExit();
            });

        const onSessionEndCleanup = () => {
            if (isSessionEndingRef.current) return;
            isSessionEndingRef.current = true;
            console.log("ARScene: Evento 'end' de sesión detectado. Limpiando...");
            if (animationFrameIdRef.current !== null) {
                if (currentSession?.cancelAnimationFrame) { // Verificar si currentSession aún es válida
                    try {currentSession.cancelAnimationFrame(animationFrameIdRef.current);} catch(e) { console.warn("ARScene: Error cancelando animationFrameIdRef:", e); }
                }
                animationFrameIdRef.current = null;
            }
            if (hitTestSourceRef.current?.cancel) hitTestSourceRef.current.cancel();
            hitTestSourceRef.current = null;
            setHitTestSourceRequested(false);
            if (gl.xr.getSession() === currentSession) {
                gl.xr.setSession(null).then(()=>{}).catch(e => { console.error("ARScene: Error al limpiar sesión XR:", e); });
            }
            onExit();
        };
        currentSession.addEventListener('end', onSessionEndCleanup);

        return () => {
            console.log("ARScene: Desmontando. Limpieza si es necesario.");
            currentSession.removeEventListener('end', onSessionEndCleanup);
            if (!isSessionEndingRef.current) {
                onSessionEndCleanup(); // Forzar limpieza si 'end' no se disparó
            }
        };
    }, [activeSession, gl.xr, onExit]);

    useEffect(() => {
        if (gl.xr.isPresenting && activeSession && !hitTestSourceRef.current && !hitTestSourceRequested) {
            const requestSource = async () => {
                setHitTestSourceRequested(true);
                try {
                    console.log("ARScene: Solicitando 'viewer' reference space para hit-test source...");
                    const viewerReferenceSpace = await activeSession.requestReferenceSpace('viewer');
                    if (isSessionEndingRef.current) return;
                    console.log("ARScene: 'viewer' reference space OK.");

                    if (typeof activeSession.requestHitTestSource === 'function') {
                        console.log("ARScene: Solicitando hit-test source...");
                        const source = await activeSession.requestHitTestSource({ space: viewerReferenceSpace });
                        if (isSessionEndingRef.current) { if(source?.cancel) source.cancel(); return; }

                        if (source) {
                            hitTestSourceRef.current = source;
                            console.log("ARScene: Hit test source OBTENIDO y almacenado.");
                        } else {
                            console.warn("ARScene: requestHitTestSource con 'viewer' resolvió a undefined.");
                            setHitTestSourceRequested(false);
                        }
                    } else {
                        console.error("ARScene: activeSession.requestHitTestSource no es una función.");
                        setHitTestSourceRequested(false);
                    }
                } catch (error) {
                    if (isSessionEndingRef.current) return;
                    console.error("ARScene: Error al obtener hit test source con 'viewer':", error);
                    setHitTestSourceRequested(false); // Permitir reintentos si es apropiado
                }
            };
            requestSource();
        } else if (!gl.xr.isPresenting && hitTestSourceRef.current) {
            console.log("ARScene: Saliendo de AR, cancelando hitTestSource.");
            if (typeof hitTestSourceRef.current.cancel === 'function') {
                hitTestSourceRef.current.cancel();
            }
            hitTestSourceRef.current = null;
            setHitTestSourceRequested(false);
        }
    }, [gl.xr.isPresenting, activeSession, hitTestSourceRequested]);


    useEffect(() => {
        const currentSession = activeSession;
        if (!gl.xr.isPresenting || !currentSession) {
            if(isReticleVisible) setIsReticleVisible(false); // Ocultar retícula si no estamos en AR
            return;
        }
        console.log("ARScene: Iniciando bucle onXRFrame. HitTestSource:", !!hitTestSourceRef.current);

        const onXRFrame = (time: DOMHighResTimeStamp, frame: XRFrame) => {
            xrFrameRef.current = frame; // Almacenar el frame actual
            animationFrameIdRef.current = currentSession.requestAnimationFrame(onXRFrame);
            if (isSessionEndingRef.current) {
                if (animationFrameIdRef.current !== null) {
                    try{currentSession.cancelAnimationFrame(animationFrameIdRef.current);}catch(e) { console.warn("ARScene: Error cancelando animationFrameIdRef:", e); }
                    animationFrameIdRef.current = null;
                }
                return;
            }

            if (!hitTestSourceRef.current) {
                // console.log("ARScene: onXRFrame - No hitTestSourceRef.current"); // Puede ser verboso
                if(isReticleVisible) setIsReticleVisible(false);
                return;
            }

            const referenceSpace = gl.xr.getReferenceSpace();
            if (!referenceSpace) {
                // console.log("ARScene: onXRFrame - No referenceSpace from gl.xr");
                if(isReticleVisible) setIsReticleVisible(false);
                return;
            }

            const hitTestResults = frame.getHitTestResults(hitTestSourceRef.current);
            if (hitTestResults.length > 0) {
                const hit = hitTestResults[0];
                const pose = hit.getPose(referenceSpace);
                if (pose) {
                    if (!reticleMatrixRef.current) reticleMatrixRef.current = new THREE.Matrix4();
                    reticleMatrixRef.current.fromArray(pose.transform.matrix);
                    if(!isReticleVisible) setIsReticleVisible(true);
                } else {
                    if(isReticleVisible) setIsReticleVisible(false);
                }
            } else {
                if(isReticleVisible) setIsReticleVisible(false);
            }
        };

        animationFrameIdRef.current = currentSession.requestAnimationFrame(onXRFrame);

        return () => {
            console.log("ARScene: Limpiando bucle onXRFrame (useEffect cleanup).");
            if (animationFrameIdRef.current !== null) {
                if (currentSession && typeof currentSession.cancelAnimationFrame === 'function') {
                    try { currentSession.cancelAnimationFrame(animationFrameIdRef.current); } catch (e) { console.warn("ARScene: Error cancelando animationFrameIdRef:", e); }
                }
                animationFrameIdRef.current = null;
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [gl.xr.isPresenting, activeSession, hitTestSourceRef.current]); // Dependencia de hitTestSourceRef.current


    const handlePlaceObject = useCallback((event?: XRSessionEvent | XRInputSourceEvent) => {
        // El evento 'select' de la sesión es la forma más directa.
        // El objeto 'event' puede dar información sobre la fuente de entrada si es necesario.
        console.log("ARScene: handlePlaceObject - Evento 'select' detectado. Evento:", event);
        console.log("ARScene: Estado actual - isReticleVisible:", isReticleVisible, "reticleMatrixRef.current:", !!reticleMatrixRef.current, "gl.xr.isPresenting:", gl.xr.isPresenting);

        if (isReticleVisible && reticleMatrixRef.current && gl.xr.isPresenting) {
            const newId = THREE.MathUtils.generateUUID();
            const newObjectMatrix = reticleMatrixRef.current.clone();
            setPlacedObjects(prev => [...prev, {
                id: newId,
                matrix: newObjectMatrix,
                qrData: qrCodeData,
            }]);
            console.log(`ARScene: Objeto colocado ID: ${newId} con qrData: ${qrCodeData}. Total objetos: ${placedObjects.length + 1}`);
        } else {
            console.warn("ARScene: Condiciones para colocar objeto NO cumplidas.");
            if (!isReticleVisible) console.warn("ARScene: Causa: Retícula no visible.");
            if (!reticleMatrixRef.current) console.warn("ARScene: Causa: Matriz de retícula no disponible.");
            if (!gl.xr.isPresenting) console.warn("ARScene: Causa: No se está presentando en XR.");
        }
    }, [isReticleVisible, qrCodeData, gl.xr.isPresenting, placedObjects.length]); // reticleMatrixRef no necesita ser dep, pero isReticleVisible sí

    useEffect(() => {
        const currentSession = activeSession;
        if (currentSession && gl.xr.isPresenting) {
            console.log("ARScene: Añadiendo listener para 'select' a la sesión.");
            // El callback para 'select' no necesita acceso directo al XRFrame,
            // la retícula ya se actualiza por el bucle onXRFrame.
            currentSession.addEventListener('select', handlePlaceObject);
            return () => {
                console.log("ARScene: Removiendo listener para 'select' de la sesión.");
                currentSession.removeEventListener('select', handlePlaceObject);
            };
        }
    }, [activeSession, handlePlaceObject, gl.xr.isPresenting]);

    if (!gl.xr.isPresenting) {
        console.log("ARScene: No se está presentando en XR, renderizando null.");
        return null;
    }

    return (
        <>
            <ambientLight intensity={0.8} />
            <directionalLight position={[1, 4, 2.5]} intensity={1.2} castShadow={true} />
            <Reticle visible={isReticleVisible} matrix={reticleMatrixRef.current} />
            {placedObjects.map(obj => (
                <PlacedObject
                    key={obj.id}
                    matrix={obj.matrix}
                    onSelect={() => {
                        router.push(`/trivia?qrCodeData=${encodeURIComponent(obj.qrData)}`);
                    }}
                />
            ))}
        </>
    );
};

interface ARCoreExperienceProps {
    activeSession: XRSession;
    qrCodeData: string;
    onExit: () => void;
}
const ARCoreExperience: React.FC<ARCoreExperienceProps> = ({ activeSession, qrCodeData, onExit }) => {
    return (
        <Canvas
            gl={{ antialias: true, alpha: true }}
            style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 1 }}
        >
            <ARScene activeSession={activeSession} qrCodeData={qrCodeData} onExit={onExit} />
        </Canvas>
    );
};

export default ARCoreExperience;