// src/lib/constants.ts

export const POINTS_PER_TRIVIA_CORRECT = 3;
export const POINTS_PER_GOLDEN_TRIVIA_CORRECT = 6;

export const CATEGORIES = [
    { id: 'Ahorro', name: 'Ahorro', svgUrl: '/icons/ahorro.svg' },
    { id: 'Tarjeta', name: 'Tarjeta', svgUrl: '/icons/tarjeta.svg' },
    { id: 'Casa', name: 'Casa', svgUrl: '/icons/casa.svg' },
    { id: 'Carro', name: 'Carro', svgUrl: '/icons/carro.svg' },
] as const; // 'as const' para que los tipos sean más estrictos

export type CategoryId = typeof CATEGORIES[number]['id'];

// Añadir más constantes aquí, si es necesario.