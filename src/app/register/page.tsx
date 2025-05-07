'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import { register } from '@/lib/services/api'; // Importar desde servicio API

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

        if (!nombre || !apellido || !cedula) {
            setError('Todos los campos son requeridos.');
            setIsLoading(false);
            return;
        }
        // TODO: Considerar validación de formato de cédula aquí o en backend

        try {
            console.log('Registrando:', { nombre, apellido, cedula });
            const result = await register({ nombre, apellido, cedula }); // Llamada API real
            console.log('Registro exitoso:', result);
            setSuccessMessage(`¡Registro exitoso! Tu UsuarioID es: ${result.usuarioId}. Serás redirigido para iniciar sesión.`);
            setTimeout(() => router.push('/login'), 3000); // Redirigir tras mensaje
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (err: any) {
            console.error("Error de registro:", err);
            const errorMessage = err.response?.data?.error || err.message || 'Error al registrar el usuario.';
            setError(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen">
            <div className="p-8 max-w-md w-full bg-white rounded-lg shadow-md">
                <h2 className="text-2xl font-bold text-center text-gray-900 mb-6">
                    BAC Trivia - Registro
                </h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <Input label="Nombre" id="nombre" type="text" value={nombre} onChange={(e) => setNombre(e.target.value)} required />
                    <Input label="Apellido" id="apellido" type="text" value={apellido} onChange={(e) => setApellido(e.target.value)} required />
                    <Input label="Cédula" id="cedula" type="text" value={cedula} onChange={(e) => setCedula(e.target.value)} placeholder="Ej: 001-123456-0001A" required />
                    {error && <p className="text-sm text-red-600">{error}</p>}
                    {successMessage && <p className="text-sm text-green-600">{successMessage}</p>}
                    <Button type="submit" className="w-full" isLoading={isLoading} disabled={!!successMessage}>
                        Registrarme
                    </Button>
                    <p className="text-sm text-center text-gray-600">
                        ¿Ya tienes cuenta?{' '}
                        <a href="/login" className="font-medium text-red-600 hover:text-red-500">
                            Inicia sesión
                        </a>
                    </p>
                </form>
            </div>
        </div>
    );
}