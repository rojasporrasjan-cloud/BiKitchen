import { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase/config';
import { consultasParaFechas } from '../utils/consultaPorFechas';
import { anotarSnapshot } from '../utils/contadorFirestore';

/**
 * Los pedidos de unas fechas, en vivo, leyendo solo esos.
 *
 * Ver `consultaPorFechas.js` para por qué son dos consultas y no una.
 *
 * NO SE DA POR CARGADO CON LO DEL CACHÉ. Con el caché en disco, Firestore
 * primero entrega lo que ya tenía guardado de otras pantallas —que puede ser
 * una parte— y un instante después lo del servidor. Si la hoja se diera por
 * lista con la primera entrega, podría imprimirse o bajarse el Excel sin
 * algunos clientes. Se espera la respuesta del servidor; si no llega en
 * `ESPERA_MAXIMA_MS` (sin internet), se muestra lo que hay y se avisa.
 *
 * @param {string[]} fechas  YYYY-MM-DD
 * @param {string}   motivo  para el contador de lecturas
 * @returns {{ pedidos: Array, cargando: boolean, sinServidor: boolean, error: Error|null }}
 */
export const ESPERA_MAXIMA_MS = 8000;

export default function usePedidosDeFechas(fechas, motivo = 'Pedidos por fecha') {
    const clave = [...new Set((fechas || []).filter(Boolean))].sort().join(',');
    const [estado, setEstado] = useState({ pedidos: [], cargando: true, sinServidor: false, error: null });

    useEffect(() => {
        const plan = consultasParaFechas(clave ? clave.split(',') : []);
        if (!plan) {
            setEstado({ pedidos: [], cargando: false, sinServidor: false, error: null });
            return undefined;
        }

        setEstado(e => ({ ...e, cargando: true, error: null }));

        const fuentes = [
            ...plan.grupos.map(g => query(collection(db, 'pedidos'), where('fechas_entrega', 'array-contains-any', g))),
            query(collection(db, 'pedidos'), where('fecha_entrega', '>=', plan.desde), where('fecha_entrega', '<=', plan.hasta))
        ];
        const porFuente = fuentes.map(() => new Map());
        const delServidor = fuentes.map(() => false);
        let vencido = false;
        let vigente = true;

        const publicar = () => {
            if (!vigente) return;
            const todos = new Map();
            porFuente.forEach(m => m.forEach((v, k) => todos.set(k, v)));
            const completo = delServidor.every(Boolean);
            setEstado({
                pedidos: [...todos.values()],
                cargando: !completo && !vencido,
                sinServidor: !completo && vencido,
                error: null
            });
        };

        const cortes = fuentes.map((q, i) => onSnapshot(
            q,
            { includeMetadataChanges: true },
            (snap) => {
                anotarSnapshot(snap, motivo);
                porFuente[i] = new Map(snap.docs.map(d => [d.id, { id: d.id, ...d.data() }]));
                if (!snap.metadata?.fromCache) delServidor[i] = true;
                publicar();
            },
            (error) => {
                console.error(`[Pedidos] No se pudo leer (${motivo}):`, error);
                if (vigente) setEstado(e => ({ ...e, cargando: false, error }));
            }
        ));

        const reloj = setTimeout(() => { vencido = true; publicar(); }, ESPERA_MAXIMA_MS);

        return () => {
            vigente = false;
            clearTimeout(reloj);
            cortes.forEach(c => c());
        };
    }, [clave, motivo]);

    return estado;
}
