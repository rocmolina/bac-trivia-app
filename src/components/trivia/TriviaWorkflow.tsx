// components/trivia/TriviaWorkflow.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Button from '@/components/ui/Button';

// Tipo para la pregunta de trivia
interface TriviaQuestion {
    id: string;
    category: string;
    questionText: string;
    options: string[];
}

export default function TriviaWorkflow() {
    const router = useRouter();
    const searchParams = useSearchParams(); // Ahora está dentro de un componente envuelto por Suspense

    const [question, setQuestion] = useState<TriviaQuestion | null>(null);
    const [selectedOptionIndex, setSelectedOptionIndex] = useState<number | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

    useEffect(() => {
        const totemIdFromQuery = searchParams.get('totemId');
        const categoryFromQuery = searchParams.get('category');

        console.log('Cargando trivia para Totem ID:', totemIdFromQuery, 'o Categoría:', categoryFromQuery);
        setIsLoading(true);
        setFeedbackMessage(null);
        setSelectedOptionIndex(null);

        // --- SIMULACIÓN DE CARGA DE PREGUNTA ---
        setTimeout(() => {
            const mockQuestion: TriviaQuestion = {
                id: 'trivia123',
                category: categoryFromQuery || 'Ahorro',
                questionText: '¿Cuál es el principal beneficio de una cuenta de ahorros programados en BAC?',
                options: [
                    'Generar intereses altos a corto plazo.',
                    'Acceder a créditos de forma inmediata.',
                    'Cumplir metas de ahorro específicas a mediano o largo plazo.',
                    'Realizar pagos internacionales sin costo.',
                ],
            };
            setQuestion(mockQuestion);
            setIsLoading(false);
        }, 1000);
        // --- FIN SIMULACIÓN ---
    }, [searchParams]); // Dependencia de searchParams

    const handleOptionSelect = (index: number) => {
        if (isSubmitting || feedbackMessage) return;
        setSelectedOptionIndex(index);
    };

    const handleSubmitAnswer = async () => {
        if (selectedOptionIndex === null || !question) {
            alert('Por favor, selecciona una opción.');
            return;
        }
        setIsSubmitting(true);
        setFeedbackMessage(null);
        // --- SIMULACIÓN DE ENVÍO ---
        setTimeout(() => {
            const isCorrect = selectedOptionIndex === 2;
            if (isCorrect) {
                setFeedbackMessage('¡Correcto! Ganaste 3 puntos.');
                setTimeout(() => router.push('/profile'), 2000);
            } else {
                setFeedbackMessage('¡Incorrecto! Intenta con otro tótem.');
                setTimeout(() => router.push('/profile'), 2000);
            }
            setIsSubmitting(false);
        }, 1500);
        // --- FIN SIMULACIÓN ---
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[300px]"> {/* Ajustar altura si es necesario */}
                <p className="text-xl text-gray-700">Cargando trivia...</p>
            </div>
        );
    }

    if (!question) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[300px]">
                <p className="text-xl text-red-500">No se pudo cargar la pregunta de trivia.</p>
                <Button onClick={() => router.push('/profile')} className="mt-4">Volver al Perfil</Button>
            </div>
        );
    }

    const categoryIcons: { [key: string]: string } = {
        'Ahorro': '🐷', 'Tarjeta': '💳', 'Casa': '🏠', 'Carro': '🚗',
    };
    const categoryIcon = categoryIcons[question.category] || '❓';

    return (
        <div className="bg-white p-6 sm:p-8 rounded-xl shadow-xl w-full max-w-lg">
            <div className="text-center mb-6">
                <span className="text-5xl mb-2 inline-block">{categoryIcon}</span>
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
                        className={`w-full text-left p-3 sm:p-4 rounded-lg border-2 transition-all duration-150 ${selectedOptionIndex === index ? 'bg-red-600 text-white border-red-700 ring-2 ring-red-400' : 'bg-white text-gray-700 border-gray-300 hover:bg-red-50 hover:border-red-400'} ${(isSubmitting || !!feedbackMessage) ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'}`}
                    >
                        <span className="font-semibold mr-2">{String.fromCharCode(65 + index)}.</span>
                        {option}
                    </button>
                ))}
            </div>
            {feedbackMessage && (
                <p className={`mb-4 text-center font-semibold ${feedbackMessage.includes('Correcto') ? 'text-green-600' : 'text-red-600'}`}>
                    {feedbackMessage}
                </p>
            )}
            {!feedbackMessage && (
                <Button onClick={handleSubmitAnswer} disabled={selectedOptionIndex === null || isSubmitting} isLoading={isSubmitting} className="w-full text-lg py-3">
                    Enviar Respuesta
                </Button>
            )}
            {feedbackMessage && (
                <Button onClick={() => router.push('/profile')} variant="secondary" className="w-full mt-2">
                    Continuar
                </Button>
            )}
        </div>
    );
}