import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { RefreshCw, Search, CalendarDays } from 'lucide-react';
import SEOHead from '../components/SEOHead';
import TarjetaDePack from '../components/packsGina/TarjetaDePack';

/**
 * /packs-mensuales/:codigo — la lista de packs de varias semanas para Gina.
 *
 * Gina no entra al panel (solo Jan): esta página le muestra desde el teléfono
 * en qué semana va cada cliente y a quién se le está por acabar el pack.
 * Solo lectura. Los datos los arma netlify/functions/packs-gina.js, con la misma
 * cuenta que Packs Mensuales del panel.
 */

const FUNCION = '/.netlify/functions/packs-gina';

const PESTANAS = [
    { id: 'porRenovar', label: 'Por renovar' },
    { id: 'enCurso', label: 'En curso' },
    { id: 'terminados', label: 'Terminados' }
];

const fechaLarga = (iso) => new Date(`${iso}T12:00:00`)
    .toLocaleDateString('es-CR', { weekday: 'long', day: 'numeric', month: 'long' })
    .replace(/^(\p{L}+),/u, '$1')
    .replace('septiembre', 'setiembre');

const sinTildes = (t) => String(t || '').normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();

/** Los packs en curso agrupados por su próxima entrega. */
const porFecha = (lista) => {
    const grupos = new Map();
    lista.forEach((p) => {
        const clave = p.proxima || 'sin-fecha';
        if (!grupos.has(clave)) grupos.set(clave, []);
        grupos.get(clave).push(p);
    });
    return [...grupos.entries()];
};

export default function PacksGinaPage() {
    const { codigo } = useParams();
    const [datos, setDatos] = useState(null);
    const [error, setError] = useState('');
    const [cargando, setCargando] = useState(true);
    const [pestana, setPestana] = useState('porRenovar');
    const [busqueda, setBusqueda] = useState('');

    const cargar = useCallback(async () => {
        setCargando(true);
        setError('');
        try {
            const res = await fetch(FUNCION, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ accion: 'ver', codigo })
            });
            const d = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(d.error || 'No se pudo cargar. Probá de nuevo.');
            setDatos(d);
        } catch (e) {
            setError(e.message);
        } finally {
            setCargando(false);
        }
    }, [codigo]);

    useEffect(() => { cargar(); }, [cargar]);

    const termino = sinTildes(busqueda.trim());
    const lista = useMemo(() => (datos?.[pestana] || [])
        .filter(p => !termino || sinTildes(`${p.cliente} ${p.pack} ${p.zona}`).includes(termino)), [datos, pestana, termino]);

    const cuantos = (id) => datos?.[id]?.length ?? 0;
    const actualizado = datos?.actualizado
        ? new Date(datos.actualizado).toLocaleTimeString('es-CR', { hour: 'numeric', minute: '2-digit' })
        : '';

    return (
        <div className="min-h-screen bg-bikitchen-beige">
            <SEOHead title="Packs mensuales | BiKitchen" description="Herramienta interna: en qué semana va cada pack." noindex />

            <header className="bg-bikitchen-orange text-white px-4 pt-8 pb-6">
                <div className="max-w-xl mx-auto">
                    <p className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-white/90">
                        <CalendarDays size={14} aria-hidden="true" /> BiKitchen
                    </p>
                    <h1 className="mt-1 text-3xl font-black leading-tight">Packs mensuales</h1>
                    <p className="mt-1 text-white/90 font-semibold">En qué semana va cada cliente y a quién se le está por acabar.</p>
                </div>
            </header>

            <main className="max-w-xl mx-auto px-4 pb-16">
                <div className="-mt-4 grid grid-cols-3 gap-2" role="tablist" aria-label="Qué packs ver">
                    {PESTANAS.map(p => (
                        <button
                            key={p.id}
                            type="button"
                            role="tab"
                            aria-selected={pestana === p.id}
                            onClick={() => setPestana(p.id)}
                            className={`py-3 rounded-2xl text-sm font-black shadow-sm transition-colors ${pestana === p.id
                                ? (p.id === 'porRenovar' ? 'bg-red-600 text-white' : 'bg-gray-900 text-white')
                                : 'bg-white text-gray-700'}`}
                        >
                            <span className="block text-2xl leading-none tabular-nums">{datos ? cuantos(p.id) : '·'}</span>
                            {p.label}
                        </button>
                    ))}
                </div>

                <div className="mt-4 flex items-center gap-2">
                    <label className="relative flex-1">
                        <span className="sr-only">Buscar cliente</span>
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" aria-hidden="true" />
                        <input
                            type="search"
                            value={busqueda}
                            onChange={e => setBusqueda(e.target.value)}
                            placeholder="Buscar cliente, pack o zona"
                            className="w-full pl-9 pr-3 py-2.5 bg-white border border-orange-100 rounded-xl text-base outline-none focus:border-bikitchen-orange"
                        />
                    </label>
                    <button type="button" onClick={cargar} disabled={cargando} aria-label="Actualizar"
                        className="p-2.5 bg-white border border-orange-100 rounded-xl text-gray-700 disabled:opacity-40 active:scale-95 transition-transform">
                        <RefreshCw size={18} className={cargando ? 'animate-spin' : ''} aria-hidden="true" />
                    </button>
                </div>
                {actualizado && <p className="mt-2 text-xs font-semibold text-gray-500">Actualizado a las {actualizado}</p>}

                {error && <p role="alert" className="mt-4 p-4 bg-red-50 text-red-700 font-semibold rounded-2xl">{error}</p>}
                {cargando && !datos && (
                    <div className="mt-4 space-y-3" aria-busy="true">
                        {[0, 1, 2].map(i => <div key={i} className="h-24 bg-white/70 rounded-2xl animate-pulse" />)}
                    </div>
                )}

                {datos && lista.length === 0 && (
                    <p className="mt-6 p-6 text-center text-gray-600 font-semibold bg-white rounded-2xl">
                        {termino ? 'Nadie con ese nombre en esta lista.' : pestana === 'porRenovar' ? 'Nadie por renovar en los próximos días. 🎉' : 'No hay packs en esta lista.'}
                    </p>
                )}

                {datos && lista.length > 0 && pestana === 'enCurso' && porFecha(lista).map(([fecha, packs]) => (
                    <section key={fecha} className="mt-6" aria-label={fecha === 'sin-fecha' ? 'Sin fecha' : fechaLarga(fecha)}>
                        <h2 className="mb-2 text-sm font-black uppercase tracking-wide text-gray-700">
                            {fecha === 'sin-fecha' ? 'Sin fecha' : fechaLarga(fecha)} · {packs.length} {packs.length === 1 ? 'pack' : 'packs'}
                        </h2>
                        <ul className="space-y-2">
                            {packs.map(p => <TarjetaDePack key={p.id} pack={p} />)}
                        </ul>
                    </section>
                ))}

                {datos && lista.length > 0 && pestana !== 'enCurso' && (
                    <ul className="mt-6 space-y-2">
                        {lista.map(p => <TarjetaDePack key={p.id} pack={p} modo={pestana === 'porRenovar' ? 'renovar' : 'terminado'} />)}
                    </ul>
                )}
            </main>
        </div>
    );
}
