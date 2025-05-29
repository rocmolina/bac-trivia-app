'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import { register } from '@/lib/services/api';
import Image from "next/image";

export default function RegisterPage() {
    const [nombre, setNombre] = useState('');
    const [apellido, setApellido] = useState('');
    const [cedula, setCedula] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setError(null);
        setSuccessMessage(null);
        setIsLoading(true);

        if (!nombre) { // Solo nombre es requerido. Cambio temporal.
            setError('El campo Usuario es requerido.');
            setIsLoading(false);
            return;
        }
        // De ultimo momento. No requeridos... default a empty.
        setApellido("");
        setCedula("");
        // TODO: Considerar validación de formato de cédula aquí o en backend

        try {
            console.log('Registrando:', { nombre, apellido, cedula });
            const result = await register({ nombre, apellido, cedula }); // Llamada API real
            console.log('Registro exitoso:', result);
            setSuccessMessage(`¡Registro exitoso! Tu UsuarioID es: ${result.usuarioId}. Serás redirigido para iniciar sesión.`);
            setTimeout(() => router.push('/login'), 5000); // Redirigir tras mensaje
        } catch (err: any) {
            console.error("Error de registro:", err);
            const errorMessage = err.response?.data?.error || err.message || 'Error al registrar el usuario.';
            setError(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    // return (
    //     <div className="flex items-center justify-center min-h-screen">
    //         <div className="p-8 max-w-md w-full bg-white rounded-lg shadow-md">
    //             <h2 className="text-2xl font-bold text-center text-gray-900 mb-6">
    //                 BAC Trivia - Registro
    //             </h2>
    //             <form onSubmit={handleSubmit} className="space-y-4">
    //                 <Input label="Usuario" id="nombre" type="text" value={nombre} onChange={(e) => setNombre(e.target.value)} required />
    //                 {error && <p className="text-sm text-red-600">{error}</p>}
    //                 {successMessage && <p className="text-sm text-green-600">{successMessage}</p>}
    //                 <Button type="submit" className="w-full" isLoading={isLoading} disabled={!!successMessage}>
    //                     Registrarme
    //                 </Button>
    //                 <p className="text-sm text-center text-gray-600">
    //                     ¿Ya tienes cuenta?{' '}
    //                     <a href="/login" className="font-medium text-red-600 hover:text-red-500">
    //                         Inicia sesión
    //                     </a>
    //                 </p>
    //             </form>
    //         </div>
    //     </div>
    // );

    return (
        <div className="flex items-center justify-center min-h-screen bg-red-600 text-gray-800 dark:text-gray-800">
            <div className="absolute top-8 sm:top-12">
                <Image src="/logos/bactrivia_logo.svg" alt="BAC Trivia Logo" width={140} height={40} priority />
            </div>
            <div className="p-8 max-w-md w-full bg-white rounded-lg shadow-md">
                <h2 className="text-2xl font-bold text-center text-gray-400 mb-6">
                    BAC Trivia - Registro
                </h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <Input label="Nuevo Usuario" id="nombre" type="text" value={nombre} onChange={(e) => setNombre(e.target.value)} required />
                    {error && <p className="text-sm text-red-600">{error}</p>}
                    {successMessage && <p className="text-sm text-green-600">{successMessage}</p>}
                    <Button type="submit" className="w-full bg-red-600 hover:bg-red-700 text-black font-semibold py-3" isLoading={isLoading} disabled={!!successMessage}>
                        Registrarme
                    </Button>
                    <p className="text-sm text-center text-gray-600">
                        ¿Ya tienes cuenta?{' '}
                        <a href="/login" className="font-medium text-red-600 hover:text-red-700">
                            Inicia sesión
                        </a>
                    </p>
                </form>
            </div>
            <div className="absolute bottom-4 right-4">
                <Image src="/logos/bac_logo.png" alt="BAC Logo" width={80} height={20} />
            </div>
        </div>
    );

}