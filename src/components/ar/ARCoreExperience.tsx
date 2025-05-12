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
                reticleRef.current.matrix.identity(); // Asegurar que partimos de una identidad
                reticleRef.current.applyMatrix4(matrix); // Aplicar la nueva matriz
            }
        }
    }, [visible, matrix]);

    return (
        <mesh ref={reticleRef} matrixAutoUpdate={false} visible={false} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.05, 0.075, 32]} /> {/* Radio interior, radio exterior, segmentos */}
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
            meshRef.current.matrix.copy(matrix); // Copiar la matriz de transformación completa
        }
    }, [matrix]);

    return (
        <mesh
            ref={meshRef}
            matrixAutoUpdate={false} // La matriz se establece desde el hit
            onClick={(event) => { // Manejar click de R3F que se traduce del 'select' en XR
                event.stopPropagation(); // Prevenir que el 'select' de la sesión se dispare si no queremos
                onSelect();
            }}
            onPointerOver={(e) => { e.stopPropagation(); setIsHovered(true); }}
            onPointerOut={(e) => { e.stopPropagation(); setIsHovered(false);}}
            scale={isHovered ? 1.25 : 1} // Aumentar un poco más en hover
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

    const reticleMatrixRef = useRef<THREE.Matrix4 | null>(null);
    const [isReticleVisible, setIsReticleVisible] = useState(false);

    const [placedObjects, setPlacedObjects] = useState<{id: string, matrix: THREE.Matrix4, qrData: string}[]>([]);
    const animationFrameIdRef = useRef<number | null>(null);
    const isSessionEndingRef = useRef(false);

    // 1. Configurar el renderer para la sesión XR
    useEffect(() => {
        const currentSession = activeSession;
        isSessionEndingRef.current = false;

        console.log("ARScene: useEffect[activeSession] - Preparando para configurar sesión en renderer.");
        gl.xr.enabled = true;

        gl.xr.setSession(currentSession)
            .then(() => {
                if (isSessionEndingRef.current) return;
                console.log("ARScene: Sesión XR establecida en renderer exitosamente.");
                // No necesitamos hacer nada con getReferenceSpace aquí, se usará en el loop de frame.
            })
            .catch(err => {
                if (isSessionEndingRef.current) return;
                console.error("ARScene: Error FATAL al llamar a gl.xr.setSession(currentSession):", err);
                if (!isSessionEndingRef.current) onExit();
            });

        const onSessionEndCleanup = () => {
            if (isSessionEndingRef.current) return;
            isSessionEndingRef.current = true;
            console.log("ARScene: Limpiando por evento 'end' de la sesión.");
            if (animationFrameIdRef.current !== null) {
                if (currentSession && typeof currentSession.cancelAnimationFrame === 'function') {
                    try { currentSession.cancelAnimationFrame(animationFrameIdRef.current); } catch(e) { console.warn("ARScene: Error al cancelar animationFrameIdRef:", e); }
                }
                animationFrameIdRef.current = null;
            }
            if (hitTestSourceRef.current && typeof hitTestSourceRef.current.cancel === 'function') {
                hitTestSourceRef.current.cancel();
            }
            hitTestSourceRef.current = null;
            setHitTestSourceRequested(false);
            if (gl.xr.getSession() === currentSession) {
                gl.xr.setSession(null).then(()=>{}).catch(e => console.warn("ARScene: Advertencia al limpiar sesión del renderer en 'end':", e));
            }
            onExit();
        };
        currentSession.addEventListener('end', onSessionEndCleanup);

        return () => {
            console.log("ARScene: Desmontando. Llamando a onSessionEndCleanup si es necesario.");
            currentSession.removeEventListener('end', onSessionEndCleanup);
            if (!isSessionEndingRef.current) {
                onSessionEndCleanup();
            }
        };
    }, [activeSession, gl.xr, onExit]);


    // 2. Solicitar Hit Test Source
    useEffect(() => {
        if (gl.xr.isPresenting && activeSession && !hitTestSourceRef.current && !hitTestSourceRequested) {
            const requestSource = async () => {
                setHitTestSourceRequested(true);
                try {
                    const viewerReferenceSpace = await activeSession.requestReferenceSpace('viewer');
                    if (isSessionEndingRef.current) return; // Chequear si la sesión terminó mientras esperábamos
                    console.log("ARScene: 'viewer' reference space obtenido para hit-test source.");

                    if (typeof activeSession.requestHitTestSource === 'function') {
                        const source = await activeSession.requestHitTestSource({ space: viewerReferenceSpace });
                        if (isSessionEndingRef.current) { if(source?.cancel) source.cancel(); return; }

                        if (source) {
                            hitTestSourceRef.current = source;
                            console.log("ARScene: Hit test source ('viewer') obtenido y almacenado.");
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
                    setHitTestSourceRequested(false);
                }
            };
            requestSource();
        } else if (!gl.xr.isPresenting && hitTestSourceRef.current) {
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
        if (!gl.xr.isPresenting || !currentSession) {
            setIsReticleVisible(false);
            return;
        }

        const onXRFrame = (time: DOMHighResTimeStamp, frame: XRFrame) => {
            animationFrameIdRef.current = currentSession.requestAnimationFrame(onXRFrame);
            if (isSessionEndingRef.current) { // Si la sesión está terminando, no hacer nada más
                if (animationFrameIdRef.current !== null) {
                    currentSession.cancelAnimationFrame(animationFrameIdRef.current);
                    animationFrameIdRef.current = null;
                }
                return;
            }

            if (!hitTestSourceRef.current) {
                setIsReticleVisible(false);
                return;
            }

            const referenceSpace = gl.xr.getReferenceSpace();
            if (!referenceSpace) {
                // console.log("ARScene: onXRFrame - No referenceSpace from gl.xr"); // Puede ser muy verboso
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
                    if(!isReticleVisible) setIsReticleVisible(true); // Solo actualizar si cambia
                } else {
                    if(isReticleVisible) setIsReticleVisible(false);
                }
            } else {
                if(isReticleVisible) setIsReticleVisible(false);
            }
        };

        animationFrameIdRef.current = currentSession.requestAnimationFrame(onXRFrame);
        console.log("ARScene: Bucle onXRFrame iniciado.");

        return () => {
            console.log("ARScene: Limpiando bucle onXRFrame.");
            if (animationFrameIdRef.current !== null) {
                if (currentSession && typeof currentSession.cancelAnimationFrame === 'function') {
                    try { currentSession.cancelAnimationFrame(animationFrameIdRef.current); } catch (e) { console.warn("ARScene: Error al cancelar animationFrameIdRef:", e); }
                }
                animationFrameIdRef.current = null;
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [gl.xr.isPresenting, activeSession, hitTestSourceRef.current]); // Dependencia clave: hitTestSourceRef.current


    // 4. Manejar evento 'select' para colocar objetos
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const handlePlaceObject = useCallback((event: Event) => { // El evento es XRSessionEvent o XRInputSourceEvent
        // El evento 'select' de la sesión es la forma más directa de capturar el tap en modo AR.
        console.log("ARScene: Evento 'select' global de la sesión detectado.");
        console.log("ARScene: Dentro de handlePlaceObject - isReticleVisible:", isReticleVisible, "reticleMatrixRef.current:", !!reticleMatrixRef.current);

        if (isReticleVisible && reticleMatrixRef.current && gl.xr.isPresenting) {
            const newId = THREE.MathUtils.generateUUID();
            const newObjectMatrix = reticleMatrixRef.current.clone();
            setPlacedObjects(prev => [...prev, {
                id: newId,
                matrix: newObjectMatrix,
                qrData: qrCodeData,
            }]);
            console.log(`ARScene: Objeto colocado ID: ${newId} con qrData: ${qrCodeData}`);
        } else {
            console.log("ARScene: Condiciones para colocar objeto NO cumplidas (retícula no visible o matriz no disponible).");
        }
    }, [isReticleVisible, qrCodeData, gl.xr.isPresenting]); // reticleMatrixRef.current no debe estar aquí

    useEffect(() => {
        const currentSession = activeSession;
        if (currentSession && gl.xr.isPresenting) {
            console.log("ARScene: Añadiendo listener para 'select' a la sesión.");
            currentSession.addEventListener('select', handlePlaceObject);
            return () => {
                console.log("ARScene: Removiendo listener para 'select' de la sesión.");
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
            <directionalLight position={[1, 4, 2.5]} intensity={1.2} castShadow={true} />
            <Reticle visible={isReticleVisible} matrix={reticleMatrixRef.current} />
            {placedObjects.map(obj => (
                <PlacedObject
                    key={obj.id}
                    matrix={obj.matrix}
                    onSelect={() => {
                        console.log(`ARScene: PlacedObject (${obj.id}) onSelect (navegando). QR: ${obj.qrData}`);
                        router.push(`/trivia?qrCodeData=${encodeURIComponent(obj.qrData)}`);
                        // Considerar terminar la sesión aquí
                        // if (activeSession && !activeSession.ended) { // ended no es una propiedad estándar
                        //    activeSession.end().catch(console.warn);
                        // }
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
            {/* Pasamos onExit para que ARScene pueda notificar a play/page.tsx si algo falla gravemente */}
            <ARScene activeSession={activeSession} qrCodeData={qrCodeData} onExit={onExit} />
        </Canvas>
    );
};

export default ARCoreExperience;