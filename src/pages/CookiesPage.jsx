import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import PageTransition from '../components/PageTransition';
import { Cookie, ArrowLeft, Settings, BarChart3, Target, Shield, ToggleLeft, ToggleRight, Info } from 'lucide-react';

export default function CookiesPage() {
    const [cookiePreferences, setCookiePreferences] = useState({
        necessary: true,
        analytics: true,
        marketing: false
    });

    const handleToggle = (type) => {
        if (type === 'necessary') return; // No se puede desactivar
        setCookiePreferences(prev => ({
            ...prev,
            [type]: !prev[type]
        }));
    };

    const savePreferences = () => {
        localStorage.setItem('cookiePreferences', JSON.stringify(cookiePreferences));
        alert('Preferencias de cookies guardadas correctamente');
    };

    const cookieTypes = [
        {
            id: 'necessary',
            icon: <Shield size={24} />,
            title: "Cookies Necesarias",
            description: "Estas cookies son esenciales para el funcionamiento del sitio web. Permiten funciones básicas como la navegación y el acceso a áreas seguras. El sitio web no puede funcionar correctamente sin estas cookies.",
            examples: [
                "Mantener tu sesión activa",
                "Recordar los productos en tu carrito",
                "Garantizar la seguridad del sitio"
            ],
            required: true,
            color: "green"
        },
        {
            id: 'analytics',
            icon: <BarChart3 size={24} />,
            title: "Cookies de Análisis",
            description: "Estas cookies nos ayudan a entender cómo los visitantes interactúan con nuestro sitio web, recopilando información de forma anónima. Esto nos permite mejorar continuamente la experiencia del usuario.",
            examples: [
                "Páginas más visitadas",
                "Tiempo de permanencia en el sitio",
                "Errores que puedan ocurrir"
            ],
            required: false,
            color: "blue"
        },
        {
            id: 'marketing',
            icon: <Target size={24} />,
            title: "Cookies de Marketing",
            description: "Estas cookies se utilizan para mostrar anuncios relevantes para ti. También limitan el número de veces que ves un anuncio y ayudan a medir la efectividad de las campañas publicitarias.",
            examples: [
                "Anuncios personalizados",
                "Seguimiento de conversiones",
                "Remarketing en redes sociales"
            ],
            required: false,
            color: "purple"
        }
    ];

    const sections = [
        {
            icon: <Cookie size={24} />,
            title: "¿Qué son las Cookies?",
            content: `Las cookies son pequeños archivos de texto que se almacenan en tu dispositivo (ordenador, tablet o móvil) cuando visitas un sitio web. Se utilizan ampliamente para hacer que los sitios web funcionen de manera más eficiente y proporcionar información a los propietarios del sitio.

Las cookies pueden ser "persistentes" (permanecen en tu dispositivo hasta que las eliminas) o "de sesión" (se eliminan cuando cierras el navegador).`
        },
        {
            icon: <Settings size={24} />,
            title: "¿Cómo Usamos las Cookies?",
            content: `En BiKitchen Food utilizamos cookies para:

• **Funcionamiento del sitio:** Permitir funciones esenciales como el carrito de compras y el proceso de pedido.
• **Recordar preferencias:** Guardar tu configuración de idioma, tema (claro/oscuro) y otras preferencias.
• **Análisis:** Entender cómo los usuarios navegan por nuestro sitio para mejorarlo.
• **Seguridad:** Proteger tu cuenta y prevenir fraudes.`
        },
        {
            icon: <Shield size={24} />,
            title: "Cookies de Terceros",
            content: `Algunas cookies son colocadas por servicios de terceros que aparecen en nuestras páginas:

• **Google Analytics:** Para análisis del tráfico web
• **Redes Sociales:** Botones de compartir en Instagram y Facebook
• **Servicios de Pago:** Para procesar transacciones de forma segura

Estos terceros tienen sus propias políticas de privacidad y cookies.`
        },
        {
            icon: <Settings size={24} />,
            title: "Cómo Gestionar las Cookies",
            content: `Puedes controlar y/o eliminar las cookies según desees. Puedes:

• **Usar el panel de preferencias:** Más abajo en esta página puedes activar o desactivar diferentes tipos de cookies.
• **Configurar tu navegador:** La mayoría de navegadores te permiten rechazar o aceptar cookies, así como eliminar las existentes.
• **Eliminar cookies existentes:** Puedes eliminar todas las cookies que ya están en tu dispositivo.

**Nota:** Si desactivas ciertas cookies, es posible que algunas funciones del sitio no funcionen correctamente.`
        }
    ];

    const browserInstructions = [
        { name: "Chrome", url: "https://support.google.com/chrome/answer/95647" },
        { name: "Firefox", url: "https://support.mozilla.org/es/kb/habilitar-y-deshabilitar-cookies-sitios-web-rastrear-preferencias" },
        { name: "Safari", url: "https://support.apple.com/es-es/guide/safari/sfri11471/mac" },
        { name: "Edge", url: "https://support.microsoft.com/es-es/microsoft-edge/eliminar-cookies-en-microsoft-edge-63947406-40ac-c3b8-57b9-2a946a29ae09" }
    ];

    return (
        <PageTransition>
            <div className="min-h-screen bg-gradient-to-b from-bikitchen-beige to-white">
                <Navbar />
                
                {/* Hero Section */}
                <section className="relative pt-32 pb-16 overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-orange-500/5"></div>
                    <div className="container relative z-10">
                        <Link 
                            to="/" 
                            className="inline-flex items-center gap-2 text-bikitchen-orange hover:text-bikitchen-orange-dark mb-6 transition-colors"
                        >
                            <ArrowLeft size={20} />
                            <span className="font-medium">Volver al inicio</span>
                        </Link>
                        
                        <div className="max-w-3xl">
                            <div className="inline-flex items-center gap-2 bg-amber-500/10 text-amber-600 px-4 py-2 rounded-full text-sm font-semibold mb-6">
                                <Cookie size={16} />
                                Documento Legal
                            </div>
                            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
                                Política de Cookies
                            </h1>
                            <p className="text-lg text-gray-600">
                                Última actualización: {new Date().toLocaleDateString('es-CR', { year: 'numeric', month: 'long', day: 'numeric' })}
                            </p>
                        </div>
                    </div>
                </section>

                {/* Content */}
                <section className="pb-20">
                    <div className="container">
                        <div className="max-w-4xl mx-auto">
                            {/* Cookie Banner Info */}
                            <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-2xl p-6 mb-8 flex items-center gap-4">
                                <div className="w-16 h-16 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
                                    <Cookie size={32} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-lg mb-1">Usamos cookies para mejorar tu experiencia</h3>
                                    <p className="text-white/80 text-sm">
                                        Puedes gestionar tus preferencias en cualquier momento desde esta página.
                                    </p>
                                </div>
                            </div>

                            {/* Main Content */}
                            <div className="bg-white rounded-2xl shadow-xl overflow-hidden mb-8">
                                <div className="p-8 md:p-12 space-y-10">
                                    {sections.map((section, index) => (
                                        <div key={index} className="group">
                                            <div className="flex items-start gap-4 mb-4">
                                                <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-600 flex-shrink-0 group-hover:bg-amber-500 group-hover:text-white transition-colors">
                                                    {section.icon}
                                                </div>
                                                <h2 className="text-xl md:text-2xl font-bold text-gray-900 pt-2">
                                                    {section.title}
                                                </h2>
                                            </div>
                                            <div className="pl-16">
                                                <div className="text-gray-600 whitespace-pre-line leading-relaxed">
                                                    {section.content}
                                                </div>
                                            </div>
                                            {index < sections.length - 1 && (
                                                <div className="border-b border-gray-100 mt-10"></div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Cookie Preferences Panel */}
                            <div className="bg-white rounded-2xl shadow-xl overflow-hidden mb-8">
                                <div className="bg-gradient-to-r from-gray-100 to-gray-50 px-8 py-6 border-b border-gray-200">
                                    <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                                        <Settings size={28} className="text-bikitchen-orange" />
                                        Gestionar Preferencias de Cookies
                                    </h2>
                                    <p className="text-gray-600 mt-2">
                                        Personaliza qué tipos de cookies deseas permitir
                                    </p>
                                </div>

                                <div className="p-8 space-y-6">
                                    {cookieTypes.map((cookie) => (
                                        <div 
                                            key={cookie.id}
                                            className={`border-2 rounded-xl p-6 transition-colors ${
                                                cookiePreferences[cookie.id] 
                                                    ? `border-${cookie.color}-200${cookie.color}-800 bg-${cookie.color}-50/50${cookie.color}-900/20`
                                                    : 'border-gray-200 bg-gray-50'
                                            }`}
                                        >
                                            <div className="flex items-start justify-between gap-4">
                                                <div className="flex items-start gap-4 flex-1">
                                                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                                                        cookie.color === 'green' ? 'bg-green-100 text-green-600' :
                                                        cookie.color === 'blue' ? 'bg-blue-100 text-blue-600' :
                                                        'bg-purple-100 text-purple-600'
                                                    }`}>
                                                        {cookie.icon}
                                                    </div>
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-2 mb-2">
                                                            <h3 className="text-lg font-bold text-gray-900">
                                                                {cookie.title}
                                                            </h3>
                                                            {cookie.required && (
                                                                <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
                                                                    Requerida
                                                                </span>
                                                            )}
                                                        </div>
                                                        <p className="text-gray-600 text-sm mb-3">
                                                            {cookie.description}
                                                        </p>
                                                        <div className="flex flex-wrap gap-2">
                                                            {cookie.examples.map((example, idx) => (
                                                                <span 
                                                                    key={idx}
                                                                    className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-lg"
                                                                >
                                                                    {example}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => handleToggle(cookie.id)}
                                                    disabled={cookie.required}
                                                    className={`flex-shrink-0 transition-colors ${cookie.required ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}
                                                >
                                                    {cookiePreferences[cookie.id] ? (
                                                        <ToggleRight size={40} className="text-green-500" />
                                                    ) : (
                                                        <ToggleLeft size={40} className="text-gray-400" />
                                                    )}
                                                </button>
                                            </div>
                                        </div>
                                    ))}

                                    <button
                                        onClick={savePreferences}
                                        className="w-full bg-bikitchen-orange hover:bg-bikitchen-orange-dark text-white font-bold py-4 px-6 rounded-xl transition-colors flex items-center justify-center gap-2"
                                    >
                                        <Settings size={20} />
                                        Guardar Preferencias
                                    </button>
                                </div>
                            </div>

                            {/* Browser Instructions */}
                            <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
                                <div className="p-8 md:p-12">
                                    <div className="flex items-start gap-4 mb-6">
                                        <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center text-gray-600 flex-shrink-0">
                                            <Info size={24} />
                                        </div>
                                        <div>
                                            <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-2">
                                                Gestionar Cookies en tu Navegador
                                            </h2>
                                            <p className="text-gray-600">
                                                También puedes gestionar las cookies directamente desde la configuración de tu navegador:
                                            </p>
                                        </div>
                                    </div>
                                    
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pl-16">
                                        {browserInstructions.map((browser) => (
                                            <a
                                                key={browser.name}
                                                href={browser.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="bg-gray-50 hover:bg-bikitchen-orange/10:bg-bikitchen-orange/20 border border-gray-200 rounded-xl p-4 text-center transition-colors group"
                                            >
                                                <span className="text-gray-900 font-semibold group-hover:text-bikitchen-orange transition-colors">
                                                    {browser.name}
                                                </span>
                                            </a>
                                        ))}
                                    </div>
                                </div>

                                {/* Contact */}
                                <div className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 p-8 md:p-12">
                                    <h3 className="text-xl font-bold text-gray-900 mb-4">
                                        ¿Tienes preguntas sobre las cookies?
                                    </h3>
                                    <p className="text-gray-600 mb-6">
                                        Si tienes alguna duda sobre cómo utilizamos las cookies, no dudes en contactarnos.
                                    </p>
                                    <a 
                                        href="mailto:bikitchenfood@gmail.com?subject=Consulta sobre Cookies"
                                        className="inline-flex items-center gap-2 bg-amber-500 text-white px-6 py-3 rounded-xl font-semibold hover:bg-amber-600 transition-colors"
                                    >
                                        Contactar
                                    </a>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                <Footer />
            </div>
        </PageTransition>
    );
}
