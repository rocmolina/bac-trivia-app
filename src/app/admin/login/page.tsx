// src/app/admin/login/page.tsx
'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import useAdminStore from '@/lib/store/adminStore';
import { loginAdminApi } from '@/lib/services/api';
import Image from 'next/image';

export default function AdminLoginPage() {
    const [adminId, setAdminId] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();
    const storeLoginAdmin = useAdminStore((state) => state.loginAdmin);

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setError(null);
        setIsLoading(true);

        if (!adminId || !password) {
            setError('Admin ID y Contraseña son requeridos.');
            setIsLoading(false);
            return;
        }

        try {
            const response = await loginAdminApi({ adminId, password });
            if (response.adminId && response.nombre) {
                storeLoginAdmin(response.adminId, response.nombre);
                router.push('/admin/dashboard');
            } else {
                // Esto no debería pasar si el backend devuelve 200 solo en éxito con datos
                setError(response.message || 'Error desconocido en login de admin.');
            }
        } catch (err: any) {
            console.error("Error de login admin:", err);
            const errorMessage = err.error || err.message || 'Error al iniciar sesión como admin.';
            setError(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    // return (
    //     <div className="flex items-center justify-center min-h-screen bg-gray-200">
    //         <div className="p-8 max-w-md w-full bg-white rounded-lg shadow-xl">
    //             <h2 className="text-3xl font-bold text-center text-gray-800 mb-8">
    //                 BAC Trivia - Admin Login
    //             </h2>
    //             <form onSubmit={handleSubmit} className="space-y-6">
    //                 <Input
    //                     label="Admin ID"
    //                     id="adminId"
    //                     type="text"
    //                     value={adminId}
    //                     onChange={(e) => setAdminId(e.target.value)}
    //                     placeholder="tuAdminID"
    //                     required
    //                 />
    //                 <Input
    //                     label="Contraseña"
    //                     id="password"
    //                     type="password"
    //                     value={password}
    //                     onChange={(e) => setPassword(e.target.value)}
    //                     required
    //                 />
    //                 {error && (
    //                     <p className="text-sm text-red-600 bg-red-100 p-3 rounded-md border border-red-300">{error}</p>
    //                 )}
    //                 <Button type="submit" className="w-full !py-3 !text-lg" isLoading={isLoading}>
    //                     Ingresar como Admin
    //                 </Button>
    //             </form>
    //         </div>
    //     </div>
    // );
    return (
        <div className="flex items-center justify-center min-h-screen bg-white p-4 relative text-gray-800 dark:text-gray-800">
            <div className="absolute top-8 sm:top-12">
                <Image src="/logos/bac_logo.png" alt="BAC Logo" width={120} height={160} priority />
            </div>
            <div className="p-8 max-w-md w-full bg-white rounded-lg shadow-xl">
                <h2 className="text-3xl font-bold text-center text-gray-400 mb-8"> {/* Texto oscuro */}
                    BAC Trivia - Admin Login
                </h2>
                <form onSubmit={handleSubmit} className="space-y-6">
                    <Input
                        label="Admin ID"
                        id="adminId"
                        type="text"
                        value={adminId}
                        onChange={(e) => setAdminId(e.target.value)}
                        placeholder="tuAdminID"
                        required
                    />
                    <Input
                        label="Contraseña"
                        id="password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                    />
                    {error && (
                        <p className="text-sm text-red-600 bg-red-100 p-3 rounded-md border border-red-300">{error}</p>
                    )}
                    <Button
                        type="submit"
                        className="w-full py-3 text-lg bg-yellow-400 hover:bg-yellow-500 text-black font-semibold" /* Botón amarillo, texto negro */
                        isLoading={isLoading}
                    >
                        Ingresar como Admin
                    </Button>
                </form>
            </div>

        </div>
    );
}