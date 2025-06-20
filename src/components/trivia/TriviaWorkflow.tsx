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
import Image from "next/image"; // <--- IMPORTAR Image

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

  useEffect(() => {
    const qrCodeDataFromParams = searchParams.get("qrCodeData");
    //const qrCodeDataFromParams = "TOTEM01_Ahorro_INFO"; // Para pruebas, usar un valor fijo
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
    // ELIMINADO: setFeedbackMessage(null);
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
    setErrorSubmitting(null); // Limpiar errores de envío previos

    try {
      // console.log(`TriviaWorkflow: Enviando respuesta - Opción: ${selectedOptionIndex}, TriviaID: ${question.triviaId}, TotemID: ${question.totemId}, QR: ${question.qrCodeData}`);
      const result: SubmitTriviaResponse = await submitTriviaAnswer(
        userFirestoreId,
        question.triviaId,
        selectedOptionIndex,
        question.totemId,
        question.qrCodeData,
      );

      // Actualizar el store local
      setPuntos(result.newTotalPoints);
      if (result.correct && result.collectedItem) {
        addCollectedItem(result.collectedItem);
      }

      // Redirigir a la página de resultado con parámetros
      router.push(
        `/trivia/result?success=${result.correct}&category=${encodeURIComponent(question.category)}&points=${result.pointsGained}`,
      );
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

  // const getCategoryIcon = (category: string | undefined) => {
  //     const iconClass = "w-16 h-16 text-white"; // Íconos de categoría en blanco para cabecera roja
  //     switch (category?.toLowerCase()) {
  //         case 'ahorro': return ( <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={iconClass}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.75A.75.75 0 0 1 3 4.5h.75m0 0h.75A.75.75 0 0 1 4.5 6v.75m0 0v.75A.75.75 0 0 1 3.75 8.25h-.75m0 0h-.75A.75.75 0 0 1 2.25 7.5V6.75m0 0H3.75m0 0h.75m0 0h.75M6 12v5.25A2.25 2.25 0 0 0 8.25 19.5h7.5A2.25 2.25 0 0 0 18 17.25V12m0 0h-1.5m1.5 0a2.25 2.25 0 0 1-2.25 2.25H8.25A2.25 2.25 0 0 1 6 12m0 0a2.25 2.25 0 0 0-2.25 2.25v5.25A2.25 2.25 0 0 0 6 21.75h7.5A2.25 2.25 0 0 0 15.75 19.5V14.25M18 12a2.25 2.25 0 0 0-2.25-2.25H8.25A2.25 2.25 0 0 0 6 12m12 0a2.25 2.25 0 0 1 2.25 2.25v5.25A2.25 2.25 0 0 1 18 21.75h-.75m.75-9h-1.5" /></svg> );
  //         case 'tarjeta': return ( <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={iconClass}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25v10.5A2.25 2.25 0 0 0 4.5 19.5Z" /></svg> );
  //         case 'casa': return ( <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={iconClass}><path strokeLinecap="round" strokeLinejoin="round" d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h7.5" /></svg> );
  //         case 'carro': return ( <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={iconClass}><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h6m-6 0H6m4.125-1.125a1.5 1.5 0 0 1 1.17-1.363l3.876-1.162a1.5 1.5 0 0 0 1.17-1.363V8.25m-7.5 0a1.5 1.5 0 0 1 1.5-1.5h5.25a1.5 1.5 0 0 1 1.5 1.5v3.75m-7.5 0v-.188a1.5 1.5 0 1 1 3 0v.188m-3 0h3m-6.75 0h6.75m-6.75 0H6m6 0h6.75m-6.75 0h6.75m0 0v-.188a1.5 1.5 0 1 0-3 0v.188m3 0h-3m6.75-3.75a1.5 1.5 0 0 0-1.5-1.5h-5.25a1.5 1.5 0 0 0-1.5 1.5v3.75m10.5-3.75a1.5 1.5 0 0 0-1.5-1.5h-5.25a1.5 1.5 0 0 0-1.5 1.5v3.75m7.5-3.75h1.5m-1.5 0h-5.25m5.25 0v3.75" /></svg> );
  //         default: return ( <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={iconClass}><path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 5.25h.008v.008H12v-.008Z" /></svg> );
  //     }
  // };

  const getCategoryIcon = (category: string | undefined): React.ReactNode => {
    // El tamaño de la imagen SVG que se mostrará.
    // Ajustar estos valores según cómo se quiera ver el ícono en la cabecera de la trivia.
    // Corresponde aproximadamente a "w-16 h-16" que se tenia antes (64px si 1rem=16px).
    const iconDisplaySize = 128;
    let svgPath = "/icons/default.svg"; // Fallback a un ícono por defecto
    switch (category?.toLowerCase()) {
      case "ahorro":
        svgPath = "/icons/ahorro.svg";
        break;
      case "tarjeta":
        svgPath = "/icons/tarjeta.svg";
        break;
      case "casa": // Asumiendo que tu archivo se llama 'casa.svg'
        svgPath = "/icons/casa.svg";
        break;
      case "carro":
        svgPath = "/icons/carro.svg";
        break;
      default:
        console.warn(
          `Icono no encontrado para categoría: ${category}, usando default.`,
        );
        // svgPath ya está establecido al default
        break;
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
          // y se quieres simular el efecto del className={iconClass} anterior.
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
            Volver al Perfil
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
            Volver al Perfil
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
              Enviar Respuesta
            </Button>
            {/* El botón Continuar al Perfil ya no es necesario aquí */}
          </div>
        </div>
      </div>
    </div>
  );
}
