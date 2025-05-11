// src/components/ar/ARCoreExperience.tsx
'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useRouter } from 'next/navigation';

// --- Componente para la Retícula ---
interface ReticleProps {
    visible: boolean;
    matrix: THREE.Matrix4 | null;
}

const Reticle: React.FC<ReticleProps> = ({ visible, matrix }) => {
    const reticleRef = useRef<THREE.Mesh>(null);

    useFrame(() => { // Actualizar en cada frame
        if (reticleRef.current) {
            reticleRef.current.visible = !!(visible && matrix); // Asegurar que matrix no sea null
            if (visible && matrix) {
                reticleRef.current.matrix.copy(matrix);
            }
        }
    });

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
    const [initialColor] = useState(() => new THREE.Color(Math.random() * 0xffffff));

    // Aplicar la matriz de transformación al objeto cuando la prop matrix cambie
    useEffect(() => {
        if (meshRef.current && matrix) {
            meshRef.current.matrix.identity(); // Resetear antes de aplicar
            meshRef.current.applyMatrix4(matrix);
            meshRef.current.updateMatrixWorld(true); // Forzar actualización
        }
    }, [matrix]);


    return (
        <mesh
            ref={meshRef}
            matrixAutoUpdate={false}
            onClick={onSelect}
            onPointerOver={() => setIsHovered(true)}
            onPointerOut={() => setIsHovered(false)}
            scale={isHovered ? 1.2 : 1} // Aplicar escala en el mesh directamente
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
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { gl, scene } = useThree(); // No necesitamos la cámara de R3F aquí, XR la maneja

    const [hitTestSource, setHitTestSource] = useState<XRHitTestSource | null>(null);
    const [hitTestSourceRequested, setHitTestSourceRequested] = useState(false);

    const reticleMatrixRef = useRef<THREE.Matrix4 | null>(new THREE.Matrix4());
    const [isReticleVisible, setIsReticleVisible] = useState(false);

    const [placedObjects, setPlacedObjects] = useState<{id: string, matrix: THREE.Matrix4, qrData: string}[]>([]);
    const animationFrameIdRef = useRef<number | null>(null);

    // 1. Configurar el renderer para la sesión XR
    useEffect(() => {
        const currentSession = activeSession;
        let ended = false;

        gl.xr.enabled = true;
        // NO llamamos a gl.xr.setReferenceSpaceType aquí. Dejamos que la sesión lo maneje.

        gl.xr.setSession(currentSession)
            .then(() => {
                if (ended) return; // Si la sesión terminó mientras esperábamos
                console.log("ARCoreExperience: Sesión XR establecida en el renderer.");
            })
            .catch(err => {
                if (ended) return;
                console.error("ARCoreExperience: Error al establecer la sesión XR en el renderer:", err);
                onExit();
            });

        const onSessionEnd = () => {
            ended = true;
            console.log("ARCoreExperience: Sesión XR terminada (evento 'end' en ARScene).");
            if (hitTestSource?.cancel) {
                hitTestSource.cancel();
            }
            setHitTestSource(null);
            setHitTestSourceRequested(false);
            // gl.xr.setSession(null).catch(console.warn); // No es necesario si onExit desmonta el canvas
            onExit();
        };
        currentSession.addEventListener('end', onSessionEnd);

        return () => {
            currentSession.removeEventListener('end', onSessionEnd);
            // Si este componente se desmonta pero la sesión NO ha terminado,
            // la página padre (play/page.tsx) debería manejar el session.end().
        };
    }, [activeSession, gl.xr, hitTestSource, onExit]);


    // 2. Solicitar Hit Test Source
    useEffect(() => {
        // Asegurarse de que la sesión esté presentando antes de solicitar el hit test source
        if (gl.xr.isPresenting && activeSession && !hitTestSource && !hitTestSourceRequested) {
            const requestSource = async () => {
                try {
                    // El 'viewer' space es para el origen del rayo del hit-test
                    const viewerReferenceSpace = await activeSession.requestReferenceSpace('viewer');
                    if (typeof activeSession.requestHitTestSource === 'function') {
                        const source = await activeSession.requestHitTestSource({ space: viewerReferenceSpace });
                        if (source) {
                            setHitTestSource(source);
                            console.log("ARCoreExperience: Hit test source obtenido.");
                        } else {
                            console.warn("ARCoreExperience: requestHitTestSource resolvió a undefined.");
                            setHitTestSourceRequested(false);
                        }
                    } else {
                        console.error("ARCoreExperience: activeSession.requestHitTestSource no es una función.");
                        setHitTestSourceRequested(false); // Permitir reintentar o mostrar error
                    }
                } catch (error) {
                    console.error("ARCoreExperience: Error al obtener hit test source:", error);
                    // El error "This device does not support the requested reference space type."
                    // podría ocurrir aquí si 'viewer' no es soportado, aunque es estándar.
                    // O si 'hit-test' no se activó correctamente en requestSession.
                    setHitTestSourceRequested(false);
                    onExit(); // Salir si no podemos obtener hit-test
                }
            };
            setHitTestSourceRequested(true);
            requestSource();
        }
    }, [gl.xr.isPresenting, activeSession, hitTestSource, hitTestSourceRequested, onExit]); // Agregado onExit


    // 3. Bucle de renderizado para Hit Testing (usando el loop de Three/XR directamente)
    useEffect(() => {
        const currentSession = activeSession;
        if (!gl.xr.isPresenting || !currentSession || !hitTestSource) {
            setIsReticleVisible(false);
            return;
        }

        const onXRFrame = (time: DOMHighResTimeStamp, frame: XRFrame) => {
            animationFrameIdRef.current = currentSession.requestAnimationFrame(onXRFrame);

            if (!hitTestSource) { // Puede ser cancelado
                setIsReticleVisible(false);
                return;
            }

            // Usar el reference space que el renderer está utilizando para la sesión
            const referenceSpace = gl.xr.getReferenceSpace();
            if (!referenceSpace) {
                setIsReticleVisible(false);
                return;
            }

            const hitTestResults = frame.getHitTestResults(hitTestSource);
            if (hitTestResults.length > 0) {
                const hit = hitTestResults[0];
                // Obtener la pose relativa al referenceSpace actual del renderer
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
                currentSession.cancelAnimationFrame(animationFrameIdRef.current);
                animationFrameIdRef.current = null;
            }
        };
    }, [gl.xr, activeSession, hitTestSource]); // Dependencias importantes


    // 4. Manejar evento 'select' para colocar objetos
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const handlePlaceObject = useCallback((event: Event) => { // El evento puede ser XRInputSourceEvent
        if (isReticleVisible && reticleMatrixRef.current && gl.xr.isPresenting) {
            // Aquí puedes verificar event.inputSource si necesitas diferenciar fuentes de entrada
            const newId = THREE.MathUtils.generateUUID();
            setPlacedObjects(prev => [...prev, {
                id: newId,
                matrix: reticleMatrixRef.current!.clone(),
                qrData: qrCodeData,
            }]);
            console.log(`Objeto colocado: ${newId}, Data: ${qrCodeData}`);
        }
    }, [isReticleVisible, qrCodeData, gl.xr.isPresenting]);

    useEffect(() => {
        const currentSession = activeSession;
        if (currentSession) {
            currentSession.addEventListener('select', handlePlaceObject);
            return () => {
                currentSession.removeEventListener('select', handlePlaceObject);
            };
        }
    }, [activeSession, handlePlaceObject]);

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
                        // Considerar si se debe salir de AR después de la selección
                        // activeSession.end().catch(console.warn);
                    }}
                />
            ))}
        </>
    );
};

// --- Componente Envoltorio del Canvas ---
interface ARCoreExperienceProps {
    activeSession: XRSession;
    qrCodeData: string;
    onExit: () => void;
}

const ARCoreExperience: React.FC<ARCoreExperienceProps> = ({ activeSession, qrCodeData, onExit }) => {
    return (
        <Canvas
            // No especificar 'gl.xrCompatible' aquí. Se maneja con gl.xr.enabled.
            gl={{ antialias: true, alpha: true }}
            style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 1 }}
            // R3F maneja la cámara por defecto. En modo XR, la cámara de Three.js es actualizada por la sesión XR.
        >
            <ARScene activeSession={activeSession} qrCodeData={qrCodeData} onExit={onExit} />
        </Canvas>
    );
};

export default ARCoreExperience;