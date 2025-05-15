// src/components/ui/GlobalAppDisabledModal.tsx
'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import useAppStatusStore from '@/lib/store/appStatusStore';
import Button from './Button';

const GlobalAppDisabledModal: React.FC = () => {
    const router = useRouter();
    const { isAppDisabledModalOpen, closeAppDisabledModal } = useAppStatusStore();

    const handleAccept = () => {
        closeAppDisabledModal();
        router.push('/login'); // Redirigir a la página de login de usuario
    };

    if (!isAppDisabledModalOpen) {
        return null;
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
            <div className="bg-white p-6 sm:p-8 rounded-xl shadow-2xl w-full max-w-md text-center">
                <svg className="w-16 h-16 text-red-500 mx-auto mb-4" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                    <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
                </svg>
                <h2 className="text-2xl font-bold text-gray-800 mb-3">Aplicación Desactivada</h2>
                <p className="text-gray-600 mb-6">
                    La aplicación está actualmente desactivada por mantenimiento o configuración.
                    Intente de nuevo más tarde.
                </p>
                <Button onClick={handleAccept} className="w-full py-3 text-lg">
                    Aceptar
                </Button>
            </div>
        </div>
    );
};

export default GlobalAppDisabledModal;