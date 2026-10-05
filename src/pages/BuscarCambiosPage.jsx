import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronRight, MessageCircle, Lock } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import SEOHead, { SEO_CONFIG } from '../components/SEOHead';
import PageTransition from '../components/PageTransition';
import { useWhatsApp } from '../hooks/useWhatsApp';
import { useAuth } from '../context/AuthContext';
import { WHATSAPP_MESSAGES } from '../config/whatsappMessages';
import { cabecerasConSesion, leerLlaveCliente, guardarLlaveCliente } from '../utils/llaveDelCliente';

/**
 * /cambios — el link FIJO de los cambios de la semana.
 *
 * Es el que se pone en cualquier mensaje o automatización de Kommo, sin
 * variables (como bikitchencr.com/etiquetas para la impresora). La búsqueda la
 * hace netlify/functions/cambios-semana.js.
 *
 * Al cliente ya conocido lo reconoce SOLO (Jan, 4 oct 2026): con la llave que
 * quedó en su teléfono (de su link personal o de una búsqueda anterior) o con
 * su cuenta, si tiene la sesión iniciada. Con un solo pack lo manda directo a
 * sus cambios. Si no se lo reconoce, escribe su WhatsApp y su nombre UNA vez y
 * desde ahí queda guardado en ese teléfono.
 */

const FUNCION = '/.netlify/functions/cambios-semana';

const fechaEnPalabras = (iso) => new Date(`${iso}T12:00:00`)
    .toLocaleDateString('es-CR', { weekday: 'long', day: 'numeric', month: 'long' })
    .replace(/^(\p{L}+),/u, '$1')
    .replace('septiembre', 'setiembre');

/** Con un solo pack abierto, directo; si no, la lista para que elija. */
const destinoDirecto = (opciones = []) => {
    const abiertas = opciones.filter(o => !o.cerrada);
    return opciones.length === 1 && abiertas.length === 1 ? abiertas[0].ruta : null;
};

export default function BuscarCambiosPage() {
    const navigate = useNavigate();
    const { getWhatsAppUrl } = useWhatsApp();
    const { currentUser } = useAuth() || {};
    const [telefono, setTelefono] = useState('');
    const [nombre, setNombre] = useState('');
    const [buscando, setBuscando] = useState(false);
    const [error, setError] = useState('');
    const [opciones, setOpciones] = useState(null);
    const [saludo, setSaludo] = useState('');
    // Mientras se pregunta si ya lo conocemos, no se muestra el formulario
    const [reconociendo, setReconociendo] = useState(() => !!leerLlaveCliente() || !!currentUser);
    const listaRef = useRef(null);

    // Con varios packs la lista queda debajo del botón: que se vea sin buscarla
    useEffect(() => {
        if (opciones) listaRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
    }, [opciones]);

    // ¿Ya lo conocemos? (la misma acción que la tarjeta de Mi cuenta)
    useEffect(() => {
        const llave = leerLlaveCliente();
        if (!llave && !currentUser) { setReconociendo(false); return undefined; }
        let vigente = true;
        (async () => {
            try {
                const res = await fetch(FUNCION, {
                    method: 'POST',
                    headers: await cabecerasConSesion(),
                    body: JSON.stringify({ accion: 'mios', llaveCliente: llave })
                });
                const d = await res.json().catch(() => ({}));
                if (!vigente || !res.ok || !d.opciones?.length) return;
                const ruta = destinoDirecto(d.opciones);
                if (ruta) { navigate(ruta, { replace: true }); return; }
                setSaludo(d.nombre || '');
                setOpciones(d.opciones);
            } catch (e) {
                console.error('[BuscarCambios] No se pudo reconocer:', e);
            } finally {
                if (vigente) setReconociendo(false);
            }
        })();
        return () => { vigente = false; };
    }, [currentUser, navigate]);

    const listo = telefono.replace(/\D/g, '').length >= 8 && nombre.trim().length >= 2;

    const handleBuscar = async (e) => {
        e.preventDefault();
        setBuscando(true);
        setError('');
        setOpciones(null);
        try {
            const res = await fetch(FUNCION, {
                method: 'POST',
                headers: await cabecerasConSesion(),
                body: JSON.stringify({ accion: 'buscar', telefono, nombre })
            });
            const datos = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(datos.error || 'No pudimos buscar tu pedido. Probá de nuevo.');
            // Ya probó que es él: la próxima vez entra directo desde este teléfono
            guardarLlaveCliente(datos.llaveCliente);
            if (datos.opciones.length === 1) navigate(datos.opciones[0].ruta);
            else setOpciones(datos.opciones);
        } catch (err) {
            setError(err.message);
        } finally {
            setBuscando(false);
        }
    };

    return (
        <PageTransition>
            <SEOHead {...SEO_CONFIG.cambiosSemana} noindex />

            <div className="min-h-screen bg-gradient-to-b from-bikitchen-beige to-white">
                <Navbar />

                <main className="max-w-md mx-auto px-4 pt-28 pb-16">
                    <h1 className="text-3xl font-black text-gray-900 leading-tight">
                        {saludo ? `¡Hola, ${saludo}! Tus cambios de esta semana` : 'Cambios de tu pack de esta semana'}
                    </h1>

                    {reconociendo ? (
                        <p className="mt-6 text-gray-600" role="status">Buscando tu pedido…</p>
                    ) : !saludo && (
                        <>
                            <p className="mt-2 text-gray-600">
                                Escribí el WhatsApp con el que hiciste tu pedido y tu nombre. Solo la primera vez: después
                                entrás directo desde este teléfono. Podés cambiar hasta 2 cosas por pack, hasta el cierre de
                                pedidos de tu entrega. <Link to="/menu" className="font-semibold text-bikitchen-orange underline">Ver el menú de la semana</Link>
                            </p>

                            <form onSubmit={handleBuscar} className="mt-6 bg-white rounded-2xl shadow-sm border border-gray-100 p-5 space-y-4">
                                <label className="block text-sm font-bold text-gray-900">
                                    Tu número de WhatsApp
                                    <input type="tel" inputMode="numeric" autoComplete="tel" value={telefono}
                                        onChange={(e) => setTelefono(e.target.value)} placeholder="8888 8888"
                                        className="mt-1 w-full p-3 bg-white border-2 border-gray-200 rounded-xl text-base font-normal outline-none focus:border-bikitchen-orange transition-colors" />
                                </label>
                                <label className="block text-sm font-bold text-gray-900">
                                    Tu nombre
                                    <input type="text" autoComplete="given-name" value={nombre}
                                        onChange={(e) => setNombre(e.target.value)} placeholder="Como aparece en tu pedido"
                                        className="mt-1 w-full p-3 bg-white border-2 border-gray-200 rounded-xl text-base font-normal outline-none focus:border-bikitchen-orange transition-colors" />
                                </label>
                                {error && <p role="alert" className="p-3 bg-red-50 text-red-700 text-sm font-medium rounded-xl">{error}</p>}
                                <button type="submit" disabled={!listo || buscando}
                                    className="w-full py-4 bg-bikitchen-orange hover:bg-bikitchen-orange-dark text-white text-lg font-bold rounded-2xl shadow-lg active:scale-[0.98] transition-all disabled:opacity-40">
                                    {buscando ? 'Buscando…' : 'Ver mi menú'}
                                </button>
                            </form>

                            {!currentUser && (
                                <p className="mt-4 text-sm text-center text-gray-600">
                                    ¿Tenés cuenta en BiKitchen?{' '}
                                    <Link to="/login?volver=/cambios" className="font-bold text-bikitchen-orange underline">Iniciá sesión</Link>
                                    {' '}y entrás directo desde cualquier teléfono.
                                </p>
                            )}
                        </>
                    )}

                    {opciones && (
                        <section ref={listaRef} className="mt-6 scroll-mt-24" aria-labelledby="titulo-packs">
                            <h2 id="titulo-packs" className="text-lg font-bold text-gray-900 mb-3">¿Qué pack querés cambiar?</h2>
                            <ul className="space-y-3">
                                {opciones.map(o => (
                                    <li key={o.ruta}>
                                        {o.cerrada ? (
                                            <p className="flex items-center justify-between gap-3 p-4 bg-gray-50 rounded-2xl border-2 border-gray-100 text-gray-500">
                                                <span>
                                                    <span className="block font-bold">{o.pack}</span>
                                                    <span className="text-sm">Entrega del {fechaEnPalabras(o.fecha)}: los cambios se cerraron</span>
                                                </span>
                                                <Lock size={18} className="shrink-0" aria-hidden="true" />
                                            </p>
                                        ) : (
                                            <Link to={o.ruta} className="flex items-center justify-between gap-3 p-4 bg-white rounded-2xl border-2 border-gray-100 hover:border-bikitchen-orange transition-colors">
                                                <span>
                                                    <span className="block font-bold text-gray-900">{o.pack}</span>
                                                    <span className="text-sm text-gray-600">Entrega del {fechaEnPalabras(o.fecha)}</span>
                                                </span>
                                                <ChevronRight size={20} className="text-bikitchen-orange shrink-0" aria-hidden="true" />
                                            </Link>
                                        )}
                                    </li>
                                ))}
                            </ul>
                        </section>
                    )}

                    <a href={getWhatsAppUrl(WHATSAPP_MESSAGES.CAMBIOS_SEMANA)} target="_blank" rel="noopener noreferrer"
                        className="mt-8 flex items-center justify-center gap-2 text-sm font-semibold text-green-700">
                        <MessageCircle size={16} aria-hidden="true" /> ¿Problemas? Escribinos por WhatsApp
                    </a>
                </main>

                <Footer />
            </div>
        </PageTransition>
    );
}
