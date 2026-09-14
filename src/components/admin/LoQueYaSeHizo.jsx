import React from 'react';
import { ClipboardPaste, PackageCheck, ChefHat, AlertTriangle } from 'lucide-react';

/**
 * Meter lo que Gina reportó anoche: qué sobró y qué alcanzó a empacar.
 *
 * Las dos cosas son descuentos, pero de lados distintos:
 *
 *   LO QUE SOBRÓ      es comida que ya existe -> se cocina menos
 *   LO QUE SE EMPACÓ  son packs que ya están armados -> no se vuelven a empacar
 *
 * Van juntas en un panel porque llegan juntas, en el mismo mensaje de WhatsApp,
 * y porque si se mete una sola la hoja queda a medias sin avisar.
 *
 * Lo que el lector NO entienda se muestra en pantalla en vez de descontarse.
 * Un descuento de menos hace que falte comida el sábado, y eso no se ve hasta
 * ese día, cuando ya no hay nada que hacer.
 */
export default function LoQueYaSeHizo({
    texto,
    onTexto,
    sobrantes,
    candidatos = [],
    empacados = [],
    onAlternar,
    familias = [],
    pedidosCocinados = [],
    onAlternarFamilia,
    onAlternarPedido,
    desactivado = false,
    // La hoja del sabado: lo que sobro el viernes y lo del lunes que ya se
    // empaco. La columna de "familias cocinadas" no va: el sabado la cocina se
    // descuenta con lo que sobro, y marcar familias no cambia ninguna cantidad.
    delSabado = false
}) {
    const marcados = new Set(empacados);
    const marcadosCocina = new Set(pedidosCocinados);
    const cuantosMarcados = candidatos.filter(c => marcados.has(c.clave)).length;

    return (
        <div className="print:hidden mb-6 rounded-xl border-2 border-sky-300 bg-sky-50 p-4">
            <h3 className="font-black text-sky-900 text-lg">Lo que ya se hizo</h3>
            <p className="text-sm text-sky-900 mb-4">
                {delSabado
                    ? 'Lo que Gina reportó el viernes en la noche: qué sobró y qué del lunes ya quedó empacado.'
                    : 'Lo que Gina reportó anoche. Se descuenta de esta hoja para no cocinar ni empacar dos veces.'}
            </p>

            {desactivado && (
                <div className="mb-4 rounded-lg bg-amber-100 border border-amber-400 p-2.5 text-sm text-amber-900">
                    <b>Estás viendo TODO sin rebajar</b>, así que estos descuentos no se
                    están aplicando. Destildá ese interruptor para verlos.
                </div>
            )}

            <div className={`grid grid-cols-1 ${delSabado ? 'lg:grid-cols-2' : 'lg:grid-cols-3'} gap-5`}>

                {/* ── Lo que sobró ───────────────────────────────────────── */}
                <div>
                    <label htmlFor="sobrantes" className="flex items-center gap-2 font-bold text-sky-900 text-sm mb-1">
                        <ClipboardPaste size={16} aria-hidden="true" />
                        Comida que sobró
                    </label>
                    <p className="text-xs text-sky-800 mb-2">
                        Pegá el mensaje tal cual. Entiende <i>“Carne mechada 3 kg”</i>,
                        <i> “3 kg de carne mechada”</i> y <i>“Carne mechada: 3 kg”</i>.
                    </p>
                    <textarea
                        id="sobrantes"
                        value={texto}
                        onChange={(e) => onTexto(e.target.value)}
                        rows={7}
                        placeholder={'Sobró:\nCarne mechada 3 kg\n2 kg de pollo a la toscana\nVegetales mixtos: 10 tazas'}
                        className="w-full border-2 border-sky-200 rounded-lg p-2.5 text-sm font-mono focus:border-sky-500 focus:outline-none"
                    />

                    {sobrantes?.reconocidos?.length > 0 && (
                        <div className="mt-2 text-sm">
                            <b className="text-green-800">
                                Se descuentan {sobrantes.reconocidos.length}:
                            </b>
                            <ul className="mt-1 space-y-0.5">
                                {sobrantes.reconocidos.map((r, i) => (
                                    <li key={i} className="text-green-900">
                                        {r.nombre} — <b>{r.cantidad} {r.unidad === 'g' ? 'g' : r.unidad}</b>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {sobrantes?.sinEntender?.length > 0 && (
                        <div className="mt-2 rounded-lg bg-amber-100 border border-amber-400 p-2.5 text-sm text-amber-900">
                            <b className="flex items-center gap-1.5">
                                <AlertTriangle size={14} aria-hidden="true" />
                                Esto NO se descontó
                            </b>
                            <ul className="list-disc ml-5 mt-1">
                                {sobrantes.sinEntender.map((x, i) => <li key={i}>{x}</li>)}
                            </ul>
                            <p className="mt-1 text-xs">
                                No traen una cantidad que la hoja pueda usar. Escribilas con
                                kilos, gramos o tazas, o descontalas a mano.
                            </p>
                        </div>
                    )}
                </div>

                {/* ── Lo que se empacó ───────────────────────────────────── */}
                <div>
                    <span className="flex items-center gap-2 font-bold text-sky-900 text-sm mb-1">
                        <PackageCheck size={16} aria-hidden="true" />
                        {delSabado ? 'Del lunes, empacados el viernes' : 'Packs que ya se empacaron'}
                    </span>
                    <p className="text-xs text-sky-800 mb-2">
                        {delSabado
                            ? 'Los bajo calorías ya vienen marcados. Destildá los que no se alcanzaron y marcá los que se empacaron de más. Los marcados salen de la cocina y del empaque de hoy.'
                            : 'Marcá los que ya están armados. Salen de esta hoja.'}
                        {candidatos.length > 0 && (
                            <b> {cuantosMarcados} de {candidatos.length} marcados.</b>
                        )}
                    </p>

                    {candidatos.length === 0 ? (
                        <p className="text-sm text-sky-700 italic border-2 border-dashed border-sky-200 rounded-lg p-3">
                            No hay packs adelantados en esta hoja. Aparecen cuando la hoja
                            trae un día de adelanto.
                        </p>
                    ) : (
                        <div className="max-h-64 overflow-y-auto border-2 border-sky-200 rounded-lg bg-white divide-y divide-sky-100">
                            {candidatos.map(c => {
                                const hecho = marcados.has(c.clave);
                                return (
                                    <label
                                        key={c.clave}
                                        className={`flex items-center gap-2.5 p-2 text-sm cursor-pointer ${hecho ? 'bg-green-50' : 'hover:bg-sky-50'}`}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={hecho}
                                            onChange={() => onAlternar(c.clave)}
                                            className="w-4 h-4 cursor-pointer flex-shrink-0"
                                        />
                                        <span className={hecho ? 'text-green-900' : 'text-gray-800'}>
                                            <b>{c.cliente}</b>
                                            <span className="text-xs text-gray-500"> · {c.paquete} ({c.cantidad})</span>
                                        </span>
                                    </label>
                                );
                            })}
                        </div>
                    )}

                    <p className="mt-2 text-xs text-sky-800">
                        Si un cliente quedó <b>a medias</b>, no lo marqués: anotá en su nota
                        cuántos le faltan. Es preferible empacar de más y devolver, que
                        mandar a alguien sin su comida.
                    </p>
                </div>

                {/* ── Familias hechas enteras ────────────────────────────── */}
                {!delSabado && (
                <div>
                    <span className="flex items-center gap-2 font-bold text-sky-900 text-sm mb-1">
                        <ChefHat size={16} aria-hidden="true" />
                        Familias ya cocinadas
                    </span>
                    <p className="text-xs text-sky-800 mb-2">
                        Marcá la familia para poner <b>todos</b> de una vez, y después
                        <b> destildá los pedidos que metiste después</b> de que la cocina
                        reportó: esos todavía no están hechos.
                    </p>

                    {familias.length === 0 ? (
                        <p className="text-sm text-sky-700 italic border-2 border-dashed border-sky-200 rounded-lg p-3">
                            No hay familias en esta hoja.
                        </p>
                    ) : (
                        <div className="max-h-72 overflow-y-auto border-2 border-sky-200 rounded-lg bg-white">
                            {familias.map(f => {
                                const suyos = f.pedidos.filter(x => marcadosCocina.has(x.clave)).length;
                                const todos = f.pedidos.length > 0 && suyos === f.pedidos.length;
                                return (
                                    <div key={f.clave} className="border-b border-sky-100 last:border-b-0">
                                        <label className={`flex items-center gap-2.5 p-2 text-sm cursor-pointer font-bold ${todos ? 'bg-green-100' : 'bg-sky-50'}`}>
                                            <input
                                                type="checkbox"
                                                checked={todos}
                                                onChange={() => onAlternarFamilia(f.clave)}
                                                className="w-4 h-4 cursor-pointer flex-shrink-0"
                                            />
                                            <span className={todos ? 'text-green-900' : 'text-sky-900'}>
                                                {f.nombre}
                                                <span className="text-xs font-normal text-gray-600">
                                                    {' · '}{suyos} de {f.pedidos.length} pedidos
                                                </span>
                                            </span>
                                        </label>

                                        {f.pedidos.map(ped => {
                                            const hecho = marcadosCocina.has(ped.clave);
                                            return (
                                                <label
                                                    key={ped.clave}
                                                    className={`flex items-center gap-2.5 py-1 pl-8 pr-2 text-xs cursor-pointer ${hecho ? 'bg-green-50' : 'hover:bg-sky-50'}`}
                                                >
                                                    <input
                                                        type="checkbox"
                                                        checked={hecho}
                                                        onChange={() => onAlternarPedido(ped.clave)}
                                                        className="w-3.5 h-3.5 cursor-pointer flex-shrink-0"
                                                    />
                                                    <span className={hecho ? 'text-green-900' : 'text-gray-700'}>
                                                        {ped.cliente}
                                                        {ped.cantidad > 1 && (
                                                            <span className="text-gray-500"> ({ped.cantidad})</span>
                                                        )}
                                                    </span>
                                                </label>
                                            );
                                        })}
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    <p className="mt-2 text-xs text-sky-800">
                        <b>Sale de COCINA, no de EMPAQUE.</b> La comida existe pero no está
                        en las bolsas: esos packs igual hay que armarlos.
                    </p>
                </div>
                )}
            </div>
        </div>
    );
}
