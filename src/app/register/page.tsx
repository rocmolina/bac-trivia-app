// src/app/register/page.tsx
"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { register } from "@/lib/services/api";
import Image from "next/image";

export default function RegisterPage() {
  const [nombre, setNombre] = useState("");
  const [apellido, setApellido] = useState(""); // Kept for potential future use, but not required for now
  const [cedula, setCedula] = useState(""); // Kept for potential future use, but not required for now
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRegistrationComplete, setIsRegistrationComplete] = useState(false); // New state
  const router = useRouter();

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setIsRegistrationComplete(false); // Reset completion state on new submission
    setIsLoading(true);

    if (!nombre.trim()) {
      setError("El campo Usuario es requerido.");
      setIsLoading(false);
      return;
    }

    // As per previous logic, apellido and cedula are defaulted to empty strings if not used.
    // For this example, we'll keep them in the state but not require them in the form explicitly
    // unless we plan to re-add those fields.
    const currentApellido = apellido.trim() || ""; // Default to empty if not provided
    const currentCedula = cedula.trim() || ""; // Default to empty if not provided

    try {
      console.log("Registrando:", {
        nombre: nombre.trim(),
        apellido: currentApellido,
        cedula: currentCedula,
      });
      const result = await register({
        nombre: nombre.trim(),
        apellido: currentApellido,
        cedula: currentCedula,
      }); //
      console.log("Registro exitoso:", result);
      setSuccessMessage(
        `¡Registro exitoso! Tu UsuarioID es: ${result.usuarioId}. Ahora puedes iniciar sesión.`,
      ); //
      setIsRegistrationComplete(true); // Mark registration as complete to show the button
      // NO automatic redirect: setTimeout(() => router.push('/login'), 5000);
    } catch (err: any) {
      console.error("Error de registro:", err);
      const errorMessage =
        err.response?.data?.error ||
        err.message ||
        "Error al registrar el usuario."; //
      setError(errorMessage);
      setIsRegistrationComplete(true); // Also mark as complete to show button even on error
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoToLogin = () => {
    router.push("/login");
  };

  return (
    <div className="flex items-center min-h-screen bg-red-500 text-gray-800 dark:text-gray-800 flex-col justify-start p-[16px]">
      {" "}
      {/* */}
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
      <div className="max-w-md w-full bg-white rounded-lg shadow-md flex flex-col justify-center p-[24px]">
        {" "}
        {/* */}
        <h2 className="text-2xl font-bold text-center mb-6 text-[#000000]">
          {" "}
          {/* */}
          Registrate
        </h2>
        {/* Show messages and "Go to Login" button if registration attempt is complete */}
        {isRegistrationComplete ? (
          <div className="space-y-4 text-center">
            {successMessage && (
              <div className="p-3 bg-green-100 border border-green-300 rounded-md text-green-700 text-sm">
                {successMessage}
              </div>
            )}
            {error && (
              <div className="p-3 bg-red-100 border border-red-300 rounded-md text-red-700 text-sm">
                {error}
              </div>
            )}
            <Button
              onClick={handleGoToLogin}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-3" // Changed text color to white for better contrast on red
            >
              Ir a Iniciar Sesión
            </Button>
          </div> // Show registration form if registration attempt is not yet complete
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Nuevo Usuario"
              id="nombre"
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              required
              disabled={isLoading}
            />
            {/* */}
            {/* If we want to re-enable Apellido and Cedula inputs, we can uncomment them here.
            We also need to make sure to also adjust the `handleSubmit` logic if they become required.
            <Input
            label="Apellido (Opcional)"
            id="apellido"
            type="text"
            value={apellido}
            onChange={(e) => setApellido(e.target.value)}
            disabled={isLoading}
            />
            <Input
            label="Cédula (Opcional)"
            id="cedula"
            type="text"
            value={cedula}
            onChange={(e) => setCedula(e.target.value)}
            disabled={isLoading}
            />
            */}
            {error && <p className="text-sm text-red-600">{error}</p>}{" "}
            {/* This error is for form validation before submission */}
            <Button
              type="submit"
              className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-3" // Changed text color to white
              isLoading={isLoading}
              disabled={isLoading}
            >
              Registrarme
            </Button>
            <p className="text-sm text-center text-gray-600">
              {" "}
              {/* */}
              ¿Ya tienes cuenta?{" "}
              <a
                href="/login"
                className="font-medium text-red-600 hover:text-red-700 underline"
              >
                {" "}
                {/* */}
                Inicia sesión
              </a>
            </p>
          </form>
        )}
        <div className="relative top-auto right-auto bottom-auto left-auto flex items-center justify-center">
          <Image
            src="/logos/bac_logo.png"
            alt="BAC Logo"
            width={80}
            height={20}
            className="w-auto mt-[16px]"
          />{" "}
          {/* */}
        </div>
      </div>
    </div>
  );
}
