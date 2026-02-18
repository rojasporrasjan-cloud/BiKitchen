import React from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import PageTransition from '../components/PageTransition';
import { Shield, ArrowLeft, Database, Eye, Lock, Users, Globe, Mail, Trash2, Baby } from 'lucide-react';

export default function PrivacidadPage() {
    const sections = [
        {
            icon: <Shield size={24} />,
            title: "1. Introducción",
            content: `En BiKitchen Food (en adelante "BiKitchen", "nosotros" o "nuestro"), nos comprometemos a proteger la privacidad de nuestros usuarios y clientes. Esta Política de Privacidad describe cómo recopilamos, usamos, almacenamos y protegemos su información personal cuando utiliza nuestro sitio web y servicios.

Al utilizar nuestros servicios, usted acepta las prácticas descritas en esta política. Le recomendamos leerla detenidamente.`
        },
        {
            icon: <Database size={24} />,
            title: "2. Información que Recopilamos",
            content: `Recopilamos diferentes tipos de información para proporcionar y mejorar nuestros servicios:

**Información proporcionada directamente:**
• Nombre completo
• Número de teléfono
• Dirección de correo electrónico
• Dirección de entrega
• Preferencias alimentarias y alergias
• Información de pago (procesada de forma segura)

**Información recopilada automáticamente:**
• Dirección IP
• Tipo de navegador y dispositivo
• Páginas visitadas y tiempo de permanencia
• Cookies y tecnologías similares (ver nuestra Política de Cookies)`
        },
        {
            icon: <Eye size={24} />,
            title: "3. Uso de la Información",
            content: `Utilizamos su información personal para:

• Procesar y entregar sus pedidos
• Comunicarnos con usted sobre su pedido, promociones y novedades
• Personalizar su experiencia en nuestro sitio web
• Mejorar nuestros productos y servicios
• Enviar información sobre menús semanales y ofertas especiales (con su consentimiento)
• Cumplir con obligaciones legales y fiscales
• Prevenir fraudes y garantizar la seguridad de nuestros servicios
• Responder a sus consultas y solicitudes de soporte`
        },
        {
            icon: <Users size={24} />,
            title: "4. Compartir Información",
            content: `No vendemos, alquilamos ni compartimos su información personal con terceros para fines de marketing sin su consentimiento expreso.

Podemos compartir su información con:

• **Servicios de entrega:** Para coordinar la entrega de sus pedidos
• **Procesadores de pago:** Para procesar transacciones de forma segura
• **Proveedores de servicios:** Que nos ayudan a operar nuestro negocio (hosting, análisis, etc.)
• **Autoridades legales:** Cuando sea requerido por ley o para proteger nuestros derechos

Todos nuestros proveedores están obligados a mantener la confidencialidad de su información.`
        },
        {
            icon: <Lock size={24} />,
            title: "5. Seguridad de los Datos",
            content: `Implementamos medidas de seguridad técnicas y organizativas para proteger su información personal:

• Encriptación de datos sensibles
• Acceso restringido a información personal
• Monitoreo regular de nuestros sistemas
• Capacitación de nuestro personal en protección de datos

Sin embargo, ningún método de transmisión por Internet o almacenamiento electrónico es 100% seguro. Aunque nos esforzamos por proteger su información, no podemos garantizar su seguridad absoluta.`
        },
        {
            icon: <Globe size={24} />,
            title: "6. Sus Derechos",
            content: `De acuerdo con la legislación costarricense de protección de datos, usted tiene derecho a:

• **Acceso:** Solicitar una copia de sus datos personales
• **Rectificación:** Corregir datos inexactos o incompletos
• **Eliminación:** Solicitar la eliminación de sus datos personales
• **Oposición:** Oponerse al procesamiento de sus datos para ciertos fines
• **Portabilidad:** Recibir sus datos en un formato estructurado
• **Retiro del consentimiento:** Retirar su consentimiento en cualquier momento

Para ejercer estos derechos, contáctenos a bikitchenfood@gmail.com`
        },
        {
            icon: <Trash2 size={24} />,
            title: "7. Retención de Datos",
            content: `Conservamos su información personal solo durante el tiempo necesario para cumplir con los fines descritos en esta política, a menos que la ley requiera o permita un período de retención más largo.

• **Datos de pedidos:** 5 años (requisitos fiscales)
• **Datos de cuenta:** Mientras mantenga una cuenta activa
• **Datos de marketing:** Hasta que retire su consentimiento

Puede solicitar la eliminación de sus datos en cualquier momento, sujeto a nuestras obligaciones legales.`
        },
        {
            icon: <Baby size={24} />,
            title: "8. Menores de Edad",
            content: `Nuestros servicios no están dirigidos a menores de 18 años. No recopilamos intencionalmente información personal de menores. Si descubrimos que hemos recopilado información de un menor sin el consentimiento parental verificable, tomaremos medidas para eliminar esa información.`
        },
        {
            icon: <Globe size={24} />,
            title: "9. Enlaces a Terceros",
            content: `Nuestro sitio web puede contener enlaces a sitios web de terceros (como redes sociales). No somos responsables de las prácticas de privacidad de estos sitios. Le recomendamos revisar las políticas de privacidad de cualquier sitio que visite.`
        },
        {
            icon: <Mail size={24} />,
            title: "10. Cambios a esta Política",
            content: `Podemos actualizar esta Política de Privacidad periódicamente. Le notificaremos sobre cambios significativos publicando la nueva política en nuestro sitio web y, cuando sea apropiado, enviándole una notificación por correo electrónico.

La fecha de "última actualización" al inicio de esta política indica cuándo se realizaron las últimas modificaciones.`
        },
        {
            icon: <Mail size={24} />,
            title: "11. Contacto",
            content: `Si tiene preguntas, comentarios o solicitudes relacionadas con esta Política de Privacidad o el tratamiento de sus datos personales, puede contactarnos:

**BiKitchen Food**
📧 Email: bikitchenfood@gmail.com
📱 WhatsApp: +506 8506-7200
📍 Ubicación: Alajuela, Costa Rica`
        }
    ];

    return (
        <PageTransition>
            <div className="min-h-screen bg-gradient-to-b from-bikitchen-beige to-white">
                <Navbar />
                
                {/* Hero Section */}
                <section className="relative pt-32 pb-16 overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5"></div>
                    <div className="container relative z-10">
                        <Link 
                            to="/" 
                            className="inline-flex items-center gap-2 text-bikitchen-orange hover:text-bikitchen-orange-dark mb-6 transition-colors"
                        >
                            <ArrowLeft size={20} />
                            <span className="font-medium">Volver al inicio</span>
                        </Link>
                        
                        <div className="max-w-3xl">
                            <div className="inline-flex items-center gap-2 bg-blue-500/10 text-blue-600 px-4 py-2 rounded-full text-sm font-semibold mb-6">
                                <Shield size={16} />
                                Documento Legal
                            </div>
                            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
                                Política de Privacidad
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
                            {/* Trust Badge */}
                            <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-2xl p-6 mb-8 flex items-center gap-4">
                                <div className="w-16 h-16 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
                                    <Lock size={32} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-lg mb-1">Tu privacidad es nuestra prioridad</h3>
                                    <p className="text-white/80 text-sm">
                                        Nos comprometemos a proteger tus datos personales y ser transparentes sobre cómo los utilizamos.
                                    </p>
                                </div>
                            </div>

                            <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
                                <div className="p-8 md:p-12 space-y-10">
                                    {sections.map((section, index) => (
                                        <div key={index} className="group">
                                            <div className="flex items-start gap-4 mb-4">
                                                <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-600 flex-shrink-0 group-hover:bg-blue-500 group-hover:text-white transition-colors">
                                                    {section.icon}
                                                </div>
                                                <h2 className="text-xl md:text-2xl font-bold text-gray-900 pt-2">
                                                    {section.title}
                                                </h2>
                                            </div>
                                            <div className="pl-16">
                                                <div className="text-gray-600 whitespace-pre-line leading-relaxed prose prose-strong:text-gray-900:text-white">
                                                    {section.content}
                                                </div>
                                            </div>
                                            {index < sections.length - 1 && (
                                                <div className="border-b border-gray-100 mt-10"></div>
                                            )}
                                        </div>
                                    ))}
                                </div>

                                {/* Contact Box */}
                                <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 p-8 md:p-12">
                                    <h3 className="text-xl font-bold text-gray-900 mb-4">
                                        Ejercer tus derechos
                                    </h3>
                                    <p className="text-gray-600 mb-6">
                                        Si deseas acceder, rectificar o eliminar tus datos personales, contáctanos y te atenderemos a la brevedad.
                                    </p>
                                    <div className="flex flex-wrap gap-4">
                                        <a 
                                            href="mailto:bikitchenfood@gmail.com?subject=Solicitud de Privacidad"
                                            className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-blue-700 transition-colors"
                                        >
                                            <Mail size={18} />
                                            Enviar Solicitud
                                        </a>
                                    </div>
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
