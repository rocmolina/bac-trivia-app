'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useRouter } from 'next/navigation';

interface ReticleProps {
    visible: boolean;
    matrix: THREE.Matrix4 | null;
}
const Reticle: React.FC<ReticleProps> = ({ visible, matrix }) => {
    const reticleRef = useRef<THREE.Mesh>(null);

    useEffect(() => {
        if (reticleRef.current && visible && matrix) {
            reticleRef.current.matrixAutoUpdate = false;
            reticleRef.current.visible = true;
            reticleRef.current.matrix.copy(matrix);
        } else if (reticleRef.current) {
            reticleRef.current.visible = false;
        }
    }, [visible, matrix]);

    return (
        <mesh ref={reticleRef} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.15, 0.2, 32]} />
            <meshBasicMaterial color="lime" opacity={0.95} />
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
            meshRef.current.matrixAutoUpdate = false;
            meshRef.current.matrix.copy(matrix);
        }
    }, [matrix]);

    return (
        <mesh
            ref={meshRef}
            onClick={(event) => {
                event.stopPropagation();
                onSelect();
            }}
            onPointerOver={(e) => { e.stopPropagation(); setIsHovered(true); }}
            onPointerOut={(e) => { e.stopPropagation(); setIsHovered(false); }}
            scale={isHovered ? 1.25 : 1}
        >
            <boxGeometry args={[0.15, 0.15, 0.15]} />
            <meshStandardMaterial roughness={0.5} metalness={0.3} color={isHovered ? 0xff00ff : initialColor} />
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
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { gl, scene, camera } = useThree();
    const [hitTestSource, setHitTestSource] = useState<XRHitTestSource | null>(null);
    const [referenceSpace, setReferenceSpace] = useState<XRReferenceSpace | null>(null);
    const reticleMatrixRef = useRef<THREE.Matrix4>(new THREE.Matrix4());
    const [reticleVisible, setReticleVisible] = useState(false);
    const [placedObjects, setPlacedObjects] = useState<{ id: string; matrix: THREE.Matrix4; qrData: string }[]>([]);

    useEffect(() => {
        gl.xr.enabled = true;
        gl.xr.setSession(activeSession);

        activeSession.addEventListener('end', () => {
            setHitTestSource(null);
            setReferenceSpace(null);
            onExit();
        });

        return () => {
            activeSession.end().catch(() => {});
            setHitTestSource(null);
            setReferenceSpace(null);
        };
    }, [activeSession, gl, onExit]);

    useEffect(() => {
        const setupHitTest = async () => {
            try {
                const viewerSpace = await activeSession.requestReferenceSpace('viewer');
                if (typeof activeSession.requestHitTestSource === 'function') {
                    const source = await activeSession.requestHitTestSource({ space: viewerSpace });
                    const localRefSpace = await activeSession.requestReferenceSpace('local');
                    if (source) setHitTestSource(source);
                    else console.error('Failed to set up hit test source: XRHitTestSource is undefined');
                    setReferenceSpace(localRefSpace);
                }
            } catch (err) {
                console.error('Failed to set up hit test source:', err);
            }
        };
        setupHitTest();
    }, [activeSession]);

    useFrame((state) => {
        const frame = state.gl.xr.getFrame();
        if (!frame || !referenceSpace || !hitTestSource) return;

        const hitTestResults = frame.getHitTestResults(hitTestSource);
        if (hitTestResults.length > 0) {
            const hit = hitTestResults[0];
            const pose = hit.getPose(referenceSpace);
            if (pose) {
                reticleMatrixRef.current.fromArray(pose.transform.matrix);
                setReticleVisible(true);
                return;
            }
        }
        setReticleVisible(false);
    });

    const handlePlaceObject = useCallback(() => {
        if (reticleVisible) {
            const matrix = reticleMatrixRef.current.clone();
            setPlacedObjects(prev => [
                ...prev,
                { id: THREE.MathUtils.generateUUID(), matrix, qrData: qrCodeData },
            ]);
        }
    }, [reticleVisible, qrCodeData]);

    useEffect(() => {
        activeSession.addEventListener('select', handlePlaceObject);
        return () => activeSession.removeEventListener('select', handlePlaceObject);
    }, [activeSession, handlePlaceObject]);

    return (
        <>
            <ambientLight intensity={1.0} />
            <directionalLight position={[1, 4, 2.5]} intensity={1.2} />
            <Reticle visible={reticleVisible} matrix={reticleMatrixRef.current} />
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
                camera={{ fov: 70, near: 0.01, far: 20 }}
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
