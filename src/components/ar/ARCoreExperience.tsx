// src/components/ar/ARCoreExperience.tsx
'use client';

import React, { useEffect, useRef, useState, useCallback, Suspense } from 'react';
import { Canvas, useThree, useFrame, ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';
import { useRouter } from 'next/navigation';
import { Image as DreiImage } from '@react-three/drei';

// Helper function (getCategoryFromQrData) remains the same
const getCategoryFromQrData = (qrData: string): string | null => {
    if (!qrData) return null;
    const parts = qrData.toLowerCase().split('_');
    if (parts.length >= 2) {
        const categoryPart = parts[1];
        if (categoryPart.includes('ahorro')) return 'ahorro';
        if (categoryPart.includes('tarjeta')) return 'tarjeta';
        if (categoryPart.includes('casa')) return 'casa';
        if (categoryPart.includes('carro')) return 'carro';
        return categoryPart;
    }
    return null;
};

// --- Componente Retícula (ReticleProps and Reticle component remain the same) ---
interface ReticleProps {
    visible: boolean;
    matrix: THREE.Matrix4 | null; // Allow null for when not visible
}
const Reticle: React.FC<ReticleProps> = ({ visible, matrix }) => {
    const ref = useRef<THREE.Mesh>(null);
    useEffect(() => {
        if (ref.current) {
            ref.current.visible = !!(visible && matrix);
            if (ref.current.visible && matrix) {
                ref.current.matrixAutoUpdate = false;
                ref.current.matrix.copy(matrix);
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

// --- Componente PlacedObject (PlacedObjectProps and PlacedObject component remain the same) ---
interface PlacedObjectProps {
    matrix: THREE.Matrix4;
    onSelectFallback: () => void;
    qrDataForDebug?: string;
}
const PlacedObject: React.FC<PlacedObjectProps> = ({ matrix, onSelectFallback, qrDataForDebug }) => {
    const meshRef = useRef<THREE.Mesh>(null!);

    useEffect(() => {
        if (meshRef.current) {
            meshRef.current.matrixAutoUpdate = false;
            meshRef.current.matrix.copy(matrix);
        }
    }, [matrix]);

    const handleClick = (e: ThreeEvent<PointerEvent>) => {
        e.stopPropagation();
        console.log(`PlacedObject (SVG): onClick INTERNO. QR: ${qrDataForDebug}.`);
        onSelectFallback();
    };

    const categoryName = qrDataForDebug ? getCategoryFromQrData(qrDataForDebug) : null;
    const svgUrl = categoryName ? `/icons/${categoryName}.svg` : '/icons/default.svg';
    const planeSize = 0.3;

    return (
        <mesh
            ref={meshRef}
            matrixAutoUpdate={false}
            onClick={handleClick}
            rotation-x={-Math.PI}
        >
            <planeGeometry args={[planeSize, planeSize]} />
            <React.Suspense fallback={<meshBasicMaterial color="lightgray" wireframe={true} />}>
                <DreiImage
                    url={svgUrl}
                    transparent
                    toneMapped={false}
                />
            </React.Suspense>
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
    // Renamed for clarity: this state reflects if hit-test found a surface
    const [isHitTestSurfaceFound, setIsHitTestSurfaceFound] = useState(false);
    const [objects, setObjects] = useState<{ id: string; matrix: THREE.Matrix4; qrData: string }[]>([]);

    // --- Session Setup and Teardown Effect ---
    useEffect(() => {
        let isMounted = true;
        console.log("ARScene: Mounting and configuring session:", activeSession);
        gl.xr.enabled = true;
        gl.xr.setSession(activeSession)
            .then(async () => {
                if (!isMounted) return;
                console.log("ARScene: XR session set on renderer.");
                try {
                    const refSpace = await activeSession.requestReferenceSpace('local-floor');
                    if (isMounted) {
                        setReferenceSpace(refSpace);
                        console.log("ARScene: 'local-floor' reference space obtained.");
                    }
                } catch (err) {
                    console.warn("ARScene: 'local-floor' failed, trying 'local'.", err);
                    try {
                        const refSpaceLocal = await activeSession.requestReferenceSpace('local');
                        if (isMounted) {
                            setReferenceSpace(refSpaceLocal);
                            console.log("ARScene: 'local' reference space obtained.");
                        }
                    } catch (localErr) {
                        console.error("ARScene: Failed to get any reference space.", localErr);
                        if (isMounted) onExit();
                    }
                }
            }).catch(err => {
            if (isMounted) {
                console.error("ARScene: Fatal error setting session.", err);
                onExit();
            }
        });

        const handleSessionEnd = () => {
            if (!isMounted) return;
            console.log("ARScene: XRSession 'end' event received.");
            if (hitTestSource?.cancel) {
                try { hitTestSource.cancel(); } catch (e) { console.warn("ARScene: Error cancelling hitTestSource on session end:", e); }
            }
            setHitTestSource(null);
            setReferenceSpace(null);
            setObjects([]); // Clear placed objects
            setIsHitTestSurfaceFound(false); // Reset hit-test state
            onExit();
        };
        activeSession.addEventListener('end', handleSessionEnd);

        return () => {
            isMounted = false;
            console.log("ARScene: Unmounting.");
            activeSession.removeEventListener('end', handleSessionEnd);
            if (hitTestSource?.cancel) {
                try { hitTestSource.cancel(); } catch (e) { console.warn("ARScene: Error cancelling hitTestSource on unmount:", e); }
            }
        };
    }, [activeSession, gl, onExit]);

    // --- Hit Test Source Setup Effect ---
    useEffect(() => {
        if (!activeSession || !referenceSpace || hitTestSource) { // Do not run if already have one or no session/refspace
            if (hitTestSource && (!activeSession || !referenceSpace)) { // Clean up if session/refspace lost
                try { hitTestSource.cancel(); } catch(e) { console.warn("ARScene: Error cancelling hitTestSource due to lost session/refSpace", e); }
                setHitTestSource(null);
            }
            return;
        }
        let isEffectMounted = true;
        const setupHitTest = async () => {
            try {
                const viewerSpace = await activeSession.requestReferenceSpace('viewer');
                if (!isEffectMounted || !activeSession.requestHitTestSource) return;
                const source = await activeSession.requestHitTestSource({ space: viewerSpace });
                if (source && isEffectMounted) {
                    console.log("ARScene: Hit test source obtained.");
                    setHitTestSource(source);
                } else if (!isEffectMounted && source?.cancel) {
                    source.cancel();
                }
            } catch (err) {
                console.error('ARScene: Error configuring HitTest:', err);
                if(isEffectMounted) setHitTestSource(null); // Ensure it's null on error
            }
        };
        setupHitTest();
        return () => {
            isEffectMounted = false;
        };
    }, [activeSession, referenceSpace]);


    // --- Frame Loop for Hit-Testing ---
    useFrame(() => {
        if (!gl.xr.isPresenting || !referenceSpace || !hitTestSource) {
            if (isHitTestSurfaceFound) setIsHitTestSurfaceFound(false);
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
                if (!isHitTestSurfaceFound) setIsHitTestSurfaceFound(true);
            } else {
                if (isHitTestSurfaceFound) setIsHitTestSurfaceFound(false);
            }
        } else {
            if (isHitTestSurfaceFound) setIsHitTestSurfaceFound(false);
        }
    });

    // --- Object Placement and Navigation Logic ---
    const placeObjectOrNavigate = useCallback(() => {
        console.log("ARScene: 'select' event (tap) detected by placeObjectOrNavigate.");

        if (objects.length > 0) { // An object is already placed, this is the second tap.
            console.log("ARScene: Object already placed. Attempting to navigate to trivia.");
            const currentObject = objects[0];
            if (currentObject && currentObject.qrData) {
                console.log(`ARScene: Navigating to /trivia with qrCodeData: ${currentObject.qrData}`);
                if (router) {
                    router.push(`/trivia?qrCodeData=${encodeURIComponent(currentObject.qrData)}`);
                } else {
                    console.error("ARScene: Router not available! Cannot navigate.");
                    alert("Error: Router not available for navigation.");
                }
            } else {
                console.error("ARScene: Cannot navigate, current object or its qrData is missing.");
                alert("Error: Object information missing for trivia.");
            }
            return;
        }

        // No object placed yet, this is the first tap. Place the object.
        // Check isHitTestSurfaceFound (updated by useFrame)
        if (isHitTestSurfaceFound && reticleMatrix.current) {
            console.log(`ARScene: Reticle indicates surface found. Placing the object with qrData: ${qrCodeData}`);
            const newObject = {
                id: THREE.MathUtils.generateUUID(),
                matrix: reticleMatrix.current.clone(),
                qrData: qrCodeData
            };
            setObjects([newObject]);
            // The reticle will be hidden on the next render pass because objects.length will be > 0
        } else {
            console.warn("ARScene: Cannot place object - hit-test surface not found or reticle matrix not ready.");
        }
    }, [objects, isHitTestSurfaceFound, qrCodeData, router]); // Dependencies for the callback

    // --- Event Listener for Taps ---
    useEffect(() => {
        if (activeSession && gl.xr.isPresenting) {
            console.log("ARScene: Adding 'select' event listener to AR session.");
            activeSession.addEventListener('select', placeObjectOrNavigate);
            return () => {
                console.log("ARScene: Removing 'select' event listener from AR session.");
                activeSession.removeEventListener('select', placeObjectOrNavigate);
            };
        }
    }, [activeSession, placeObjectOrNavigate, gl.xr.isPresenting]);

    // Determine if the reticle should be rendered
    const shouldRenderReticle = isHitTestSurfaceFound && objects.length === 0;

    return (
        <>
            <ambientLight intensity={1.0} />
            <directionalLight position={[1, 4, 2.5]} intensity={1.2} />
            <Reticle visible={shouldRenderReticle} matrix={shouldRenderReticle ? reticleMatrix.current : null} />

            {objects.map((obj) => (
                <PlacedObject
                    key={obj.id}
                    matrix={obj.matrix}
                    qrDataForDebug={obj.qrData}
                    onSelectFallback={() => {
                        // This fallback is if the PlacedObject's internal onClick is ever triggered.
                        // The main navigation path is through placeObjectOrNavigate.
                        console.warn(`ARScene: PlacedObject onSelectFallback invoked for ${obj.qrData}. This should not be the primary navigation trigger.`);
                    }}
                />
            ))}
        </>
    );
};

// --- ARCoreExperience Wrapper Component (remains the same) ---
interface ARCoreExperienceProps {
    activeSession: XRSession;
    qrCodeData: string;
    onExit: () => void;
}
const ARCoreExperience: React.FC<ARCoreExperienceProps> = ({ activeSession, qrCodeData, onExit }) => {
    const handleOverlayClick = useCallback(() => {
        // This click on the overlay div dispatches the 'select' event to the active AR session.
        // This is the primary mechanism for user taps.
        console.log("ARCoreExperience: Overlay onClick. Dispatching 'select' event to XR session.");
        if (activeSession && typeof activeSession.dispatchEvent === 'function') {
            // Create a simple event, as XRSession's 'select' doesn't typically carry detailed data itself.
            const selectEvent = new Event('select');
            activeSession.dispatchEvent(selectEvent);
        } else {
            console.warn("ARCoreExperience: Cannot dispatch 'select'. Session not active or dispatchEvent not available.");
        }
    }, [activeSession]);

    return (
        <>
            {/* The Canvas for 3D rendering */}
            <Canvas gl={{ antialias: true, alpha: true }} style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 1 }} camera={{ fov: 70, near: 0.01, far: 20 }}>
                <ARScene activeSession={activeSession} qrCodeData={qrCodeData} onExit={onExit} />
            </Canvas>
            {/* This div captures screen taps and forwards them as 'select' events to the AR session. */}
            <div onClick={handleOverlayClick} style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 2, WebkitTapHighlightColor: 'transparent' }} />
        </>
    );
};

export default ARCoreExperience;