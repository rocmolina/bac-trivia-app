// src/components/ar/ARCoreExperience.tsx
'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Canvas, useThree } from '@react-three/fiber'; // useFrame se usará indirectamente
import * as THREE from 'three';
import { useRouter } from 'next/navigation';

// --- Componente para la Retícula ---
interface ReticleProps {
    visible: boolean;
    matrix: THREE.Matrix4 | null;
}
const Reticle: React.FC<ReticleProps> = ({ visible, matrix }) => {
    const reticleRef = useRef<THREE.Mesh>(null);
    useEffect(() => { // Usar useEffect para actualizar cuando las props cambian
        if (reticleRef.current) {
            reticleRef.current.visible = !!(visible && matrix);
            if (visible && matrix) {
                reticleRef.current.matrix.copy(matrix);
                // La retícula se asume que es un anillo que debe estar plano,
                // la rotación ya está en el mesh. La matriz del hit-test la orientará.
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

    // Aplicar la matriz de transformación directamente al objeto
    // Esta matriz viene del hit-test y ya tiene la posición y orientación correctas.
    useEffect(() => {
        if (meshRef.current && matrix) {
            meshRef.current.matrix.copy(matrix); // Copiar la matriz completa
        }
    }, [matrix]);

    return (
        <mesh
            ref={meshRef}
            matrixAutoUpdate={false} // La matriz se establece desde el hit
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
    const { gl } = useThree(); // Solo necesitamos el renderer (gl)

    const hitTestSourceRef = useRef<XRHitTestSource | null>(null);
    const [hitTestSourceRequested, setHitTestSourceRequested] = useState(false);

    const reticleMatrixRef = useRef<THREE.Matrix4 | null>(new THREE.Matrix4());
    const [isReticleVisible, setIsReticleVisible] = useState(false);

    const [placedObjects, setPlacedObjects] = useState<{id: string, matrix: THREE.Matrix4, qrData: string}[]>([]);
    const animationFrameIdRef = useRef<number | null>(null);
    const localReferenceSpaceRef = useRef<XRReferenceSpace | null>(null);

    // 1. Configurar el renderer para la sesión XR y obtener el espacio de referencia local
    useEffect(() => {
        const currentSession = activeSession;
        let ended = false;

        gl.xr.enabled = true;
        gl.xr.setSession(currentSession)
            .then(async () => {
                if (ended) return;
                console.log("ARCoreExperience: Sesión XR establecida en renderer.");
                // Una vez la sesión está en el renderer, obtenemos el reference space que Three.js está usando
                // Esto es crucial. El ejemplo HTML obtiene `renderer.xr.getReferenceSpace()` en el loop.
                // Aquí, lo obtenemos una vez y lo reusamos, o lo re-obtenemos si es necesario.
                // El tipo 'local-floor' es el más común y deseado para AR de suelo.
                // Si este falla, es el núcleo del problema.
                try {
                    // Intentar obtener 'local-floor' explícitamente si es necesario
                    // o confiar en el que `gl.xr.getReferenceSpace()` devuelve por defecto.
                    const refSpace = await currentSession.requestReferenceSpace('local-floor');
                    localReferenceSpaceRef.current = refSpace;
                    console.log("ARCoreExperience: 'local-floor' reference space obtenido.", refSpace);
                } catch (refSpaceError) {
                    console.error("ARCoreExperience: Error al solicitar 'local-floor'. Intentando con el default del renderer.", refSpaceError);
                    // Si 'local-floor' falla, el `gl.xr.getReferenceSpace()` que se usa en el loop
                    // podría devolver otro tipo o ser null. Este es un punto crítico de depuración.
                    // El error que viste ("This device does not support the requested reference space type")
                    // probablemente ocurre aquí o al intentar usar un tipo específico en requestHitTestSource.
                    onExit(); // Salir si no podemos obtener un espacio de referencia base.
                }
            })
            .catch(err => {
                if (ended) return;
                console.error("ARCoreExperience: Error fatal al establecer la sesión XR en el renderer:", err);
                onExit();
            });

        const onSessionEndCleanup = () => {
            ended = true;
            console.log("ARCoreExperience: Limpiando debido a session 'end'.");
            if (animationFrameIdRef.current !== null) {
                currentSession.cancelAnimationFrame(animationFrameIdRef.current);
                animationFrameIdRef.current = null;
            }
            if (hitTestSourceRef.current?.cancel) {
                hitTestSourceRef.current.cancel();
            }
            hitTestSourceRef.current = null;
            setHitTestSourceRequested(false);
            // gl.xr.setSession(null).catch(console.warn); // Se maneja en play/page.tsx
            onExit(); // Notificar a la página padre
        };
        currentSession.addEventListener('end', onSessionEndCleanup);

        return () => {
            currentSession.removeEventListener('end', onSessionEndCleanup);
        };
    }, [activeSession, gl.xr, onExit]);


    // 2. Solicitar Hit Test Source
    useEffect(() => {
        if (gl.xr.isPresenting && activeSession && localReferenceSpaceRef.current && !hitTestSourceRef.current && !hitTestSourceRequested) {
            const requestSource = async () => {
                try {
                    // El 'viewer' space es para el origen del rayo del hit-test. Es diferente del 'local-floor'.
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
                    // No llamar a onExit aquí todavía, el hit-test podría ser opcional si el resto funciona.
                    // Pero para nuestra app es esencial.
                }
            };
            setHitTestSourceRequested(true);
            requestSource();
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

            if (!hitTestSourceRef.current) {
                setIsReticleVisible(false);
                return;
            }

            // Usar el 'local-floor' (o el que se haya obtenido) referenceSpace que almacenamos
            const currentLocalRefSpace = localReferenceSpaceRef.current;
            if (!currentLocalRefSpace) {
                setIsReticleVisible(false);
                // Intentar obtener el del renderer como fallback, aunque deberíamos tener el nuestro.
                // const fallbackRefSpace = gl.xr.getReferenceSpace();
                // if(!fallbackRefSpace) return;
                // currentLocalRefSpace = fallbackRefSpace;
                return;
            }

            const hitTestResults = frame.getHitTestResults(hitTestSourceRef.current);
            if (hitTestResults.length > 0) {
                const hit = hitTestResults[0];
                const pose = hit.getPose(currentLocalRefSpace); // ¡Usar el localReferenceSpaceRef!
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
                currentSession.cancelAnimationFrame(animationFrameIdRef.current);
                animationFrameIdRef.current = null;
            }
        };
    }, [gl.xr.isPresenting, activeSession, hitTestSourceRequested]); // Re-ejecutar si cambia el estado de presentación o la sesión

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
        if (currentSession && gl.xr.isPresenting) { // Solo añadir si está presentando
            currentSession.addEventListener('select', handlePlaceObject);
            return () => {
                currentSession.removeEventListener('select', handlePlaceObject);
            };
        }
    }, [activeSession, handlePlaceObject, gl.xr.isPresenting]);

    return (
        <>
            <ambientLight intensity={0.7} />
            <directionalLight position={[1, 3, 2]} intensity={1.0} />
            <Reticle visible={isReticleVisible} matrix={reticleMatrixRef.current} />
            {placedObjects.map(obj => (
                <PlacedObject
                    key={obj.id}
                    matrix={obj.matrix}
                    onSelect={() => {
                        router.push(`/trivia?qrCodeData=${encodeURIComponent(obj.qrData)}`);
                        // Considerar llamar a activeSession.end() aquí o a través de onExit
                        // para una transición más limpia después de seleccionar un objeto.
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
            // La cámara es manejada por XR
        >
            <ARScene activeSession={activeSession} qrCodeData={qrCodeData} onExit={onExit} />
        </Canvas>
    );
};

export default ARCoreExperience;