import { useCallback, useEffect, useRef, useState } from 'react';
import { leerCola, guardarCola, enviarCola } from '../utils/colaDelReloj';
import { pedirAlReloj } from '../utils/planillaClient';

/**
 * La cola del reloj en la página: agregar un toque y mandarla.
 *
 * Los envíos van uno detrás del otro (una sola "cadena"): el reintento de cada
 * 30 s, el de cuando vuelve el internet y el del toque nuevo nunca mandan la
 * misma cola a la vez. Lo que el servidor rechaza de un envío que nadie está
 * esperando (un toque viejo, sin internet) queda en `rechazadas` para avisar.
 */
const REINTENTO_MS = 30000;

export default function useColaDelReloj(codigo) {
    const [cola, setCola] = useState(leerCola);
    const [rechazadas, setRechazadas] = useState([]);
    const cadena = useRef(Promise.resolve());
    const resultados = useRef(new Map());
    const esperando = useRef(new Set());

    const enviarPendientes = useCallback(() => {
        const vuelta = cadena.current.then(async () => {
            const actual = leerCola();
            if (actual.length === 0) return;
            const hechos = await enviarCola(actual, d => pedirAlReloj('marcar', { codigo, ...d }));
            const restante = leerCola().filter(m => !hechos.has(m.idMarca));
            guardarCola(restante);
            setCola(restante);
            const nuevas = [];
            hechos.forEach((r, id) => {
                resultados.current.set(id, r);
                if (!r.ok && !esperando.current.has(id)) {
                    const marca = actual.find(m => m.idMarca === id);
                    nuevas.push({ ...marca, error: r.error });
                }
            });
            if (nuevas.length) setRechazadas(v => [...v, ...nuevas]);
        });
        cadena.current = vuelta.catch(() => {});
        return cadena.current;
    }, [codigo]);

    /** Guarda el toque y lo manda; devuelve lo que contestó el servidor o null si no hay internet. */
    const marcar = useCallback(async (marca) => {
        esperando.current.add(marca.idMarca);
        const nueva = [...leerCola(), marca];
        guardarCola(nueva);
        setCola(nueva);
        await enviarPendientes();
        esperando.current.delete(marca.idMarca);
        const r = resultados.current.get(marca.idMarca) || null;
        resultados.current.delete(marca.idMarca);
        return r;
    }, [enviarPendientes]);

    const olvidarRechazadas = useCallback(() => setRechazadas([]), []);

    useEffect(() => {
        enviarPendientes();
        const t = setInterval(() => { if (leerCola().length) enviarPendientes(); }, REINTENTO_MS);
        window.addEventListener('online', enviarPendientes);
        return () => {
            clearInterval(t);
            window.removeEventListener('online', enviarPendientes);
        };
    }, [enviarPendientes]);

    return { cola, marcar, rechazadas, olvidarRechazadas };
}
