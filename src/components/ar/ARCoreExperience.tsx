'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useRouter } from 'next/navigation';

interface ReticleProps {
    visible: boolean;
    matrix: THREE.Matrix4 | null;
}
const Reticle: React.FC<ReticleProps> = ({ visible, matrix }) => {
    const reticleRef = useRef<THREE.Mesh>(null);
    useEffect(() => {
        if (reticleRef.current) {
            const isActuallyVisible = !!(visible && matrix);
            reticleRef.current.visible = isActuallyVisible;
            if (isActuallyVisible && matrix) {
                reticleRef.current.matrix.identity();
                reticleRef.current.applyMatrix4(matrix);
            }
        }
    }, [visible, matrix]);

    return (
        <mesh ref={reticleRef} matrixAutoUpdate={false} visible={visible} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.05, 0.075, 32]} />
            <meshBasicMaterial color="white" transparent={false} opacity={0.85} depthTest={false} />
        </mesh>
    );
};

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
            meshRef.current.matrix.copy(matrix);
        }
    }, [matrix]);

    return (
        <mesh
            ref={meshRef}
            matrixAutoUpdate={false}
            onClick={(event) => {
                event.stopPropagation();
                onSelect();
            }}
            onPointerOver={(e) => { e.stopPropagation(); setIsHovered(true); }}
            onPointerOut={(e) => { e.stopPropagation(); setIsHovered(false); }}
            scale={isHovered ? 1.25 : 1}
        >
            <boxGeometry args={[0.1, 0.1, 0.1]} />
            <meshStandardMaterial roughness={0.7} metalness={0.3} color={isHovered ? 0xff00ff : initialColor} />
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
    const [hitTestSourceRequested, setHitTestSourceRequested] = useState(false);
    const reticleMatrixRef = useRef<THREE.Matrix4 | null>(null);
    const [isReticleVisible, setIsReticleVisible] = useState(false);
    const [placedObjects, setPlacedObjects] = useState<{ id: string, matrix: THREE.Matrix4, qrData: string }[]>([]);
    const animationFrameIdRef = useRef<number | null>(null);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const isSessionEndingRef = useRef(false);

    useEffect(() => {
        const currentSession = activeSession;
        gl.xr.enabled = true;
        gl.xr.setSession(currentSession).catch(err => {
            console.error("Fallo en setSession:", err);
            onExit();
        });
        return () => {
            if (animationFrameIdRef.current) {
                currentSession.cancelAnimationFrame(animationFrameIdRef.current);
            }
            hitTestSource?.cancel();
            gl.xr.setSession(null).catch(() => {});
            onExit();
        };
    }, [activeSession, gl.xr, hitTestSource, onExit]);

    useEffect(() => {
        if (gl.xr.isPresenting && activeSession && !hitTestSource && !hitTestSourceRequested) {
            setHitTestSourceRequested(true);
            activeSession.requestReferenceSpace('viewer')
                .then(viewerSpace => {
                    if (typeof activeSession.requestHitTestSource === 'function') {
                        return activeSession.requestHitTestSource({ space: viewerSpace });
                    } else {
                        throw new Error('requestHitTestSource is not available');
                    }
                })
                .then(source => { if (source) setHitTestSource(source); })
                .catch(() => setHitTestSourceRequested(false));
        }
    }, [gl.xr.isPresenting, activeSession, hitTestSource, hitTestSourceRequested]);

    useEffect(() => {
        if (!gl.xr.isPresenting || !activeSession || !hitTestSource) return;

        const onXRFrame = (time: DOMHighResTimeStamp, frame: XRFrame) => {
            animationFrameIdRef.current = activeSession.requestAnimationFrame(onXRFrame);
            const referenceSpace = gl.xr.getReferenceSpace();
            if (!referenceSpace) return;
            const hitTestResults = frame.getHitTestResults(hitTestSource);
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

        animationFrameIdRef.current = activeSession.requestAnimationFrame(onXRFrame);
        return () => {
            if (animationFrameIdRef.current) activeSession.cancelAnimationFrame(animationFrameIdRef.current);
        };
    }, [gl.xr.isPresenting, activeSession, hitTestSource, gl.xr]);

    const handlePlaceObject = useCallback(() => {
        if (isReticleVisible && reticleMatrixRef.current) {
            const newMatrix = reticleMatrixRef.current.clone();
            setPlacedObjects(prev => [...prev, {
                id: THREE.MathUtils.generateUUID(),
                matrix: newMatrix,
                qrData: qrCodeData
            }]);
        }
    }, [isReticleVisible, qrCodeData]);

    useEffect(() => {
        activeSession.addEventListener('select', handlePlaceObject);
        return () => activeSession.removeEventListener('select', handlePlaceObject);
    }, [activeSession, handlePlaceObject]);

    if (!gl.xr.isPresenting) return null;

    return (
        <>
            <ambientLight intensity={0.8} />
            <directionalLight position={[1, 4, 2.5]} intensity={1.2} castShadow={false} />
            <Reticle visible={isReticleVisible} matrix={reticleMatrixRef.current} />
            {placedObjects.map(obj => (
                <PlacedObject
                    key={obj.id}
                    matrix={obj.matrix}
                    onSelect={() => router.push(`/trivia?qrCodeData=${encodeURIComponent(obj.qrData)}`)}
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
        <>
            <Canvas
                gl={{ antialias: true, alpha: true }}
                style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 1 }}
            >
                <ARScene activeSession={activeSession} qrCodeData={qrCodeData} onExit={onExit} />
            </Canvas>
            <div
                onClick={() => {
                    const evt = new Event('select');
                    activeSession.dispatchEvent(evt);
                }}
                style={{
                    position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
                    zIndex: 2, backgroundColor: 'transparent', pointerEvents: 'auto'
                }}
            />
        </>
    );
};

export default ARCoreExperience;
