// components/ui/Button.tsx
'use client'; // Si tiene interactividad como onClick

import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    children: React.ReactNode;
    variant?: 'primary' | 'secondary'; // Puedes añadir más variantes
    isLoading?: boolean;
}

const Button: React.FC<ButtonProps> = ({
                                           children,
                                           variant = 'primary',
                                           isLoading = false,
                                           className = '',
                                           ...props
                                       }) => {
    const baseStyle = "px-4 py-2 rounded font-semibold focus:outline-none focus:ring-2 focus:ring-offset-2 transition duration-150 ease-in-out";
    const variantStyle = variant === 'primary'
        ? "bg-red-600 text-white hover:bg-red-700 focus:ring-red-500" // Estilo BAC Rojo
        : "bg-gray-200 text-gray-700 hover:bg-gray-300 focus:ring-gray-500";
    const loadingStyle = isLoading ? "opacity-50 cursor-not-allowed" : "";

    return (
        <button
            className={`${baseStyle} ${variantStyle} ${loadingStyle} ${className}`}
            disabled={isLoading}
            {...props}
        >
            {isLoading ? 'Cargando...' : children}
        </button>
    );
};

export default Button;