import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useWhatsApp } from '../hooks/useWhatsApp';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import PageTransition from '../components/PageTransition';
import { FileText, ArrowLeft, Shield, CreditCard, Truck, RefreshCw, AlertCircle, Scale } from 'lucide-react';
import { db } from '../firebase/config';
import { doc, getDoc } from 'firebase/firestore';

const SECTION_ICONS = [FileText, Shield, CreditCard, Truck, RefreshCw, AlertCircle, Scale, Shield, FileText, Scale];

export default function TerminosPage() {
    const { getWhatsAppUrl } = useWhatsApp();
    const DEFAULT_SECTIONS = [
        {
            icon: <FileText size={24} />,
            title: "1. Aceptación de los Términos",
            content: `Al acceder y utilizar el sitio web de BiKitchen Food (en adelante "BiKitchen", "nosotros" o "nuestro"), usted acepta estar sujeto a estos Términos y Condiciones de uso. Si no está de acuerdo con alguna parte de estos términos, le rogamos que no utilice nuestro sitio web ni nuestros servicios.

Estos términos aplican a todos los visitantes, usuarios y clientes que accedan o utilicen nuestro servicio de comida preparada y delivery en Costa Rica.`
        },
        {
            icon: <Shield size={24} />,
            title: "2. Descripción del Servicio",
            content: `BiKitchen Food es un servicio de preparación y entrega de comida saludable ubicado en Alajuela, Costa Rica. Ofrecemos:

• Packs de comidas semanales, quincenales y mensuales
• Menús rotativos con ingredientes frescos y de temporada
• Servicio de delivery en zonas seleccionadas de Costa Rica
• Opciones personalizadas según requerimientos dietéticos

Los menús se actualizan semanalmente según la disponibilidad de ingredientes frescos y la planificación de nuestro equipo de cocina.`
        },
        {
            icon: <CreditCard size={24} />,
            title: "3. Precios y Pagos",
            content: `• Todos los precios están expresados en Colones Costarricenses (₡) e incluyen el Impuesto al Valor Agregado (IVA) cuando aplique.
• Los precios pueden variar sin previo aviso, pero los pedidos confirmados mantendrán el precio acordado al momento de la compra.
• Aceptamos pagos mediante SINPE Móvil, transferencia bancaria y otros métodos que se indiquen en el proceso de compra.
• El pago debe realizarse antes de la preparación y entrega del pedido.
• Los descuentos y promociones tienen condiciones específicas que se indicarán en cada caso.`
        },
        {
            icon: <Truck size={24} />,
            title: "4. Entregas y Envíos",
            content: `• Las entregas se realizan en las zonas de cobertura establecidas. Consulte con nosotros la disponibilidad en su área.
• Los costos de envío varían según la ubicación y serán informados antes de confirmar el pedido.
• Los horarios de entrega se coordinarán directamente con el cliente.
• Es responsabilidad del cliente proporcionar una dirección correcta y estar disponible para recibir el pedido.
• En caso de no poder recibir el pedido en el horario acordado, debe notificarnos con al menos 2 horas de anticipación.
• BiKitchen no se hace responsable por retrasos causados por factores externos como tráfico, clima u otras circunstancias fuera de nuestro control.`
        },
        {
            icon: <RefreshCw size={24} />,
            title: "5. Cancelaciones y Reembolsos",
            content: `• Las cancelaciones deben realizarse con al menos 24 horas de anticipación a la fecha de entrega programada.
• Cancelaciones realizadas con menos de 24 horas de anticipación pueden estar sujetas a cargos parciales.
• No se aceptan devoluciones de productos alimenticios por razones de seguridad e higiene.
• En caso de recibir un producto en mal estado o diferente al ordenado, debe notificarnos dentro de las primeras 2 horas después de la entrega para gestionar una solución.
• Los reembolsos, cuando apliquen, se procesarán en un plazo de 5 a 10 días hábiles.`
        },
        {
            icon: <AlertCircle size={24} />,
            title: "6. Alergias e Información Nutricional",
            content: `• Es responsabilidad del cliente informarnos sobre cualquier alergia alimentaria o restricción dietética antes de realizar su pedido.
• Aunque tomamos precauciones, nuestras comidas se preparan en una cocina donde se manejan diversos ingredientes, incluyendo alérgenos comunes como gluten, lácteos, huevos, mariscos, frutos secos, entre otros.
• La información nutricional proporcionada es aproximada y puede variar según los ingredientes disponibles.
• BiKitchen no se hace responsable por reacciones alérgicas si el cliente no ha informado previamente sobre sus alergias.`
        },
        {
            icon: <Scale size={24} />,
            title: "7. Propiedad Intelectual",
            content: `• Todo el contenido del sitio web, incluyendo textos, imágenes, logos, diseños y código, es propiedad de BiKitchen Food o sus licenciantes.
• Queda prohibida la reproducción, distribución o uso no autorizado del contenido sin consentimiento previo por escrito.
• Las recetas y métodos de preparación son propiedad exclusiva de BiKitchen Food.`
        },
        {
            icon: <Shield size={24} />,
            title: "8. Limitación de Responsabilidad",
            content: `• BiKitchen Food no será responsable por daños indirectos, incidentales o consecuentes derivados del uso de nuestros servicios.
• Nuestra responsabilidad máxima se limita al valor del pedido afectado.
• No garantizamos que el sitio web esté libre de errores o interrupciones.`
        },
        {
            icon: <FileText size={24} />,
            title: "9. Modificaciones",
            content: `Nos reservamos el derecho de modificar estos Términos y Condiciones en cualquier momento. Los cambios entrarán en vigor inmediatamente después de su publicación en el sitio web. El uso continuado de nuestros servicios después de cualquier modificación constituye la aceptación de los nuevos términos.`
        },
        {
            icon: <Scale size={24} />,
            title: "10. Ley Aplicable",
            content: `Estos Términos y Condiciones se rigen por las leyes de la República de Costa Rica. Cualquier disputa será sometida a la jurisdicción de los tribunales de Costa Rica.`
        }
    ];

    const [sections, setSections] = useState(DEFAULT_SECTIONS);

    useEffect(() => {
        getDoc(doc(db, 'config', 'legal-terminos')).then(snap => {
            if (snap.exists() && snap.data().sections?.length > 0) {
                setSections(snap.data().sections.map((s, i) => {
                    const Icon = SECTION_ICONS[i] || FileText;
                    return { icon: <Icon size={24} />, title: s.title, content: s.content };
                }));
            }
        }).catch(() => {});
    }, []);

    return (
        <PageTransition>
            <div className="min-h-screen bg-gradient-to-b from-bikitchen-beige to-white">
                <Navbar />
                
                {/* Hero Section */}
                <section className="relative pt-32 pb-16 overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-bikitchen-orange/5 to-bikitchen-gold/5"></div>
                    <div className="container relative z-10">
                        <Link 
                            to="/" 
                            className="inline-flex items-center gap-2 text-bikitchen-orange hover:text-bikitchen-orange-dark mb-6 transition-colors"
                        >
                            <ArrowLeft size={20} />
                            <span className="font-medium">Volver al inicio</span>
                        </Link>
                        
                        <div className="max-w-3xl">
                            <div className="inline-flex items-center gap-2 bg-bikitchen-orange/10 text-bikitchen-orange px-4 py-2 rounded-full text-sm font-semibold mb-6">
                                <FileText size={16} />
                                Documento Legal
                            </div>
                            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
                                Términos y Condiciones
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
                            <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
                                <div className="p-8 md:p-12 space-y-10">
                                    {sections.map((section, index) => (
                                        <div key={index} className="group">
                                            <div className="flex items-start gap-4 mb-4">
                                                <div className="w-12 h-12 rounded-xl bg-bikitchen-orange/10 flex items-center justify-center text-bikitchen-orange flex-shrink-0 group-hover:bg-bikitchen-orange group-hover:text-white transition-colors">
                                                    {section.icon}
                                                </div>
                                                <h2 className="text-xl md:text-2xl font-bold text-gray-900 pt-2">
                                                    {section.title}
                                                </h2>
                                            </div>
                                            <div className="pl-16">
                                                <p className="text-gray-600 whitespace-pre-line leading-relaxed">
                                                    {section.content}
                                                </p>
                                            </div>
                                            {index < sections.length - 1 && (
                                                <div className="border-b border-gray-100 mt-10"></div>
                                            )}
                                        </div>
                                    ))}
                                </div>

                                {/* Contact Box */}
                                <div className="bg-gradient-to-r from-bikitchen-orange/10 to-bikitchen-gold/10 p-8 md:p-12">
                                    <h3 className="text-xl font-bold text-gray-900 mb-4">
                                        ¿Tienes preguntas?
                                    </h3>
                                    <p className="text-gray-600 mb-6">
                                        Si tienes alguna duda sobre nuestros términos y condiciones, no dudes en contactarnos.
                                    </p>
                                    <div className="flex flex-wrap gap-4">
                                        <a 
                                            href="mailto:bikitchenfood@gmail.com"
                                            className="inline-flex items-center gap-2 bg-bikitchen-orange text-white px-6 py-3 rounded-xl font-semibold hover:bg-bikitchen-orange-dark transition-colors"
                                        >
                                            Contactar por Email
                                        </a>
                                        <a 
                                            href={getWhatsAppUrl('Hola, tengo una consulta 💬')}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-2 bg-green-500 text-white px-6 py-3 rounded-xl font-semibold hover:bg-green-600 transition-colors"
                                        >
                                            WhatsApp
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
