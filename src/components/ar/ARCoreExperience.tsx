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
    const isSessionActiveRef = useRef(false); // Para rastrear el estado de la sesión XR en el renderer

    // 1. Configurar el renderer para la sesión XR
    useEffect(() => {
        const currentSession = activeSession;
        let endedGracefully = false;
        isSessionActiveRef.current = false;


        console.log("ARCoreExperience: Preparando para configurar sesión en renderer.");
        gl.xr.enabled = true;

        // **** INTENTO DE CORRECCIÓN PRINCIPAL ****
        // Establecer el tipo de espacio de referencia ANTES de setSession,
        // si la sesión lo soporta (lo cual vimos que sí en enabledFeatures)
        // Esta es la parte más delicada. El WebXRManager de Three.js tiene su propia lógica.
        // Si 'local-floor' está en enabledFeatures, el WebXRManager debería poder usarlo.
        // El error sugiere que cuando setSession LO INTENTA, falla.
        // No hay una forma directa de "decirle" a setSession qué referenceSpace usar si no es
        // a través de `setReferenceSpaceType` ANTES, o confiando en su default.
        // Lo que haremos es NO llamar a setReferenceSpaceType y confiar en el default de setSession,
        // PERO asegurar que la sesión que pasamos esté lo más "limpia" y correctamente configurada posible.
        // El error que vimos indica que el problema es cuando `setSession` internamente llama a `requestReferenceSpace`.

        const setupSession = async () => {
            try {
                // No llamamos a gl.xr.setReferenceSpaceType() aquí.
                // Dejamos que setSession intente usar 'local-floor' o 'bounded-floor'
                // que están en `enabledFeatures`.
                await gl.xr.setSession(currentSession);
                if (endedGracefully) return;

                console.log("ARCoreExperience: Sesión XR establecida en renderer exitosamente.");
                isSessionActiveRef.current = true;

                const currentRefSpace = gl.xr.getReferenceSpace();
                if (!currentRefSpace) {
                    console.error("ARCoreExperience: gl.xr.getReferenceSpace() es null DESPUÉS de setSession. ¡Esto no debería pasar si setSession tuvo éxito! Saliendo.");
                    onExit();
                    return;
                }
                console.log("ARCoreExperience: Espacio de referencia del renderer post-setSession obtenido.");
                // El tipo exacto se puede inspeccionar en el objeto currentRefSpace si es necesario,
                // pero el hecho de que exista es lo importante.

            } catch (err) {
                if (endedGracefully) return;
                console.error("ARCoreExperience: Error FATAL al llamar a gl.xr.setSession(currentSession):", err);
                onExit();
            }
        };

        setupSession();

        const onSessionEndCleanup = () => {
            if (endedGracefully) return;
            endedGracefully = true;
            isSessionActiveRef.current = false;
            console.log("ARCoreExperience: Limpiando por evento 'end' de la sesión.");
            // Cancelar el bucle de animación si está activo
            if (animationFrameIdRef.current !== null) {
                if (currentSession && typeof currentSession.cancelAnimationFrame === 'function') {
                    try { currentSession.cancelAnimationFrame(animationFrameIdRef.current); } catch(e) { console.warn("ARCoreExperience: Error cancelando animationFrameIdRef:", e); }
                }
                animationFrameIdRef.current = null;
            }
            // Cancelar el hit test source si existe
            if (hitTestSourceRef.current && typeof hitTestSourceRef.current.cancel === 'function') {
                hitTestSourceRef.current.cancel();
            }
            hitTestSourceRef.current = null;
            setHitTestSourceRequested(false); // Permitir re-solicitar si se reingresa

            // Desvincular la sesión del renderer
            if (gl.xr.getSession() === currentSession) {
                gl.xr.setSession(null).catch(e => console.warn("ARCoreExperience: Advertencia al limpiar sesión del renderer:", e));
            }
            onExit(); // Notificar a la página padre
        };
        currentSession.addEventListener('end', onSessionEndCleanup);

        return () => {
            console.log("ARCoreExperience: Desmontando ARScene. endedGracefully:", endedGracefully);
            currentSession.removeEventListener('end', onSessionEndCleanup);
            if (!endedGracefully) { // Si el componente se desmonta antes de que 'end' se dispare
                onSessionEndCleanup(); // Ejecutar la limpieza manualmente
            }
        };
    }, [activeSession, gl.xr, onExit]);


    // 2. Solicitar Hit Test Source
    useEffect(() => {
        if (isSessionActiveRef.current && activeSession && !hitTestSourceRef.current && !hitTestSourceRequested) {
            const requestSource = async () => {
                setHitTestSourceRequested(true);
                try {
                    const viewerReferenceSpace = await activeSession.requestReferenceSpace('viewer');
                    console.log("ARCoreExperience: 'viewer' reference space obtenido para hit-test source.");

                    if (typeof activeSession.requestHitTestSource === 'function') {
                        const source = await activeSession.requestHitTestSource({ space: viewerReferenceSpace });
                        if (source) {
                            hitTestSourceRef.current = source;
                            console.log("ARCoreExperience: Hit test source ('viewer') obtenido y almacenado.");
                        } else {
                            console.warn("ARCoreExperience: requestHitTestSource con 'viewer' resolvió a undefined.");
                            setHitTestSourceRequested(false); // Permitir re-intento
                        }
                    } else {
                        console.error("ARCoreExperience: activeSession.requestHitTestSource no es una función.");
                        setHitTestSourceRequested(false);
                    }
                } catch (error) {
                    console.error("ARCoreExperience: Error al obtener hit test source con 'viewer':", error);
                    // Si 'viewer' falla, es un problema con las features habilitadas o el soporte del dispositivo.
                    // Tu log de `enabledFeatures` incluía 'viewer', así que esto debería funcionar.
                    setHitTestSourceRequested(false);
                }
            };
            requestSource();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isSessionActiveRef.current, activeSession, hitTestSourceRequested]); // Usar isSessionActiveRef


    // 3. Bucle de renderizado (requestAnimationFrame)
    useEffect(() => {
        const currentSession = activeSession; // Capturar para el closure
        if (!isSessionActiveRef.current || !currentSession) {
            setIsReticleVisible(false);
            return;
        }

        const onXRFrame = (time: DOMHighResTimeStamp, frame: XRFrame) => {
            animationFrameIdRef.current = currentSession.requestAnimationFrame(onXRFrame); // Solicitar el siguiente frame

            if (!hitTestSourceRef.current) {
                setIsReticleVisible(false);
                return;
            }

            const referenceSpace = gl.xr.getReferenceSpace(); // Este debería ser el 'local-floor'
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
                    try { currentSession.cancelAnimationFrame(animationFrameIdRef.current); } catch (e) { console.warn("ARCoreExperience: Error cancelando animationFrameIdRef:", e); }
                }
                animationFrameIdRef.current = null;
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [gl.xr, activeSession, hitTestSourceRef.current]); // Re-ejecutar si hitTestSourceRef.current cambia


    // 4. Manejar evento 'select'
    const handlePlaceObject = useCallback(() => {
        if (isReticleVisible && reticleMatrixRef.current && isSessionActiveRef.current) {
            const newId = THREE.MathUtils.generateUUID();
            setPlacedObjects(prev => [...prev, {
                id: newId,
                matrix: reticleMatrixRef.current!.clone(),
                qrData: qrCodeData,
            }]);
            console.log(`ARCoreExperience: Objeto colocado ID: ${newId}`);
        }
    }, [isReticleVisible, qrCodeData]);

    useEffect(() => {
        const currentSession = activeSession;
        if (currentSession && isSessionActiveRef.current) {
            currentSession.addEventListener('select', handlePlaceObject);
            return () => {
                currentSession.removeEventListener('select', handlePlaceObject);
            };
        }
    }, [activeSession, handlePlaceObject]); // Ya no depende de gl.xr.isPresenting, sino de isSessionActiveRef

    // Renderizado de la escena
    if (!isSessionActiveRef.current) {
        // No renderizar nada o un loader si la sesión no está activa en el renderer.
        // Esto ayuda a evitar que Three.js intente renderizar antes de que XR esté listo.
        return null;
    }

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
                        // Considerar terminar la sesión AR aquí para una mejor UX
                        // if (activeSession && activeSession.ended === false) {
                        //   activeSession.end().catch(console.warn);
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
            gl={{ antialias: true, alpha: true }} // alpha: true es crucial
            style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 1 }}
            // La cámara y el bucle de renderizado son manejados por el WebXRManager de Three.js
            // cuando una sesión XR está activa.
        >
            <ARScene activeSession={activeSession} qrCodeData={qrCodeData} onExit={onExit} />
        </Canvas>
    );
};

export default ARCoreExperience;