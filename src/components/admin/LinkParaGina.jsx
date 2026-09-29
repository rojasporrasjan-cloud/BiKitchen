import React, { useState } from 'react';
import { Link2, Copy, CheckCircle2 } from 'lucide-react';
import { auth } from '../../firebase/config';

/**
 * El link de Gina para ver los packs mensuales desde su teléfono, sin entrar al
 * panel (/packs-mensuales/<código>). Lo arma netlify/functions/packs-gina.js,
 * que solo se lo da al dueño.
 */

const FUNCION = '/.netlify/functions/packs-gina';

export default function LinkParaGina() {
    const [url, setUrl] = useState('');
    const [error, setError] = useState('');
    const [cargando, setCargando] = useState(false);
    const [copiado, setCopiado] = useState(false);

    const generar = async () => {
        setCargando(true);
        setError('');
        try {
            const usuario = auth.currentUser;
            if (!usuario) throw new Error('Tu sesión venció. Volvé a entrar al panel.');
            const res = await fetch(FUNCION, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await usuario.getIdToken()}` },
                body: JSON.stringify({ accion: 'generar' })
            });
            const datos = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(datos.error || `Error ${res.status}`);
            setUrl(datos.url);
        } catch (e) {
            setError(e.message);
        } finally {
            setCargando(false);
        }
    };

    const copiar = async () => {
        try {
            await navigator.clipboard.writeText(url);
            setCopiado(true);
            setTimeout(() => setCopiado(false), 2000);
        } catch {
            window.prompt('Copiá el link:', url);
        }
    };

    return (
        <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4" aria-labelledby="titulo-link-gina">
            <h2 id="titulo-link-gina" className="flex items-center gap-2 font-bold text-gray-900">
                <Link2 size={17} className="text-bikitchen-orange" aria-hidden="true" /> Link para Gina
            </h2>
            <p className="mt-1 text-sm text-gray-600">
                Gina ve esta misma lista desde su teléfono, sin entrar al panel: semana de cada pack, por renovar y terminados.
                Sin teléfonos ni direcciones.
            </p>
            {url ? (
                <div className="mt-3 flex flex-wrap items-center gap-2 p-2.5 bg-gray-50 rounded-xl">
                    <span className="min-w-0 flex-1 font-mono text-xs font-bold text-gray-900 break-all">{url}</span>
                    <button type="button" onClick={copiar}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-bold text-gray-700 hover:border-bikitchen-orange">
                        {copiado ? <><CheckCircle2 size={14} className="text-green-600" aria-hidden="true" /> Copiado</> : <><Copy size={14} aria-hidden="true" /> Copiar</>}
                    </button>
                </div>
            ) : (
                <button type="button" onClick={generar} disabled={cargando}
                    className="mt-3 px-4 py-2 bg-bikitchen-orange hover:bg-bikitchen-orange-dark text-white text-sm font-bold rounded-xl disabled:opacity-40">
                    {cargando ? 'Armando…' : 'Sacar el link'}
                </button>
            )}
            {error && <p role="alert" className="mt-2 text-sm text-red-700">{error}</p>}
        </section>
    );
}
