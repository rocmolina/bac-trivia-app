// app/login/page.tsx
'use client'; // Necesario para hooks y manejo de eventos

import React, { useState } from 'react';
import { useRouter } from 'next/navigation'; // Importar desde 'next/navigation' en App Router
import Input from '@/components/ui/Input'; // Ajustar ruta si es necesario
import Button from '@/components/ui/Button'; // Ajustar ruta si es necesario
// Importar el store y el servicio API (se crearán más adelante)
// import useUserStore from '@/lib/store/userStore';
// import { login } from '@/lib/services/api';

export default function LoginPage() {
    const [usuarioId, setUsuarioId] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();
    // const { login: storeLogin } = useUserStore(); // Obtener acción del store

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
            // --- Lógica de Login (se completará en Día 2) ---
            console.log('Intentando iniciar sesión con UsuarioID:', usuarioId);
            alert(`Simulando login con ${usuarioId}. Redirigiendo a perfil... (Lógica real en Día 2)`);
            // const userData = await login(usuarioId); // Llamada API real
            // storeLogin(userData); // Guardar en store
            router.push('/profile'); // Redirigir a perfil en éxito
            // ----------------------------------------------

        } catch (err: any) {
            console.error("Error de login:", err);
            setError(err.response?.data?.error || err.message || 'Error al iniciar sesión.');
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
                        error={error && error.includes('UsuarioID') ? error : undefined} // Mostrar error específico si aplica
                    />
                    {error && !error.includes('UsuarioID') && (
                        <p className="text-sm text-red-600">{error}</p> // Mostrar error general
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