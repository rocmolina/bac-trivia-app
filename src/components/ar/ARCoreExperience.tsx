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
            reticleRef.current.visible = !!(visible && matrix);
            if (visible && matrix) {
                reticleRef.current.matrix.copy(matrix);
            }
        }
    }, [visible, matrix]);

    return (
        <mesh ref={reticleRef} matrixAutoUpdate={false} visible={false} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.05, 0.075, 32]} />
            <meshBasicMaterial color="white" transparent={true} opacity={0.75} depthTest={false} />
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
    const [initialColor] = useState(() => new THREE.Color(0xffffff * Math.random()));

    useEffect(() => {
        if (meshRef.current && matrix) {
            meshRef.current.matrix.copy(matrix);
        }
    }, [matrix]);

    return (
        <mesh
            ref={meshRef}
            matrixAutoUpdate={false}
            onClick={onSelect}
            onPointerOver={(e) => { e.stopPropagation(); setIsHovered(true); }}
            onPointerOut={(e) => { e.stopPropagation(); setIsHovered(false);}}
            scale={isHovered ? 1.2 : 1}
        >
            <boxGeometry args={[0.1, 0.1, 0.1]} />
            <meshStandardMaterial color={isHovered ? 'hotpink' : initialColor} />
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

    const reticleMatrixRef = useRef<THREE.Matrix4 | null>(new THREE.Matrix4());
    const [isReticleVisible, setIsReticleVisible] = useState(false);

    const [placedObjects, setPlacedObjects] = useState<{id: string, matrix: THREE.Matrix4, qrData: string}[]>([]);
    const animationFrameIdRef = useRef<number | null>(null);

    // 1. Configurar el renderer para la sesión XR
    useEffect(() => {
        const currentSession = activeSession;
        let endedGracefully = false;

        gl.xr.enabled = true; // Asegurar que XR esté habilitado en el renderer

        gl.xr.setSession(currentSession)
            .then(() => {
                if (endedGracefully) return;
                console.log("ARCoreExperience: Sesión XR establecida en renderer.");
                const currentRefSpace = gl.xr.getReferenceSpace();
                if (!currentRefSpace) {
                    console.error("ARCoreExperience: gl.xr.getReferenceSpace() es null DESPUÉS de setSession. Saliendo.");
                    onExit();
                    return;
                }
                console.log("ARCoreExperience: Espacio de referencia del renderer obtenido post-setSession.");
            })
            .catch(err => {
                if (endedGracefully) return;
                console.error("ARCoreExperience: Error FATAL al llamar a gl.xr.setSession:", err);
                onExit();
            });

        const onSessionEndCleanup = () => {
            if (endedGracefully) return;
            endedGracefully = true;
            console.log("ARCoreExperience: Limpiando por evento 'end' de la sesión.");
            if (animationFrameIdRef.current !== null) {
                if (currentSession && typeof currentSession.cancelAnimationFrame === 'function') {
                    try { currentSession.cancelAnimationFrame(animationFrameIdRef.current); } catch(e) { console.warn("ARCoreExperience: Error cancelando animationFrame:", e); }
                }
                animationFrameIdRef.current = null;
            }
            if (hitTestSourceRef.current && typeof hitTestSourceRef.current.cancel === 'function') {
                hitTestSourceRef.current.cancel();
            }
            hitTestSourceRef.current = null;
            setHitTestSourceRequested(false);
            // Solo intentar desvincular la sesión del renderer si todavía es la activa
            if (gl.xr.getSession() === currentSession) {
                gl.xr.setSession(null).catch(console.warn);
            }
            onExit();
        };
        currentSession.addEventListener('end', onSessionEndCleanup);

        return () => {
            currentSession.removeEventListener('end', onSessionEndCleanup);
            if (!endedGracefully && gl.xr.getSession() === currentSession) {
                if (hitTestSourceRef.current && typeof hitTestSourceRef.current.cancel === 'function') {
                    hitTestSourceRef.current.cancel();
                    hitTestSourceRef.current = null;
                }
                gl.xr.setSession(null).catch(console.warn);
            }
        };
    }, [activeSession, gl.xr, onExit]);


    // 2. Solicitar Hit Test Source
    useEffect(() => {
        // Solo solicitar si la sesión XR está activa en el renderer (gl.xr.isPresenting)
        // y si tenemos una sesión activa y aún no se ha solicitado/obtenido el hitTestSource.
        if (gl.xr.isPresenting && activeSession && !hitTestSourceRef.current && !hitTestSourceRequested) {
            const requestSource = async () => {
                setHitTestSourceRequested(true); // Marcar como solicitado para evitar múltiples intentos
                try {
                    // 'viewer' es para el origen del rayo, desde la perspectiva del dispositivo.
                    const viewerReferenceSpace = await activeSession.requestReferenceSpace('viewer');
                    console.log("ARCoreExperience: 'viewer' reference space obtenido para hit-test source.");

                    if (typeof activeSession.requestHitTestSource === 'function') {
                        const source = await activeSession.requestHitTestSource({ space: viewerReferenceSpace });
                        if (source) {
                            hitTestSourceRef.current = source;
                            console.log("ARCoreExperience: Hit test source ('viewer') obtenido y almacenado.");
                        } else {
                            console.warn("ARCoreExperience: requestHitTestSource con 'viewer' resolvió a undefined.");
                            // No llamar a onExit aquí, podría ser recuperable o el hit-test no es estrictamente fatal para la sesión base
                        }
                    } else {
                        console.error("ARCoreExperience: activeSession.requestHitTestSource no es una función.");
                    }
                } catch (error) {
                    console.error("ARCoreExperience: Error al obtener hit test source con 'viewer':", error);
                    // Si esto falla, el hit-testing no funcionará. Podríamos notificar al usuario o salir.
                    // onExit(); // Considerar si esto debe ser fatal
                }
            };
            requestSource();
        } else if (!gl.xr.isPresenting && hitTestSourceRef.current) {
            // Si salimos de AR, limpiar el hitTestSource
            if (typeof hitTestSourceRef.current.cancel === 'function') {
                hitTestSourceRef.current.cancel();
            }
            hitTestSourceRef.current = null;
            setHitTestSourceRequested(false);
        }
    }, [gl.xr.isPresenting, activeSession, hitTestSourceRequested]);


    // 3. Bucle de renderizado (requestAnimationFrame)
    useEffect(() => {
        const currentSession = activeSession;
        if (!gl.xr.isPresenting || !currentSession ) {
            setIsReticleVisible(false);
            return;
        }

        const onXRFrame = (time: DOMHighResTimeStamp, frame: XRFrame) => {
            animationFrameIdRef.current = currentSession.requestAnimationFrame(onXRFrame);

            if (!hitTestSourceRef.current) {
                setIsReticleVisible(false);
                return;
            }

            // Este es el espacio de referencia principal de la sesión AR (debería ser 'local-floor' o similar)
            const referenceSpace = gl.xr.getReferenceSpace();
            if (!referenceSpace) {
                setIsReticleVisible(false);
                return;
            }

            const hitTestResults = frame.getHitTestResults(hitTestSourceRef.current);
            if (hitTestResults.length > 0) {
                const hit = hitTestResults[0];
                // La pose del hit debe obtenerse relativa al referenceSpace de la sesión principal
                const pose = hit.getPose(referenceSpace);
                if (pose) {
                    if (!reticleMatrixRef.current) reticleMatrixRef.current = new THREE.Matrix4();
                    reticleMatrixRef.current.fromArray(pose.transform.matrix);
                    setIsReticleVisible(true);
                } else {
                    setIsReticleVisible(false);
                }
            } else {
                setIsReticleVisible(false);
            }
        };

        animationFrameIdRef.current = currentSession.requestAnimationFrame(onXRFrame);

        return () => {
            if (animationFrameIdRef.current !== null) {
                if (currentSession && typeof currentSession.cancelAnimationFrame === 'function') {
                    try { currentSession.cancelAnimationFrame(animationFrameIdRef.current); } catch (e) { console.warn("ARCoreExperience: Error cancelando animationFrame:", e); }
                }
                animationFrameIdRef.current = null;
            }
        };
    }, [gl.xr, activeSession, hitTestSourceRequested]); // Re-ejecutar si cambia estado de presentación o la sesión o si se solicita de nuevo el hitTestSource

    // 4. Manejar evento 'select'
    const handlePlaceObject = useCallback(() => {
        if (isReticleVisible && reticleMatrixRef.current && gl.xr.isPresenting) {
            const newId = THREE.MathUtils.generateUUID();
            setPlacedObjects(prev => [...prev, {
                id: newId,
                matrix: reticleMatrixRef.current!.clone(),
                qrData: qrCodeData,
            }]);
        }
    }, [isReticleVisible, qrCodeData, gl.xr.isPresenting]);

    useEffect(() => {
        const currentSession = activeSession;
        if (currentSession && gl.xr.isPresenting) {
            currentSession.addEventListener('select', handlePlaceObject);
            return () => {
                currentSession.removeEventListener('select', handlePlaceObject);
            };
        }
    }, [activeSession, handlePlaceObject, gl.xr.isPresenting]);

    return (
        <>
            <ambientLight intensity={0.7} />
            <directionalLight position={[1, 3, 2]} intensity={1.0} castShadow={true} />
            <Reticle visible={isReticleVisible} matrix={reticleMatrixRef.current} />
            {placedObjects.map(obj => (
                <PlacedObject
                    key={obj.id}
                    matrix={obj.matrix}
                    onSelect={() => {
                        router.push(`/trivia?qrCodeData=${encodeURIComponent(obj.qrData)}`);
                        // Considerar si se debe salir de AR después de la selección
                        // activeSession.end().catch(console.warn); // O llamar a onExit()
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