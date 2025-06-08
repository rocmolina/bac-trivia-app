// src/components/auth/ProtectedRoute.tsx
"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import useUserStore from "@/lib/store/userStore"; // Asegúrate que la ruta sea correcta

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const router = useRouter();
  // Suscribirse al estado de autenticación
  const isAuthenticated = useUserStore((state) => state.isAuthenticated);
  const persist = useUserStore.persist;

  // Estados: 'initial', 'loading', 'authenticated', 'unauthenticated'
  type Status = "initial" | "loading" | "authenticated" | "unauthenticated";
  const [status, setStatus] = useState<Status>("initial");

  useEffect(() => {
    console.log(
      `ProtectedRoute Effect [Auth Check]: Running. Current hook isAuthenticated: ${isAuthenticated}, Current Status: ${status}`,
    );

    // Verificar si el middleware persist está listo
    if (!persist || typeof persist.hasHydrated !== "function") {
      console.warn(
        "ProtectedRoute: Persist middleware not ready. Relying on initial hook state.",
      );
      setStatus(isAuthenticated ? "authenticated" : "unauthenticated");
      return;
    }

    // Esperar a que termine la hidratación si aún no ha ocurrido
    if (!persist.hasHydrated()) {
      console.log(
        "ProtectedRoute: Store not hydrated yet, setting status to loading and waiting.",
      );
      // Establecer estado de carga mientras esperamos
      // Importante: No establecer a 'unauthenticated' aquí prematuramente
      if (status !== "loading") {
        // Evitar bucle si ya está en loading
        setStatus("loading");
      }
      const unsub = persist.onFinishHydration(() => {
        console.log("ProtectedRoute: Hydration finished via callback.");
        // Una vez hidratado, el estado global se actualiza,
        // lo que hará que este efecto se ejecute de nuevo (debido a la dependencia de isAuthenticated).
        // No necesitamos hacer nada más aquí excepto desuscribirnos.
        unsub();
      });
      return; // Salir hasta que se hidrate
    }

    // --- Si llegamos aquí, el store YA está hidratado ---
    console.log("ProtectedRoute: Store is hydrated.");
    // Determinar el estado basado en el valor actual suscrito
    setStatus(isAuthenticated ? "authenticated" : "unauthenticated");
  }, [isAuthenticated, persist, status]); // Incluir status para re-evaluar si cambia (ej. de loading)

  useEffect(() => {
    // EFECTO SEPARADO PARA REDIRECCIONAR basado únicamente en el estado determinado
    console.log(
      `ProtectedRoute Effect [Redirect Check]: Running. Status: ${status}`,
    );
    if (status === "unauthenticated") {
      console.log("ProtectedRoute: Redirecting to /login...");
      router.replace("/login");
    }
  }, [status, router]);

  // --- Lógica de Renderizado ---
  if (status === "initial" || status === "loading") {
    console.log(`ProtectedRoute Render: Loading state (Status: ${status})`);
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Verificando sesión...</p>
      </div>
    );
  }

  if (status === "authenticated") {
    // Doble chequeo por seguridad, aunque el status debería ser la fuente de verdad
    if (!isAuthenticated) {
      console.log(
        "ProtectedRoute Render: Status='authenticated' pero hook dice !isAuthenticated. Mostrando fallback.",
      );
      return (
        <div className="flex items-center justify-center min-h-screen">
          <p>Redirigiendo...</p>
        </div>
      );
    }
    console.log(
      "ProtectedRoute Render: Rendering children (Status: authenticated)",
    );
    return <>{children}</>;
  }

  // Si status es 'unauthenticated'
  console.log(
    "ProtectedRoute Render: Redirecting state (Status: unauthenticated)",
  );
  return (
    <div className="flex items-center justify-center min-h-screen">
      <p>Redirigiendo...</p>
    </div>
  );
};

export default ProtectedRoute;
