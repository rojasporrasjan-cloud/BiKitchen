import React, { useState } from 'react';
import { Tablet, Copy, CheckCircle2, ExternalLink, Eye } from 'lucide-react';
import { pedirALaPlanilla } from '../../utils/planillaClient';

/** Los dos links: el del reloj (iPad de la cocina) y el de Gina (ver la planilla, sin cambiar nada). */
const LINKS = {
    reloj: {
        accion: 'link',
        Icono: Tablet,
        titulo: 'El reloj del iPad',
        texto: 'Abrí este link en el iPad de la cocina y dejalo ahí. Cada persona toca su nombre al llegar, al almorzar y al irse. En Safari: Compartir → «Agregar a pantalla de inicio» para que quede como una app.',
        fondo: 'bg-gradient-to-br from-stone-900 to-stone-800'
    },
    gina: {
        accion: 'linkGina',
        Icono: Eye,
        titulo: 'Link para Gina',
        texto: 'Gina ve esta misma planilla desde su teléfono: quién está trabajando, horas y salario de cada día, y puede bajar el Excel. Solo ver: no puede cambiar marcas ni tarifas.',
        fondo: 'bg-gradient-to-br from-emerald-700 to-teal-700'
    }
};

export default function LinkDelReloj({ paraGina = false }) {
    const { accion, Icono, titulo, texto, fondo } = LINKS[paraGina ? 'gina' : 'reloj'];
    const [url, setUrl] = useState('');
    const [error, setError] = useState('');
    const [cargando, setCargando] = useState(false);
    const [copiado, setCopiado] = useState(false);

    const handleSacar = async () => {
        setCargando(true);
        setError('');
        try {
            setUrl((await pedirALaPlanilla(accion)).url);
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
        <section className={`p-5 ${fondo} text-white rounded-3xl shadow-lg`} aria-labelledby={`titulo-${accion}`}>
            <h2 id={`titulo-${accion}`} className="flex items-center gap-2 text-lg font-black text-white">
                <Icono size={20} className={paraGina ? 'text-emerald-200' : 'text-bikitchen-orange'} aria-hidden="true" /> {titulo}
            </h2>
            <p className="mt-1 text-sm text-white/75">{texto}</p>
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
