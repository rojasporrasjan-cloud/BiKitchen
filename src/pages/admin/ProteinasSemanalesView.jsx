import React, { useEffect, useMemo, useState } from 'react';
import { Beef, Info, Search } from 'lucide-react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import AdminPageHeader from '../../components/admin/AdminPageHeader';
import EntregaDeProteinas from '../../components/admin/EntregaDeProteinas';
import usePedidosDeFechas from '../../hooks/usePedidosDeFechas';
import { fechasEntre } from '../../utils/consultaPorFechas';
import { individualesData } from '../../data/individualesData';
import { getOfficialMenus } from '../../utils/firestoreMenus';
import {
    entregasParaElegir, sugerenciasDeProteinas, cambioDeProteinas, diaDeLaSemana
} from '../../utils/proteinasPorEntrega';
import { formatFechaLarga, diasHasta } from '../../utils/dateDisplay';

/**
 * Proteínas de la semana.
 *
 * Los packs de proteínas de varias entregas cambian de lista cada semana. Esta
 * pantalla junta, por día de entrega —miércoles, sábado y lunes—, a quién le
 * toca un pack de proteínas y deja escribir las de esa semana. Lo que se guarda
 * sale en la hoja de producción, en las etiquetas y en la hoja de despacho de
 * esa fecha.
 *
 * Lee SOLO los pedidos con entregas en las próximas cinco semanas —no la
 * colección entera— y la consulta no cambia al mover los filtros, así que
 * filtrar no cuesta lecturas (REGLA 17). Guardar es UNA escritura en el pedido.
 */

const DIAS = [
    { id: 'todos', label: 'Todos' },
    { id: 3, label: 'Miércoles' },
    { id: 6, label: 'Sábado' },
    { id: 1, label: 'Lunes' }
];

const RANGOS = [
    { dias: 7, label: 'Esta semana' },
    { dias: 14, label: '2 semanas' },
    { dias: 35, label: 'El mes' }
];

const LISTA_SUGERENCIAS = 'sugerencias-proteinas';

const hoyISO = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const sumarDias = (iso, n) => {
    const d = new Date(`${iso}T12:00:00`);
    d.setDate(d.getDate() + n);
    return d.toISOString().slice(0, 10);
};

export default function ProteinasSemanalesView() {
    const [dia, setDia] = useState('todos');
    const [rango, setRango] = useState(7);
    const [soloFaltan, setSoloFaltan] = useState(false);
    const [busqueda, setBusqueda] = useState('');

    const desde = hoyISO();
    const hasta = sumarDias(desde, rango);

    // Siempre el rango MÁS LARGO: cambiar entre "esta semana" y "el mes" filtra
    // en memoria en vez de hacer otra consulta.
    const fechasDelMes = useMemo(() => fechasEntre(desde, sumarDias(desde, 35)), [desde]);
    const { pedidos: orders, cargando: loading } = usePedidosDeFechas(fechasDelMes, 'Proteínas de la semana');

    const grupos = useMemo(
        () => entregasParaElegir(orders, { desde, hasta }),
        [orders, desde, hasta]
    );
    // La lista PAQUETES DE PROTEÍNA del menú de la semana va primero en las
    // sugerencias. El menú oficial es un solo documento y casi siempre sale de caché.
    const [menus, setMenus] = useState(null);
    useEffect(() => {
        getOfficialMenus().then(setMenus).catch(() => setMenus(null));
    }, []);
    const sugerencias = useMemo(() => sugerenciasDeProteinas(orders, individualesData, menus), [orders, menus]);

    const termino = busqueda.trim().toLowerCase();
    const visibles = grupos
        .filter(g => dia === 'todos' || diaDeLaSemana(g.fecha) === dia)
        .map(g => ({
            ...g,
            filas: g.filas
                .filter(f => !soloFaltan || f.origen === 'falta')
                .filter(f => !termino || String(f.pedido.cliente || '').toLowerCase().includes(termino))
        }))
        .filter(g => g.filas.length > 0);

    const todas = grupos.flatMap(g => g.filas);
    const faltan = todas.filter(f => f.origen === 'falta').length;
    const faltanEstaSemana = grupos
        .filter(g => g.fecha <= sumarDias(desde, 7))
        .flatMap(g => g.filas)
        .filter(f => f.origen === 'falta').length;

    const guardar = async (fila, lista) => {
        const cambios = cambioDeProteinas(fila.pedido, fila.fecha, lista);
        if (!cambios) return;
        // Por el id REAL del documento. Un PATCH a un id que no existe no
        // falla: crea un pedido fantasma (3 de setiembre de 2026).
        await updateDoc(doc(db, 'pedidos', fila.pedido.id), cambios);
    };

    return (
        <div className="space-y-6 pb-20">
            <AdminPageHeader
                icon={Beef}
                title="Proteínas de la semana"
                subtitle="Elegí las proteínas de cada entrega de los packs de proteínas"
                stats={[
                    { value: todas.length, label: 'Entregas' },
                    { value: faltan, label: 'Falta elegir' },
                    { value: faltanEstaSemana, label: 'Faltan esta semana' }
                ]}
                gradient="from-rose-600 via-orange-500 to-amber-400"
            />

            <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 flex items-start gap-3">
                <Info size={18} className="text-blue-600 mt-0.5 shrink-0" aria-hidden="true" />
                <p className="text-sm text-blue-900 leading-relaxed">
                    Lo que guardés acá es <strong>solo para esa entrega</strong> y sale así en la hoja de producción,
                    las etiquetas y el despacho de ese día. Las otras semanas no cambian. Si una entrega no tiene
                    nada elegido, la hoja usa las proteínas de la compra y <strong>te avisa en rojo</strong>.
                </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
                <div role="group" aria-label="Día de entrega" className="flex flex-wrap gap-1.5">
                    {DIAS.map(d => (
                        <button
                            key={d.id}
                            type="button"
                            onClick={() => setDia(d.id)}
                            aria-pressed={dia === d.id}
                            className={`px-3.5 py-2 rounded-xl text-sm font-bold border-2 transition ${dia === d.id
                                ? 'bg-gray-900 text-white border-gray-900'
                                : 'bg-white text-gray-700 border-gray-200 hover:border-gray-400'}`}
                        >
                            {d.label}
                        </button>
                    ))}
                </div>
                <div role="group" aria-label="Cuánto adelante" className="flex gap-1.5">
                    {RANGOS.map(r => (
                        <button
                            key={r.dias}
                            type="button"
                            onClick={() => setRango(r.dias)}
                            aria-pressed={rango === r.dias}
                            className={`px-3 py-2 rounded-xl text-xs font-bold border transition ${rango === r.dias
                                ? 'bg-orange-100 text-orange-900 border-orange-300'
                                : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'}`}
                        >
                            {r.label}
                        </button>
                    ))}
                </div>
                <label className="inline-flex items-center gap-2 text-sm font-semibold text-gray-700 cursor-pointer">
                    <input type="checkbox" checked={soloFaltan} onChange={(e) => setSoloFaltan(e.target.checked)} className="w-4 h-4" />
                    Solo los que faltan
                </label>
                <div className="relative ml-auto w-full sm:w-64">
                    <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" aria-hidden="true" />
                    <input
                        type="search"
                        value={busqueda}
                        onChange={(e) => setBusqueda(e.target.value)}
                        placeholder="Buscar cliente"
                        aria-label="Buscar cliente"
                        className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-xl text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                    />
                </div>
            </div>

            <datalist id={LISTA_SUGERENCIAS}>
                {sugerencias.map(s => <option key={s} value={s} />)}
            </datalist>

            {loading && <p className="text-sm text-gray-500">Cargando pedidos…</p>}

            {!loading && visibles.length === 0 && (
                <p className="text-sm text-gray-600 bg-white border border-gray-200 rounded-2xl px-4 py-6 text-center">
                    {todas.length === 0
                        ? 'No hay entregas de packs de proteínas en estas fechas.'
                        : 'Nada que mostrar con estos filtros.'}
                </p>
            )}

            {visibles.map(g => {
                const n = diasHasta(g.fecha);
                const cuando = n === 0 ? 'HOY' : n === 1 ? 'Mañana' : `En ${n} días`;
                const sinElegir = g.filas.filter(f => f.origen === 'falta').length;
                return (
                    <section key={g.fecha} aria-labelledby={`dia-${g.fecha}`}>
                        <h2 id={`dia-${g.fecha}`} className="flex flex-wrap items-baseline gap-x-3 mb-3 text-lg font-bold text-gray-900 capitalize">
                            {formatFechaLarga(g.fecha)}
                            <span className="text-sm font-semibold text-gray-500 normal-case">
                                {cuando} · {g.filas.length} {g.filas.length === 1 ? 'pack' : 'packs'}
                                {sinElegir > 0 && <span className="text-red-700"> · faltan {sinElegir}</span>}
                            </span>
                        </h2>
                        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                            {g.filas.map(f => (
                                <EntregaDeProteinas
                                    // La llave cambia cuando cambia lo guardado: la tarjeta se
                                    // vuelve a armar con lo que quedó en el pedido.
                                    key={`${f.pedido.id}-${f.fecha}-${f.origen}-${f.lista.join('|')}`}
                                    fila={f}
                                    listaSugerencias={LISTA_SUGERENCIAS}
                                    onGuardar={(lista) => guardar(f, lista)}
                                />
                            ))}
                        </div>
                    </section>
                );
            })}
        </div>
    );
}
