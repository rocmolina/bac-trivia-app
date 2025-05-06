// components/ui/Input.tsx
'use client'; // Porque maneja estado/eventos implícitamente con props

import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
}

const Input: React.FC<InputProps> = ({ label, id, error, className = '', ...props }) => {
    const baseStyle = "mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500 sm:text-sm";
    const errorStyle = error ? "border-red-500 focus:ring-red-500 focus:border-red-500" : "border-gray-300";

    return (
        <div>
            {label && (
                <label htmlFor={id} className="block text-sm font-medium text-gray-700">
                    {label}
                </label>
            )}
            <input
                id={id}
                className={`${baseStyle} ${errorStyle} ${className}`}
                {...props}
            />
            {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
        </div>
    );
};

export default Input;