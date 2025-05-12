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
    const ref = useRef<THREE.Mesh>(null);

    useEffect(() => {
        if (ref.current && matrix) {
            ref.current.visible = visible;
            ref.current.matrixAutoUpdate = false;
            ref.current.matrix.copy(matrix);
        }
    }, [visible, matrix]);

    return (
        <mesh ref={ref} visible={visible} matrixAutoUpdate={false}>
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
            onClick={(e) => { e.stopPropagation(); onSelect(); }}
            onPointerOver={(e) => { e.stopPropagation(); setHovered(true); }}
            onPointerOut={(e) => { e.stopPropagation(); setHovered(false); }}
            scale={hovered ? 1.25 : 1}
        >
            <boxGeometry args={[0.15, 0.15, 0.15]} />
            <meshStandardMaterial color={hovered ? 0xff00ff : initialColor} />
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
    const [reticleVisible, setReticleVisible] = useState(false);
    const [objects, setObjects] = useState<{ id: string; matrix: THREE.Matrix4; qrData: string }[]>([]);

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
        const setup = async () => {
            try {
                const viewerSpace = await activeSession.requestReferenceSpace('viewer');
                const localSpace = await activeSession.requestReferenceSpace('local');
                if (typeof activeSession.requestHitTestSource === 'function') {
                    const source = await activeSession.requestHitTestSource({ space: viewerSpace });
                    if (source) setHitTestSource(source);
                    else console.error('No hit test source available.');
                    setReferenceSpace(localSpace);
                }
            } catch (err) {
                console.error('HitTest error:', err);
            }
        };
        setup();
    }, [activeSession]);

    useFrame(({ gl }) => {
        const frame = gl.xr.getFrame();
        if (!frame || !referenceSpace || !hitTestSource) return;
        const results = frame.getHitTestResults(hitTestSource);
        if (results.length > 0) {
            const hit = results[0];
            const pose = hit.getPose(referenceSpace);
            if (pose) {
                reticleMatrix.current.fromArray(pose.transform.matrix);
                setReticleVisible(true);
                return;
            }
        }
        setReticleVisible(false);
    });

    const placeObject = useCallback(() => {
        if (reticleVisible) {
            setObjects((prev) => [
                ...prev,
                { id: THREE.MathUtils.generateUUID(), matrix: reticleMatrix.current.clone(), qrData: qrCodeData },
            ]);
        }
    }, [reticleVisible, qrCodeData]);

    useEffect(() => {
        activeSession.addEventListener('select', placeObject);
        return () => activeSession.removeEventListener('select', placeObject);
    }, [activeSession, placeObject]);

    return (
        <>
            <ambientLight intensity={1.0} />
            <directionalLight position={[1, 4, 2.5]} intensity={1.2} />
            <group matrix={reticleMatrix.current} matrixAutoUpdate={false}>
                <Reticle visible={reticleVisible} matrix={reticleMatrix.current} />
            </group>
            {objects.map((obj) => (
                <group key={obj.id} matrix={obj.matrix} matrixAutoUpdate={false}>
                    <PlacedObject matrix={obj.matrix} onSelect={() => router.push(`/trivia?qrCodeData=${encodeURIComponent(obj.qrData)}`)} />
                </group>
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
