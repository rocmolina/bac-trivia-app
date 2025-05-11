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
            <meshBasicMaterial color="white" transparent opacity={0.75} depthTest={false} />
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

    useEffect(() => {
        const currentSession = activeSession;
        let endedGracefully = false;

        console.log("ARCoreExperience: Configurando sesión en renderer."); // Eliminado currentSession.mode
        gl.xr.enabled = true;

        gl.xr.setSession(currentSession)
            .then(() => {
                if (endedGracefully) return;
                console.log("ARCoreExperience: Sesión XR establecida en renderer exitosamente.");
                const currentRefSpace = gl.xr.getReferenceSpace();
                if (!currentRefSpace) {
                    console.error("ARCoreExperience: gl.xr.getReferenceSpace() es null DESPUÉS de setSession. Esto es un problema crítico.");
                    onExit();
                    return;
                }
                // No podemos acceder a .type directamente de forma fiable en todas las implementaciones.
                // El hecho de que tengamos un referenceSpace es lo importante por ahora.
                console.log("ARCoreExperience: Espacio de referencia del renderer post-setSession obtenido.");
            })
            .catch(err => {
                if (endedGracefully) return;
                console.error("ARCoreExperience: Error FATAL al llamar a gl.xr.setSession(currentSession):", err);
                onExit();
            });

        const onSessionEndCleanup = () => {
            if (endedGracefully) return;
            endedGracefully = true;
            console.log("ARCoreExperience: Limpiando debido a session 'end' (evento).");
            if (animationFrameIdRef.current !== null) {
                // Verificar si la sesión aún existe y tiene requestAnimationFrame antes de cancelar
                if (currentSession && typeof currentSession.cancelAnimationFrame === 'function') {
                    try {
                        currentSession.cancelAnimationFrame(animationFrameIdRef.current);
                    } catch(e) { console.warn("Advertencia al cancelar animationFrame en sessionEnd:", e); }
                }
                animationFrameIdRef.current = null;
            }
            if (hitTestSourceRef.current) { // Verificar si existe hitTestSourceRef.current
                if (typeof hitTestSourceRef.current.cancel === 'function') { // Verificar si el método cancel existe
                    hitTestSourceRef.current.cancel();
                }
                hitTestSourceRef.current = null;
            }
            setHitTestSourceRequested(false);
            if (gl.xr.getSession() === currentSession) { // Solo limpiar si es la misma sesión
                gl.xr.setSession(null).catch(console.warn);
            }
            onExit();
        };
        currentSession.addEventListener('end', onSessionEndCleanup);

        return () => {
            currentSession.removeEventListener('end', onSessionEndCleanup);
            if (!endedGracefully && gl.xr.getSession() === currentSession) {
                console.log("ARCoreExperience: Limpieza en desmontaje (componente), terminando sesión XR del renderer.");
                if (hitTestSourceRef.current && typeof hitTestSourceRef.current.cancel === 'function') {
                    hitTestSourceRef.current.cancel(); // Asegurar que el hit test se cancele
                    hitTestSourceRef.current = null;
                }
                gl.xr.setSession(null).catch(console.warn);
            }
        };
    }, [activeSession, gl.xr, onExit]);


    useEffect(() => {
        if (gl.xr.isPresenting && activeSession && !hitTestSourceRef.current && !hitTestSourceRequested) {
            const requestSource = async () => {
                try {
                    const viewerReferenceSpace = await activeSession.requestReferenceSpace('viewer');
                    if (typeof activeSession.requestHitTestSource === 'function') {
                        const source = await activeSession.requestHitTestSource({ space: viewerReferenceSpace });
                        if (source) {
                            hitTestSourceRef.current = source;
                            console.log("ARCoreExperience: Hit test source ('viewer') obtenido.");
                        } else {
                            console.warn("ARCoreExperience: requestHitTestSource con 'viewer' resolvió a undefined.");
                            setHitTestSourceRequested(false);
                        }
                    } else {
                        console.error("ARCoreExperience: activeSession.requestHitTestSource no es una función.");
                        setHitTestSourceRequested(false);
                    }
                } catch (error) {
                    console.error("ARCoreExperience: Error al obtener hit test source con 'viewer':", error);
                    setHitTestSourceRequested(false);
                }
            };
            setHitTestSourceRequested(true);
            requestSource();
        }
    }, [gl.xr.isPresenting, activeSession, hitTestSourceRequested]);


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

            const referenceSpace = gl.xr.getReferenceSpace();
            if (!referenceSpace) {
                setIsReticleVisible(false);
                return;
            }

            const hitTestResults = frame.getHitTestResults(hitTestSourceRef.current);
            if (hitTestResults.length > 0) {
                const hit = hitTestResults[0];
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
                    try {
                        currentSession.cancelAnimationFrame(animationFrameIdRef.current);
                    } catch (e) { console.warn("Advertencia al cancelar frame en cleanup:", e); }
                }
                animationFrameIdRef.current = null;
            }
        };
    }, [gl.xr, activeSession, hitTestSourceRequested]);


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
            <directionalLight position={[1, 3, 2]} intensity={1.0} castShadow />
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