import React, { useState } from 'react';
import { RefreshCw, Undo2, Drumstick, Leaf, Wheat, Check } from 'lucide-react';

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
const ICONO_DE_PARTE = { proteina: Drumstick, vegetal: Leaf, carbo: Wheat };
const PARTES = ['proteina', 'vegetal', 'carbo'];

/** Un ingrediente del plato: lo que trae, o lo tachado y lo nuevo. */
function Ingrediente({ parte, actual, nuevo }) {
    const Icono = ICONO_DE_PARTE[parte];
    const esProteina = parte === 'proteina';
    return (
        <div className="flex items-start gap-3 min-w-0">
            <span className={`shrink-0 mt-0.5 flex items-center justify-center w-8 h-8 rounded-full ${nuevo ? 'bg-bikitchen-orange text-white' : 'bg-bikitchen-beige text-bikitchen-orange'}`} aria-hidden="true">
                {nuevo ? <Check size={16} /> : <Icono size={16} />}
            </span>
            <div className="min-w-0">
                <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">
                    {NOMBRE_DE_PARTE[parte]}
                </p>
                {nuevo ? (
                    <>
                        <p className="text-sm text-gray-400 line-through leading-snug">{actual}</p>
                        <p className={`font-bold text-bikitchen-orange leading-snug ${esProteina ? 'text-lg' : 'text-base'}`}>{nuevo}</p>
                    </>
                ) : (
                    <p className={`text-gray-900 leading-snug ${esProteina ? 'text-lg font-bold' : 'text-base'}`}>{actual}</p>
                )}
            </div>
        </div>
    );
}

export default function PlatoParaCambiar({ plato, comida, cambios, opciones, puedeCambiarMas, onCambiar }) {
    const [abierta, setAbierta] = useState(null);

    const elegir = (parte, valor) => {
        onCambiar(comida, parte, plato[parte], valor);
        setAbierta(null);
    };

    const partes = PARTES.filter(parte => plato[parte]);
    const conCambio = partes.some(parte => cambios[`${comida}|${parte}|${plato[parte]}`]);

    return (
        <li className={`bg-white rounded-3xl border-2 shadow-sm overflow-hidden transition-colors ${conCambio ? 'border-bikitchen-orange' : 'border-transparent'}`}>
            <div className="flex items-center justify-between px-4 pt-4">
                <p className="text-xs font-black uppercase tracking-wider text-bikitchen-orange">
                    {comida === 'cena' ? 'Cena' : 'Plato'} {plato.numero}
                </p>
                {conCambio && (
                    <span className="text-[11px] font-bold text-white bg-bikitchen-orange px-2 py-0.5 rounded-full">Con cambio</span>
                )}
            </div>

            <ul className="px-4 pb-2 divide-y divide-gray-100">
                {partes.map((parte) => {
                    const clave = `${comida}|${parte}|${plato[parte]}`;
                    const nuevo = cambios[clave];
                    const lista = (opciones[parte] || []).filter(o => o !== plato[parte]);
                    const sePuede = lista.length > 0 && (nuevo || puedeCambiarMas);
                    const idOpciones = `opciones-${comida}-${plato.numero}-${parte}`;

                    return (
                        <li key={parte} className="py-3">
                            <div className="flex items-start justify-between gap-2">
                                <Ingrediente parte={parte} actual={plato[parte]} nuevo={nuevo} />

                                {nuevo ? (
                                    <button
                                        type="button"
                                        onClick={() => onCambiar(comida, parte, plato[parte], null)}
                                        aria-label={`Deshacer el cambio de ${plato[parte]}`}
                                        className="shrink-0 flex items-center gap-1 px-3 py-2 text-sm font-semibold text-gray-600 bg-gray-100 rounded-full active:scale-95 transition-transform"
                                    >
                                        <Undo2 size={15} aria-hidden="true" /> Deshacer
                                    </button>
                                ) : sePuede && (
                                    <button
                                        type="button"
                                        onClick={() => setAbierta(abierta === parte ? null : parte)}
                                        aria-expanded={abierta === parte}
                                        aria-controls={idOpciones}
                                        className={`shrink-0 flex items-center gap-1 px-3 py-2 text-sm font-semibold rounded-full active:scale-95 transition-all ${abierta === parte ? 'bg-bikitchen-orange text-white' : 'text-bikitchen-orange bg-orange-50'}`}
                                    >
                                        <RefreshCw size={15} aria-hidden="true" /> Cambiar
                                    </button>
                                )}
                            </div>

                            {abierta === parte && (
                                <div id={idOpciones} className="mt-3 ml-11 p-3 bg-bikitchen-beige rounded-2xl">
                                    <p className="text-xs font-semibold text-gray-500 mb-2">Elegí por cuál lo cambiamos:</p>
                                    <div className="flex flex-wrap gap-2">
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
                                </div>
                            )}
                        </li>
                    );
                })}
            </ul>
        </li>
    );
}
