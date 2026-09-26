import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronRight, MessageCircle } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import SEOHead, { SEO_CONFIG } from '../components/SEOHead';
import PageTransition from '../components/PageTransition';
import { useWhatsApp } from '../hooks/useWhatsApp';
import { WHATSAPP_MESSAGES } from '../config/whatsappMessages';

/**
 * /cambios — el link FIJO de los cambios de la semana.
 *
 * Es el que se pone en cualquier mensaje o automatización de Kommo, sin
 * variables (como bikitchencr.com/etiquetas para la impresora). El cliente
 * escribe su WhatsApp y su nombre, y lo lleva a su link de siempre
 * (/cambios/<código>), con las mismas reglas: hasta el miércoles 8 p. m. y
 * máximo 2 cambios por pack. La búsqueda la hace netlify/functions/cambios-semana.js.
 */

const FUNCION = '/.netlify/functions/cambios-semana';

const fechaEnPalabras = (iso) => new Date(`${iso}T12:00:00`)
    .toLocaleDateString('es-CR', { weekday: 'long', day: 'numeric', month: 'long' })
    .replace(/^(\p{L}+),/u, '$1')
    .replace('septiembre', 'setiembre');

export default function BuscarCambiosPage() {
    const navigate = useNavigate();
    const { getWhatsAppUrl } = useWhatsApp();
    const [telefono, setTelefono] = useState('');
    const [nombre, setNombre] = useState('');
    const [buscando, setBuscando] = useState(false);
    const [error, setError] = useState('');
    const [opciones, setOpciones] = useState(null);

    const listo = telefono.replace(/\D/g, '').length >= 8 && nombre.trim().length >= 2;

    const handleBuscar = async (e) => {
        e.preventDefault();
        setBuscando(true);
        setError('');
        setOpciones(null);
        try {
            const res = await fetch(FUNCION, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ accion: 'buscar', telefono, nombre })
            });
            const datos = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(datos.error || 'No pudimos buscar tu pedido. Probá de nuevo.');
            // Un solo pack: directo a sus cambios. Varios: que elija.
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
                    <h1 className="text-3xl font-black text-gray-900 leading-tight">Cambios de tu pack de esta semana</h1>
                    <p className="mt-2 text-gray-600">
                        Escribí el WhatsApp con el que hiciste tu pedido y tu nombre. Podés cambiar hasta 2 cosas por pack,
                        hasta el miércoles a las 8 p. m. <Link to="/menu" className="font-semibold text-bikitchen-orange underline">Ver el menú de la semana</Link>
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

                    {opciones && (
                        <section className="mt-6" aria-labelledby="titulo-packs">
                            <h2 id="titulo-packs" className="text-lg font-bold text-gray-900 mb-3">¿Qué pack querés cambiar?</h2>
                            <ul className="space-y-3">
                                {opciones.map(o => (
                                    <li key={o.ruta}>
                                        <Link to={o.ruta} className="flex items-center justify-between gap-3 p-4 bg-white rounded-2xl border-2 border-gray-100 hover:border-bikitchen-orange transition-colors">
                                            <span>
                                                <span className="block font-bold text-gray-900">{o.pack}</span>
                                                <span className="text-sm text-gray-600">Entrega del {fechaEnPalabras(o.fecha)}</span>
                                            </span>
                                            <ChevronRight size={20} className="text-bikitchen-orange shrink-0" aria-hidden="true" />
                                        </Link>
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
