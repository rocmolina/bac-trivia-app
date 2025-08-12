"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { login } from "@/lib/services/api"; // Importar desde servicio API
import useUserStore from "@/lib/store/userStore"; // Importar desde store Zustand
import Image from "next/image";

export default function LoginPage() {
  const [usuarioId, setUsuarioId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const storeLogin = useUserStore((state) => state.login); // Obtener acción del store

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsLoading(true);

    if (!usuarioId) {
      setError("El UsuarioID es requerido.");
      setIsLoading(false);
      return;
    }

    try {
      console.log("Intentando iniciar sesión con UsuarioID:", usuarioId);
      const userData = await login(usuarioId); // Llamada API real
      console.log("Login exitoso:", userData);
      storeLogin(userData); // Guardar en store (userData debe coincidir con UserState)
      router.push("/profile"); // Redirigir a perfil si login éxito
    } catch (err: any) {
      console.error("Error de login:", err);
      const errorMessage =
        err.response?.data?.error ||
        err.message ||
        "Error al iniciar sesión. Verifica tu UsuarioID.";
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-full w-full flex flex-col items-center bg-red-500 p-3">
      <div className="relative w-full h-[400px]">
        <Image
          src="/logos/lightrays.png"
          alt="BAC Trivia Logo"
          width={80}
          height={35}
          className="absolute left-0 top-1/2 -translate-y-1/2 w-full"
        />

        <Image
          src="/logos/bactrivia_logo.svg"
          alt="BAC Trivia Logo"
          width={140}
          height={40}
          priority
          className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 auto z-10 drop-shadow-xl w-[164px]"
        />
      </div>
      <div className="w-full flex flex-1 items-center justify-center relative">
        <div className="w-full max-w-md bg-white rounded-lg shadow-md flex flex-col justify-center items-center gap-[normal] p-[24px] relative ">
          <h2 className="text-2xl font-bold text-center mb-6 border-0 border-[#00000000] text-[#000000]">
            {" "}
            {/* Texto gris */}
            Iniciar sesión
          </h2>
          <form
            onSubmit={handleSubmit}
            className="space-y-4 relative top-auto right-auto bottom-auto left-auto w-full flex flex-col gap-[8px]"
          >
            <Input
              label="ID de Usuario:"
              id="usuarioId"
              type="text"
              value={usuarioId}
              onChange={(e) => setUsuarioId(e.target.value)}
              placeholder="usuario..."
              required
              error={error && error.includes("UsuarioID") ? error : undefined}
            />

            {error && <p className="text-sm text-red-600">{error}</p>}
            <Button
              type="submit"
              className="w-full bg-red-600 hover:bg-red-700 text-gray-500 font-bold py-3"
              isLoading={isLoading}
            >
              Iniciar sesión
            </Button>
            <p className="text-sm text-center text-gray-600">
              ¿No tienes usuario?{" "}
              <a
                href="/register"
                className="font-medium text-red-600 hover:text-red-700 underline"
              >
                {" "}
                {/* Enlace rojo */}
                Regístrate aquí
              </a>
            </p>
          </form>
          <div className="relative top-auto right-auto bottom-auto left-auto flex justify-center items-center h-[fit-content] w-full mt-[24px]">
            <Image
              src="/logos/bac_logo.png"
              alt="BAC Logo"
              width={80}
              height={20}
              className="relative top-auto right-auto bottom-auto left-auto h-[31px] m-0"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
