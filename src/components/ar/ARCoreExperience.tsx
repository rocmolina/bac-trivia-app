// src/components/ar/ARCoreExperience.tsx
"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { Canvas, useThree, useFrame, ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";
import { useRouter } from "next/navigation";
import { Image as DreiImage } from "@react-three/drei";

// Helper function (getCategoryFromQrData) remains the same
const getCategoryFromQrData = (qrData: string): string | null => {
  if (!qrData) return null;
  const parts = qrData.toLowerCase().split("_");
  if (parts.length >= 2) {
    const categoryPart = parts[1];
    if (categoryPart.includes("ahorro")) return "ahorro";
    if (categoryPart.includes("tarjeta")) return "tarjeta";
    if (categoryPart.includes("casa")) return "casa";
    if (categoryPart.includes("carro")) return "carro";
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

  if (!visible) return null; // Optimization: don't render if not visible

  return (
    <mesh
      ref={ref}
      matrixAutoUpdate={false}
      rotation-x={-Math.PI / 2}
      data-oid="umms2qb"
    >
      <ringGeometry args={[0.08, 0.1, 32]} data-oid="22p-dj7" />
      <meshBasicMaterial
        color="lime"
        opacity={0.9}
        transparent={true}
        depthTest={false}
        data-oid="5ss:eh5"
      />
    </mesh>
  );
};

// --- Componente PlacedObject (PlacedObjectProps and PlacedObject component remain the same) ---
interface PlacedObjectProps {
  matrix: THREE.Matrix4;
  onSelectFallback: () => void;
  qrDataForDebug?: string;
}
const PlacedObject: React.FC<PlacedObjectProps> = ({
  matrix,
  onSelectFallback,
  qrDataForDebug,
}) => {
  const meshRef = useRef<THREE.Mesh>(null!);

  useEffect(() => {
    if (meshRef.current) {
      meshRef.current.matrixAutoUpdate = false;
      meshRef.current.matrix.copy(matrix);
    }
  }, [matrix]);

  const handleClick = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation(); // Prevent event from bubbling up if needed
    console.log(
      `PlacedObject (SVG): onClick INTERNO. QR: ${qrDataForDebug}. Calling onSelectFallback.`,
    );
    onSelectFallback();
  };

  const categoryName = qrDataForDebug
    ? getCategoryFromQrData(qrDataForDebug)
    : null;
  const svgUrl = categoryName
    ? `/icons/${categoryName}.svg`
    : "/icons/default.svg";
  const planeSize = 0.3; // Size of the plane in AR world units

  return (
    <mesh
      ref={meshRef}
      matrixAutoUpdate={false} // Matrix is applied from props
      onClick={handleClick}
      // The rotation here is to orient the plane. If hitTest matrix provides full orientation, this might need adjustment.
      // For a typical hit test on a horizontal surface, the plane (image) might need to be rotated to face the camera or upwards.
      // -Math.PI should make it face "up" if placed on a floor relative to its local Y being up.
      // If it appears upside down or incorrectly rotated, this is a key place to adjust.
      rotation-x={-Math.PI / 2} // Often needed to make a plane lay flat from default Z-up
      data-oid="cyto-a:"
    >
      <planeGeometry args={[planeSize, planeSize]} data-oid="z_jwjdz" />
      <React.Suspense
        fallback={
          <meshBasicMaterial
            color="lightgray"
            wireframe={true}
            data-oid="tfadzik"
          />
        }
        data-oid="wbrt3o-"
      >
        <DreiImage
          url={svgUrl}
          transparent // Important for SVGs with transparent backgrounds
          toneMapped={false} // Often better for UI elements / icons
          data-oid="rsta_0p"
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

const ARScene: React.FC<ARSceneProps> = ({
  activeSession,
  qrCodeData,
  onExit,
}) => {
  const router = useRouter();
  const { gl } = useThree();
  const [hitTestSource, setHitTestSource] = useState<XRHitTestSource | null>(
    null,
  );
  const [referenceSpace, setReferenceSpace] = useState<XRReferenceSpace | null>(
    null,
  );
  const reticleMatrix = useRef(new THREE.Matrix4());
  const [isHitTestSurfaceFound, setIsHitTestSurfaceFound] = useState(false);
  const [objects, setObjects] = useState<
    { id: string; matrix: THREE.Matrix4; qrData: string }[]
  >([]);

  // --- Session Setup and Teardown Effect ---
  useEffect(() => {
    let isMounted = true;
    console.log(
      "ARScene: Mounting and configuring session:",
      activeSession ? activeSession : "No session",
    );
    gl.xr.enabled = true;
    gl.xr
      .setSession(activeSession)
      .then(async () => {
        if (!isMounted) return;
        console.log("ARScene: XR session set on renderer.");
        try {
          const refSpace =
            await activeSession.requestReferenceSpace("local-floor");
          if (isMounted) {
            setReferenceSpace(refSpace);
            console.log("ARScene: 'local-floor' reference space obtained.");
          }
        } catch (err) {
          console.warn("ARScene: 'local-floor' failed, trying 'local'.", err);
          try {
            const refSpaceLocal =
              await activeSession.requestReferenceSpace("local");
            if (isMounted) {
              setReferenceSpace(refSpaceLocal);
              console.log("ARScene: 'local' reference space obtained.");
            }
          } catch (localErr) {
            console.error(
              "ARScene: Failed to get any reference space.",
              localErr,
            );
            if (isMounted) onExit();
          }
        }
      })
      .catch((err) => {
        if (isMounted) {
          console.error("ARScene: Fatal error setting session.", err);
          onExit();
        }
      });

    const handleSessionEnd = () => {
      if (!isMounted) return; // Guard against calls after unmount
      console.log("ARScene: XRSession 'end' event received.");
      if (hitTestSource?.cancel) {
        try {
          hitTestSource.cancel();
        } catch (e) {
          console.warn(
            "ARScene: Error cancelling hitTestSource on session end:",
            e,
          );
        }
      }
      setHitTestSource(null);
      setReferenceSpace(null);
      setObjects([]);
      setIsHitTestSurfaceFound(false);
      // onExit will be called by PlayPageContent or similar logic when session actually ends
      // This handler is for the session's own 'end' event.
      // We call onExit here to ensure PlayPageContent is notified to reset its state.
      onExit();
    };
    activeSession.addEventListener("end", handleSessionEnd);

    return () => {
      isMounted = false;
      console.log("ARScene: Unmounting.");
      activeSession.removeEventListener("end", handleSessionEnd);
      if (hitTestSource?.cancel) {
        // Ensure hitTestSource is cancelled on unmount
        try {
          hitTestSource.cancel();
        } catch (e) {
          console.warn(
            "ARScene: Error cancelling hitTestSource on unmount:",
            e,
          );
        }
      }
    };
  }, [activeSession, gl, onExit]); // onExit is a dependency now

  // --- Hit Test Source Setup Effect ---
  useEffect(() => {
    if (!activeSession || !referenceSpace) {
      if (hitTestSource) {
        // If session/refSpace lost, cleanup existing hitTestSource
        try {
          hitTestSource.cancel();
        } catch (e) {
          console.warn("ARScene: Error cancelling stale hitTestSource", e);
        }
        setHitTestSource(null);
      }
      return;
    }
    // If we already have a hitTestSource, and session/refSpace are still valid, don't re-create
    if (hitTestSource) return;

    let isEffectMounted = true;
    const setupHitTest = async () => {
      try {
        const viewerSpace = await activeSession.requestReferenceSpace("viewer");
        if (!isEffectMounted || !activeSession.requestHitTestSource) return; // Guard
        const source = await activeSession.requestHitTestSource({
          space: viewerSpace,
        });
        if (source && isEffectMounted) {
          console.log("ARScene: Hit test source obtained.");
          setHitTestSource(source);
        } else if (!isEffectMounted && source?.cancel) {
          source.cancel(); // Cleanup if unmounted before set
        }
      } catch (err) {
        console.error("ARScene: Error configuring HitTest:", err);
        if (isEffectMounted) setHitTestSource(null);
      }
    };
    setupHitTest();
    return () => {
      isEffectMounted = false;
      // Cleanup of hitTestSource is typically handled by its .cancel() method directly
      // or when the session ends. If it's still active here, cancel it.
      if (hitTestSource) {
        // && hitTestSource.cancel) {
        try {
          setHitTestSource(null);
        } catch (e) {
          console.warn(
            "ARScene: Error cancelling hitTestSource in effect cleanup",
            e,
          );
        }
        // setHitTestSource(null); // This would be set by the session end or main cleanup
      }
    };
  }, [activeSession, referenceSpace, hitTestSource]); // Added hitTestSource to dependencies to manage its lifecycle

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
    console.log(
      "ARScene: 'select' event (tap) detected by placeObjectOrNavigate.",
    );

    if (objects.length > 0) {
      // An object is already placed, this is the second tap.
      console.log(
        "ARScene: Object already placed. Attempting to navigate to trivia.",
      );
      const currentObject = objects[0];
      if (currentObject && currentObject.qrData) {
        const targetQrData = currentObject.qrData;
        console.log(
          `ARScene: Preparing to navigate to /trivia with qrCodeData: ${targetQrData}.`,
        );

        if (!router) {
          console.error("ARScene: Router not available! Cannot navigate.");
          alert("Error: Router not available for navigation.");
          return;
        }

        // Defer navigation slightly using setTimeout to allow the current event cycle to complete.
        // This can help with stability on some mobile browsers/WebViews, especially with XR.
        setTimeout(() => {
          console.log(
            `ARScene: Executing router.push via setTimeout to /trivia?qrCodeData=${encodeURIComponent(targetQrData)}`,
          );
          try {
            router.push(
              `/trivia?qrCodeData=${encodeURIComponent(targetQrData)}`,
            );
            // After router.push, the browser will handle page transition.
            // The AR session should be automatically ended by the browser as the page unloads or changes.
            // The 'end' event listener on the XRSession instance is responsible for final cleanup
            // (like calling onExit which resets PlayPageContent).
          } catch (e) {
            console.error("ARScene: Error during router.push:", e);
            alert("Error: Could not navigate to trivia page.");
          }
        }, 0); // 0ms delay
      } else {
        console.error(
          "ARScene: Cannot navigate, current object or its qrData is missing.",
        );
        alert("Error: Object information missing for trivia.");
      }
      return; // Exit after initiating navigation
    }

    // No object placed yet, this is the first tap. Place the object.
    if (isHitTestSurfaceFound && reticleMatrix.current) {
      console.log(
        `ARScene: Reticle indicates surface found. Placing the object with qrData: ${qrCodeData}`,
      );
      const newObject = {
        id: THREE.MathUtils.generateUUID(),
        matrix: reticleMatrix.current.clone(),
        qrData: qrCodeData,
      };
      setObjects([newObject]); // This will trigger a re-render
      // Reticle will be hidden on the next render pass because objects.length will be > 0
    } else {
      console.warn(
        "ARScene: Cannot place object - hit-test surface not found or reticle matrix not ready.",
      );
    }
  }, [objects, isHitTestSurfaceFound, qrCodeData, router]); // Dependencies for the callback

  // --- Event Listener for Taps ---
  useEffect(() => {
    if (activeSession && gl.xr.isPresenting) {
      console.log("ARScene: Adding 'select' event listener to AR session.");
      activeSession.addEventListener("select", placeObjectOrNavigate);
      return () => {
        console.log(
          "ARScene: Removing 'select' event listener from AR session.",
        );
        activeSession.removeEventListener("select", placeObjectOrNavigate);
      };
    }
  }, [activeSession, placeObjectOrNavigate, gl.xr.isPresenting]);

  // Determine if the reticle should be rendered
  const shouldRenderReticle = isHitTestSurfaceFound && objects.length === 0;

  return (
    <>
      <ambientLight intensity={1.0} data-oid="nfu5jyg" />
      <directionalLight
        position={[1, 4, 2.5]}
        intensity={1.2}
        data-oid="f213vh0"
      />

      {/* Conditionally render Reticle based on shouldRenderReticle */}
      {shouldRenderReticle && (
        <Reticle
          visible={true}
          matrix={reticleMatrix.current}
          data-oid="sh14iqe"
        />
      )}

      {objects.map((obj) => (
        <PlacedObject
          key={obj.id}
          matrix={obj.matrix}
          qrDataForDebug={obj.qrData}
          onSelectFallback={() => {
            console.warn(
              `ARScene: PlacedObject onSelectFallback invoked for ${obj.qrData}. This should not be the primary navigation trigger.`,
            );
          }}
          data-oid="z7rl1qx"
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
const ARCoreExperience: React.FC<ARCoreExperienceProps> = ({
  activeSession,
  qrCodeData,
  onExit,
}) => {
  const handleOverlayClick = useCallback(() => {
    console.log(
      "ARCoreExperience: Overlay onClick. Dispatching 'select' event to XR session.",
    );
    if (activeSession && typeof activeSession.dispatchEvent === "function") {
      const selectEvent = new Event("select");
      activeSession.dispatchEvent(selectEvent);
    } else {
      console.warn(
        "ARCoreExperience: Cannot dispatch 'select'. Session not active or dispatchEvent not available.",
      );
    }
  }, [activeSession]);

  return (
    <>
      <Canvas
        gl={{ antialias: true, alpha: true }}
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100vw",
          height: "100vh",
          zIndex: 1,
        }}
        camera={{ fov: 70, near: 0.01, far: 20 }}
        data-oid="844h46p"
      >
        <ARScene
          activeSession={activeSession}
          qrCodeData={qrCodeData}
          onExit={onExit}
          data-oid="i7h_uqu"
        />
      </Canvas>
      <div
        onClick={handleOverlayClick}
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100vw",
          height: "100vh",
          zIndex: 2,
          WebkitTapHighlightColor: "transparent",
        }}
        data-oid="bpfkc0w"
      />
    </>
  );
};

export default ARCoreExperience;
