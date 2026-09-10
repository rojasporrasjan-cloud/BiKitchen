import React, { useState, useEffect } from 'react';
import { ChefHat, ArrowRight, Check } from 'lucide-react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { proximaHornada } from '../../utils/fechasDeCocina';
import { COLECCION_TANDAS, acumularEnviados } from '../../utils/tandasDeCocina';
import { abrirHoja } from '../../utils/abrirHoja';

/**
 * De donde se saca la hoja de cocina de la semana.
 *
 * El ciclo es siempre el mismo: se cocina para el SABADO y el LUNES juntos.
 *
 *   jueves    ->  los mensuales y quincenales, que ya estan pagados
 *   viernes   ->  lo que entro desde el jueves
 *   sabado    ->  lo que entro desde el viernes
 *
 * Cada hoja lleva SOLO lo que no se mando antes. Este panel existe para que eso
 * no dependa de escribir una URL a mano: las fechas vienen calculadas y el
 * estado de abajo dice que ya salio.
 */
export default function HojaDeCocinaPorTandas() {
    const hoy = new Date().toISOString().split('T')[0];
    const inicial = proximaHornada(hoy);

    const [sabado, setSabado] = useState(inicial.sabado);
    const [lunes, setLunes] = useState(inicial.lunes);
    const [tandas, setTandas] = useState([]);
    const [cargando, setCargando] = useState(true);

    const clave = `${sabado}_${lunes}`;

    useEffect(() => {
        let vigente = true;
        setCargando(true);
        getDocs(query(collection(db, COLECCION_TANDAS), where('clave', '==', clave)))
            .then(snap => {
                if (!vigente) return;
                setTandas(snap.docs.map(d => d.data()).sort((a, b) =>
                    String(a.enviada || '').localeCompare(String(b.enviada || ''))));
                setCargando(false);
            })
            .catch(err => {
                console.error('[Cocina] No se pudieron leer las tandas:', err);
                if (vigente) setCargando(false);
            });
        return () => { vigente = false; };
    }, [clave]);

    const yaEnviados = acumularEnviados(tandas);
    const esLaPrimera = tandas.length === 0;

    // `view=cocina` no es opcional: sin el, la vista arranca en 'all' y lo
    // primero que sale es la hoja de EMPAQUE. Esto es lo que se le manda a la
    // cocina, asi que tiene que abrir en la de cocina.
    const abrir = (adelanto) => {
        const url = `/admin/print-production?date=${sabado},${lunes}&view=cocina`
            + (adelanto ? '&tanda=adelanto' : '');
        abrirHoja(url);
    };

    const fechaCorta = (iso) => {
        if (!iso) return '';
        const d = new Date(`${iso}T12:00:00`);
        return d.toLocaleDateString('es-CR', { weekday: 'long', day: 'numeric', month: 'long' });
    };

    return (
        <div className="max-w-4xl mx-auto mt-8 bg-white rounded-xl border-2 border-gray-900 overflow-hidden">
            <div className="bg-gray-900 text-white px-5 py-3 flex items-center gap-3">
                <ChefHat size={22} aria-hidden="true" />
                <div>
                    <div className="font-bold uppercase tracking-wide text-sm">Hoja de cocina de la semana</div>
                    <div className="text-xs text-gray-300">
                        Se cocina para el sábado y el lunes juntos. Cada hoja lleva solo lo que no se mandó antes.
                    </div>
                </div>
            </div>

            <div className="p-5">
                <div className="flex flex-wrap gap-4 items-end mb-5">
                    <label className="text-sm">
                        <span className="block text-gray-500 mb-1">Sábado</span>
                        <input type="date" value={sabado} onChange={e => setSabado(e.target.value)}
                            className="px-3 py-2 border border-gray-300 rounded-lg" />
                    </label>
                    <label className="text-sm">
                        <span className="block text-gray-500 mb-1">Lunes</span>
                        <input type="date" value={lunes} onChange={e => setLunes(e.target.value)}
                            className="px-3 py-2 border border-gray-300 rounded-lg" />
                    </label>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <button
                        onClick={() => abrir(true)}
                        className="text-left p-4 rounded-lg border-2 border-gray-900 bg-gray-900 text-white hover:bg-gray-800 transition-colors"
                    >
                        <div className="font-bold flex items-center gap-2">
                            1. Adelanto del jueves <ArrowRight size={16} aria-hidden="true" />
                        </div>
                        <div className="text-xs text-gray-300 mt-1">
                            Solo mensuales y quincenales. Es lo que ya está pagado y no va a cambiar.
                        </div>
                    </button>

                    <button
                        onClick={() => abrir(false)}
                        className="text-left p-4 rounded-lg border-2 border-gray-300 hover:border-gray-900 transition-colors"
                    >
                        <div className="font-bold flex items-center gap-2 text-gray-900">
                            2. Viernes y sábado <ArrowRight size={16} aria-hidden="true" />
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                            Todo lo que haya entrado y todavía no se le haya mandado.
                        </div>
                    </button>
                </div>

                <div className="mt-5 pt-4 border-t border-gray-200 text-sm">
                    {cargando ? (
                        <span className="text-gray-400">Revisando qué se mandó…</span>
                    ) : esLaPrimera ? (
                        <span className="text-gray-600">
                            Todavía no se le ha mandado nada a la cocina para el {fechaCorta(sabado)} y el {fechaCorta(lunes)}.
                        </span>
                    ) : (
                        <>
                            <div className="font-bold text-gray-900 mb-2">
                                Ya se mandó ({yaEnviados.length} pedido{yaEnviados.length === 1 ? '' : 's'} en total):
                            </div>
                            <ul className="space-y-1">
                                {tandas.map((t, i) => (
                                    <li key={i} className="flex items-center gap-2 text-gray-700">
                                        <Check size={14} className="text-green-600" aria-hidden="true" />
                                        <span>
                                            {t.soloRecurrentes ? 'Adelanto' : 'Complemento'} — {t.cuantos} pedidos
                                            {t.enviada && ` · ${new Date(t.enviada).toLocaleString('es-CR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}`}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
