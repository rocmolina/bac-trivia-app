/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/components/**/*.{js,ts,jsx,tsx,mdx}", // Rutas a tus componentes
        "./src/app/**/*.{js,ts,jsx,tsx,mdx}", // Ruta al directorio app (para App Router)
    ],
    theme: {
        extend: {
            colors: {
                // Colores basados en el pdf de requerimientos
                'bac-red': '#D9002E', // Un rojo BAC común (ajustar al valor exacto)
                'bac-red-dark': '#A30024', // Un tono más oscuro del rojo BAC para hovers, etc.
                'bac-yellow': '#FFDD00', // Un amarillo/dorado similar al de los ejemplos (ajustar conforme)
                'bac-yellow-dark': '#E6C200', // Un tono más oscuro del amarillo para hovers

                // Colores para texto
                'bac-text-black': '#000000',
                'bac-text-red': '#D9002E', // Texto rojo BAC común (ajustar al valor exacto)
                'bac-text-dark': '#111111', // Texto oscuro principal (casi negro)
                'bac-text-light': '#FFFFFF', // Texto claro (blanco) para usar sobre fondos oscuros/rojos
                'bac-text-gray': '#555555', // Un gris medio para texto secundario

                // Colores de fondo y UI general
                'bac-bg-light': '#FFFFFF', // Fondo principal claro (blanco)
                'bac-bg-gray': '#F0F0F0', // Un gris muy claro para los fondos de secciones o de página
                'bac-bg-red-header': '#D9002E', // Para cabeceras rojas
                'bac-button-yellow': '#FFDD00', // Específico para botones amarillos
                'bac-button-yellow-hover': '#E6C200', // Hover para botones amarillos
            },
            // Extender otras propiedades del tema aquí si es necesario
            // fontFamily: {
            //   sans: ['Graphik', 'sans-serif'],
            //   serif: ['Merriweather', 'serif'],
            // },
        },
    },
    plugins: [
        // Añadir plugins de Tailwind según sea necesario
        // require('@tailwindcss/forms'),
        // require('@tailwindcss/typography'),
    ],
}