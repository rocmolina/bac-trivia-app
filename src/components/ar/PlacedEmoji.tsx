// src/components/ar/PlacedEmoji.tsx
"use client";

import React, { useState } from "react";
import { Box } from "@react-three/drei";
import * as THREE from "three";
import { useRouter } from "next/navigation";
// Interactive ya no se usa, los eventos se manejan directamente en el mesh/group.

interface PlacedEmojiProps {
  position: THREE.Vector3Tuple;
  quaternion: THREE.QuaternionTuple;
  qrCodeData: string;
  category: string;
}

const PlacedEmoji: React.FC<PlacedEmojiProps> = ({
  position,
  quaternion,
  qrCodeData,
  category,
}) => {
  const router = useRouter();
  const [hovered, setHovered] = useState(false);
  const [color] = useState(Math.random() * 0xffffff); // Color aleatorio para diferenciar, mantenido con useState

  const handleSelect = () => {
    console.log(
      `Emoji seleccionado con qrCodeData: ${qrCodeData}, categoría: ${category}`,
    );
    router.push(`/trivia?qrCodeData=${encodeURIComponent(qrCodeData)}`);
  };

  return (
    <group
      position={position}
      quaternion={quaternion}
      onClick={handleSelect} // Evento de R3F para el tap/click
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
      scale={hovered ? 1.2 : 1} // Aplicamos la escala al grupo para que afecte a todos sus hijos
      data-oid="yhb32d."
    >
      <Box
        args={[0.2, 0.2, 0.2]}
        // La escala ya se maneja en el grupo
        data-oid="eax92pd"
      >
        <meshStandardMaterial
          color={hovered ? "hotpink" : new THREE.Color(color)}
          data-oid="vj6tqy."
        />
      </Box>
      {/* Podrías añadir un <Text> de @react-three/drei aquí para mostrar la categoría si es necesario */}
    </group>
  );
};

export default PlacedEmoji;
