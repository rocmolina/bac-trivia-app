// src/components/ar/ARCoreExperience.tsx
// MODIFICADO: Se maneja el "segundo tap" dentro de placeObject para navegar a la trivia.
'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Canvas, useThree, useFrame, ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';
import { useRouter } from 'next/navigation';

// --- Componente Retícula (Sin cambios) ---
interface ReticleProps {
    visible: boolean;
    matrix: THREE.Matrix4 | null;
}
const Reticle: React.FC<ReticleProps> = ({ visible, matrix }) => {
    const ref = useRef<THREE.Mesh>(null);
    useEffect(() => {
        if (ref.current) {
            ref.current.visible = !!(visible && matrix);
            if (ref.current.visible && matrix) {
                ref.current.matrixAutoUpdate = false;
                ref.current.matrix.copy(matrix);
            } else if (ref.current.visible && !matrix) {
                ref.current.visible = false;
            }
        }
    }, [visible, matrix]);
    return (
        <mesh ref={ref} visible={false} matrixAutoUpdate={false} rotation-x={-Math.PI / 2}>
            <ringGeometry args={[0.08, 0.1, 32]} />
            <meshBasicMaterial color="lime" opacity={0.90} transparent={true} depthTest={false} />
        </mesh>
    );
};

// --- Componente Objeto Colocado (onClick ahora es menos crítico, pero lo mantenemos por si acaso) ---
interface PlacedObjectProps {
    matrix: THREE.Matrix4;
    onSelectFallback: () => void; // Renombrado para claridad, ya que el tap principal se maneja arriba
    qrDataForDebug?: string;
}
const PlacedObject: React.FC<PlacedObjectProps> = ({ matrix, onSelectFallback, qrDataForDebug }) => {
    const meshRef = useRef<THREE.Mesh>(null);
    const [hovered, setHovered] = useState(false);
    const [initialColor] = useState(() => new THREE.Color().setHex(Math.random() * 0xffffff));

    useEffect(() => {
        if (meshRef.current) {
            meshRef.current.matrixAutoUpdate = false;
            meshRef.current.matrix.copy(matrix);
        }
    }, [matrix]);

    const handleClick = (e: ThreeEvent<PointerEvent>) => {
        e.stopPropagation();
        console.log(`PlacedObject: onClick INTERNO. QR Data: ${qrDataForDebug}. Llamando a onSelectFallback.`);
        // alert(`PlacedObject INTERNO Tapped! QR: ${qrDataForDebug}`); // Ya no es la via principal
        onSelectFallback(); // Podría usarse si alguna vez el clic directo funciona mejor
    };
    const handlePointerOver = (e: ThreeEvent<PointerEvent>) => { e.stopPropagation(); setHovered(true); };
    const handlePointerOut = (e: ThreeEvent<PointerEvent>) => { e.stopPropagation(); setHovered(false); };

    return (
        <mesh
            ref={meshRef}
            matrixAutoUpdate={false}
            onClick={handleClick} // Lo dejamos, pero el flujo principal ahora no depende de él.
            onPointerOver={handlePointerOver}
            onPointerOut={handlePointerOut}
            scale={hovered ? 0.22 : 0.20}
        >
            <boxGeometry args={[1, 1, 1]} />
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
    const reticleMatrix = useRef(new THREE.Matrix4());
    const [isReticleVisible, setIsReticleVisible] = useState(false);
    const [objects, setObjects] = useState<{ id: string; matrix: THREE.Matrix4; qrData: string }[]>([]);

    // --- Configuración y limpieza de sesión (Sin cambios desde la última versión) ---
    useEffect(() => {
        let isMounted = true;
        // console.log("ARScene: Montado. Configurando sesión:", activeSession);
        gl.xr.enabled = true;
        gl.xr.setSession(activeSession)
            .then(async () => {
                if(!isMounted) return;
                // console.log("ARScene: Sesión XR establecida en renderer.");
                try {
                    const refSpace = await activeSession.requestReferenceSpace('local-floor');
                    if(!isMounted) return; setReferenceSpace(refSpace); // console.log("ARScene: 'local-floor' reference space obtenido.");
                } catch (err) {
                    // console.warn("ARScene: Falló 'local-floor', intentando 'local'.", err);
                    try {
                        const refSpace = await activeSession.requestReferenceSpace('local');
                        if(!isMounted) return; setReferenceSpace(refSpace); // console.log("ARScene: 'local' reference space obtenido.");
                    } catch (localErr) {
                        // console.error("ARScene: Falló obtener cualquier reference space.", localErr);
                        if(!isMounted) return; onExit();
                    }
                }
            }).catch(err => {
                if(!isMounted) return; /*console.error("ARScene: Error fatal al establecer sesión.", err);*/ onExit();
            });
        const handleSessionEnd = () => {
            if(!isMounted) return; /*console.log("ARScene: Evento 'end' de XRSession.");*/
            if (hitTestSource?.cancel) hitTestSource.cancel(); setHitTestSource(null); setReferenceSpace(null); onExit();
        };
        activeSession.addEventListener('end', handleSessionEnd);
        return () => {
            isMounted = false; /*console.log("ARScene: Desmontando.");*/
            activeSession.removeEventListener('end', handleSessionEnd);
        };
    }, [activeSession, gl, onExit, hitTestSource]);

    // --- Obtener hitTestSource (Sin cambios desde la última versión) ---
    useEffect(() => {
        if (!activeSession || !referenceSpace || hitTestSource) return;
        let isEffectMounted = true;
        const setupHitTest = async () => {
            try {
                const viewerSpace = await activeSession.requestReferenceSpace('viewer');
                if(!isEffectMounted) return;
                if (typeof activeSession.requestHitTestSource === 'function') {
                    const source = await activeSession.requestHitTestSource({ space: viewerSpace });
                    if(!isEffectMounted) { if(source?.cancel) source.cancel(); return; }
                    if (source && isEffectMounted) setHitTestSource(source);
                }
            } catch (err) { /* console.error('ARScene: Error al configurar HitTest:', err); */ }
        };
        setupHitTest();
        return () => { isEffectMounted = false; };
    }, [activeSession, referenceSpace, hitTestSource]);

    // --- Bucle de frame (Sin cambios desde la última versión) ---
    useFrame(() => { // ... (sin cambios, actualiza reticleMatrix y isReticleVisible)
        if (!gl.xr.isPresenting || !referenceSpace || !hitTestSource) {
            if(isReticleVisible) setIsReticleVisible(false); return;
        }
        const frame = gl.xr.getFrame(); if (!frame) return;
        const results = frame.getHitTestResults(hitTestSource);
        if (results.length > 0) {
            const hit = results[0]; const pose = hit.getPose(referenceSpace);
            if (pose) { reticleMatrix.current.fromArray(pose.transform.matrix); if(!isReticleVisible) setIsReticleVisible(true); }
            else { if(isReticleVisible) setIsReticleVisible(false); }
        } else { if(isReticleVisible) setIsReticleVisible(false); }
    });

    // MODIFICADO: Lógica de `placeObject` para manejar el "segundo tap" y navegar
    const placeObject = useCallback(() => {
        console.log("ARScene: placeObject (listener de sesión 'select') llamado.");

        if (objects.length > 0) {
            // Un objeto ya está colocado. Este 'select' event es el "segundo tap" (o subsiguiente).
            console.log("ARScene: Objeto ya colocado. Este tap AHORA NAVEGARÁ a la trivia.");
            const currentObject = objects[0]; // Asumimos que solo hay un objeto relevante

            if (currentObject && currentObject.qrData) {
                console.log(`ARScene: Navegando a /trivia con qrCodeData: ${currentObject.qrData}`);
                if (router) {
                    router.push(`/trivia?qrCodeData=${encodeURIComponent(currentObject.qrData)}`);
                } else {
                    console.error("ARScene: ¡Router no disponible! No se puede navegar.");
                    alert("Error: Router no disponible para navegar a la trivia.");
                }
            } else {
                console.error("ARScene: No se puede navegar, falta el objeto actual o su qrData.");
                alert("Error: No se encontró información del objeto para la trivia.");
            }
            return; // Importante: Salir después de manejar la navegación
        }

        // Si no hay objetos, es el primer tap: colocar el objeto
        if (isReticleVisible && reticleMatrix.current) {
            console.log(`ARScene: Retícula visible, colocando el ÚNICO objeto con qrData: ${qrCodeData}`);
            setObjects([
                { id: THREE.MathUtils.generateUUID(), matrix: reticleMatrix.current.clone(), qrData: qrCodeData },
            ]);
        } else {
            console.warn("ARScene: No se puede colocar objeto (retícula no visible o matriz no lista).");
        }
    }, [objects, isReticleVisible, qrCodeData, router]); // <<-- AÑADIR 'objects' y 'router' a las dependencias

    // Listener para el evento 'select' de la sesión (Sin cambios)
    useEffect(() => {
        if (activeSession && gl.xr.isPresenting) {
            activeSession.addEventListener('select', placeObject);
            return () => {
                activeSession.removeEventListener('select', placeObject);
            };
        }
    }, [activeSession, placeObject, gl.xr.isPresenting]); // placeObject ahora depende de 'objects' y 'router'

    return (
        <>
            <ambientLight intensity={1.0} />
            <directionalLight position={[1, 4, 2.5]} intensity={1.2} castShadow={true} />
            <Reticle visible={isReticleVisible} matrix={reticleMatrix.current} />

            {objects.map((obj) => (
                <PlacedObject
                    key={obj.id}
                    matrix={obj.matrix}
                    qrDataForDebug={obj.qrData}
                    // La prop onSelect ahora es más un fallback, ya que el flujo principal
                    // de navegación se maneja en placeObject.
                    onSelectFallback={() => {
                        console.warn(`ARScene: PlacedObject onSelectFallback invocado para ${obj.qrData}, pero la navegación principal debería ocurrir en placeObject.`);
                        // Podrías decidir si quieres que esto también navegue como un respaldo,
                        // o simplemente sea para logging. Por ahora, lo dejamos como un log.
                        // if (router) {
                        // router.push(`/trivia?qrCodeData=${encodeURIComponent(obj.qrData)}`);
                        // }
                    }}
                />
            ))}
        </>
    );
};

// --- Componente Principal Envoltorio (ARCoreExperience) --- (Sin cambios)
interface ARCoreExperienceProps {
    activeSession: XRSession;
    qrCodeData: string;
    onExit: () => void;
}
const ARCoreExperience: React.FC<ARCoreExperienceProps> = ({ activeSession, qrCodeData, onExit }) => {
    const handleOverlayClick = () => {
        // console.log("ARCoreExperience: Overlay onClick. Despachando evento 'select' a la sesión XR.");
        if (activeSession && typeof activeSession.dispatchEvent === 'function') {
            const evt = new Event('select');
            activeSession.dispatchEvent(evt);
        } else {
            // console.warn("ARCoreExperience: No se puede despachar 'select'. Sesión no activa o dispatchEvent no disponible.");
        }
    };
    return (
        <>
            <Canvas gl={{ antialias: true, alpha: true }} style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 1 }} camera={{ fov: 70, near: 0.01, far: 20 }}>
                <ARScene activeSession={activeSession} qrCodeData={qrCodeData} onExit={onExit} />
            </Canvas>
            <div onClick={handleOverlayClick} style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 2 }} />
        </>
    );
};

export default ARCoreExperience;