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

  // return (
  //     <div className="flex items-center justify-center min-h-screen">
  //         <div className="p-8 max-w-md w-full bg-white rounded-lg shadow-md">
  //             <h2 className="text-2xl font-bold text-center text-gray-900 mb-6">
  //                 BAC Trivia - Iniciar Sesión
  //             </h2>
  //             <form onSubmit={handleSubmit} className="space-y-4">
  //                 <Input
  //                     label="UsuarioID (Ej: Nombre-Numero)"
  //                     id="usuarioId"
  //                     type="text"
  //                     value={usuarioId}
  //                     onChange={(e) => setUsuarioId(e.target.value)}
  //                     placeholder="TuUsuario-123"
  //                     required
  //                     error={error && error.includes('UsuarioID') ? error : undefined}
  //                 />
  //                 {error && ( // Mostrar error general si no es específico del campo
  //                     <p className="text-sm text-red-600">{error}</p>
  //                 )}
  //                 <Button type="submit" className="w-full" isLoading={isLoading}>
  //                     Ingresar
  //                 </Button>
  //                 <p className="text-sm text-center text-gray-600">
  //                     ¿No tienes cuenta?{' '}
  //                     <a href="/register" className="font-medium text-red-600 hover:text-red-500">
  //                         Regístrate aquí
  //                     </a>
  //                 </p>
  //             </form>
  //         </div>
  //     </div>
  // );

  return (
    <div className="flex items-center min-h-screen bg-red-500 text-gray-800 dark:text-gray-800 flex-col justify-start p-[16px]">
      <div className="sm:top-12 relative top-auto right-auto bottom-auto left-auto w-full h-[408px]">
        <Image
          src="/logos/lightrays.png"
          alt="BAC Trivia Logo"
          width={80}
          height={35}
          className="w-[537px] h-[409px]"
        />

        <Image
          src="/logos/bactrivia_logo.svg"
          alt="BAC Trivia Logo"
          width={140}
          height={40}
          priority
          className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 auto z-10 drop-shadow-xl rounded-lg w-[35%] max-w-md"
        />
      </div>
      <div className="max-w-md w-full bg-white rounded-lg shadow-md flex flex-col justify-center items-center gap-[normal] p-[24px]">
        <h2 className="text-2xl font-bold text-center mb-6 border-0 border-[#00000000] text-[#000000]">
          {" "}
          {/* Texto gris */}
          Iniciar Sesión
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
            placeholder="usuario-123..."
            required
            error={error && error.includes("UsuarioID") ? error : undefined}
          />

          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button
            type="submit"
            className="w-full bg-red-600 hover:bg-red-700 text-gray-500 font-bold py-3"
            isLoading={isLoading}
          >
            Iniciar Sesión
          </Button>
          <p className="text-sm text-center text-gray-600">
            ¿No tienes cuenta?{" "}
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
  );
}
