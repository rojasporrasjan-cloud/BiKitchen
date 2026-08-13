import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { BadgePercent, RefreshCw, ExternalLink, Info, Clock, CheckCircle2 } from 'lucide-react';
import { db } from '../../firebase/config';
import { doc, getDoc } from 'firebase/firestore';
import AdminPageHeader from '../../components/admin/AdminPageHeader';
import { getPackPrices, getIndividualPrices } from '../../utils/firestoreMenus';
import { getAllCoupons } from '../../utils/firestoreCoupons';
import { getAllPromotions } from '../../utils/firestorePromotions';
import { individualesData } from '../../data/individualesData';
import { recolectarDescuentos, resumirDescuentos, ORIGENES } from '../../utils/descuentosActivos';
import { formatFechaCorta } from '../../utils/dateDisplay';

/**
 * Tablero de descuentos: qué está rebajado ahora mismo.
 *
 * Los descuentos viven en cinco pantallas distintas (packs, platos, cupones,
 * envío y promociones), cada una guardando en su propio lugar. Esta pantalla
 * SOLO LEE de las cinco y las junta en una tabla.
 *
 * No se unificaron los datos a propósito: cambiar dónde se guardan obligaría a
 * tocar cómo se calculan los precios en el carrito y el checkout, que es el
 * código que mueve la plata. El problema real no era ese, era no tener un lugar
 * donde ver todo junto.
 */

const COLOR_ORIGEN = {
    pack: 'bg-orange-100 text-orange-700',
    plato: 'bg-blue-100 text-blue-700',
    cupon: 'bg-purple-100 text-purple-700',
    envio: 'bg-teal-100 text-teal-700',
    promocion: 'bg-pink-100 text-pink-700'
};

export default function ActiveDiscountsView() {
    const [datos, setDatos] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const cargar = async () => {
        setLoading(true);
        setError(null);
        try {
            // Cada fuente por separado: si una falla, las demás igual se muestran
            const [packPrices, individualPrices, cupones, promociones, envioSnap] = await Promise.all([
                getPackPrices().catch(() => ({})),
                getIndividualPrices().catch(() => ({})),
                getAllCoupons().catch(() => []),
                getAllPromotions().catch(() => []),
                getDoc(doc(db, 'config', 'shippingDiscount')).catch(() => null)
            ]);

            setDatos({
                packPrices: packPrices || {},
                individualPrices: individualPrices || {},
                catalogoIndividuales: individualesData,
                cupones: cupones || [],
                promociones: promociones || [],
                envio: envioSnap?.exists() ? envioSnap.data() : null
            });
        } catch (err) {
            console.error('[Descuentos] Error cargando:', err);
            setError('No se pudieron leer los descuentos. Revisá la conexión.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { cargar(); }, []);

    const items = useMemo(() => (datos ? recolectarDescuentos(datos) : []), [datos]);
    const resumen = resumirDescuentos(items);

    const vigentes = items.filter(i => i.vigente);
    const otros = items.filter(i => !i.vigente);

    const Fila = ({ item }) => {
        const origen = ORIGENES[item.origen];
        return (
            <div className={`flex flex-wrap items-center gap-4 p-4 rounded-xl border ${item.vigente ? 'bg-white border-gray-200' : 'bg-gray-50 border-gray-200 opacity-75'
                }`}>
                <span className={`text-xs font-bold px-2.5 py-1 rounded-lg shrink-0 ${COLOR_ORIGEN[item.origen]}`}>
                    {origen.etiqueta}
                </span>

                <div className="flex-1 min-w-[180px]">
                    <p className="font-medium text-gray-900">{item.nombre}</p>
                    {item.nota && <p className="text-xs text-gray-500 mt-0.5">{item.nota}</p>}
                </div>

                <div className="text-right min-w-[80px]">
                    <p className="font-bold text-gray-900">{item.descuento}</p>
                </div>

                <div className="min-w-[150px] text-xs text-gray-500">
                    {item.desde || item.hasta ? (
                        <>
                            {item.desde && <span>desde {formatFechaCorta(item.desde)}</span>}
                            {item.desde && item.hasta && ' · '}
                            {item.hasta && <span>hasta {formatFechaCorta(item.hasta)}</span>}
                        </>
                    ) : (
                        <span>Sin fecha límite</span>
                    )}
                </div>

                <Link
                    to={origen.ruta}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-700 text-xs font-bold rounded-lg hover:bg-gray-200 transition-colors shrink-0"
                >
                    <ExternalLink size={13} aria-hidden="true" />
                    {origen.pantalla}
                </Link>
            </div>
        );
    };

    return (
        <div className="space-y-6 pb-20">
            <AdminPageHeader
                icon={BadgePercent}
                title="Descuentos Activos"
                subtitle="Todo lo que está rebajado ahora mismo, de las cinco pantallas"
                gradient="from-emerald-600 via-teal-500 to-cyan-500"
                stats={[
                    { value: resumen.vigentes, label: 'Corriendo hoy' },
                    { value: resumen.programados, label: 'Programados o vencidos' }
                ]}
                actions={[
                    <button
                        key="refresh"
                        onClick={cargar}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/20 text-sm text-white hover:bg-white/30 transition-colors"
                    >
                        <RefreshCw size={16} className={loading ? 'animate-spin' : ''} aria-hidden="true" />
                        Actualizar
                    </button>
                ]}
            />

            <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 flex items-start gap-3">
                <Info size={18} className="text-blue-600 mt-0.5 shrink-0" aria-hidden="true" />
                <p className="text-sm text-blue-900 leading-relaxed">
                    Esta pantalla <strong>solo muestra</strong>: cada descuento se sigue configurando
                    en su pantalla de siempre. Si un precio sale raro, empezá por acá para saber
                    cuál está aplicando y andá directo a corregirlo con el botón de la derecha.
                </p>
            </div>

            {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-800">
                    {error}
                </div>
            )}

            {loading ? (
                <div className="flex justify-center py-16">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-bikitchen-orange" aria-hidden="true" />
                </div>
            ) : items.length === 0 ? (
                <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
                    <BadgePercent size={40} className="text-gray-300 mx-auto mb-3" aria-hidden="true" />
                    <p className="text-gray-600 font-medium">No hay ningún descuento activo</p>
                    <p className="text-sm text-gray-400 mt-1">
                        Todos los precios están al valor normal.
                    </p>
                </div>
            ) : (
                <>
                    <section className="space-y-3">
                        <h2 className="flex items-center gap-2 text-sm font-bold text-green-800 uppercase tracking-wide">
                            <CheckCircle2 size={16} aria-hidden="true" />
                            Corriendo ahora ({vigentes.length})
                        </h2>
                        {vigentes.length === 0 ? (
                            <p className="text-sm text-gray-500 px-4 py-3 bg-gray-50 rounded-xl">
                                Ninguno está aplicando en este momento.
                            </p>
                        ) : (
                            vigentes.map(item => <Fila key={item.clave} item={item} />)
                        )}
                    </section>

                    {otros.length > 0 && (
                        <section className="space-y-3">
                            <h2 className="flex items-center gap-2 text-sm font-bold text-gray-500 uppercase tracking-wide">
                                <Clock size={16} aria-hidden="true" />
                                Configurados pero fuera de fecha ({otros.length})
                            </h2>
                            <p className="text-xs text-gray-500 -mt-1">
                                Están encendidos, pero su rango de fechas todavía no empezó o ya pasó.
                            </p>
                            {otros.map(item => <Fila key={item.clave} item={item} />)}
                        </section>
                    )}
                </>
            )}
        </div>
    );
}
