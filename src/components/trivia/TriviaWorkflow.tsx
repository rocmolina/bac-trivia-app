// src/components/trivia/TriviaWorkflow.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Button from '@/components/ui/Button'; // Ajusta la ruta
import useUserStore from '@/lib/store/userStore'; // Ajusta la ruta
import { getTriviaQuestion, submitTriviaAnswer } from '@/lib/services/api'; // Ajusta la ruta

// --- Interfaces (Asegúrate que coincidan con tu API y Store) ---
interface TriviaQuestion {
    triviaId: string;
    category: string;
    questionText: string;
    options: string[];
    totemId?: string;
}

interface GetTriviaResponse {
    triviaId?: string;
    category?: string;
    questionText?: string;
    options?: string[];
    totemId?: string;
    status?: 'wait' | 'category_completed' | 'no_questions_found';
    message?: string;
    cooldown_seconds_left?: number;
}

// --- Componente Principal ---
export default function TriviaWorkflow() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const userFirestoreId = useUserStore((state) => state.firestoreId);
    const userPuntos = useUserStore((state) => state.puntos);
    const setPuntos = useUserStore((state) => state.setPuntos);
    // const addCollectedItem = useUserStore((state) => state.addCollectedItem); // Implementar en store y aquí cuando se necesite

    const [question, setQuestion] = useState<TriviaQuestion | null>(null);
    const [selectedOptionIndex, setSelectedOptionIndex] = useState<number | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
    const [errorLoading, setErrorLoading] = useState<string | null>(null);
    const [apiStatusMessage, setApiStatusMessage] = useState<string | null>(null);

    useEffect(() => {
        const qrCodeData = searchParams.get('qrCodeData');

        if (!userFirestoreId) {
            console.error("TriviaWorkflow Effect: No userFirestoreId.");
            setErrorLoading("Error de usuario. Intenta iniciar sesión de nuevo.");
            setIsLoading(false);
            return;
        }
        if (!qrCodeData) {
            setErrorLoading("No se especificó el tótem.");
            setIsLoading(false);
            return;
        }

        // Resetear estados al cargar nueva pregunta
        setIsLoading(true);
        setErrorLoading(null);
        setApiStatusMessage(null);
        setFeedbackMessage(null);
        setSelectedOptionIndex(null);
        setQuestion(null);
        console.log('Cargando trivia para QR:', qrCodeData, 'Usuario:', userFirestoreId);

        const fetchQuestion = async () => {
            try {
                const response: GetTriviaResponse = await getTriviaQuestion(userFirestoreId, qrCodeData);
                console.log("Respuesta API getTriviaQuestion:", response);

                if (response.status) { // Manejar estados especiales primero
                    setApiStatusMessage(response.message || `Estado: ${response.status}`);
                    setQuestion(null);
                } else if (response.triviaId && response.questionText && response.options) {
                    // Éxito, recibimos una pregunta válida
                    setQuestion({
                        triviaId: response.triviaId,
                        category: response.category || 'Desconocida',
                        questionText: response.questionText,
                        options: response.options,
                        totemId: response.totemId
                    });
                } else {
                    // Respuesta inesperada
                    throw new Error("Respuesta inválida de la API de trivias.");
                }
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            } catch (error: any) {
                console.error("Error cargando trivia:", error);
                const errMsg = error.response?.data?.message || error.message || "Error al cargar la trivia.";
                setErrorLoading(errMsg);
            } finally {
                setIsLoading(false);
            }
        };

        void fetchQuestion(); // Llamar a la función async

    }, [searchParams, userFirestoreId]); // Dependencias clave

    // --- Handlers ---
    const handleOptionSelect = (index: number) => {
        if (isSubmitting || feedbackMessage || apiStatusMessage) return;
        setSelectedOptionIndex(index);
    };

    const handleSubmitAnswer = async () => {
        if (selectedOptionIndex === null || !question || !userFirestoreId || isSubmitting) return;
        setIsSubmitting(true);
        setFeedbackMessage(null);
        try {
            // --- LLAMADA API submitTriviaAnswer (SIMULADA) ---
            console.log(`Simulando envío: Opción ${selectedOptionIndex} para pregunta ${question.triviaId}`);
            const result = await submitTriviaAnswer(userFirestoreId, question.triviaId, selectedOptionIndex);
            console.log("Resultado API submitTriviaAnswer (SIMULADO):", result);
            if (result.correct) {
                // Actualizar puntos localmente (simulación)
                setPuntos(userPuntos + result.pointsGained);
                // TODO: Llamar a addCollectedItem del store cuando esté implementado
                // addCollectedItem({ triviaId: question.triviaId, category: question.category, totemId: question.totemId, answeredCorrectly: true });
                setFeedbackMessage(`¡Correcto! Ganaste ${result.pointsGained} puntos. (Simulado)`);
                setTimeout(() => router.push('/profile'), 2500);
            } else {
                setFeedbackMessage(result.message || '¡Incorrecto! (Simulado)');
                // Lógica de Cooldown se maneja en la siguiente llamada a getTriviaQuestion
                setTimeout(() => router.push('/profile'), 2500);
            }
            // --- FIN SIMULACIÓN ---
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (error: any) {
            console.error("Error enviando respuesta:", error);
            setFeedbackMessage(error.response?.data?.message || "Error al enviar la respuesta.");
            setIsSubmitting(false); // Permitir reintentar si falla el envío
        }
        // No poner setIsSubmitting(false) si hay feedback y redirección
    };

    // --- Función Helper para Íconos SVG ---
    const getCategoryIcon = (category: string | undefined) => {
        const iconClass = "w-16 h-16 text-red-600";
        switch (category) {
            case 'Ahorro': return ( <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={iconClass}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.75A.75.75 0 0 1 3 4.5h.75m0 0h.75A.75.75 0 0 1 4.5 6v.75m0 0v.75A.75.75 0 0 1 3.75 8.25h-.75m0 0h-.75A.75.75 0 0 1 2.25 7.5V6.75m0 0H3.75m0 0h.75m0 0h.75M6 12v5.25A2.25 2.25 0 0 0 8.25 19.5h7.5A2.25 2.25 0 0 0 18 17.25V12m0 0h-1.5m1.5 0a2.25 2.25 0 0 1-2.25 2.25H8.25A2.25 2.25 0 0 1 6 12m0 0a2.25 2.25 0 0 0-2.25 2.25v5.25A2.25 2.25 0 0 0 6 21.75h7.5A2.25 2.25 0 0 0 15.75 19.5V14.25M18 12a2.25 2.25 0 0 0-2.25-2.25H8.25A2.25 2.25 0 0 0 6 12m12 0a2.25 2.25 0 0 1 2.25 2.25v5.25A2.25 2.25 0 0 1 18 21.75h-.75m.75-9h-1.5" /></svg> );
            case 'Tarjeta': return ( <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={iconClass}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25v10.5A2.25 2.25 0 0 0 4.5 19.5Z" /></svg> );
            case 'Casa': return ( <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={iconClass}><path strokeLinecap="round" strokeLinejoin="round" d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h7.5" /></svg> );
            case 'Carro': return ( <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={iconClass}><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h6m-6 0H6m4.125-1.125a1.5 1.5 0 0 1 1.17-1.363l3.876-1.162a1.5 1.5 0 0 0 1.17-1.363V8.25m-7.5 0a1.5 1.5 0 0 1 1.5-1.5h5.25a1.5 1.5 0 0 1 1.5 1.5v3.75m-7.5 0v-.188a1.5 1.5 0 1 1 3 0v.188m-3 0h3m-6.75 0h6.75m-6.75 0H6m6 0h6.75m-6.75 0h6.75m0 0v-.188a1.5 1.5 0 1 0-3 0v.188m3 0h-3m6.75-3.75a1.5 1.5 0 0 0-1.5-1.5h-5.25a1.5 1.5 0 0 0-1.5 1.5v3.75m10.5-3.75a1.5 1.5 0 0 0-1.5-1.5h-5.25a1.5 1.5 0 0 0-1.5 1.5v3.75m7.5-3.75h1.5m-1.5 0h-5.25m5.25 0v3.75" /></svg> );
            default: return ( <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={iconClass}><path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 5.25h.008v.008H12v-.008Z" /></svg> );
        }
    };

    // ----- Renderizado Condicional -----
    if (isLoading) {
        return <div className="flex items-center justify-center p-10"><p className="text-lg animate-pulse">Cargando trivia...</p></div>;
    }
    if (errorLoading || apiStatusMessage) {
        return (
            <div className="flex flex-col items-center justify-center text-center bg-white p-8 rounded-xl shadow-xl w-full max-w-lg">
                <p className={`text-xl mb-6 ${errorLoading ? 'text-red-600' : 'text-blue-700'}`}>
                    {errorLoading || apiStatusMessage}
                </p>
                <Button onClick={() => router.push('/profile')} variant="secondary">Volver al Perfil</Button>
            </div>
        );
    }
    if (!question) {
        return (
            <div className="flex flex-col items-center justify-center text-center bg-white p-8 rounded-xl shadow-xl w-full max-w-lg">
                <p className="text-xl text-gray-500 mb-6">No hay pregunta disponible.</p>
                <Button onClick={() => router.push('/profile')} variant="secondary">Volver al Perfil</Button>
            </div>
        );
    }

    // ----- Renderizado de la Pregunta -----
    return (
        <div className="bg-white p-6 sm:p-8 rounded-xl shadow-xl w-full max-w-lg">
            <div className="text-center mb-6">
                <div className="inline-block mb-2">{getCategoryIcon(question.category)}</div>
                <h1 className="text-xl sm:text-2xl font-bold text-red-700">
                    Trivia BAC: {question.category}
                </h1>
            </div>
            <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 rounded-md">
                <p className="text-md sm:text-lg text-gray-800 leading-relaxed">
                    {question.questionText}
                </p>
            </div>
            <div className="space-y-3 mb-8">
                {question.options.map((option, index) => (
                    <button
                        key={index}
                        onClick={() => handleOptionSelect(index)}
                        disabled={isSubmitting || !!feedbackMessage}
                        className={`w-full text-left p-3 sm:p-4 rounded-lg border-2 transition-all duration-150 ${selectedOptionIndex === index ? 'bg-red-600 text-white border-red-700 ring-2 ring-red-400 shadow-md' : 'bg-white text-gray-700 border-gray-300 hover:bg-red-50 hover:border-red-400'} ${(isSubmitting || !!feedbackMessage) ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'}`}
                    >
                        <span className="font-semibold mr-2">{String.fromCharCode(65 + index)}.</span>
                        {option}
                    </button>
                ))}
            </div>

            {/* Feedback y Botones de Acción */}
            <div className="mt-6 text-center">
                {feedbackMessage && (
                    <p className={`mb-4 font-semibold ${feedbackMessage.includes('Correcto') ? 'text-green-600' : 'text-red-600'}`}>
                        {feedbackMessage}
                    </p>
                )}
                {!feedbackMessage && (
                    <Button
                        onClick={handleSubmitAnswer}
                        disabled={selectedOptionIndex === null || isSubmitting}
                        isLoading={isSubmitting}
                        className="w-full text-lg py-3"
                    >
                        Enviar Respuesta
                    </Button>
                )}
                {feedbackMessage && !isSubmitting && ( // Mostrar botón continuar solo después de que el feedback aparece y no se está "procesando" la redirección
                    <Button
                        onClick={() => router.push('/profile')}
                        variant="secondary"
                        className="w-full mt-2"
                    >
                        Continuar
                    </Button>
                )}
            </div>
        </div>
    );
}

// El componente app/trivia/page.tsx sigue igual, envolviendo TriviaPageContent
// (que a su vez envuelve Suspense y TriviaWorkflow) en ProtectedRoute.