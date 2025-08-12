// src/components/trivia/TriviaWorkflow.tsx
"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Button from "@/components/ui/Button";
import useUserStore from "@/lib/store/userStore";
import {
  getTriviaQuestion,
  submitTriviaAnswer,
  SubmitTriviaResponse,
  CollectedItem,
} from "@/lib/services/api";
import Image from "next/image";

interface TriviaQuestionView {
  triviaId: string;
  category: string;
  questionText: string;
  options: string[];
  totemId: string;
  qrCodeData: string;
}

export default function TriviaWorkflow() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const userFirestoreId = useUserStore((state) => state.firestoreId);
  const setPuntos = useUserStore((state) => state.setPuntos);
  const addCollectedItem = useUserStore((state) => state.addCollectedItem);

  const [question, setQuestion] = useState<TriviaQuestionView | null>(null);
  const [selectedOptionIndex, setSelectedOptionIndex] = useState<number | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  // ELIMINAMOS feedbackMessage ya que no se usará para el mensaje principal aquí
  // const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [errorSubmitting, setErrorSubmitting] = useState<string | null>(null); // Nuevo estado para errores de envío
  const [errorLoading, setErrorLoading] = useState<string | null>(null);
  const [apiStatusMessage, setApiStatusMessage] = useState<string | null>(null);
  const [isGolden, setIsGolden] = useState(false);

  useEffect(() => {
    const qrCodeDataFromParams = searchParams.get("qrCodeData");
    const isGoldenParam = searchParams.get("isGolden"); // Nuevo parámetro para indicar si es un emoji dorado
    setIsGolden(isGoldenParam === 'true');

    console.log("TriviaWorkflow: qrCodeDataFromParams:", qrCodeDataFromParams);
    if (!userFirestoreId) {
      setErrorLoading("Error de usuario. Intenta iniciar sesión de nuevo.");
      setIsLoading(false);
      return;
    }
    if (!qrCodeDataFromParams) {
      setErrorLoading(
        "No se especificó el tótem (falta qrCodeData en la URL).",
      );
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setErrorLoading(null);
    setApiStatusMessage(null);
    setErrorSubmitting(null);
    setSelectedOptionIndex(null);
    setQuestion(null);

    const fetchQuestion = async () => {
      try {
        const response = await getTriviaQuestion(
          userFirestoreId,
          qrCodeDataFromParams,
        );
        // console.log("TriviaWorkflow: Respuesta API getTriviaQuestion:", response);
        if (response.status) {
          setApiStatusMessage(
            response.message ||
            `Estado: ${response.status}. ${response.cooldown_seconds_left ? `Espera ${response.cooldown_seconds_left}s.` : ""}`,
          );
          setQuestion(null);
        } else if (
          response.triviaId &&
          response.questionText &&
          response.options &&
          response.totemId
        ) {
          setQuestion({
            triviaId: response.triviaId,
            category: response.category || "Desconocida",
            questionText: response.questionText,
            options: response.options,
            totemId: response.totemId,
            qrCodeData: qrCodeDataFromParams,
          });
        } else {
          throw new Error(
            "Respuesta inválida de la API de trivias (faltan datos necesarios).",
          );
        }
      } catch (error: any) {
        console.error("TriviaWorkflow: Error cargando trivia:", error);
        const errMsg =
          error.message || "Error desconocido al cargar la trivia.";
        setErrorLoading(errMsg);
      } finally {
        setIsLoading(false);
      }
    };
    void fetchQuestion();
  }, [searchParams, userFirestoreId]);

  const handleOptionSelect = (index: number) => {
    if (isSubmitting || errorSubmitting || apiStatusMessage || !question)
      return; // Usar errorSubmitting
    setSelectedOptionIndex(index);
  };

  // MODIFICADO: handleSubmitAnswer para redirigir a la nueva página de resultado
  const handleSubmitAnswer = async () => {
    if (
      selectedOptionIndex === null ||
      !question ||
      !userFirestoreId ||
      isSubmitting
    )
      return;

    setIsSubmitting(true);
    setErrorSubmitting(null); // Limpiar errores de envío previo

    try {
      // console.log(`TriviaWorkflow: Enviando respuesta - Opción: ${selectedOptionIndex}, TriviaID: ${question.triviaId}, TotemID: ${question.totemId}, QR: ${question.qrCodeData}`);
      const result: SubmitTriviaResponse = await submitTriviaAnswer(
        userFirestoreId,
        question.triviaId,
        selectedOptionIndex,
        question.totemId,
        question.qrCodeData,
        isGolden // Pass the isGolden state
      );

      // Actualizar el store local
      setPuntos(result.newTotalPoints);
      if (result.correct && result.collectedItem) {
        addCollectedItem(result.collectedItem);
      }

      const params = new URLSearchParams({
        success: String(result.correct),
        category: question.category,
        points: String(result.pointsGained),
        isGolden: String(isGolden),
      });
      router.push(`/trivia/result?${params.toString()}`);

    } catch (error: any) {
      console.error("TriviaWorkflow: Error enviando respuesta:", error);
      const errMsg =
        error.error || error.message || "Error al enviar la respuesta.";
      setErrorSubmitting(errMsg); // Guardar el error para mostrarlo si es necesario
      // No redirigir automáticamente en caso de error de envío, mostrar error en la misma página de trivia.
      setIsSubmitting(false); // Permitir reintentar si es un error de red
    }
    // No se necesita setIsSubmitting(false) si la redirección es exitosa,
    // porque el componente se desmontará.
  };

  const getCategoryIcon = (category: string | undefined): React.ReactNode => {
    // El tamaño de la imagen SVG que se mostrará.
    // Ajustar estos valores según cómo se quiera ver el ícono en la cabecera de la trivia.
    // Corresponde aproximadamente a "w-16 h-16" que se tenia antes (64px si 1rem=16px).
    const iconDisplaySize = 128
    const validCategories = ["ahorro", "tarjeta", "casa", "carro"];
    let svgPath = "/icons/default.svg"; // Fallback a un ícono por defecto
    const categoryLower = category?.toLowerCase();

    if (categoryLower && validCategories.includes(categoryLower)) {
      const suffix = isGolden ? "_golden" : ""; // Sufijo para el ícono dorado
      svgPath = `/icons/${categoryLower}${suffix}.svg`;
    } else {
      console.warn(
        `Icono no encontrado para categoría: ${category}, usando default.`,
      );
    }

    return (
      <div
        style={{ width: iconDisplaySize, height: iconDisplaySize }}
        className="relative w-[96px] h-[96px] flex justify-center items-center"
      >
        <Image
          src={svgPath}
          alt={category || "Icono de categoría"}
          width={iconDisplaySize}
          height={iconDisplaySize}
          style={{ objectFit: "contain" }} // 'contain' para asegurar que el ícono se vea completo
          // Opcional: Añadir un color de fondo al div o a la imagen si los SVGs no tienen relleno
          // y se quiere simular el efecto del className={iconClass} anterior.
          // Pero si los SVGs ya son blancos o tienen su propio estilo, esto no es necesario.
          className=""
        />
      </div>
    );
  };

  // Resto del renderizado condicional para isLoading, errorLoading, apiStatusMessage, !question)
  // Es importante que si hay un errorSubmitting, se muestre aquí también.

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-10">
        <p className="text-lg animate-pulse text-gray-700">
          Cargando trivia...
        </p>
      </div>
    );
  }

  // Pantalla para errores de carga o estados especiales de la API
  if (errorLoading || apiStatusMessage) {
    // Igualmente, se podría querer añadir errorSubmitting aquí si es relevante y no hay pregunta
    // Por ahora, errorSubmitting se manejará dentro del renderizado de la pregunta.
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        {" "}
        {/* Contenedor para centrar */}
        <div className="bg-white p-8 rounded-xl shadow-2xl w-full max-w-lg text-center text-gray-800 relative">
          <div className="absolute top-4 left-1/2 -translate-x-1/2 transform">
            <Image
              src="/logos/bactrivia_logo.svg"
              alt="BAC Trivia Logo"
              width={80}
              height={60}
            />
          </div>
          <p
            className={`text-xl mb-6 mt-16 ${errorLoading ? "text-red-600" : "text-blue-700"}`}
          >
            {errorLoading || apiStatusMessage}
          </p>
          <Button
            onClick={() => router.push("/profile")}
            variant="secondary"
            className="border-red-600 text-red-600 hover:bg-red-100"
          >
            Volver al perfil
          </Button>
        </div>
      </div>
    );
  }

  if (!question && !isLoading) {
    // Añadido !isLoading para ser más explícito
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <div className="bg-white p-8 rounded-xl shadow-2xl w-full max-w-lg text-center text-gray-800 relative">
          <div className="absolute top-4 left-1/2 -translate-x-1/2 transform">
            <Image
              src="/logos/bactrivia_logo.svg"
              alt="BAC Trivia Logo"
              width={80}
              height={60}
            />
          </div>
          <p className="text-xl text-gray-600 mb-6 mt-16">
            No hay pregunta disponible en este momento.
          </p>
          <Button
            onClick={() => router.push("/profile")}
            variant="secondary"
            className="border-red-600 text-red-600 hover:bg-red-100"
          >
            Volver al perfil
          </Button>
        </div>
      </div>
    );
  }

  // Si llegamos aquí y question es null, algo anda mal.
  if (!question) {
    return (
      <div className="flex items-center justify-center p-10">
        <p className="text-lg text-red-600">
          Error: No se pudo cargar la pregunta.
        </p>
      </div>
    );
  }

  // Renderizado de la pregunta
  return (
    <div className="h-full w-full bg-red-500 flex flex-col">
      {" "}
      {/* Fondo general gris claro */}
      <div className="w-full h-full flex flex-col items-center">
        {/* Cabecera Roja */}

        <div className="relative w-full h-[300px]">
          {" "}
          {/* Espacio para el logo */}
          <Image
            src="/logos/lightrays.png"
            alt="BAC Trivia Logo"
            width={90}
            height={60}
            className="absolute -translate-y-1/2 w-full left-0 top-1/2 z-0"
          />
          <div className="absolute top-1/2 -translate-y-1/2 left-1/2 -translate-x-1/2">
            {getCategoryIcon(question.category)}
          </div>
        </div>

        {/* Contenido Blanco */}
        <div className="flex-1 bg-white rounded-tl-[12px] rounded-tr-[12px] p-[32px] max-w-[1000px] flex flex-col justify-between z-10">
          <div>
            <div className="flex flex-col items-center justify-center bg-red-700 rounded-full mb-[24px]">
              <h1 className="text-2xl sm:text-3xl font-bold text-white text">
                {question.category}
              </h1>
            </div>
            <div className="mb-6 p-4 bg-red-100 border-l-4 border-red-500 rounded-md">
              <p className="text-md sm:text-lg text-gray-800 leading-relaxed">
                {question.questionText}
              </p>
            </div>
            <div className="space-y-3 h-fit">
              {question.options.map((option, index) => (
                <button
                  key={index}
                  onClick={() => handleOptionSelect(index)}
                  disabled={isSubmitting || !!errorSubmitting} // Deshabilitar si hay error de envío también
                  className={`w-full text-left p-3 sm:p-4 rounded-lg border-2 transition-all duration-150 text-gray-800
                                            ${selectedOptionIndex === index ? "bg-red-600 text-white border-red-700 ring-2 ring-red-700 shadow-md" : "bg-white border-gray-300 hover:bg-red-100 hover:border-red-500"} 
                                            ${isSubmitting || !!errorSubmitting ? "cursor-not-allowed opacity-70" : "cursor-pointer"}`}
                >
                  <span className="font-semibold mr-2 text-gray-700">
                    {String.fromCharCode(65 + index)}.
                  </span>
                  {option}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-6 text-center">
            {/* Mostrar error de envío si existe */}
            {errorSubmitting && (
              <p className="mb-4 text-lg font-semibold text-red-600">
                Error: {errorSubmitting}
              </p>
            )}
            {/* El feedback ya no se muestra aquí, se redirige a la página de resultado */}
            <Button
              onClick={handleSubmitAnswer}
              disabled={
                selectedOptionIndex === null ||
                isSubmitting ||
                !!errorSubmitting
              }
              isLoading={isSubmitting}
              className="w-full text-lg py-3 bg-red-600 hover:bg-red-700 text-black font-semibold"
            >
              Enviar respuesta
            </Button>
            {/* El botón Continuar al Perfil ya no es necesario aquí */}
          </div>
        </div>
      </div>
    </div>
  );
}
