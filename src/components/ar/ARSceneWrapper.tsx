'use client';
import React from 'react';
import { Canvas } from '@react-three/fiber';
// import { OrbitControls } from '@react-three/drei';

const ARSceneWrapper = ({ children }: { children: React.ReactNode }) => {
    // Este wrapper solo configura el Canvas 3D base
    // La lógica WebXR se añadirá aquí o en componentes hijos más adelante
    return (
        <Canvas style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: -1 }}>
            <ambientLight intensity={1.0} />
            <pointLight position={[5, 10, 5]} intensity={50}/>
            {children} {/* Para renderizar objetos 3D específicos */}
            {/* <OrbitControls /> */} {/* Útil para debug fuera de modo AR */}
        </Canvas>
    );
};
export default ARSceneWrapper;