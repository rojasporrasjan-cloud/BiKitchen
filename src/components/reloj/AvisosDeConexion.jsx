import React from 'react';
import { WifiOff, CloudUpload, AlertTriangle } from 'lucide-react';
import { horaCR } from '../../utils/planilla';

/**
 * Avisos del reloj cuando la señal falla: que no hay internet (se sigue
 * marcando igual), cuántas marcas esperan en el iPad, y las que el servidor
 * rechazó al mandarlas tarde (por ejemplo, un PIN mal escrito sin internet).
 */
export default function AvisosDeConexion({ sinConexion, porEnviar, rechazadas, desfase, onEntendido }) {
    if (!sinConexion && !porEnviar && rechazadas.length === 0) return null;
    return (
        <div className="space-y-3 mb-6">
            {(sinConexion || porEnviar > 0) && (
                <div role="status" className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-2xl text-amber-900">
                    {porEnviar > 0
                        ? <CloudUpload size={22} className="shrink-0 mt-0.5" aria-hidden="true" />
                        : <WifiOff size={22} className="shrink-0 mt-0.5" aria-hidden="true" />}
                    <p className="font-semibold">
                        <b>Sin internet, pero se puede marcar igual.</b>{' '}
                        {porEnviar > 0
                            ? `${porEnviar === 1 ? 'Hay 1 marca guardada' : `Hay ${porEnviar} marcas guardadas`} en este iPad: se mandan solas cuando vuelva el internet, con la hora en que se tocó. No cierren esta página.`
                            : 'Las marcas se guardan en este iPad y se mandan solas cuando vuelva.'}
                    </p>
                </div>
            )}
            {rechazadas.length > 0 && (
                <div role="alert" className="p-4 bg-red-50 border border-red-200 rounded-2xl text-red-800">
                    <p className="flex items-center gap-2 font-black">
                        <AlertTriangle size={18} aria-hidden="true" />
                        {rechazadas.length === 1 ? 'Una marca no se pudo guardar' : `${rechazadas.length} marcas no se pudieron guardar`}
                    </p>
                    <ul className="mt-2 space-y-1 text-sm font-semibold lining-nums">
                        {rechazadas.map(m => (
                            <li key={m.idMarca}>
                                {m.nombre}: {m.tipo} de las {horaCR(new Date(m.tocado + desfase))} — {m.error}
                            </li>
                        ))}
                    </ul>
                    <p className="mt-2 text-sm">Avisale a Jan para que la ponga a mano en la planilla.</p>
                    <button type="button" onClick={onEntendido}
                        className="mt-3 px-4 py-2 bg-white border border-red-200 text-sm font-bold rounded-xl">
                        Entendido
                    </button>
                </div>
            )}
        </div>
    );
}
