import ARSceneWrapper from '@/components/ar/ARSceneWrapper'; // Ajusta ruta
import { PlaceholderCube } from '@/components/ar/PlaceholderCube'; // Ajusta ruta

export default function JugarPage() {
    return (
        <div>
            {/* Overlay UI: Botones, Lector QR se añadirán aquí */}
            <div style={{ position: 'absolute', top: 10, left: 10, zIndex: 1, background:'rgba(0,0,0,0.5)', color:'white', padding:'10px' }}>
                <p>Modo Jugar (AR)</p>
                {/* Aquí iría el componente del lector QR */}
            </div>

            <ARSceneWrapper>
                <PlaceholderCube /> {/* Muestra el cubo mientras no hay AR */}
            </ARSceneWrapper>
        </div>
    );
}