import React, { useState } from 'react';
import { Copy, CheckCircle2, Link2 } from 'lucide-react';

/**
 * Los links FIJOS para pegar en mensajes y automatizaciones de Kommo, sin
 * variables ni campos: son iguales para todos los clientes.
 *
 *   /cambios → el cliente escribe su WhatsApp y su nombre y llega a SUS cambios
 *   /menu    → el menú de la semana
 */

const SITIO = 'https://bikitchencr.com';

const LINKS = [
    { ruta: '/cambios', para: 'Cambios de la semana (máximo 2 por pack, hasta el cierre de pedidos de su entrega)' },
    { ruta: '/menu', para: 'Menú de la semana' }
];

export default function LinksFijos() {
    const [copiado, setCopiado] = useState('');

    const copiar = async (url) => {
        try {
            await navigator.clipboard.writeText(url);
            setCopiado(url);
            setTimeout(() => setCopiado(''), 2000);
        } catch {
            window.prompt('Copiá el link:', url);
        }
    };

    return (
        <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4" aria-labelledby="titulo-links-fijos">
            <h2 id="titulo-links-fijos" className="flex items-center gap-2 font-bold text-gray-900">
                <Link2 size={17} className="text-bikitchen-orange" aria-hidden="true" /> Links fijos para Kommo
            </h2>
            <p className="mt-1 text-sm text-gray-600">
                Son iguales para todos: se pegan tal cual en cualquier mensaje o automatización, sin variables.
            </p>
            <ul className="mt-3 space-y-2">
                {LINKS.map(({ ruta, para }) => {
                    const url = `${SITIO}${ruta}`;
                    return (
                        <li key={ruta} className="flex flex-wrap items-center gap-2 p-2.5 bg-gray-50 rounded-xl">
                            <span className="min-w-0 flex-1">
                                <span className="block font-mono text-sm font-bold text-gray-900 break-all">{url}</span>
                                <span className="text-xs text-gray-500">{para}</span>
                            </span>
                            <button type="button" onClick={() => copiar(url)} aria-label={`Copiar ${url}`}
                                className="inline-flex items-center gap-1 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-bold text-gray-700 hover:border-bikitchen-orange">
                                {copiado === url
                                    ? <><CheckCircle2 size={14} className="text-green-600" aria-hidden="true" /> Copiado</>
                                    : <><Copy size={14} aria-hidden="true" /> Copiar</>}
                            </button>
                        </li>
                    );
                })}
            </ul>
        </section>
    );
}
