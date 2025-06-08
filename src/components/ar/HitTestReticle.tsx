// src/components/ar/HitTestReticle.tsx
"use client";

import React from "react";
import { Ring } from "@react-three/drei";
import * as THREE from "three";

interface HitTestReticleProps {
  visible: boolean;
  matrix: THREE.Matrix4 | undefined;
}

const HitTestReticle: React.FC<HitTestReticleProps> = ({ visible, matrix }) => {
  if (!visible || !matrix) {
    return null;
  }

  return (
    <group matrixAutoUpdate={false} matrix={matrix}>
      <Ring args={[0.05, 0.075, 32]} rotation={[-Math.PI / 2, 0, 0]}>
        <meshBasicMaterial color="white" opacity={0.75} transparent={true} />
      </Ring>
    </group>
  );
};

export default HitTestReticle;
