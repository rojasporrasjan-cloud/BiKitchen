import React, { useState } from 'react';
import { RefreshCw, Undo2 } from 'lucide-react';

/**
 * Un plato del menú de la semana, con un botón "Cambiar" en cada parte.
 *
 * El cliente no escribe nada: toca la parte y elige de la lista de Gina. Así la
 * cocina nunca recibe un plato que no tiene, y nadie tiene que interpretar un
 * mensaje de WhatsApp a las nueve de la noche.
 *
 * El cambio es del INGREDIENTE, no del plato: si el puré va en dos platos,
 * cambiarlo en uno lo cambia en los dos. Así lo aplica la hoja de cocina, y
 * así el cliente ve exactamente lo que le va a llegar.
 */

const NOMBRE_DE_PARTE = { proteina: 'Proteína', vegetal: 'Vegetal', carbo: 'Harina' };
const PARTES = ['proteina', 'vegetal', 'carbo'];

export default function PlatoParaCambiar({ plato, comida, cambios, opciones, puedeCambiarMas, onCambiar }) {
    const [abierta, setAbierta] = useState(null);

    const elegir = (parte, valor) => {
        onCambiar(comida, parte, plato[parte], valor);
        setAbierta(null);
    };

    return (
        <li className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <p className="text-xs font-bold uppercase tracking-wider text-bikitchen-orange">
                {comida === 'cena' ? 'Cena' : 'Plato'} {plato.numero}
            </p>

            <ul className="mt-2 divide-y divide-gray-100">
                {PARTES.filter(parte => plato[parte]).map((parte) => {
                    const clave = `${comida}|${parte}|${plato[parte]}`;
                    const nuevo = cambios[clave];
                    const lista = (opciones[parte] || []).filter(o => o !== plato[parte]);
                    const sePuede = lista.length > 0 && (nuevo || puedeCambiarMas);
                    const idOpciones = `opciones-${comida}-${plato.numero}-${parte}`;

                    return (
                        <li key={parte} className="py-2.5">
                            <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                    <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">
                                        {NOMBRE_DE_PARTE[parte]}
                                    </p>
                                    {nuevo ? (
                                        <>
                                            <p className="text-sm text-gray-400 line-through">{plato[parte]}</p>
                                            <p className="text-base font-bold text-bikitchen-orange">{nuevo}</p>
                                        </>
                                    ) : (
                                        <p className="text-base text-gray-900">{plato[parte]}</p>
                                    )}
                                </div>

                                {nuevo ? (
                                    <button
                                        type="button"
                                        onClick={() => onCambiar(comida, parte, plato[parte], null)}
                                        className="shrink-0 flex items-center gap-1 px-3 py-2 text-sm font-semibold text-gray-600 bg-gray-100 rounded-xl active:scale-95 transition-transform"
                                    >
                                        <Undo2 size={15} aria-hidden="true" /> Deshacer
                                    </button>
                                ) : sePuede && (
                                    <button
                                        type="button"
                                        onClick={() => setAbierta(abierta === parte ? null : parte)}
                                        aria-expanded={abierta === parte}
                                        aria-controls={idOpciones}
                                        className="shrink-0 flex items-center gap-1 px-3 py-2 text-sm font-semibold text-bikitchen-orange bg-orange-50 rounded-xl active:scale-95 transition-transform"
                                    >
                                        <RefreshCw size={15} aria-hidden="true" /> Cambiar
                                    </button>
                                )}
                            </div>

                            {abierta === parte && (
                                <div id={idOpciones} className="mt-3 flex flex-wrap gap-2">
                                    {lista.map(opcion => (
                                        <button
                                            key={opcion}
                                            type="button"
                                            onClick={() => elegir(parte, opcion)}
                                            className="px-3.5 py-2 text-sm text-gray-800 bg-white border-2 border-gray-200 rounded-full hover:border-bikitchen-orange active:scale-95 transition-all"
                                        >
                                            {opcion}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </li>
                    );
                })}
            </ul>
        </li>
    );
}
