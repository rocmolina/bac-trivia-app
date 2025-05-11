// src/components/ar/ARCoreExperience.tsx
'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { Canvas, useThree, useFrame, ThreeElements } from '@react-three/fiber';
import * as THREE from 'three';
import { useRouter } from 'next/navigation';

// --- Componente para la Retícula ---
interface ReticleProps {
    visible: boolean;
    matrix: THREE.Matrix4 | null;
}

const Reticle: React.FC<ReticleProps> = ({ visible, matrix }) => {
    const reticleRef = useRef<THREE.Mesh>(null);

    useFrame(() => {
        if (reticleRef.current) {
            reticleRef.current.visible = visible;
            if (visible && matrix) {
                reticleRef.current.matrix.copy(matrix);
            }
        }
    });

    return (
        <mesh ref={reticleRef} matrixAutoUpdate={false} visible={false} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.05, 0.075, 32]} />
            {/* Usar MeshBasicMaterial para que no necesite luces y siempre sea visible */}
            <meshBasicMaterial color="white" transparent={true} opacity={0.75} depthTest={false} />
        </mesh>
    );
};

// --- Componente para el Objeto Colocado ---
interface PlacedObjectProps {
    matrix: THREE.Matrix4;
    // qrCodeData: string; // No se usa directamente para renderizar, pero sí para la lógica de tap
    // category: string; // Para futura diferenciación visual
    onSelect: () => void;
}

const PlacedObject: React.FC<PlacedObjectProps> = ({ matrix, onSelect }) => {
    const meshRef = useRef<THREE.Mesh>(null!);
    const [isHovered, setIsHovered] = useState(false);

    // Aplicar la matriz de transformación al objeto
    // Esta matriz ya contiene posición, rotación y escala del hit-test
    useEffect(() => {
        if (meshRef.current && matrix) {
            meshRef.current.matrix.copy(matrix);
        }
    }, [matrix]);


    return (
        <mesh
            ref={meshRef}
            matrixAutoUpdate={false} // La matriz se establece una vez desde el hit
            onClick={onSelect}
            onPointerOver={() => setIsHovered(true)}
            onPointerOut={() => setIsHovered(false)}
        >
            <boxGeometry args={[0.1, 0.1, 0.1]} /> {/* Tamaño reducido para mejor proporción inicial */}
            <meshStandardMaterial color={isHovered ? 'hotpink' : 'orange'} />
        </mesh>
    );
};


// --- Escena Principal de AR ---
interface ARSceneProps {
    activeSession: XRSession; // La sesión XR activa pasada como prop
    qrCodeData: string;
    onExit: () => void; // Para notificar a la página padre que la sesión terminó o hubo error
}

const ARScene: React.FC<ARSceneProps> = ({ activeSession, qrCodeData, onExit }) => {
    const router = useRouter();
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { gl, camera, scene } = useThree(); // renderer, camera, scene de R3F

    const [hitTestSource, setHitTestSource] = useState<XRHitTestSource | null>(null);
    const [hitTestSourceRequested, setHitTestSourceRequested] = useState(false);

    const reticleMatrixRef = useRef<THREE.Matrix4 | null>(new THREE.Matrix4());
    const [isReticleVisible, setIsReticleVisible] = useState(false);

    const [placedObjects, setPlacedObjects] = useState<{id: string, matrix: THREE.Matrix4, qrData: string}[]>([]);

    // 1. Inicializar el renderer de Three.js con la sesión XR
    useEffect(() => {
        const currentSession = activeSession;
        gl.xr.enabled = true;
        gl.xr.setReferenceSpaceType('local-floor'); // Crucial para hit-testing en el suelo

        gl.xr.setSession(currentSession)
            .then(() => {
                console.log("ARCoreExperience: Sesión XR establecida en el renderer.");
            })
            .catch(err => {
                console.error("ARCoreExperience: Error al establecer la sesión XR en el renderer:", err);
                onExit(); // Notificar error para salir del modo AR
            });

        // Listener para cuando la sesión termine desde fuera (ej. usuario revoca permisos)
        const onSessionEnd = () => {
            console.log("ARCoreExperience: Sesión XR terminada (evento 'end').");
            if (hitTestSource?.cancel) { // Usar optional chaining si cancel puede no existir
                hitTestSource.cancel();
            }
            setHitTestSource(null);
            setHitTestSourceRequested(false);
            gl.xr.setSession(null).catch(console.warn); // Limpiar la sesión del renderer
            onExit();
        };
        currentSession.addEventListener('end', onSessionEnd);

        return () => {
            currentSession.removeEventListener('end', onSessionEnd);
            // No limpiar la sesión aquí si el componente se desmonta pero la sesión sigue
            // El cleanup de la sesión se maneja en play/page.tsx o por el evento 'end'
        };
    }, [activeSession, gl.xr, hitTestSource, onExit]);


    // 2. Solicitar Hit Test Source una vez que la sesión XR esté en el renderer
    useEffect(() => {
        if (gl.xr.isPresenting && activeSession && !hitTestSource && !hitTestSourceRequested) {
            const requestSource = async () => {
                try {
                    const viewerReferenceSpace = await activeSession.requestReferenceSpace('viewer');
                    // Verificar si requestHitTestSource existe antes de llamarlo
                    if (typeof activeSession.requestHitTestSource === 'function') {
                        const source = await activeSession.requestHitTestSource({ space: viewerReferenceSpace });
                        if (source) { // La promesa puede resolverse a undefined
                            setHitTestSource(source);
                            console.log("ARCoreExperience: Hit test source obtenido.");
                        } else {
                            console.warn("ARCoreExperience: requestHitTestSource resolvió a undefined.");
                            setHitTestSourceRequested(false); // Permitir reintentar o manejar el error
                        }
                    } else {
                        console.error("ARCoreExperience: activeSession.requestHitTestSource no es una función.");
                        setHitTestSourceRequested(false);
                    }
                } catch (error) {
                    console.error("ARCoreExperience: Error al obtener hit test source:", error);
                    setHitTestSourceRequested(false);
                }
            };
            setHitTestSourceRequested(true);
            requestSource();
        }
    }, [gl.xr.isPresenting, activeSession, hitTestSource, hitTestSourceRequested]);


    // 3. Bucle de renderizado para Hit Testing y actualización de la retícula
    useFrame((state, delta, xrFrame) => { // xrFrame es el XRFrame actual
        if (!xrFrame || !hitTestSource || !gl.xr.isPresenting) {
            setIsReticleVisible(false);
            return;
        }

        const referenceSpace = gl.xr.getReferenceSpace(); // Este es el 'local-floor'
        if (!referenceSpace) {
            setIsReticleVisible(false);
            return;
        }

        const hitTestResults = xrFrame.getHitTestResults(hitTestSource);

        if (hitTestResults.length > 0) {
            const hit = hitTestResults[0];
            const pose = hit.getPose(referenceSpace); // Pose relativa al referenceSpace
            if (pose) {
                reticleMatrixRef.current!.copy(new THREE.Matrix4().fromArray(pose.transform.matrix));
                setIsReticleVisible(true);
            } else {
                setIsReticleVisible(false);
            }
        } else {
            setIsReticleVisible(false);
        }
    });

    // 4. Manejar evento 'select' global de la sesión para colocar objetos
    const handlePlaceObject = useCallback(() => {
        if (isReticleVisible && reticleMatrixRef.current && gl.xr.isPresenting) {
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
        const currentSession = activeSession; // Usar la prop activeSession
        if (currentSession) {
            currentSession.addEventListener('select', handlePlaceObject);
            return () => {
                currentSession.removeEventListener('select', handlePlaceObject);
            };
        }
    }, [activeSession, handlePlaceObject]);

    return (
        <>
            {/* La cámara es manejada por WebXR. R3F adapta su cámara por defecto. */}
            <ambientLight intensity={0.8} /> {/* Reducir un poco si se ve muy brillante */}
            <directionalLight position={[1, 3, 2]} intensity={1.5} />

            <Reticle visible={isReticleVisible} matrix={reticleMatrixRef.current} />

            {placedObjects.map(obj => (
                <PlacedObject
                    key={obj.id}
                    matrix={obj.matrix}
                    onSelect={() => {
                        console.log(`Navegando a trivia con: ${obj.qrData}`);
                        router.push(`/trivia?qrCodeData=${encodeURIComponent(obj.qrData)}`);
                        // Considerar salir de AR después de seleccionar
                        // activeSession.end(); // O llamar a onExit()
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
            gl={{ // Pasamos un objeto de configuración para el WebGLRenderer
                antialias: true,
                alpha: true, // Para transparencia y ver la cámara
                // xrCompatible: true, // esta propiedad se maneja con gl.xr.enabled = true
            }}
            style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 1 }}
            // R3F <Canvas> automáticamente configura su cámara.
            // Para XR, la cámara es controlada por la sesión.
            // onCreated={(state) => { state.gl.xr.enabled = true; }} // Otra forma de habilitar XR al crear el renderer
        >
            <ARScene activeSession={activeSession} qrCodeData={qrCodeData} onExit={onExit} />
        </Canvas>
    );
};

export default ARCoreExperience;