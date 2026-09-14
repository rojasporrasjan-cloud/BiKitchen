import React, { useState } from 'react';
import { X, Save, Ban, AlertTriangle, Plus } from 'lucide-react';
import CampoDePlato from './CampoDePlato';
import { leerMenuPegado, menuComoTexto } from '../../utils/guardarPedidoDeLaHoja';
import { contarCambios, MAX_CAMBIOS_POR_PACK } from '../../utils/limiteDeCambios';
import { leerListaDeProteinas } from '../../utils/proteinasPorEntrega';

/**
 * Arreglar un pedido SIN salir de la hoja de produccion.
 *
 * A las nueve de la noche, cuando la hoja sale mal, hoy hay que irse a buscar el
 * dato a otra pantalla —¿pedidos? ¿menus?— o rehacerla a mano, que fue lo que
 * termino haciendo la prima de Gina. Esto arregla el pedido ahi mismo.
 *
 * LO QUE SE EDITA ES EL PEDIDO, NO LA HOJA. La hoja se vuelve a armar sola con
 * el dato corregido. Si se editara una copia de la hoja, el arreglo duraria una
 * noche —el pedido seguiria mal la semana entrante— y, peor, las etiquetas y el
 * Excel saldrian de los datos viejos: se cocinaria una cosa y la etiqueta diria
 * otra. Eso no se ve hasta que el cliente abre la bolsa.
 *
 * Cancelar en vez de borrar: queda el rastro y se puede revertir. Nadie deberia
 * poder destruir un pedido sin querer a las nueve de la noche.
 */
export default function EditorDePedido({ pedido, onGuardar, onCancelarPedido, onCerrar, sugerencias = [] }) {
    const proteinasIniciales = (pedido?.proteinas || []).map(s => String(s).trim()).filter(Boolean).join('\n');
    const [notas, setNotas] = useState(pedido?.observaciones || '');
    // Un campo por proteína, para poder buscarla escribiendo ("tilapia").
    const [proteinas, setProteinas] = useState(() => {
        const iniciales = pedido?.proteinas || [];
        const largo = Math.max(pedido?.cuantasProteinas || 0, iniciales.length);
        return Array.from({ length: largo }, (_, i) => iniciales[i] || '');
    });
    const [platoBuscado, setPlatoBuscado] = useState('');
    // El menu de un PERSONALIZADO: arranca con lo que el pedido tiene hoy.
    const menuInicial = menuComoTexto(pedido?.menuActual || []);
    const [menuTexto, setMenuTexto] = useState(menuInicial);
    // El NOMBRE del pack. De el salen el gramaje, la familia y en que hoja va.
    const planInicial = String(pedido?.plan || '');
    const [plan, setPlan] = useState(planInicial);

    // La entrega que se esta mirando, y a donde se mueve.
    const fechaDeHoy = pedido?.fechaDeLaHoja || (pedido?.fechasEntrega || [])[0] || '';
    const [fechaNueva, setFechaNueva] = useState(fechaDeHoy);
    const [moverTodas, setMoverTodas] = useState(false);

    const [guardando, setGuardando] = useState(false);
    const [confirmandoCancelar, setConfirmandoCancelar] = useState(false);
    const [error, setError] = useState(null);

    if (!pedido) return null;

    const cuantasPide = pedido.cuantasProteinas || 0;
    const listaProteinas = proteinas.map(s => s.trim()).filter(Boolean);
    const ponerProteina = (i, valor) => setProteinas(proteinas.map((x, j) => (j === i ? valor : x)));
    // Pegar varias de WhatsApp en un campo las reparte desde ese campo para abajo.
    const pegarProteinas = (i) => (e) => {
        const texto = e.clipboardData?.getData('text') || '';
        if (!/\n/.test(texto.trim())) return;
        e.preventDefault();
        const nueva = [...proteinas];
        leerListaDeProteinas(texto).forEach((nombre, k) => { nueva[i + k] = nombre; });
        setProteinas(nueva);
    };
    const esPersonalizado = !!pedido.esPersonalizado;
    const menuCambio = esPersonalizado && menuTexto !== menuInicial;
    const menuLeido = leerMenuPegado(menuTexto);
    // Un menu vacio no se guarda: borraria los platos del pedido y la hoja
    // dejaria de imprimirle nada al cliente.
    const menuInvalido = menuCambio && menuLeido.platos.length === 0;
    const planCambio = plan.trim() !== planInicial.trim() && plan.trim().length > 0;
    const fechaCambio = !!fechaNueva && !!fechaDeHoy && fechaNueva !== fechaDeHoy;
    const cambio = notas !== (pedido.observaciones || '') || listaProteinas.join('\n') !== proteinasIniciales
        || menuCambio || planCambio || fechaCambio;

    const guardar = async () => {
        setGuardando(true);
        setError(null);
        try {
            await onGuardar({
                observaciones: notas,
                proteinas: cuantasPide ? listaProteinas : null,
                // Solo si se toco: si no, se guardaria el menu tal como se
                // releyo del texto, y un plato raro podria perderse.
                menu: menuCambio ? menuLeido.platos : null,
                // Solo si se tocaron: mandar el valor de siempre gastaria una
                // escritura y ensuciaria la fecha de modificacion sin motivo.
                plan: planCambio ? plan.trim() : null,
                fechas: fechaCambio
                    ? { fechaActual: fechaDeHoy, fechaNueva, todas: moverTodas }
                    : null
            });
            onCerrar();
        } catch (e) {
            setError(e?.message || 'No se pudo guardar. Revisá la conexión.');
        }
        setGuardando(false);
    };

    return (
        <div className="print:hidden fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
                <div className="flex items-start justify-between p-5 border-b border-gray-100">
                    <div>
                        <h3 className="text-lg font-bold text-gray-900">{pedido.cliente}</h3>
                        <p className="text-sm text-gray-500">{pedido.plan}</p>
                    </div>
                    <button
                        onClick={onCerrar}
                        aria-label="Cerrar"
                        className="p-2 -m-1 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-50"
                    >
                        <X size={20} aria-hidden="true" />
                    </button>
                </div>

                <div className="p-5 space-y-5">
                    {/* El NOMBRE del pack.
                        No es una etiqueta: de acá salen el gramaje que se cocina, la
                        familia donde se imprime, y si va en hoja aparte. El pack de
                        Patrick decía "(250g)" y él es de 500, y no había forma de
                        arreglarlo desde la hoja. */}
                    <div>
                        <label htmlFor="plan-pedido" className="block text-sm font-bold text-gray-800">
                            Nombre del pack
                        </label>
                        <p className="text-xs text-gray-500 mt-0.5 mb-2">
                            De acá salen <b>los gramos</b> y <b>la familia</b>. Si empieza con
                            <b> PERSONALIZADO</b>, sale en su propia hoja con los platos del pedido.
                        </p>
                        <input
                            id="plan-pedido"
                            type="text"
                            value={plan}
                            onChange={(e) => setPlan(e.target.value)}
                            className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                            placeholder="Pack 5 Proteínas (500g)"
                        />
                        {planCambio && (
                            <p className="mt-1.5 text-xs text-amber-700 flex items-start gap-1.5">
                                <AlertTriangle size={13} className="flex-shrink-0 mt-0.5" aria-hidden="true" />
                                Cambiar el nombre cambia <b>cuánto se cocina</b> y en qué hoja sale.
                                Dejá escritos los gramos y la familia.
                            </p>
                        )}
                    </div>

                    {/* La FECHA de entrega.
                        Son DOS operaciones distintas y confundirlas rompe el pedido:
                        mover las cuatro entregas de un mensual cuando solo había que
                        mover una le cambia el plan al cliente. */}
                    {fechaDeHoy && (
                        <div>
                            <label htmlFor="fecha-pedido" className="block text-sm font-bold text-gray-800">
                                Día de entrega
                            </label>
                            <p className="text-xs text-gray-500 mt-0.5 mb-2">
                                Hoy está en <b>{fechaDeHoy}</b>.
                            </p>
                            <input
                                id="fecha-pedido"
                                type="date"
                                value={fechaNueva}
                                onChange={(e) => setFechaNueva(e.target.value)}
                                className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                            />

                            {fechaCambio && (
                                <div className="mt-2 rounded-xl border-2 border-amber-300 bg-amber-50 p-2.5">
                                    <label className="flex items-start gap-2 text-sm cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={moverTodas}
                                            onChange={(e) => setMoverTodas(e.target.checked)}
                                            className="w-4 h-4 mt-0.5 cursor-pointer flex-shrink-0"
                                        />
                                        <span className="text-amber-900">
                                            <b>Mover TODAS sus entregas</b>
                                            <span className="block text-xs mt-0.5">
                                                {moverTodas
                                                    ? 'Se corre el calendario entero: deja de ser de un día y pasa a ser de otro.'
                                                    : 'Solo se mueve esta entrega. Las demás quedan como están.'}
                                            </span>
                                        </span>
                                    </label>
                                </div>
                            )}
                        </div>
                    )}

                    {cuantasPide > 0 && (
                        <div>
                            <p className="block text-sm font-bold text-gray-800">
                                Las {cuantasPide} proteínas que eligió
                                {pedido.fechaDeProteinas && (
                                    <span className="block text-xs font-semibold text-orange-700 mt-0.5">
                                        Solo para la entrega del {pedido.fechaDeProteinas.split('-').reverse().join('/')}. Las otras semanas no cambian.
                                    </span>
                                )}
                            </p>
                            <p className="text-xs text-gray-500 mt-0.5 mb-2">
                                Escribí una parte del nombre ("tilapia") y elegí de la lista, así se
                                escribe igual que en el menú. También podés pegar la lista de WhatsApp.
                            </p>
                            <ol className="space-y-1.5">
                                {proteinas.map((valor, i) => (
                                    <li key={i} className="flex items-center gap-2">
                                        <span className="w-5 text-right text-xs font-bold text-gray-400" aria-hidden="true">{i + 1}</span>
                                        <CampoDePlato
                                            value={valor}
                                            onChange={(v) => ponerProteina(i, v)}
                                            onPaste={pegarProteinas(i)}
                                            sugerencias={sugerencias}
                                            ariaLabel={`Proteína ${i + 1}`}
                                            placeholder="Escribí o elegí una proteína"
                                        />
                                    </li>
                                ))}
                            </ol>
                            <button
                                type="button"
                                onClick={() => setProteinas([...proteinas, ''])}
                                className="mt-2 inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-300 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                            >
                                <Plus size={13} aria-hidden="true" /> Otra proteína
                            </button>
                            {/* Repetir la misma proteina es casi siempre un dedazo al cargar:
                                a Diana Gonzalez le quedaron tres "Milanesa de pollo" y se le
                                iban a cocinar tres veces lo mismo. */}
                            {listaProteinas.length > 0
                                && new Set(listaProteinas.map(s => s.toLowerCase())).size < listaProteinas.length && (
                                <p className="mt-1.5 text-xs text-amber-700 flex items-start gap-1.5">
                                    <AlertTriangle size={13} className="flex-shrink-0 mt-0.5" aria-hidden="true" />
                                    Hay proteínas repetidas. Si es a propósito está bien, pero
                                    revisá que no sea un error de carga.
                                </p>
                            )}
                            <p className={`mt-1 text-xs font-semibold ${
                                listaProteinas.length === cuantasPide ? 'text-green-700' : 'text-amber-700'
                            }`}>
                                {listaProteinas.length} de {cuantasPide} escritas
                            </p>
                        </div>
                    )}

                    {esPersonalizado && (
                        <div>
                            <label htmlFor="menu-pedido" className="block text-sm font-bold text-gray-800">
                                Menú de esta entrega
                            </label>
                            <p className="text-xs text-gray-500 mt-0.5 mb-2">
                                Pegá los platos como vienen en WhatsApp: proteína, vegetal y carbo, uno por
                                renglón, y un renglón en blanco entre plato y plato. Los datos del cliente
                                de arriba se ignoran solos.
                            </p>
                            {/* Buscar el plato para escribirlo igual que en el menú: si queda
                                "pollo pesto" y en el menú dice "Pollo al pesto", la cocina los
                                cuenta como dos ollas. */}
                            <div className="flex items-center gap-2 mb-2">
                                <CampoDePlato
                                    value={platoBuscado}
                                    onChange={setPlatoBuscado}
                                    onElegir={(nombre) => {
                                        setMenuTexto(t => (t && !t.endsWith('\n') ? `${t}\n` : t) + nombre);
                                        setPlatoBuscado('');
                                    }}
                                    sugerencias={sugerencias}
                                    ariaLabel="Buscar un plato para agregarlo al menú"
                                    placeholder="Buscar un plato (ej: tilapia) y tocarlo para agregarlo"
                                />
                            </div>
                            <textarea
                                id="menu-pedido"
                                value={menuTexto}
                                onChange={(e) => setMenuTexto(e.target.value)}
                                rows={12}
                                className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-base sm:text-sm font-mono focus:outline-none focus:ring-2 focus:ring-orange-400"
                                placeholder={'Pollo al pesto\nZuchinnis salteados\nPapitas salteadas\n\nFilet de tilapia\nEnsalada coleslaw\nPure de papa'}
                            />

                            {/* Lo que se va a guardar, plato por plato, ANTES de guardarlo. */}
                            {menuCambio && menuLeido.platos.length > 0 && (
                                <ol className="mt-2 space-y-1 text-xs text-gray-800 bg-green-50 border border-green-200 rounded-lg p-2.5">
                                    {menuLeido.platos.map((p, i) => (
                                        <li key={i}>
                                            <span className="font-bold">Plato {i + 1}:</span>{' '}
                                            {p.proteina} · {p.vegetal}{p.carbo ? ` · ${p.carbo}` : ''}
                                        </li>
                                    ))}
                                </ol>
                            )}
                            {menuCambio && menuLeido.ignorados.length > 0 && (
                                <p className="mt-1.5 text-xs text-amber-700 flex items-start gap-1.5">
                                    <AlertTriangle size={13} className="flex-shrink-0 mt-0.5" aria-hidden="true" />
                                    <span>
                                        No se usan porque no parecen un plato: {menuLeido.ignorados.join(' · ')}.
                                        Si alguno SÍ era un plato, dejale un renglón en blanco antes y después.
                                    </span>
                                </p>
                            )}
                            {menuInvalido && (
                                <p className="mt-1.5 text-xs font-semibold text-red-700">
                                    No se encontró ningún plato. No se puede guardar un menú vacío.
                                </p>
                            )}
                        </div>
                    )}

                    <div>
                        <label htmlFor="notas-pedido" className="block text-sm font-bold text-gray-800">
                            Especificaciones
                        </label>
                        <p className="text-xs text-gray-500 mt-0.5 mb-2">
                            Lo que hay que tener en cuenta al cocinar o empacar. Sale impreso en la hoja.
                        </p>
                        <textarea
                            id="notas-pedido"
                            value={notas}
                            onChange={(e) => setNotas(e.target.value)}
                            rows={4}
                            className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                            placeholder="Ej: NO VAINICAS. · Cambiar zuchinnis por ensalada coleslaw."
                        />
                        {/* Maximo 2 cambios por pack (Gina, 14 set 2026). Se cuenta
                            mientras se escribe; las restricciones no cuentan. */}
                        {(() => {
                            const { total } = contarCambios({ observaciones: notas, items: pedido.items });
                            if (total === 0) return null;
                            const deMas = total > MAX_CAMBIOS_POR_PACK;
                            return (
                                <p className={`mt-1.5 text-xs font-semibold flex items-start gap-1.5 ${deMas ? 'text-red-700' : 'text-gray-600'}`}>
                                    {deMas && <AlertTriangle size={13} className="flex-shrink-0 mt-0.5" aria-hidden="true" />}
                                    {total} {total === 1 ? 'cambio' : 'cambios'} de ingredientes
                                    {deMas
                                        ? ` — el máximo es ${MAX_CAMBIOS_POR_PACK} por pack. Si es cliente nuevo o renueva, dejalo en ${MAX_CAMBIOS_POR_PACK}.`
                                        : ` de ${MAX_CAMBIOS_POR_PACK} permitidos`}
                                </p>
                            );
                        })()}
                    </div>

                    {error && (
                        <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                            {error}
                        </p>
                    )}
                </div>

                <div className="flex flex-wrap gap-3 p-5 border-t border-gray-100">
                    {!confirmandoCancelar ? (
                        <button
                            onClick={() => setConfirmandoCancelar(true)}
                            className="px-4 py-2.5 rounded-xl border-2 border-red-200 text-red-700 font-semibold text-sm hover:bg-red-50 inline-flex items-center gap-1.5"
                        >
                            <Ban size={15} aria-hidden="true" /> Cancelar este pedido
                        </button>
                    ) : (
                        <div className="w-full bg-red-50 border border-red-200 rounded-xl p-3">
                            <p className="text-sm font-bold text-red-900">
                                ¿Sacar este pedido de la hoja?
                            </p>
                            <p className="text-xs text-red-800 mt-1 mb-2.5">
                                No se borra: queda cancelado y se puede volver a activar desde
                                Pedidos. Deja de cocinarse y de imprimirse.
                            </p>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setConfirmandoCancelar(false)}
                                    className="px-3 py-2 rounded-lg border border-gray-300 text-sm font-semibold text-gray-700 bg-white"
                                >
                                    No
                                </button>
                                <button
                                    onClick={async () => { await onCancelarPedido(); onCerrar(); }}
                                    className="px-3 py-2 rounded-lg bg-red-600 text-white text-sm font-bold"
                                >
                                    Sí, sacarlo
                                </button>
                            </div>
                        </div>
                    )}

                    <button
                        onClick={guardar}
                        disabled={!cambio || guardando || menuInvalido}
                        className="ml-auto px-5 py-2.5 rounded-xl bg-bikitchen-orange text-white font-bold text-sm hover:bg-bikitchen-orange-dark disabled:opacity-40 inline-flex items-center gap-1.5"
                    >
                        <Save size={15} aria-hidden="true" />
                        {guardando ? 'Guardando…' : 'Guardar'}
                    </button>
                </div>
            </div>
        </div>
    );
}
