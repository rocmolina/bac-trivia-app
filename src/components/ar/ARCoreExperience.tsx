// src/components/ar/ARCoreExperience.tsx
// BASADO EN TU ÚLTIMA VERSIÓN - AJUSTES MÍNIMOS PARA LA INTERACCIÓN DEL OBJETO
'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useRouter } from 'next/navigation';

// --- Componente Retícula (TU VERSIÓN) ---
interface ReticleProps {
    visible: boolean;
    matrix: THREE.Matrix4 | null;
}
const Reticle: React.FC<ReticleProps> = ({ visible, matrix }) => {
    const ref = useRef<THREE.Mesh>(null);

    useEffect(() => {
        if (ref.current) {
            ref.current.visible = !!(visible && matrix); // Ser explícito con el booleano
            if (ref.current.visible && matrix) {
                ref.current.matrixAutoUpdate = false;
                ref.current.matrix.copy(matrix);
            } else if (ref.current.visible && !matrix) {
                // Si es visible pero la matriz se vuelve null, ocultarlo
                ref.current.visible = false;
            }
        }
    }, [visible, matrix]);

    return (
        // Añadida rotación para que el anillo esté plano por defecto.
        // La matriz del hit-test lo orientará y posicionará correctamente.
        <mesh ref={ref} visible={false} matrixAutoUpdate={false} rotation-x={-Math.PI / 2}>
            <ringGeometry args={[0.08, 0.1, 32]} /> {/* Ajustar tamaño si es necesario */}
            <meshBasicMaterial color="lime" opacity={0.90} transparent={true} depthTest={false} />
        </mesh>
    );
};

// --- Componente Objeto Colocado (TU VERSIÓN) ---
interface PlacedObjectProps {
    matrix: THREE.Matrix4;
    onSelect: () => void; // Esta es la función que se llamará para navegar
}
const PlacedObject: React.FC<PlacedObjectProps> = ({ matrix, onSelect }) => {
    const meshRef = useRef<THREE.Mesh>(null);
    const [hovered, setHovered] = useState(false);
    const [initialColor] = useState(() => new THREE.Color().setHex(Math.random() * 0xffffff));

    useEffect(() => {
        if (meshRef.current) {
            meshRef.current.matrixAutoUpdate = false;
            meshRef.current.matrix.copy(matrix);
        }
    }, [matrix]);

    return (
        <mesh
            ref={meshRef}
            matrixAutoUpdate={false}
            onClick={(e) => {
                e.stopPropagation(); // MUY IMPORTANTE para que el click no se propague al div del overlay
                console.log("PlacedObject: onClick event handler triggered!");
                onSelect();
            }}
            onPointerOver={(e) => { e.stopPropagation(); setHovered(true); }}
            onPointerOut={(e) => { e.stopPropagation(); setHovered(false); }}
            scale={hovered ? 0.17 : 0.15} // Tamaño ajustado (si boxGeometry es [1,1,1])
        >
            <boxGeometry args={[1, 1, 1]} /> {/* Geometría unitaria */}
            <meshStandardMaterial color={hovered ? 0xff00ff : initialColor} roughness={0.5} metalness={0.3}/>
        </mesh>
    );
};

interface ARSceneProps {
    activeSession: XRSession;
    qrCodeData: string;
    onExit: () => void;
}
const ARScene: React.FC<ARSceneProps> = ({ activeSession, qrCodeData, onExit }) => {
    const router = useRouter();
    const { gl } = useThree();
    const [hitTestSource, setHitTestSource] = useState<XRHitTestSource | null>(null);
    const [referenceSpace, setReferenceSpace] = useState<XRReferenceSpace | null>(null);
    const reticleMatrix = useRef(new THREE.Matrix4()); // Usamos ref para la matriz de la retícula
    const [isReticleVisible, setIsReticleVisible] = useState(false); // Estado para la visibilidad
    const [objects, setObjects] = useState<{ id: string; matrix: THREE.Matrix4; qrData: string }[]>([]);

    // Configuración inicial y limpieza de sesión
    useEffect(() => {
        let isMounted = true;
        console.log("ARScene: Montado. Configurando sesión:", activeSession);
        gl.xr.enabled = true;
        gl.xr.setSession(activeSession)
            .then(async () => {
                if(!isMounted) return;
                console.log("ARScene: Sesión XR establecida en renderer.");
                try {
                    const refSpace = await activeSession.requestReferenceSpace('local-floor');
                    if(!isMounted) return;
                    setReferenceSpace(refSpace);
                    console.log("ARScene: 'local-floor' reference space obtenido.");
                } catch (err) {
                    console.warn("ARScene: Falló 'local-floor', intentando 'local'.", err);
                    try {
                        const refSpace = await activeSession.requestReferenceSpace('local');
                        if(!isMounted) return;
                        setReferenceSpace(refSpace);
                        console.log("ARScene: 'local' reference space obtenido.");
                    } catch (localErr) {
                        console.error("ARScene: Falló obtener cualquier reference space.", localErr);
                        if(!isMounted) return;
                        onExit();
                    }
                }
            }).catch(err => {
            if(!isMounted) return;
            console.error("ARScene: Error fatal al establecer sesión.", err);
            onExit();
        });

        const handleSessionEnd = () => {
            if(!isMounted) return;
            console.log("ARScene: Evento 'end' de XRSession.");
            if (hitTestSource?.cancel) hitTestSource.cancel();
            setHitTestSource(null);
            setReferenceSpace(null);
            onExit();
        };
        activeSession.addEventListener('end', handleSessionEnd);
        return () => {
            isMounted = false;
            console.log("ARScene: Desmontando.");
            activeSession.removeEventListener('end', handleSessionEnd);
            // La sesión es terminada por play/page.tsx a través de onExit
        };
    }, [activeSession, gl, onExit, hitTestSource]);

    // Obtener hitTestSource
    useEffect(() => {
        if (!activeSession || !referenceSpace || hitTestSource) return;
        let isEffectMounted = true;
        console.log("ARScene: Intentando obtener hitTestSource.");
        const setupHitTest = async () => {
            try {
                const viewerSpace = await activeSession.requestReferenceSpace('viewer');
                if(!isEffectMounted) return;
                if (typeof activeSession.requestHitTestSource === 'function') {
                    const source = await activeSession.requestHitTestSource({ space: viewerSpace });
                    if(!isEffectMounted) { if(source?.cancel) source.cancel(); return; }
                    if (source) {
                        if(isEffectMounted) setHitTestSource(source);
                        console.log("ARScene: HitTestSource obtenido.");
                    } else { console.error('ARScene: No se pudo obtener hit test source.'); }
                }
            } catch (err) {
                if(!isEffectMounted) return;
                console.error('ARScene: Error al configurar HitTest:', err);
            }
        };
        setupHitTest();
        return () => { isEffectMounted = false; };
    }, [activeSession, referenceSpace, hitTestSource]);

    // Bucle de frame para actualizar retícula
    useFrame(() => {
        if (!gl.xr.isPresenting || !referenceSpace || !hitTestSource) {
            if(isReticleVisible) setIsReticleVisible(false);
            return;
        }
        const frame = gl.xr.getFrame();
        if (!frame) return;

        const results = frame.getHitTestResults(hitTestSource);
        if (results.length > 0) {
            const hit = results[0];
            const pose = hit.getPose(referenceSpace);
            if (pose) {
                reticleMatrix.current.fromArray(pose.transform.matrix);
                if(!isReticleVisible) setIsReticleVisible(true);
            } else {
                if(isReticleVisible) setIsReticleVisible(false);
            }
        } else {
            if(isReticleVisible) setIsReticleVisible(false);
        }
    });

    // Modificación: Lógica de `placeObject`
    const placeObject = useCallback(() => {
        console.log("ARScene: placeObject (listener de sesión 'select') llamado.");
        // Esta función se llama por el tap en el overlay.
        // Si ya hay un objeto, no hacemos nada aquí, porque el tap sobre el objeto
        // debería ser manejado por el onClick del PlacedObject gracias a stopPropagation.
        if (objects.length > 0) {
            console.log("ARScene: Ya hay un objeto. El tap en el objeto se maneja por su propio onClick.");
            return;
        }

        if (isReticleVisible && reticleMatrix.current) { // Solo colocar si la retícula está visible y tenemos la matriz
            console.log("ARScene: Retícula visible, colocando el ÚNICO objeto.");
            setObjects([ // Establecer el array con un solo objeto
                { id: THREE.MathUtils.generateUUID(), matrix: reticleMatrix.current.clone(), qrData: qrCodeData },
            ]);
        } else {
            console.warn("ARScene: No se puede colocar objeto (retícula no visible o matriz no lista).");
        }
    }, [isReticleVisible, qrCodeData, objects.length]); // reticleMatrix (ref) no es dependencia directa

    // Listener para el evento 'select' de la sesión (disparado por el div en ARCoreExperience)
    useEffect(() => {
        if (activeSession && gl.xr.isPresenting) {
            activeSession.addEventListener('select', placeObject); // Este es el listener para colocar
            return () => {
                activeSession.removeEventListener('select', placeObject);
            };
        }
    }, [activeSession, placeObject, gl.xr.isPresenting]);

    return (
        <>
            <ambientLight intensity={1.0} />
            <directionalLight position={[1, 4, 2.5]} intensity={1.2} castShadow={true} />

            {/* Renderiza Reticle y le pasa las props del estado de ARScene */}
            <Reticle visible={isReticleVisible} matrix={reticleMatrix.current} />

            {objects.map((obj) => (
                <PlacedObject
                    key={obj.id}
                    matrix={obj.matrix}
                    onSelect={() => { // Esta función se pasa al PlacedObject y se llama en su onClick
                        console.log(`ARScene: Objeto ${obj.id} seleccionado (PlacedObject onSelect). Navegando a trivia con ${obj.qrData}`);
                        router.push(`/trivia?qrCodeData=${encodeURIComponent(obj.qrData)}`);
                    }}
                />
            ))}
        </>
    );
};

// --- Componente Principal Envoltorio (TU VERSIÓN) ---
interface ARCoreExperienceProps {
    activeSession: XRSession;
    qrCodeData: string;
    onExit: () => void;
}
const ARCoreExperience: React.FC<ARCoreExperienceProps> = ({ activeSession, qrCodeData, onExit }) => {
    return (
        <>
            <Canvas
                gl={{ antialias: true, alpha: true }}
                style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 1 }}
                camera={{ fov: 70, near: 0.01, far: 20 }}
            >
                <ARScene activeSession={activeSession} qrCodeData={qrCodeData} onExit={onExit} />
            </Canvas>
            {/* Este div es el que captura el tap y dispara 'select' en la sesión */}
            <div
                onClick={() => {
                    if (activeSession && typeof activeSession.dispatchEvent === 'function') {
                        // console.log("Overlay onClick: Despachando evento 'select'");
                        const evt = new Event('select');
                        activeSession.dispatchEvent(evt);
                    }
                }}
                style={{
                    position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
                    zIndex: 2, // Sobre el canvas para asegurar captura de taps
                    // backgroundColor: 'rgba(0,0,0,0.0)', // Transparente
                }}
            />
        </>
    );
};

export default ARCoreExperience;