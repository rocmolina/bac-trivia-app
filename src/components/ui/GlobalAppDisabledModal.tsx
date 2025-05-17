// src/components/ui/GlobalAppDisabledModal.tsx
'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import useAppStatusStore from '@/lib/store/appStatusStore';
import Button from './Button';
import Image from 'next/image'; // Importar Image para el logo si se decide añadir

const GlobalAppDisabledModal: React.FC = () => {
    const router = useRouter();
    const { isAppDisabledModalOpen, closeAppDisabledModal } = useAppStatusStore();

    const handleAccept = () => {
        closeAppDisabledModal();
        router.push('/login');
    };

    if (!isAppDisabledModalOpen) {
        return null;
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-[9999] p-4"> {/* z-index muy alto */}
            <div className="bg-white p-6 sm:p-8 rounded-xl shadow-2xl w-full max-w-md text-center text-gray-800"> {/* Fondo blanco, texto base oscuro */}
                {/* Ícono de Alerta Rojo (Estándar de Tailwind/Heroicons) */}
                <svg className="w-16 h-16 text-red-600 mx-auto mb-4" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                    <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
                </svg>
                <h2 className="text-2xl font-bold text-gray-900 mb-3"> {/* Texto oscuro */}
                    Aplicación Desactivada
                </h2>
                <p className="text-gray-600 mb-6 px-4">
                    La aplicación está actualmente desactivada por mantenimiento o configuración.
                    Intente de nuevo más tarde.
                </p>
                <Button
                    onClick={handleAccept}
                    className="w-full py-3 text-lg bg-yellow-400 hover:bg-yellow-500 text-black font-semibold" /* Botón amarillo, texto negro */
                >
                    Aceptar
                </Button>
            </div>
        </div>
    );
};

export default GlobalAppDisabledModal;