// components/ui/Button.tsx
"use client";

import React from "react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: "primary" | "secondary";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
}

const Button: React.FC<ButtonProps> = ({
  children,
  variant = "primary",
  size = "md", // Tamaño por defecto será 'md'
  isLoading = false,
  className = "",
  ...props
}) => {
  const baseStyle =
    "font-semibold focus:outline-none focus:ring-2 focus:ring-offset-2 transition duration-150 ease-in-out rounded-full"; // Moví 'rounded' aquí

  const variantStyle =
    variant === "primary"
      ? "bg-red-600 text-white hover:bg-red-700 focus:ring-red-500" // Estilo BAC Rojo
      : "bg-gray-200 text-gray-700 hover:bg-gray-300 focus:ring-gray-500";

  // Estilos para diferentes tamaños
  let sizeStyle = "";
  switch (size) {
    case "sm":
      sizeStyle = "px-3 py-1.5 text-xs"; // Más pequeño
      break;
    case "lg":
      sizeStyle = "px-6 py-3 text-lg"; // Más grande
      break;
    case "md": // Tamaño mediano por defecto
    default:
      sizeStyle = "px-4 py-2 text-sm"; // El que teníamos antes como base
      break;
  }

  const loadingStyle = isLoading ? "opacity-50 cursor-not-allowed" : "";

  return (
    <button
      className={`${baseStyle} ${variantStyle} ${sizeStyle} ${loadingStyle} ${className}`}
      disabled={isLoading}
      {...props}
      data-oid="xvs.p:2"
    >
      {isLoading ? "Cargando..." : children}
    </button>
  );
};

export default Button;
