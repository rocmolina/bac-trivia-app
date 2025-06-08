// src/components/admin/EditUserModal.tsx
"use client";

import React, { useState, useEffect, FormEvent } from "react";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { UserScoreData } from "@/lib/services/api"; // UserScoreData debe incluir firestoreId y nombre

interface EditUserModalProps {
  user: UserScoreData | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (userFirestoreId: string, newNombre: string) => Promise<void>; // Función que llama a la API
  isUpdating: boolean; // Para el estado de carga del botón
  updateError: string | null; // Para mostrar errores de la API
  clearUpdateError: () => void; // Para limpiar errores al reabrir o cambiar campo
}

const EditUserModal: React.FC<EditUserModalProps> = ({
  user,
  isOpen,
  onClose,
  onUpdate,
  isUpdating,
  updateError,
  clearUpdateError,
}) => {
  const [currentNombre, setCurrentNombre] = useState("");

  useEffect(() => {
    if (user?.nombre) {
      setCurrentNombre(user.nombre);
    } else {
      setCurrentNombre("");
    }
    // Limpiar errores cuando el usuario o el estado isOpen cambian, o cuando se monta
    clearUpdateError();
  }, [user, isOpen, clearUpdateError]);

  if (!isOpen || !user) {
    return null;
  }

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCurrentNombre(e.target.value);
    if (updateError) {
      // Limpiar error si el usuario empieza a escribir de nuevo
      clearUpdateError();
    }
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!currentNombre.trim() || currentNombre.trim().length < 3) {
      // Este error debería ser manejado por el estado local del modal, no el 'updateError' de la API
      alert("El nombre debe tener al menos 3 caracteres."); // Simple alert o estado de error local
      return;
    }
    // No cerrar inmediatamente si el nombre no ha cambiado, pero permitir el envío si se desea
    // (quizás el admin solo quiere ver si hay colisión de usuarioId con el mismo nombre)
    if (currentNombre.trim() === user.nombre) {
      alert("El nombre no ha cambiado.");
      return;
    }

    // La función onUpdate (que llama a la API) se encargará de la lógica de carga y error.
    await onUpdate(user.firestoreId, currentNombre.trim());
    // El cierre del modal (onClose) se manejará en AdminDashboardContent si la actualización es exitosa
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-[100]" // z-index alto
      onClick={onClose}
      data-oid="4x_jex_"
    >
      <div
        className="bg-white p-6 sm:p-8 rounded-xl shadow-2xl w-full max-w-lg mx-4"
        onClick={(e) => e.stopPropagation()}
        data-oid="2rdj125"
      >
        <div
          className="flex justify-between items-center mb-6 pb-3 border-b border-gray-200"
          data-oid="kyv866x"
        >
          <h2
            className="text-2xl font-semibold text-gray-800"
            data-oid="6whyh95"
          >
            Editar Nombre de Usuario
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors text-3xl leading-none"
            aria-label="Cerrar modal"
            data-oid="00jfhn6"
          >
            &times;
          </button>
        </div>

        <div className="mb-4" data-oid="2m-_n_s">
          <p className="text-sm text-gray-600" data-oid="rpf3302">
            Editando a:{" "}
            <span className="font-semibold text-gray-800" data-oid="6ghxz2.">
              {user.nombre} {user.apellido || ""}
            </span>
          </p>
          <p className="text-xs text-gray-500" data-oid="7p5n.3e">
            UsuarioID actual:{" "}
            <span
              className="font-mono bg-gray-100 px-1 rounded"
              data-oid="5dutg3s"
            >
              {user.usuarioId}
            </span>
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5" data-oid="th48:q-">
          <Input
            label="Nuevo Nombre del Usuario"
            id="edit-user-nombre"
            type="text"
            value={currentNombre}
            onChange={handleNameChange}
            required
            placeholder="Ingresa el nuevo nombre"
            autoFocus
            className="text-lg" // Hacer el input un poco más grande
            data-oid="z3:q2l:"
          />

          {updateError && (
            <p
              className="text-sm text-red-600 bg-red-100 p-3 rounded-md border border-red-200"
              data-oid="r7s09ig"
            >
              {updateError}
            </p>
          )}
          <div
            className="flex flex-col sm:flex-row-reverse gap-3 pt-3"
            data-oid="-fnvx8l"
          >
            <Button
              type="submit"
              className="w-full sm:w-auto bg-red-600 hover:bg-red-700 text-white"
              isLoading={isUpdating}
              disabled={
                isUpdating ||
                !currentNombre.trim() ||
                currentNombre.trim() === user.nombre
              }
              data-oid="xgt:wfs"
            >
              Actualizar Nombre
            </Button>
            <Button
              type="button"
              onClick={onClose}
              variant="secondary"
              className="w-full sm:w-auto border-gray-400 text-gray-700 hover:bg-gray-100"
              disabled={isUpdating}
              data-oid="zfzj5fm"
            >
              Cancelar
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditUserModal;
