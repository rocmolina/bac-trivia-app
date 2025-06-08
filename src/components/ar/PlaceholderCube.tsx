"use client";
import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";

export function PlaceholderCube() {
  const meshRef = useRef<THREE.Mesh>(null!);
  useFrame((_state, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 0.5; // Rotación suave
    }
  });
  return (
    <mesh ref={meshRef} position={[0, 0.5, -2]} scale={0.5}>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color="dodgerblue" />
    </mesh>
  );
}
