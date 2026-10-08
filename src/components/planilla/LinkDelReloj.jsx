import React, { useState } from 'react';
import { Tablet, Copy, CheckCircle2, ExternalLink } from 'lucide-react';
import { pedirALaPlanilla } from '../../utils/planillaClient';

/** El link del reloj para abrir en el iPad de la cocina. */
export default function LinkDelReloj() {
    const [url, setUrl] = useState('');
    const [error, setError] = useState('');
    const [cargando, setCargando] = useState(false);
    const [copiado, setCopiado] = useState(false);

    const handleSacar = async () => {
        setCargando(true);
        setError('');
        try {
            setUrl((await pedirALaPlanilla('link')).url);
        } catch (e) {
            setError(e.message);
        } finally {
            setCargando(false);
        }
    };

    const handleCopiar = async () => {
        try {
            await navigator.clipboard.writeText(url);
            setCopiado(true);
            setTimeout(() => setCopiado(false), 2000);
        } catch {
            window.prompt('Copiá el link:', url);
        }
    };

    return (
        <section className="p-5 bg-gradient-to-br from-stone-900 to-stone-800 text-white rounded-3xl shadow-lg" aria-labelledby="titulo-link-reloj">
            <h2 id="titulo-link-reloj" className="flex items-center gap-2 text-lg font-black text-white">
                <Tablet size={20} className="text-bikitchen-orange" aria-hidden="true" /> El reloj del iPad
            </h2>
            <p className="mt-1 text-sm text-white/70">
                Abrí este link en el iPad de la cocina y dejalo ahí. Cada persona toca su nombre al llegar y al irse.
                En Safari: Compartir → «Agregar a pantalla de inicio» para que quede como una app.
            </p>
            {url ? (
                <div className="flex flex-wrap items-center gap-2 mt-3 p-2.5 bg-white/10 rounded-xl">
                    <span className="flex-1 min-w-0 font-mono text-xs font-bold break-all">{url}</span>
                    <button type="button" onClick={handleCopiar}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-white text-stone-900 text-xs font-bold rounded-lg">
                        {copiado
                            ? <><CheckCircle2 size={14} className="text-green-600" aria-hidden="true" /> Copiado</>
                            : <><Copy size={14} aria-hidden="true" /> Copiar</>}
                    </button>
                    <a href={url} target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-bikitchen-orange text-white text-xs font-bold rounded-lg">
                        <ExternalLink size={14} aria-hidden="true" /> Abrir
                    </a>
                </div>
            ) : (
                <button type="button" onClick={handleSacar} disabled={cargando}
                    className="mt-3 px-4 py-2 bg-bikitchen-orange hover:bg-bikitchen-orange-dark text-white text-sm font-bold rounded-xl disabled:opacity-40">
                    {cargando ? 'Armando…' : 'Sacar el link'}
                </button>
            )}
            {error && <p role="alert" className="mt-2 text-sm text-red-300">{error}</p>}
        </section>
    );
}
