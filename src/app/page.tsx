'use client'; // Necesario para useRouter en App Router Client Component
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/login'); // Redirige a la página de login
  }, [router]);

  return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Redirigiendo a inicio de sesión...</p>
        {/* Puedes poner un spinner aquí si lo deseas */}
      </div>
  );
}