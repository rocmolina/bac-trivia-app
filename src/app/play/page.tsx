"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation"; // Needed for routing
import Button from "@/components/ui/Button";

declare global {
  interface Window {
    XRIFrame: {
      registerXRIFrame: (id: string) => void;
    };
  }
}

const IFRAME_ID = "my-iframe";
const CONTROLS_ID = "iframeControls";
const LOGO_ID = "poweredByLogo";
const INNER_FRAME_URL = "https://bactrivia.8thwall.app/bactrivia/";

const WebARViewer = () => {
  const router = useRouter();

  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://cdn.8thwall.com/web/iframe/iframe.js";
    script.async = true;

    script.onload = () => {
      if (window.XRIFrame) {
        window.XRIFrame.registerXRIFrame(IFRAME_ID);
      }

      const controls = document.getElementById(CONTROLS_ID);
      const poweredByLogo = document.getElementById(LOGO_ID);

      window.addEventListener("message", (event) => {
        // Por seguridad, verifica el origen del mensaje (ajusta el dominio a tu iframe real)
        // if (event.origin !== 'https://bactrivia.8thwall.app') return;

        const { qrCodeData, type, path } = event.data || {};

        // Procesar qrCodeData si existe
        if (qrCodeData) {
          console.log("Dato recibido desde iframe:", qrCodeData);
          // Aquí puedes hacer algo con qrCodeData
        }

        // Manejar mensaje de navegación
        if (type === "navigate" && typeof path === "string") {
          router.push(path);
          return;
        }

        // Manejar mensaje acceptedCamera
        if (event.data === "acceptedCamera") {
          if (controls) {
            controls.style.opacity = "0";

            const styleCleanup = setTimeout(() => {
              if (poweredByLogo) poweredByLogo.style.display = "none";
              controls.style.display = "block";
            }, 300);

            const uiFadeIn = setTimeout(() => {
              controls.classList.add("fade-in");
            }, 800);

            setTimeout(() => {
              clearTimeout(styleCleanup);
              clearTimeout(uiFadeIn);
            }, 900);
          }
          return;
        }
      });
    };

    document.body.appendChild(script);
    return () => {
      document.body.removeChild(script);
    };
  }, [router]);

  return (
    <div className="relative">
      <iframe
        id={IFRAME_ID}
        title="8th Wall AR"
        src={INNER_FRAME_URL}
        allow="camera;gyroscope;accelerometer;magnetometer;xr-spatial-tracking;microphone;"
        allowFullScreen
        style={{
          border: "none",
          width: "100%",
          height: "100vh",
          margin: 0,
          padding: 0,
          display: "block",
        }}
      />

      <Button
        className="fixed bottom-8 left-1/2 transform -translate-x-1/2"
        onClick={() => router.push("/profile")}
      >
        Back to Menu
      </Button>
    </div>
  );
};

export default WebARViewer;
