import React, { useState } from 'react';
import { Send, Wrench, AlertTriangle, CheckCircle2 } from 'lucide-react';
import {
    diagnosticarKommo,
    sincronizarConKommo,
    enviarPorKommo,
    probarConUnNumero
} from '../../utils/kommoClient';

/**
 * Envío por Kommo.
 *
 * El mensaje NO sale de acá: lo arma el Salesbot leyendo la ficha del contacto.
 * Este panel sincroniza los datos (en qué semana va el pack, próxima entrega,
 * etiqueta del segmento) y después lanza el bot.
 *
 * Mandar es irreversible: le llega a clientes reales. Por eso hay tres frenos —
 * probar con un número, confirmar escribiendo la cantidad, y nunca enviar solo.
 */
export default function EnvioKommo({ destinatarios, segmentoId }) {
    const [botId, setBotId] = useState(localStorage.getItem('bk_kommo_bot') || '');
    const [telPrueba, setTelPrueba] = useState('');
    const [info, setInfo] = useState(null);
    const [estado, setEstado] = useState('');
    const [error, setError] = useState('');
    const [ocupado, setOcupado] = useState(false);

    const camposIds = JSON.parse(localStorage.getItem('bk_kommo_campos') || '{}');

    const correr = async (tarea) => {
        setOcupado(true);
        setError('');
        try {
            await tarea();
        } catch (err) {
            console.error('[Kommo]', err);
            setError(err.message);
            setEstado('');
        }
        setOcupado(false);
    };

    const revisar = () => correr(async () => {
        setEstado('Consultando la cuenta de Kommo…');
        const datos = await diagnosticarKommo();
        setInfo(datos);
        setEstado('');
    });

    const guardarBot = (id) => {
        setBotId(id);
        localStorage.setItem('bk_kommo_bot', id);
    };

    const usarCampo = (clave, id) => {
        const actual = JSON.parse(localStorage.getItem('bk_kommo_campos') || '{}');
        localStorage.setItem('bk_kommo_campos', JSON.stringify({ ...actual, [clave]: id }));
        setEstado(`Campo "${clave}" guardado.`);
    };

    const opciones = { segmentoId, camposIds, botId, avisar: setEstado };

    const probar = () => correr(async () => {
        if (!botId) throw new Error('Elegí primero el bot que va a mandar el mensaje.');
        if (!telPrueba.trim()) throw new Error('Escribí el número con el que querés probar.');
        await probarConUnNumero(telPrueba, destinatarios, opciones);
        setEstado(`Listo. Revisá el WhatsApp de ${telPrueba}.`);
    });

    const enviarATodos = () => correr(async () => {
        if (!botId) throw new Error('Elegí primero el bot que va a mandar el mensaje.');

        const cantidad = destinatarios.length;
        const escrito = window.prompt(
            `Vas a mandarle el mensaje a ${cantidad} clientes REALES por WhatsApp.\n\n`
            + 'Esto no se puede deshacer.\n\n'
            + `Escribí ${cantidad} para confirmar:`
        );
        if (escrito === null) return;
        if (escrito.trim() !== String(cantidad)) {
            throw new Error('El número no coincide. No se mandó nada.');
        }

        const { ids, creados, actualizados } = await sincronizarConKommo(destinatarios, opciones);
        const { enviados } = await enviarPorKommo(botId, ids, opciones);
        setEstado(`Listo: ${enviados} enviados (${creados} contactos nuevos, ${actualizados} actualizados).`);
    });

    return (
        <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 md:p-5 mt-4">
            <h2 className="text-sm font-bold text-gray-900 mb-1 flex items-center gap-2">
                <Send size={16} aria-hidden="true" /> 4. Enviar por Kommo
            </h2>
            <p className="text-xs text-gray-600 mb-3">
                El texto lo arma el Salesbot desde la ficha del contacto. Acá se le
                sincronizan los datos y se le da la orden de mandar.
            </p>

            <button
                onClick={revisar}
                disabled={ocupado}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-100 text-gray-800 text-xs font-bold hover:bg-gray-200 transition-colors disabled:opacity-40"
            >
                <Wrench size={13} aria-hidden="true" /> Revisar mi cuenta de Kommo
            </button>

            {info && (
                <div className="mt-3 space-y-3 text-xs">
                    <p className="text-gray-700">
                        Cuenta: <strong>{info.cuenta?.nombre}</strong> ({info.cuenta?.subdominio})
                    </p>

                    <div>
                        <p className="font-semibold text-gray-800 mb-1">Bot que manda el mensaje</p>
                        {Array.isArray(info.bots) ? (
                            <div className="flex flex-wrap gap-1.5">
                                {info.bots.length === 0 && (
                                    <span className="text-gray-500">
                                        No hay bots. Gina tiene que crear uno en Kommo con su plantilla aprobada.
                                    </span>
                                )}
                                {info.bots.map((b) => (
                                    <button
                                        key={b.id}
                                        onClick={() => guardarBot(String(b.id))}
                                        className={`px-2 py-1 rounded font-semibold transition-colors ${
                                            botId === String(b.id)
                                                ? 'bg-bikitchen-orange text-white'
                                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                        }`}
                                    >
                                        {b.nombre} <span className="opacity-60">#{b.id}</span>
                                    </button>
                                ))}
                            </div>
                        ) : (
                            <p className="text-red-700 bg-red-50 border border-red-200 rounded-lg px-2 py-1.5">
                                No se pudieron leer los bots: {info.bots?.error}
                            </p>
                        )}
                    </div>

                    <details>
                        <summary className="font-semibold text-gray-800 cursor-pointer">
                            Campos personalizados ({info.campos?.length || 0})
                        </summary>
                        <p className="text-gray-600 mt-1 mb-2">
                            Asigná qué campo de Kommo recibe cada dato. La plantilla del bot
                            los tiene que referenciar para que el mensaje salga personalizado.
                        </p>
                        <div className="max-h-52 overflow-y-auto space-y-1">
                            {info.campos?.map((c) => (
                                <div key={c.id} className="flex items-center gap-2">
                                    <span className="flex-1 text-gray-700">
                                        {c.nombre} <span className="text-gray-400">#{c.id}</span>
                                    </span>
                                    {['avance', 'proximaEntrega', 'entregasRestantes', 'pack', 'zona'].map((clave) => (
                                        <button
                                            key={clave}
                                            onClick={() => usarCampo(clave, c.id)}
                                            className={`px-1.5 py-0.5 rounded text-[10px] font-mono transition-colors ${
                                                String(camposIds[clave]) === String(c.id)
                                                    ? 'bg-green-600 text-white'
                                                    : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                                            }`}
                                        >
                                            {clave}
                                        </button>
                                    ))}
                                </div>
                            ))}
                        </div>
                    </details>
                </div>
            )}

            <div className="mt-4 pt-4 border-t border-gray-100">
                <p className="text-xs font-semibold text-gray-800 mb-2">
                    Antes de mandarle a todos, probá con un número
                </p>
                <div className="flex flex-wrap gap-2">
                    <input
                        type="tel"
                        value={telPrueba}
                        onChange={(e) => setTelPrueba(e.target.value)}
                        placeholder="8888-8888 (tiene que estar en la lista)"
                        aria-label="Número de prueba"
                        className="flex-1 min-w-[220px] px-3 py-2 rounded-lg border border-gray-200 text-sm"
                    />
                    <button
                        onClick={probar}
                        disabled={ocupado || !botId}
                        className="px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 active:scale-95 transition-all disabled:opacity-40"
                    >
                        Probar con este
                    </button>
                </div>
            </div>

            <div className="mt-4 pt-4 border-t border-gray-100">
                <button
                    onClick={enviarATodos}
                    disabled={ocupado || !botId || destinatarios.length === 0}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-green-600 text-white text-sm font-black hover:bg-green-700 active:scale-95 transition-all disabled:opacity-40"
                >
                    <Send size={16} aria-hidden="true" />
                    Enviar a los {destinatarios.length}
                </button>
                {!botId && (
                    <p className="text-[11px] text-gray-500 mt-1.5">
                        Primero revisá tu cuenta y elegí el bot.
                    </p>
                )}
            </div>

            {estado && (
                <p className="mt-3 text-xs text-blue-800 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 flex items-start gap-2">
                    <CheckCircle2 size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
                    {estado}
                </p>
            )}

            {error && (
                <p className="mt-3 text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2 flex items-start gap-2">
                    <AlertTriangle size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
                    {error}
                </p>
            )}
        </section>
    );
}
