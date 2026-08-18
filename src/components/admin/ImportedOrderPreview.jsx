import React, { useState } from 'react';
import { AlertTriangle, CheckCircle, FilePlus, Search } from 'lucide-react';
import { formatPrice } from '../../utils/formatters';
import { searchClientByName } from '../../services/clientService';

/**
 * Vista previa de un pedido leído del chat, antes de crearlo.
 *
 * Muestra SIEMPRE lo que se va a guardar y lo que no se pudo leer. La idea es que
 * nadie cree un pedido a ciegas: si falta algo que la cocina necesita, se ve acá.
 *
 * `problems` bloquea la creación (Firestore lo rechazaría igual).
 * `warnings` no bloquea, pero avisa de lo que va a quedar incompleto.
 */
/** Campos que se pueden corregir a mano antes de crear el pedido. */
const CAMPOS_EDITABLES = [
    { campo: 'cliente', label: 'Cliente', tipo: 'text', placeholder: 'Nombre y apellido' },
    { campo: 'telefono', label: 'Teléfono', tipo: 'tel', placeholder: '8888-8888' },
    // El correo es opcional: si no viene, se arma a partir del teléfono
    { campo: 'correo', label: 'Correo (opcional)', tipo: 'email', placeholder: 'Si no tiene, dejalo vacío', opcional: true },
    { campo: 'zona', label: 'Zona', tipo: 'text', placeholder: 'Moravia, Escazú…', opcional: true },
    { campo: 'direccion', label: 'Dirección', tipo: 'text', placeholder: 'Señas exactas', opcional: true },
    { campo: 'total', label: 'Monto Total (₡)', tipo: 'number', placeholder: 'Ej: 4500', opcional: true },
    { campo: 'costoEnvio', label: 'Costo Envío (₡)', tipo: 'number', placeholder: 'Ej: 3000', opcional: true }
];

export default function ImportedOrderPreview({
    parsed,
    pedido,
    problems = [],
    warnings = [],
    creating = false,
    created = null,
    onCreate,
    onEdit
}) {
    const variasEntregas = parsed.fechasEntrega?.length > 1;

    const [isSearchingClient, setIsSearchingClient] = useState(false);
    const [clientResults, setClientResults] = useState([]);

    const handleSearchClient = async () => {
        if (!parsed.cliente || parsed.cliente.length < 3) {
            alert('Digitá al menos 3 letras del nombre del cliente para buscar.');
            return;
        }
        setIsSearchingClient(true);
        const results = await searchClientByName(parsed.cliente);
        setClientResults(results);
        if (results.length === 0) {
            alert('No se encontraron clientes con ese nombre.');
        }
        setIsSearchingClient(false);
    };

    const handleSelectClient = (client) => {
        onEdit('cliente', client.nombre);
        if (client.telefono) onEdit('telefono', client.telefono);
        if (client.correo) onEdit('correo', client.correo);
        if (client.zona) onEdit('zona', client.zona);
        if (client.direccion) onEdit('direccion', client.direccion);
        setClientResults([]);
    };

    return (
        <div className="bg-white rounded-2xl shadow-xl shadow-gray-100 border border-gray-100 p-6">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <FilePlus size={20} className="text-gray-400" aria-hidden="true" />
                Pedido nuevo, leído del texto
            </h2>
            <p className="text-sm text-gray-500 mt-1">
                Revisá que esté todo bien antes de crearlo.
            </p>
            <p className="text-sm text-gray-600 mt-2 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                <strong>Para que salga en la hoja impresa de cocina y empaque, el pedido
                    tiene que quedar confirmado.</strong> Si lo dejás sin confirmar, lo vas a ver
                en la pantalla de Producción pero no va a salir en la hoja.
            </p>

            {/* Bloqueos */}
            {problems.length > 0 && (
                <div className="mt-4 p-4 bg-red-50 border border-red-100 rounded-xl">
                    <p className="text-sm font-bold text-red-800 flex items-center gap-2">
                        <AlertTriangle size={16} aria-hidden="true" />
                        No se puede crear todavía
                    </p>
                    <ul className="mt-2 space-y-1 text-sm text-red-700 list-disc list-inside">
                        {problems.map((p, i) => <li key={i}>{p}</li>)}
                    </ul>
                </div>
            )}

            {/* Avisos que no bloquean */}
            {warnings.length > 0 && problems.length === 0 && (
                <div className="mt-4 p-4 bg-amber-50 border border-amber-100 rounded-xl">
                    <p className="text-sm font-bold text-amber-800 flex items-center gap-2">
                        <AlertTriangle size={16} aria-hidden="true" />
                        Revisá esto
                    </p>
                    <ul className="mt-2 space-y-1 text-sm text-amber-800 list-disc list-inside">
                        {warnings.map((w, i) => <li key={i}>{w}</li>)}
                    </ul>
                </div>
            )}

            {/* Datos — editables, porque el mensaje de WhatsApp no trae teléfono ni correo */}
            <p className="mt-5 text-xs text-gray-500 uppercase tracking-wider">
                Datos del pedido — podés corregir o completar lo que falte
            </p>
            <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
                {CAMPOS_EDITABLES.map(({ campo, label, tipo, placeholder, opcional }) => {
                    const valor = parsed[campo] || '';
                    const falta = !valor && !opcional;
                    return (
                        <div key={campo} className="relative">
                            <label htmlFor={`imp-${campo}`} className="block text-xs font-medium text-gray-600 mb-1">
                                {label}
                            </label>
                            <div className="flex gap-2">
                                <input
                                    id={`imp-${campo}`}
                                    type={tipo}
                                    value={valor}
                                    placeholder={placeholder}
                                    onChange={(e) => onEdit(campo, e.target.value)}
                                    className={`w-full px-3 py-2 border rounded-lg text-sm outline-none transition-all focus:ring-4 focus:ring-orange-100 focus:border-bikitchen-orange ${falta ? 'border-red-300 bg-red-50' : 'border-gray-200'
                                        }`}
                                />
                                {campo === 'cliente' && (
                                    <button
                                        type="button"
                                        onClick={handleSearchClient}
                                        disabled={isSearchingClient}
                                        className="px-3 py-2 bg-gray-100 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-200 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center"
                                        title="Buscar cliente por nombre"
                                    >
                                        {isSearchingClient ? (
                                            <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                                        ) : (
                                            <Search size={18} />
                                        )}
                                    </button>
                                )}
                            </div>
                            
                            {/* Resultados de búsqueda (Solo debajo del campo cliente) */}
                            {campo === 'cliente' && clientResults.length > 0 && (
                                <div className="mt-2 absolute z-10 w-full sm:w-96 max-h-60 overflow-y-auto bg-white border border-gray-200 rounded-lg shadow-xl divide-y divide-gray-100">
                                    <div className="px-3 py-2 bg-gray-50 flex justify-between items-center sticky top-0">
                                        <span className="text-xs font-bold text-gray-500 uppercase">Seleccionar Cliente</span>
                                        <button onClick={() => setClientResults([])} className="text-xs text-red-500 hover:text-red-700 font-bold">Cerrar</button>
                                    </div>
                                    {clientResults.map(client => (
                                        <button
                                            key={client.id}
                                            type="button"
                                            onClick={() => handleSelectClient(client)}
                                            className="w-full text-left px-4 py-3 hover:bg-orange-50 transition-colors focus:bg-orange-50 outline-none"
                                        >
                                            <p className="font-bold text-sm text-gray-900">{client.nombre}</p>
                                            <p className="text-xs text-gray-500 mt-0.5">
                                                {client.telefono || 'Sin tel'} • {client.correo || 'Sin correo'}
                                            </p>
                                        </button>
                                    ))}
                                </div>
                            )}

                            {campo === 'correo' && pedido.correoEsPlaceholder && (
                                <p className="mt-1 text-xs text-gray-500">
                                    Sin correo se guarda como <strong>{pedido.correo}</strong>, armado con el teléfono.
                                </p>
                            )}
                        </div>
                    );
                })}

                <div>
                    <label htmlFor="imp-fecha" className="block text-xs font-medium text-gray-600 mb-1">
                        Fecha de entrega
                    </label>
                    {variasEntregas ? (
                        <p className="px-3 py-2 bg-blue-50 border border-blue-100 rounded-lg text-sm text-blue-800">
                            {parsed.fechasEntrega.length} entregas: {parsed.fechasEntrega.join(', ')}
                        </p>
                    ) : (
                        <input
                            id="imp-fecha"
                            type="date"
                            value={parsed.fechasEntrega?.[0] || ''}
                            onChange={(e) => onEdit('fecha', e.target.value)}
                            className={`w-full px-3 py-2 border rounded-lg text-sm outline-none transition-all focus:ring-4 focus:ring-orange-100 focus:border-bikitchen-orange ${!parsed.fechasEntrega?.[0] ? 'border-red-300 bg-red-50' : 'border-gray-200'
                                }`}
                        />
                    )}
                </div>

                <div className="text-sm text-gray-600 self-end pb-2">
                    <span className="text-gray-500">Pago:</span> {parsed.metodoPago || '—'}
                    {parsed.observaciones && (
                        <span className="block mt-1">
                            <span className="text-gray-500">Notas:</span> {parsed.observaciones}
                        </span>
                    )}
                </div>
            </div>

            {/* Ítems */}
            <div className="mt-5 border-t border-gray-100 pt-4">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                    Ítems ({pedido.items.length})
                </p>
                {pedido.items.length === 0 ? (
                    <p className="text-sm text-gray-400 italic">No se leyó ningún ítem.</p>
                ) : (
                    <ul className="space-y-4">
                        {pedido.items.map((item, i) => {
                            // Un pack que anuncia N proteínas sin listarlas deja a la
                            // cocina sin saber qué preparar
                            const anuncia = String(item.nombre || '').match(/(\d+)\s*prote[íi]nas?/i);
                            const faltanProteinas = anuncia && !item.proteinas;
                            return (
                                <li key={i} className="text-sm text-gray-700">
                                    <span className="font-medium">{item.cantidad}× {item.nombre}</span>
                                    <span className="text-gray-500"> — {formatPrice(item.total)}</span>

                                    <div className="mt-1.5 pl-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <div>
                                            <label htmlFor={`imp-precio-${i}`} className="block text-xs text-gray-500 mb-1">
                                                Precio del ítem (₡)
                                            </label>
                                            <input
                                                id={`imp-precio-${i}`}
                                                type="number"
                                                value={item.precio || ''}
                                                placeholder="Ej: 4500"
                                                onChange={(e) => onEdit(`precio_${i}`, e.target.value)}
                                                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none transition-all focus:ring-4 focus:ring-orange-100 focus:border-bikitchen-orange"
                                            />
                                        </div>
                                        <div>
                                            <label htmlFor={`imp-prot-${i}`} className="block text-xs text-gray-500 mb-1">
                                                Proteínas {anuncia ? `(deberían ser ${anuncia[1]})` : ''} — separalas con coma
                                            </label>
                                            <input
                                                id={`imp-prot-${i}`}
                                                type="text"
                                                value={(item.proteinas || []).join(', ')}
                                                placeholder="Carne mechada, Pollo al pesto, Pollo mediterráneo"
                                                onChange={(e) => onEdit(`proteinas_${i}`, e.target.value)}
                                                className={`w-full px-3 py-2 border rounded-lg text-sm outline-none transition-all focus:ring-4 focus:ring-orange-100 focus:border-bikitchen-orange ${faltanProteinas ? 'border-red-300 bg-red-50' : 'border-gray-200'
                                                    }`}
                                            />
                                        </div>
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                )}
                <p className="mt-3 text-right text-base font-bold text-gray-900">
                    Total: {formatPrice(pedido.total)}
                </p>
            </div>

            {/* Acción */}
            <div className="mt-5 flex items-center gap-4 flex-wrap">
                {created ? (
                    <div className="space-y-1">
                        <span className="inline-flex items-center gap-2 px-4 py-2 bg-green-100 text-green-700 rounded-lg text-sm font-bold">
                            <CheckCircle size={16} aria-hidden="true" />
                            Pedido {created.numeroOrden} creado
                            {created.confirmado ? ' y confirmado — ya sale en la hoja' : ' (sin confirmar)'}
                        </span>
                        <p className="text-xs text-gray-500">
                            {parsed.cliente} quedó registrado en Clientes. Si vuelve a pedir,
                            se le suma el pedido en vez de crear una ficha nueva.
                        </p>
                    </div>
                ) : (
                    <>
                        <button
                            onClick={() => onCreate(true)}
                            disabled={creating || problems.length > 0}
                            className="flex items-center justify-center gap-2 bg-gradient-to-r from-bikitchen-orange to-orange-600 text-white px-8 py-3.5 rounded-xl font-bold shadow-lg shadow-orange-200 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:hover:scale-100"
                        >
                            {creating ? 'Creando…' : 'Crear y confirmar'}
                        </button>
                        <button
                            onClick={() => onCreate(false)}
                            disabled={creating || problems.length > 0}
                            className="px-5 py-3 text-sm text-gray-600 hover:text-gray-900 font-medium transition-colors disabled:opacity-50"
                        >
                            Solo crear, todavía no pagó
                        </button>
                    </>
                )}
            </div>
        </div>
    );
}
