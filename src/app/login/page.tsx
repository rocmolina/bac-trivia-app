'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import { login } from '@/lib/services/api'; // Importar desde servicio API
import useUserStore from '@/lib/store/userStore'; // Importar desde store Zustand

export default function LoginPage() {
    const [usuarioId, setUsuarioId] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();
    const storeLogin = useUserStore((state) => state.login); // Obtener acción del store

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setError(null);
        setIsLoading(true);

        if (!usuarioId) {
            setError('El UsuarioID es requerido.');
            setIsLoading(false);
            return;
        }

        try {
            console.log('Intentando iniciar sesión con UsuarioID:', usuarioId);
            const userData = await login(usuarioId); // Llamada API real
            console.log('Login exitoso:', userData);
            storeLogin(userData); // Guardar en store (userData debe coincidir con UserState)
            router.push('/profile'); // Redirigir a perfil si login éxito
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (err: any) {
            console.error("Error de login:", err);
            const errorMessage = err.response?.data?.error || err.message || 'Error al iniciar sesión. Verifica tu UsuarioID.';
            setError(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen">
            <div className="p-8 max-w-md w-full bg-white rounded-lg shadow-md">
                <h2 className="text-2xl font-bold text-center text-gray-900 mb-6">
                    BAC Trivia - Iniciar Sesión
                </h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <Input
                        label="UsuarioID (Ej: Nombre-Numero)"
                        id="usuarioId"
                        type="text"
                        value={usuarioId}
                        onChange={(e) => setUsuarioId(e.target.value)}
                        placeholder="TuUsuario-123"
                        required
                        error={error && error.includes('UsuarioID') ? error : undefined}
                    />
                    {error && ( // Mostrar error general si no es específico del campo
                        <p className="text-sm text-red-600">{error}</p>
                    )}
                    <Button type="submit" className="w-full" isLoading={isLoading}>
                        Ingresar
                    </Button>
                    <p className="text-sm text-center text-gray-600">
                        ¿No tienes cuenta?{' '}
                        <a href="/register" className="font-medium text-red-600 hover:text-red-500">
                            Regístrate aquí
                        </a>
                    </p>
                </form>
            </div>
        </div>
    );
}