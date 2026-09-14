import { useEffect, useState } from 'react';
import { collection, query, where, getCountFromServer } from 'firebase/firestore';
import { db } from '../firebase/config';
import { anotarLecturas } from '../utils/contadorFirestore';

/**
 * Cuántos pedidos esperan confirmación, para el numerito del menú lateral.
 *
 * Antes el menú bajaba la colección `pedidos` ENTERA (~600 documentos) en cada
 * página del panel solo para contar estos. Un conteo de Firestore cuesta UNA
 * lectura por cada mil documentos, así que ahora cuesta 1.
 *
 * No es en vivo: se cuenta al abrir, al volver a la pestaña y cada cinco
 * minutos. Para un numerito de aviso alcanza, y un listener en vivo cobraría
 * cada pedido pendiente.
 */
export const ESTADOS_PENDIENTES = ['pending_payment', 'pending', 'new'];
export const CADA_MS = 5 * 60 * 1000;

export default function usePedidosPendientes(activo = true) {
    const [cuantos, setCuantos] = useState(0);

    useEffect(() => {
        if (!activo) return undefined;
        let vigente = true;

        const contar = async () => {
            if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
            try {
                const q = query(collection(db, 'pedidos'), where('status', 'in', ESTADOS_PENDIENTES));
                const r = await getCountFromServer(q);
                anotarLecturas(1, 'Pendientes (menú)');
                if (vigente) setCuantos(r.data().count || 0);
            } catch (error) {
                // El numerito no vale tumbar el panel.
                console.error('[Menú] No se pudieron contar los pendientes:', error);
            }
        };

        contar();
        const reloj = setInterval(contar, CADA_MS);
        const alVolver = () => { if (document.visibilityState === 'visible') contar(); };
        document.addEventListener('visibilitychange', alVolver);
        return () => {
            vigente = false;
            clearInterval(reloj);
            document.removeEventListener('visibilitychange', alVolver);
        };
    }, [activo]);

    return cuantos;
}
