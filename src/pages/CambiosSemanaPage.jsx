import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { CheckCircle2, Clock, MessageCircle, CalendarDays, Sparkles } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import SEOHead, { SEO_CONFIG } from '../components/SEOHead';
import PageTransition from '../components/PageTransition';
import PlatoParaCambiar from '../components/cambios/PlatoParaCambiar';
import ElegirProteinas from '../components/cambios/ElegirProteinas';
import { useWhatsApp } from '../hooks/useWhatsApp';
import { WHATSAPP_MESSAGES } from '../config/whatsappMessages';
import { CODIGO_DE_PRUEBA, PACKS_DE_PRUEBA, armarPrueba, enviarPrueba } from '../utils/cambiosDePrueba';
import { cabecerasConSesion, guardarLlaveCliente } from '../utils/llaveDelCliente';

/**
 * /cambios/:codigo — el cliente pide los cambios de su pack de esta semana.
 *
 * Le llega por WhatsApp el miércoles. Sin cuenta ni contraseña: el link ya dice
 * de quién es y de qué entrega (ver netlify/functions/cambios-semana.js). Lo
 * que elige queda guardado en SU pedido y Gina lo ve en el panel.
 */

const FUNCION = '/.netlify/functions/cambios-semana';

const llamar = async (cuerpo) => {
    const res = await fetch(FUNCION, {
        method: 'POST',
        // Con la sesión, si la tiene: así su cuenta queda unida a su pedido sola
        headers: await cabecerasConSesion(),
        body: JSON.stringify(cuerpo)
    });
    const datos = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(datos.error || 'No pudimos cargar tus cambios. Probá de nuevo.');
    return datos;
};

const fechaEnPalabras = (iso) => new Date(`${iso}T12:00:00`)
    .toLocaleDateString('es-CR', { weekday: 'long', day: 'numeric', month: 'long' })
    .replace(/^(\p{L}+),/u, '$1')
    .replace('septiembre', 'setiembre');

/** Lo guardado, en la forma del formulario. */
const desdeLoGuardado = (guardado) => ({
    cambios: Object.fromEntries((guardado?.cambios || []).map(c => [`${c.comida}|${c.parte}|${c.de}`, c.a])),
    proteinas: (guardado?.proteinas || []).reduce((m, p) => ({ ...m, [p]: (m[p] || 0) + 1 }), {}),
    notas: guardado?.notas || ''
});

export default function CambiosSemanaPage() {
    const { codigo } = useParams();
    const [params] = useSearchParams();
    const { getWhatsAppUrl } = useWhatsApp();
    // /cambios/prueba: la misma página con el menú real, sin guardar nada
    const esPrueba = codigo === CODIGO_DE_PRUEBA;
    const packDePrueba = params.get('pack') || PACKS_DE_PRUEBA[0].id;
    const [textoCocina, setTextoCocina] = useState('');

    const [datos, setDatos] = useState(null);
    const [error, setError] = useState('');
    const [cambios, setCambios] = useState({});
    const [proteinas, setProteinas] = useState({});
    const [notas, setNotas] = useState('');
    const [enviando, setEnviando] = useState(false);
    const [listo, setListo] = useState(false);

    useEffect(() => {
        let vigente = true;
        setDatos(null);
        setError('');
        setListo(false);
        const cargar = esPrueba
            ? armarPrueba(packDePrueba)
            : llamar({ accion: 'ver', codigo });
        cargar
            .then((d) => {
                if (!vigente) return;
                const previo = desdeLoGuardado(d.guardado);
                // Su teléfono sellado queda en este aparato: el perfil lo usa cada semana
                guardarLlaveCliente(d.llaveCliente);
                setDatos(d);
                setCambios(previo.cambios);
                setProteinas(previo.proteinas);
                setNotas(previo.notas);
            })
            .catch((e) => vigente && setError(e.message));
        return () => { vigente = false; };
    }, [codigo, esPrueba, packDePrueba]);

    const permitido = datos?.permitido;
    const tope = permitido ? permitido.maxCambios * permitido.packs : 0;
    const usados = Object.keys(cambios).length;
    const totalProteinas = Object.values(proteinas).reduce((s, n) => s + n, 0);
    const listoParaEnviar = permitido?.tipo === 'proteinas'
        ? totalProteinas === permitido.proteinas.cuantas
        : usados > 0 || notas.trim().length > 0;

    const resumen = useMemo(() => Object.entries(cambios).map(([clave, a]) => {
        const [comida, parte, de] = clave.split('|');
        const platos = (comida === 'cena' ? permitido?.cenas : permitido?.almuerzos) || [];
        const numeros = platos.filter(p => p[parte] === de).map(p => p.numero);
        const donde = `${comida === 'cena' ? 'Cena' : 'Plato'}${numeros.length > 1 ? 's' : ''} ${numeros.join(' y ')}`;
        return `${donde}: ${de} → ${a}`;
    }), [cambios, permitido]);

    const handleCambiar = (comida, parte, de, valor) => {
        setCambios((prev) => {
            const nuevos = { ...prev };
            const clave = `${comida}|${parte}|${de}`;
            if (valor) nuevos[clave] = valor; else delete nuevos[clave];
            return nuevos;
        });
    };

    const handleEnviar = async () => {
        setEnviando(true);
        setError('');
        const cuerpo = {
            notas,
            cambios: Object.entries(cambios).map(([clave, a]) => {
                const [comida, parte, de] = clave.split('|');
                return { comida, parte, de, a };
            }),
            proteinas: Object.entries(proteinas).flatMap(([nombre, n]) => Array.from({ length: n }, () => nombre))
        };
        try {
            if (esPrueba) {
                // Las mismas reglas que el servidor, sin guardar
                setTextoCocina(enviarPrueba(permitido, cuerpo));
            } else {
                await llamar({ accion: 'guardar', codigo, ...cuerpo });
            }
            setListo(true);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } catch (e) {
            setError(e.message);
        } finally {
            setEnviando(false);
        }
    };

    const whatsapp = getWhatsAppUrl(WHATSAPP_MESSAGES.CAMBIOS_SEMANA);

    return (
        <PageTransition>
            <SEOHead {...SEO_CONFIG.cambiosSemana} noindex />

            <div className="min-h-screen bg-gradient-to-b from-bikitchen-beige to-white">
                <Navbar />

                <main className="max-w-xl mx-auto px-4 pt-28 pb-44">
                    {esPrueba && (
                        <div className="mb-5 p-4 rounded-3xl bg-gray-900 text-white">
                            <p className="font-black">Modo prueba: nada se guarda</p>
                            <p className="mt-1 text-sm text-white/80">
                                Es la misma página que ve el cliente, con el menú y la lista de cambios reales de esta semana.
                                Al enviar te mostramos lo que le llegaría a la cocina.
                            </p>
                            <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Pack para probar">
                                {PACKS_DE_PRUEBA.map(p => (
                                    <Link key={p.id} to={`/cambios/${CODIGO_DE_PRUEBA}?pack=${p.id}`} replace
                                        aria-current={p.id === packDePrueba ? 'true' : undefined}
                                        className={`px-3 py-1.5 rounded-full text-xs font-bold ${p.id === packDePrueba ? 'bg-bikitchen-orange text-white' : 'bg-white/15 text-white'}`}>
                                        {p.nombre.replace(/^Pack /, '')}
                                    </Link>
                                ))}
                            </div>
                        </div>
                    )}

                    {!datos && !error && (
                        <div className="space-y-3" aria-busy="true" aria-label="Cargando tu menú">
                            <div className="h-8 w-2/3 bg-gray-200 rounded-lg animate-pulse" />
                            <div className="h-40 bg-gray-100 rounded-2xl animate-pulse" />
                            <div className="h-40 bg-gray-100 rounded-2xl animate-pulse" />
                        </div>
                    )}

                    {!datos && error && (
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 text-center">
                            <h1 className="text-2xl font-bold text-gray-900">No pudimos abrir tus cambios</h1>
                            <p className="mt-2 text-gray-600">{error}</p>
                            <a href={whatsapp} target="_blank" rel="noopener noreferrer"
                                className="mt-5 inline-flex items-center gap-2 px-6 py-3 bg-green-600 text-white font-bold rounded-xl active:scale-95 transition-transform">
                                <MessageCircle size={18} aria-hidden="true" /> Escribinos por WhatsApp
                            </a>
                        </div>
                    )}

                    {datos && (
                        <>
                            <p className="text-bikitchen-orange font-bold">¡Hola, {datos.nombre}! 👋</p>
                            <h1 className="mt-1 text-3xl font-black text-gray-900 leading-tight">
                                {listo ? '¡Listo! Ya tenemos tus cambios' : 'Tus cambios de esta semana'}
                            </h1>

                            <div className="mt-4 bg-white rounded-3xl shadow-sm p-4 space-y-3">
                                <p className="flex items-center gap-3 text-gray-700">
                                    <span className="flex items-center justify-center w-9 h-9 rounded-full bg-bikitchen-beige text-bikitchen-orange shrink-0" aria-hidden="true">
                                        <CalendarDays size={18} />
                                    </span>
                                    <span className="leading-snug">
                                        <b className="block text-gray-900">{datos.pack}</b>
                                        Entrega del {fechaEnPalabras(datos.fecha)}
                                    </span>
                                </p>
                                <p className={`flex items-center gap-3 px-3 py-2 rounded-2xl text-sm font-semibold ${datos.cerrada ? 'bg-gray-100 text-gray-600' : 'bg-orange-50 text-bikitchen-orange'}`}>
                                    <Clock size={16} className="shrink-0" aria-hidden="true" />
                                    {datos.cerrada ? `Se cerró el ${datos.cierreEnPalabras}` : `Tenés hasta el ${datos.cierreEnPalabras}`}
                                </p>
                            </div>

                            {listo && (
                                <div className="mt-6 bg-green-50 border border-green-200 rounded-2xl p-5">
                                    <p className="flex items-center gap-2 font-bold text-green-800">
                                        <CheckCircle2 size={20} aria-hidden="true" />
                                        {esPrueba ? 'Así lo vería el cliente (en la prueba no se guardó)' : 'Gina ya lo tiene en el sistema'}
                                    </p>
                                    <ul className="mt-3 space-y-1 text-sm text-green-900">
                                        {permitido.tipo === 'proteinas'
                                            ? Object.entries(proteinas).map(([p, n]) => <li key={p}>{n > 1 ? `${n}× ` : ''}{p}</li>)
                                            : resumen.map(r => <li key={r}>{r}</li>)}
                                        {notas.trim() && <li>Nota: {notas.trim()}</li>}
                                    </ul>
                                    {esPrueba && (
                                        <div className="mt-4 p-3 rounded-xl bg-white border border-green-200">
                                            <p className="text-xs font-bold uppercase tracking-wide text-gray-500">Prueba — esto le llegaría a la hoja de cocina</p>
                                            <p className="mt-1 text-sm font-mono text-gray-900 break-words">{textoCocina || '(nada: sin cambios)'}</p>
                                        </div>
                                    )}
                                    {!datos.cerrada && (
                                        <button type="button" onClick={() => setListo(false)}
                                            className="mt-4 text-sm font-semibold text-green-800 underline">
                                            Quiero cambiar algo más
                                        </button>
                                    )}
                                </div>
                            )}

                            {!listo && datos.cerrada && (
                                <div className="mt-6 bg-white rounded-2xl border border-gray-100 p-5 text-gray-700">
                                    Esta semana ya no se pueden hacer cambios desde acá. Si es urgente, escribinos y vemos si todavía llegamos.
                                    <a href={whatsapp} target="_blank" rel="noopener noreferrer"
                                        className="mt-4 flex items-center justify-center gap-2 py-3 bg-green-600 text-white font-bold rounded-xl active:scale-95 transition-transform">
                                        <MessageCircle size={18} aria-hidden="true" /> Escribir por WhatsApp
                                    </a>
                                </div>
                            )}

                            {!listo && !datos.cerrada && (
                                <>
                                    {permitido.tipo === 'proteinas' ? (
                                        <section className="mt-6" aria-labelledby="titulo-proteinas">
                                            <h2 id="titulo-proteinas" className="text-lg font-bold text-gray-900">Elegí tus proteínas</h2>
                                            <p className="text-sm text-gray-500 mb-3">Podés repetir la misma si te gusta más.</p>
                                            <ElegirProteinas cuantas={permitido.proteinas.cuantas} disponibles={permitido.proteinas.disponibles}
                                                elegidas={proteinas} onCambiar={setProteinas} />
                                        </section>
                                    ) : (
                                        <>
                                            <p className="mt-6 flex items-start gap-2 text-sm text-gray-600">
                                                <Sparkles size={16} className="mt-0.5 shrink-0 text-bikitchen-gold" aria-hidden="true" />
                                                <span>
                                                    Este es tu menú. Tocá <b>Cambiar</b> en lo que no te guste: podés hacer
                                                    hasta <b className="text-gray-900">{tope}</b> cambio{tope === 1 ? '' : 's'}.
                                                </span>
                                            </p>
                                            <section className="mt-4" aria-labelledby="titulo-almuerzos">
                                                <h2 id="titulo-almuerzos" className="text-lg font-bold text-gray-900 mb-3">
                                                    {permitido.cenas.length ? 'Almuerzos' : 'Tu menú'}
                                                </h2>
                                                <ul className="space-y-3">
                                                    {permitido.almuerzos.map(p => (
                                                        <PlatoParaCambiar key={`a${p.numero}`} plato={p} comida="almuerzo" cambios={cambios}
                                                            opciones={permitido.opciones} puedeCambiarMas={usados < tope} onCambiar={handleCambiar} />
                                                    ))}
                                                </ul>
                                            </section>
                                            {permitido.cenas.length > 0 && (
                                                <section className="mt-6" aria-labelledby="titulo-cenas">
                                                    <h2 id="titulo-cenas" className="text-lg font-bold text-gray-900 mb-3">Cenas</h2>
                                                    <ul className="space-y-3">
                                                        {permitido.cenas.map(p => (
                                                            <PlatoParaCambiar key={`c${p.numero}`} plato={p} comida="cena" cambios={cambios}
                                                                opciones={permitido.opciones} puedeCambiarMas={usados < tope} onCambiar={handleCambiar} />
                                                        ))}
                                                    </ul>
                                                </section>
                                            )}
                                        </>
                                    )}

                                    <label htmlFor="notas-cambios" className="block mt-6 text-sm font-bold text-gray-900">
                                        ¿Algo más que debamos saber? <span className="font-normal text-gray-500">(opcional)</span>
                                    </label>
                                    <textarea id="notas-cambios" value={notas} maxLength={300} rows={3}
                                        onChange={(e) => setNotas(e.target.value)}
                                        placeholder="Ej: sin cebolla, poco picante"
                                        className="mt-2 w-full p-3 bg-white border-2 border-gray-200 rounded-2xl text-base outline-none focus:border-bikitchen-orange transition-colors" />

                                    {error && <p role="alert" className="mt-4 p-3 bg-red-50 text-red-700 text-sm font-medium rounded-xl">{error}</p>}

                                    <p className="mt-5 text-center text-sm text-gray-500">
                                        ¿No querés cambiar nada? No hace falta que hagás nada: te llega tu menú tal cual.
                                    </p>
                                    <a href={whatsapp} target="_blank" rel="noopener noreferrer"
                                        className="mt-3 flex items-center justify-center gap-2 text-sm font-semibold text-green-700">
                                        <MessageCircle size={16} aria-hidden="true" /> ¿Dudas? Escribinos por WhatsApp
                                    </a>

                                    {/* Fija abajo: el contador y el botón siempre a mano, sin bajar hasta el final */}
                                    <div className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 shadow-[0_-4px_16px_rgba(0,0,0,0.06)] px-4 pt-3 pb-5">
                                        <div className="max-w-xl mx-auto">
                                            <p className="text-center text-sm text-gray-600 mb-2">
                                                {permitido.tipo === 'proteinas'
                                                    ? <>Elegiste <b className="text-gray-900">{totalProteinas} de {permitido.proteinas.cuantas}</b> proteínas</>
                                                    : <>Llevás <b className="text-gray-900">{usados} de {tope}</b> cambios</>}
                                            </p>
                                            <button type="button" onClick={handleEnviar} disabled={!listoParaEnviar || enviando}
                                                className="w-full py-4 bg-bikitchen-orange hover:bg-bikitchen-orange-dark text-white text-lg font-bold rounded-2xl shadow-lg active:scale-[0.98] transition-all disabled:opacity-40">
                                                {enviando ? 'Guardando…' : 'Enviar mis cambios'}
                                            </button>
                                        </div>
                                    </div>
                                </>
                            )}
                        </>
                    )}
                </main>

                <Footer />
            </div>
        </PageTransition>
    );
}
