// src/components/trivia/TriviaWorkflow.tsx
// VERSIÓN CORREGIDA: Eliminada la selección de estado 'userProfile' que causaba bucle infinito.
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Button from '@/components/ui/Button'; // Ajusta la ruta si es necesario
import useUserStore from '@/lib/store/userStore'; // Ajusta la ruta si es necesario
import { getTriviaQuestion, submitTriviaAnswer, SubmitTriviaResponse, CollectedItem } from '@/lib/services/api'; // Ajusta la ruta e importa tipos

// Interface para definir la estructura de la pregunta que maneja el estado local
interface TriviaQuestionView {
    triviaId: string;
    category: string;
    questionText: string;
    options: string[];
    totemId: string; // ID del documento del tótem en Firestore
    qrCodeData: string; // Dato del QR escaneado, necesario para submitTriviaAnswer
}

export default function TriviaWorkflow() {
    const router = useRouter();
    const searchParams = useSearchParams();

    // Seleccionar datos y acciones del store de Zustand individualmente
    const userFirestoreId = useUserStore((state) => state.firestoreId);
    const setPuntos = useUserStore((state) => state.setPuntos);
    const addCollectedItem = useUserStore((state) => state.addCollectedItem);

    // Estado local del componente
    const [question, setQuestion] = useState<TriviaQuestionView | null>(null); // La pregunta actual
    const [selectedOptionIndex, setSelectedOptionIndex] = useState<number | null>(null); // Opción seleccionada por el usuario
    const [isLoading, setIsLoading] = useState(true); // Estado de carga inicial
    const [isSubmitting, setIsSubmitting] = useState(false); // Estado al enviar la respuesta
    const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null); // Mensaje de feedback (Correcto/Incorrecto/Error)
    const [errorLoading, setErrorLoading] = useState<string | null>(null); // Error específico al cargar la pregunta
    const [apiStatusMessage, setApiStatusMessage] = useState<string | null>(null); // Mensajes de estado de la API (wait, category_completed, etc.)

    // useEffect para cargar la pregunta cuando el componente se monta o cambian las dependencias
    useEffect(() => {
        const qrCodeDataFromParams = searchParams.get('qrCodeData'); // Obtener qrCodeData de la URL

        // Validaciones esenciales
        if (!userFirestoreId) {
            setErrorLoading("Error de usuario. Intenta iniciar sesión de nuevo.");
            setIsLoading(false);
            return;
        }
        if (!qrCodeDataFromParams) {
            setErrorLoading("No se especificó el tótem (falta qrCodeData en la URL).");
            setIsLoading(false);
            return;
        }

        // Resetear estados antes de cargar nueva pregunta/estado
        setIsLoading(true);
        setErrorLoading(null);
        setApiStatusMessage(null);
        setFeedbackMessage(null);
        setSelectedOptionIndex(null);
        setQuestion(null);
        console.log('TriviaWorkflow: Cargando trivia/estado para QR:', qrCodeDataFromParams, 'Usuario:', userFirestoreId);

        // Función asíncrona para llamar a la API getTriviaQuestion
        const fetchQuestion = async () => {
            try {
                const response = await getTriviaQuestion(userFirestoreId, qrCodeDataFromParams);
                console.log("TriviaWorkflow: Respuesta API getTriviaQuestion:", response);

                // Procesar la respuesta de la API
                if (response.status) {
                    // La API devolvió un estado especial (no una pregunta)
                    setApiStatusMessage(response.message || `Estado: ${response.status}. ${response.cooldown_seconds_left ? `Espera ${response.cooldown_seconds_left}s.` : ''}`);
                    setQuestion(null); // Asegurar que no se muestre ninguna pregunta anterior
                } else if (response.triviaId && response.questionText && response.options && response.totemId) {
                    // La API devolvió una pregunta válida
                    setQuestion({
                        triviaId: response.triviaId,
                        category: response.category || 'Desconocida',
                        questionText: response.questionText,
                        options: response.options,
                        totemId: response.totemId, // Guardamos el ID del documento del tótem
                        qrCodeData: qrCodeDataFromParams // Guardamos el qrCodeData original
                    });
                } else {
                    // La respuesta de la API no tiene el formato esperado
                    throw new Error("Respuesta inválida de la API de trivias (faltan datos necesarios).");
                }
            } catch (error: any) {
                // Capturar errores durante la llamada a la API o procesamiento
                console.error("TriviaWorkflow: Error cargando trivia:", error);
                const errMsg = error.message || "Error desconocido al cargar la trivia.";
                setErrorLoading(errMsg); // Mostrar mensaje de error
            } finally {
                // Quitar el estado de carga independientemente del resultado
                setIsLoading(false);
            }
        };

        void fetchQuestion(); // Llamar a la función async

        // Dependencias: el efecto se re-ejecuta si cambia el qrCodeData en la URL o si cambia el usuario logueado.
    }, [searchParams, userFirestoreId]);

    // Manejador para cuando el usuario selecciona una opción
    const handleOptionSelect = (index: number) => {
        // No permitir cambiar la selección si se está enviando, ya hay feedback o no hay pregunta
        if (isSubmitting || feedbackMessage || apiStatusMessage || !question) return;
        setSelectedOptionIndex(index);
    };

    // Manejador para cuando el usuario envía la respuesta seleccionada
    const handleSubmitAnswer = async () => {
        // Validaciones antes de enviar
        if (selectedOptionIndex === null || !question || !userFirestoreId || isSubmitting) return;

        setIsSubmitting(true); // Indicar que se está procesando
        setFeedbackMessage(null); // Limpiar feedback anterior
        setErrorLoading(null); // Limpiar error de carga anterior

        try {
            console.log(`TriviaWorkflow: Enviando respuesta - Opción: ${selectedOptionIndex}, TriviaID: ${question.triviaId}, TotemID: ${question.totemId}, QR: ${question.qrCodeData}`);

            // Llamar a la API real para enviar la respuesta
            const result: SubmitTriviaResponse = await submitTriviaAnswer(
                userFirestoreId,
                question.triviaId,
                selectedOptionIndex,
                question.totemId, // Pasar el ID del documento del tótem
                question.qrCodeData // Pasar el qrCodeData original
            );

            console.log("TriviaWorkflow: Resultado API submitTriviaAnswer:", result);

            // Actualizar estado local con la respuesta de la API
            setFeedbackMessage(result.message || (result.correct ? "¡Respuesta Correcta!" : "¡Respuesta Incorrecta!"));
            setPuntos(result.newTotalPoints); // Actualizar los puntos totales en el store Zustand

            // Si la respuesta fue correcta y la API devolvió el item coleccionado
            if (result.correct && result.collectedItem) {
                addCollectedItem(result.collectedItem); // Añadir el item al store Zustand
            }

            // Redirigir al perfil después de un breve tiempo para mostrar el feedback
            setTimeout(() => {
                router.push('/profile');
            }, 2500); // 2.5 segundos de delay

        } catch (error: any) {
            // Capturar errores durante el envío o procesamiento de la respuesta
            console.error("TriviaWorkflow: Error enviando respuesta:", error);
            // Mostrar mensaje de error en la UI (usando el estado de feedback)
            const errMsg = error.error || error.message || "Error al enviar la respuesta."; // Usar error.error si viene de la API
            setFeedbackMessage(`Error: ${errMsg}`);
            // ¿Permitir al usuario reintentar si falla el envío? Depende del error.
            // Si fue error de red, quizás sí. Si fue error lógico, probablemente no.
            // Por ahora, dejamos isSubmitting en true para evitar reintentos inmediatos tras error,
            // ya que la redirección ocurrirá igualmente (o el usuario usará el botón Continuar).
            // setIsSubmitting(false); // Descomentar si se quiere permitir reintento tras error
            setTimeout(() => router.push('/profile'), 3500); // Redirigir igual tras error, quizás con más delay
        }
        // Nota: No establecer setIsSubmitting(false) aquí si la redirección es automática.
    };

    // --- Función Helper para obtener el Ícono SVG según la categoría ---
    // (Este código es el mismo que proporcionaste anteriormente, lo incluimos completo)
    const getCategoryIcon = (category: string | undefined) => {
        const iconClass = "w-16 h-16 text-red-600"; // Clases de Tailwind para el estilo del SVG
        switch (category) {
            case 'Ahorro': return ( <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={iconClass}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.75A.75.75 0 0 1 3 4.5h.75m0 0h.75A.75.75 0 0 1 4.5 6v.75m0 0v.75A.75.75 0 0 1 3.75 8.25h-.75m0 0h-.75A.75.75 0 0 1 2.25 7.5V6.75m0 0H3.75m0 0h.75m0 0h.75M6 12v5.25A2.25 2.25 0 0 0 8.25 19.5h7.5A2.25 2.25 0 0 0 18 17.25V12m0 0h-1.5m1.5 0a2.25 2.25 0 0 1-2.25 2.25H8.25A2.25 2.25 0 0 1 6 12m0 0a2.25 2.25 0 0 0-2.25 2.25v5.25A2.25 2.25 0 0 0 6 21.75h7.5A2.25 2.25 0 0 0 15.75 19.5V14.25M18 12a2.25 2.25 0 0 0-2.25-2.25H8.25A2.25 2.25 0 0 0 6 12m12 0a2.25 2.25 0 0 1 2.25 2.25v5.25A2.25 2.25 0 0 1 18 21.75h-.75m.75-9h-1.5" /></svg> );
            case 'Tarjeta': return ( <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={iconClass}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25v10.5A2.25 2.25 0 0 0 4.5 19.5Z" /></svg> );
            case 'Casa': return ( <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={iconClass}><path strokeLinecap="round" strokeLinejoin="round" d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h7.5" /></svg> );
            case 'Carro': return ( <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={iconClass}><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h6m-6 0H6m4.125-1.125a1.5 1.5 0 0 1 1.17-1.363l3.876-1.162a1.5 1.5 0 0 0 1.17-1.363V8.25m-7.5 0a1.5 1.5 0 0 1 1.5-1.5h5.25a1.5 1.5 0 0 1 1.5 1.5v3.75m-7.5 0v-.188a1.5 1.5 0 1 1 3 0v.188m-3 0h3m-6.75 0h6.75m-6.75 0H6m6 0h6.75m-6.75 0h6.75m0 0v-.188a1.5 1.5 0 1 0-3 0v.188m3 0h-3m6.75-3.75a1.5 1.5 0 0 0-1.5-1.5h-5.25a1.5 1.5 0 0 0-1.5 1.5v3.75m10.5-3.75a1.5 1.5 0 0 0-1.5-1.5h-5.25a1.5 1.5 0 0 0-1.5 1.5v3.75m7.5-3.75h1.5m-1.5 0h-5.25m5.25 0v3.75" /></svg> );
            default: return ( <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={iconClass}><path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 5.25h.008v.008H12v-.008Z" /></svg> ); // Icono genérico de pregunta
        }
    };

    // ----- RENDERIZADO CONDICIONAL -----

    // 1. Estado de Carga Inicial
    if (isLoading) {
        return (
            <div className="flex items-center justify-center p-10">
                <p className="text-lg animate-pulse">Cargando trivia...</p>
                {/* Podrías añadir un spinner aquí */}
            </div>
        );
    }

    // 2. Estado de Error al Cargar o Estado Especial de API (wait, completed, etc.)
    if (errorLoading || apiStatusMessage) {
        return (
            <div className="flex flex-col items-center justify-center text-center bg-white p-8 rounded-xl shadow-xl w-full max-w-lg">
                <p className={`text-xl mb-6 ${errorLoading ? 'text-red-600' : 'text-blue-700'}`}>
                    {errorLoading || apiStatusMessage} {/* Mostrar error o mensaje de estado */}
                </p>
                <Button onClick={() => router.push('/profile')} variant="secondary">
                    Volver al Perfil
                </Button>
            </div>
        );
    }

    // 3. Estado donde no hay pregunta disponible (pero no es error ni estado especial)
    if (!question) {
        return (
            <div className="flex flex-col items-center justify-center text-center bg-white p-8 rounded-xl shadow-xl w-full max-w-lg">
                <p className="text-xl text-gray-500 mb-6">No hay pregunta disponible en este momento.</p>
                <Button onClick={() => router.push('/profile')} variant="secondary">
                    Volver al Perfil
                </Button>
            </div>
        );
    }

    // ----- 4. RENDERIZADO DE LA PREGUNTA (si lo anterior pasó) -----
    return (
        <div className="bg-white p-6 sm:p-8 rounded-xl shadow-xl w-full max-w-lg">
            {/* Sección de Categoría e Ícono */}
            <div className="text-center mb-6">
                <div className="inline-block mb-2">
                    {getCategoryIcon(question.category)}
                </div>
                <h1 className="text-xl sm:text-2xl font-bold text-red-700">
                    Trivia BAC: {question.category}
                </h1>
            </div>

            {/* Texto de la Pregunta */}
            <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 rounded-md">
                <p className="text-md sm:text-lg text-gray-800 leading-relaxed">
                    {question.questionText}
                </p>
            </div>

            {/* Opciones de Respuesta */}
            <div className="space-y-3 mb-8">
                {question.options.map((option, index) => (
                    <button
                        key={index}
                        onClick={() => handleOptionSelect(index)}
                        disabled={isSubmitting || !!feedbackMessage} // Deshabilitar si se está enviando o ya hay feedback
                        className={`w-full text-left p-3 sm:p-4 rounded-lg border-2 transition-all duration-150 
                                    ${selectedOptionIndex === index
                            ? 'bg-red-600 text-white border-red-700 ring-2 ring-red-400 shadow-md' // Estilo seleccionado
                            : 'bg-white text-gray-700 border-gray-300 hover:bg-red-50 hover:border-red-400'} // Estilo normal/hover
                                    ${(isSubmitting || !!feedbackMessage)
                            ? 'cursor-not-allowed opacity-70' // Estilo deshabilitado
                            : 'cursor-pointer'}` // Estilo habilitado
                        }
                    >
                        <span className="font-semibold mr-2">{String.fromCharCode(65 + index)}.</span> {/* Letra A, B, C... */}
                        {option}
                    </button>
                ))}
            </div>

            {/* Sección de Feedback y Botones de Acción */}
            <div className="mt-6 text-center">
                {/* Mostrar Feedback si existe */}
                {feedbackMessage && (
                    <p className={`mb-4 text-lg font-semibold 
                        ${feedbackMessage.includes('Correcto') || feedbackMessage.includes('Felicidades')
                        ? 'text-green-600' // Verde para éxito
                        : (feedbackMessage.includes('Error') || feedbackMessage.includes('Incorrecto')
                            ? 'text-red-600' // Rojo para error/incorrecto
                            : 'text-blue-700') // Azul para otros mensajes (ej. info)
                    }`}>
                        {feedbackMessage}
                    </p>
                )}

                {/* Mostrar Botón "Enviar" SOLO si NO hay feedback */}
                {!feedbackMessage && (
                    <Button
                        onClick={handleSubmitAnswer}
                        disabled={selectedOptionIndex === null || isSubmitting} // Deshabilitar si no hay selección o se está enviando
                        isLoading={isSubmitting} // Mostrar estado de carga
                        className="w-full text-lg py-3" // Estilo del botón
                    >
                        Enviar Respuesta
                    </Button>
                )}

                {/* Mostrar Botón "Continuar" DESPUÉS de que aparezca el feedback */}
                {feedbackMessage && !isSubmitting && ( // Asegurar que no esté en proceso de envío (aunque la redirección es automática)
                    <Button
                        onClick={() => router.push('/profile')} // Navegar al perfil
                        variant="secondary" // Estilo secundario
                        className="w-full mt-2" // Margen superior
                    >
                        Continuar al Perfil
                    </Button>
                )}
            </div>
        </div>
    );
}