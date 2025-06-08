// components/ui/Input.tsx
"use client"; // Porque maneja estado/eventos implícitamente con props

import React from "react";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

const Input: React.FC<InputProps> = ({
  label,
  id,
  error,
  className = "",
  ...props
}) => {
  const baseStyle = `
        mt-1 block w-full px-3 py-2 
        border border-gray-300 rounded-md shadow-sm 
        focus:outline-none focus:ring-red-500 focus:border-red-500 
        sm:text-sm 
        bg-white 
        text-gray-900 
        placeholder-gray-500
        dark:bg-white 
        dark:text-gray-900 
        dark:placeholder-gray-500
    `;

  const errorStyle = error
    ? "border-red-500 focus:ring-red-500 focus:border-red-500" // Estilo de error
    : "border-gray-300 dark:border-gray-400"; // Estilo normal, añadido un borde un poco más visible en dark mode si el input es blanco

  return (
    <div data-oid="w1wqle1">
      {label && (
        <label
          htmlFor={id}
          className="block text-sm font-medium text-gray-700 dark:text-gray-300"
          data-oid="z420aoy"
        >
          {label}{" "}
          {/* El color del label también podría necesitar ajuste para modo oscuro */}
        </label>
      )}
      <input
        id={id}
        className={`${baseStyle} ${errorStyle} ${className}`}
        {...props}
        data-oid="831ni1q"
      />

      {error && (
        <p className="mt-1 text-xs text-red-600" data-oid="aq-8mdo">
          {error}
        </p>
      )}
    </div>
  );
};

// const Input: React.FC<InputProps> = ({ label, id, error, className = '', ...props }) => {
//     const baseStyle = "mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500 sm:text-sm";
//     const errorStyle = error ? "border-red-500 focus:ring-red-500 focus:border-red-500" : "border-gray-300";
//
//     return (
//         <div>
//             {label && (
//                 <label htmlFor={id} className="block text-sm font-medium text-gray-700">
//                     {label}
//                 </label>
//             )}
//             <input
//                 id={id}
//                 className={`${baseStyle} ${errorStyle} ${className}`}
//                 {...props}
//             />
//             {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
//         </div>
//     );
// };

export default Input;
