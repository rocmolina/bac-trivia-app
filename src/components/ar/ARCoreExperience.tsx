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
            if (isActuallyVisible && matrix) {
                reticleRef.current.matrix.identity();
                reticleRef.current.applyMatrix4(matrix);
            }
        }
    }, [visible, matrix]);

    return (
        <mesh ref={reticleRef} matrixAutoUpdate={false} visible={false} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.05, 0.075, 32]} />
            <meshBasicMaterial color="white" transparent={false} opacity={0.85} depthTest={false} />
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

    // Usar useState para hitTestSource para que los efectos que dependen de él se actualicen
    const [hitTestSource, setHitTestSource] = useState<XRHitTestSource | null>(null);
    const [hitTestSourceRequested, setHitTestSourceRequested] = useState(false);

    const reticleMatrixRef = useRef<THREE.Matrix4 | null>(null);
    const [isReticleVisible, setIsReticleVisible] = useState(false);

    const [placedObjects, setPlacedObjects] = useState<{id: string, matrix: THREE.Matrix4, qrData: string}[]>([]);
    const animationFrameIdRef = useRef<number | null>(null);
    const isSessionEndingRef = useRef(false);

    // 1. Configurar el renderer para la sesión XR
    useEffect(() => {
        const currentSession = activeSession;
        isSessionEndingRef.current = false;
        let isMounted = true; // Para evitar actualizaciones de estado en componente desmontado

        console.log("ARScene: useEffect[activeSession] - Preparando sesión en renderer.");
        gl.xr.enabled = true;

        gl.xr.setSession(currentSession)
            .then(() => {
                if (!isMounted || isSessionEndingRef.current) return;
                console.log("ARScene: Sesión XR establecida en renderer OK.");
            })
            .catch(err => {
                if (!isMounted || isSessionEndingRef.current) return;
                console.error("ARScene: Error FATAL en gl.xr.setSession:", err);
                if (!isSessionEndingRef.current) onExit();
            });

        const onSessionEndCleanup = () => {
            if (isSessionEndingRef.current) return;
            isSessionEndingRef.current = true;
            console.log("ARScene: Evento 'end' de sesión. Limpiando...");
            if (animationFrameIdRef.current !== null) {
                if (currentSession?.cancelAnimationFrame) {
                    try {currentSession.cancelAnimationFrame(animationFrameIdRef.current);} catch(e) { console.warn("ARScene: Error cancelAnimationFrame:", e); }
                }
                animationFrameIdRef.current = null;
            }
            if (hitTestSource?.cancel) hitTestSource.cancel(); // Usar estado aquí
            if(isMounted) setHitTestSource(null);
            if(isMounted) setHitTestSourceRequested(false);
            if (gl.xr.getSession() === currentSession) {
                gl.xr.setSession(null).then(()=>{}).catch(e => { console.warn("ARScene: Error en gl.xr.setSession(null):", e); });
            }
            onExit();
        };
        currentSession.addEventListener('end', onSessionEndCleanup);

        return () => {
            isMounted = false;
            console.log("ARScene: Desmontando. Limpieza final.");
            currentSession.removeEventListener('end', onSessionEndCleanup);
            if (!isSessionEndingRef.current) { // Forzar limpieza si 'end' no se disparó
                onSessionEndCleanup();
            }
        };
    }, [activeSession, gl.xr, onExit, hitTestSource]); // Añadido hitTestSource para el cleanup


    // 2. Solicitar Hit Test Source
    useEffect(() => {
        let isMounted = true;
        if (gl.xr.isPresenting && activeSession && !hitTestSource && !hitTestSourceRequested) {
            const requestSource = async () => {
                if(!isMounted) return;
                setHitTestSourceRequested(true);
                try {
                    console.log("ARScene: Solicitando 'viewer' reference space...");
                    const viewerReferenceSpace = await activeSession.requestReferenceSpace('viewer');
                    if (!isMounted || isSessionEndingRef.current) return;
                    console.log("ARScene: 'viewer' reference space OK.");

                    if (typeof activeSession.requestHitTestSource === 'function') {
                        console.log("ARScene: Solicitando hit-test source...");
                        const source = await activeSession.requestHitTestSource({ space: viewerReferenceSpace });
                        if (!isMounted || isSessionEndingRef.current) { if(source?.cancel) source.cancel(); return; }

                        if (source) {
                            if(isMounted) setHitTestSource(source); // <--- Usar useState
                            console.log("ARScene: Hit test source OBTENIDO y almacenado en estado.");
                        } else {
                            console.warn("ARScene: requestHitTestSource con 'viewer' resolvió a undefined.");
                            if(isMounted) setHitTestSourceRequested(false);
                        }
                    } else {
                        console.error("ARScene: activeSession.requestHitTestSource no es una función.");
                        if(isMounted) setHitTestSourceRequested(false);
                    }
                } catch (error) {
                    if (!isMounted || isSessionEndingRef.current) return;
                    console.error("ARScene: Error al obtener hit test source con 'viewer':", error);
                    if(isMounted) setHitTestSourceRequested(false);
                }
            };
            console.log("ARScene: Disparando requestSource para hit-test.");
            requestSource();
        } else if (!gl.xr.isPresenting && hitTestSource) {
            console.log("ARScene: Saliendo de AR, limpiando hitTestSource del estado.");
            if (typeof hitTestSource.cancel === 'function') {
                hitTestSource.cancel();
            }
            if(isMounted) setHitTestSource(null);
            if(isMounted) setHitTestSourceRequested(false);
        }
        return () => { isMounted = false; }
    }, [gl.xr.isPresenting, activeSession, hitTestSource, hitTestSourceRequested]);


    // 3. Bucle de renderizado (requestAnimationFrame)
    useEffect(() => {
        const currentSession = activeSession;
        if (!gl.xr.isPresenting || !currentSession || !hitTestSource) { // Depender del estado hitTestSource
            if(isReticleVisible) setIsReticleVisible(false);
            // console.log("ARScene: Bucle onXRFrame no iniciado (no present, no session, o no hitTestSource). HitTestSource:", !!hitTestSource);
            return;
        }
        console.log("ARScene: Bucle onXRFrame INICIADO. HitTestSource disponible.");

        const onXRFrame = (time: DOMHighResTimeStamp, frame: XRFrame) => {
            animationFrameIdRef.current = currentSession.requestAnimationFrame(onXRFrame);
            if (isSessionEndingRef.current) {
                if (animationFrameIdRef.current !== null) {
                    try{currentSession.cancelAnimationFrame(animationFrameIdRef.current);}catch(e) { console.warn("ARScene: Error cancelAnimationFrame:", e); }
                    animationFrameIdRef.current = null;
                }
                return;
            }

            // hitTestSource ya es el objeto del estado, no necesitamos hitTestSourceRef.current
            const referenceSpace = gl.xr.getReferenceSpace();
            if (!referenceSpace) {
                if(isReticleVisible) setIsReticleVisible(false);
                return;
            }

            const hitTestResults = frame.getHitTestResults(hitTestSource); // Usar hitTestSource del estado
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
                    try { currentSession.cancelAnimationFrame(animationFrameIdRef.current); } catch (e) { console.warn("ARScene: Error cancelAnimationFrame:", e); }
                }
                animationFrameIdRef.current = null;
            }
        };
    }, [gl.xr.isPresenting, activeSession, hitTestSource, isReticleVisible, gl.xr]); // Añadido hitTestSource e isReticleVisible


    // 4. Manejar evento 'select'
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const handlePlaceObject = useCallback((event?: Event) => {
        console.log("ARScene: handlePlaceObject llamado. Evento 'select' de sesión.");
        console.log("ARScene: Estado actual: isReticleVisible:", isReticleVisible, "reticleMatrixRef.current:", !!reticleMatrixRef.current);

        if (isReticleVisible && reticleMatrixRef.current && gl.xr.isPresenting) {
            const newId = THREE.MathUtils.generateUUID();
            const newObjectMatrix = reticleMatrixRef.current.clone();
            setPlacedObjects(prev => [...prev, {
                id: newId,
                matrix: newObjectMatrix,
                qrData: qrCodeData,
            }]);
            console.log(`ARScene: Objeto colocado! ID: ${newId}`);
        } else {
            console.warn("ARScene: Condiciones para colocar objeto NO CUMPLIDAS.");
        }
    }, [isReticleVisible, qrCodeData, gl.xr.isPresenting]);

    useEffect(() => {
        const currentSession = activeSession;
        if (currentSession && gl.xr.isPresenting) {
            console.log("ARScene: Añadiendo listener 'select' a la sesión.");
            currentSession.addEventListener('select', handlePlaceObject);
            return () => {
                console.log("ARScene: Removiendo listener 'select' de la sesión.");
                currentSession.removeEventListener('select', handlePlaceObject);
            };
        }
    }, [activeSession, handlePlaceObject, gl.xr.isPresenting]);

    if (!gl.xr.isPresenting) {
        return null;
    }

    return (
        <>
            <ambientLight intensity={0.8} />
            <directionalLight position={[1, 4, 2.5]} intensity={1.2} castShadow={false} />
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