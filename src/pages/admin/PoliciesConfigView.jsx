import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    FileText, Save, AlertCircle, CheckCircle, RefreshCw,
    Plus, Trash2, ChevronUp, ChevronDown, Shield, Cookie,
    RotateCcw, Edit3, Eye, Loader2
} from 'lucide-react';
import { db } from '../../firebase/config';
import { doc, getDoc, setDoc } from 'firebase/firestore';

// ─── Default content (texto sin íconos, igual que en las páginas públicas) ────

const DEFAULTS = {
    terminos: [
        { title: '1. Aceptación de los Términos', content: 'Al acceder y utilizar el sitio web de BiKitchen Food (en adelante "BiKitchen", "nosotros" o "nuestro"), usted acepta estar sujeto a estos Términos y Condiciones de uso. Si no está de acuerdo con alguna parte de estos términos, le rogamos que no utilice nuestro sitio web ni nuestros servicios.\n\nEstos términos aplican a todos los visitantes, usuarios y clientes que accedan o utilicen nuestro servicio de comida preparada y delivery en Costa Rica.' },
        { title: '2. Descripción del Servicio', content: 'BiKitchen Food es un servicio de preparación y entrega de comida saludable ubicado en Alajuela, Costa Rica. Ofrecemos:\n\n• Packs de comidas semanales, quincenales y mensuales\n• Menús rotativos con ingredientes frescos y de temporada\n• Servicio de delivery en zonas seleccionadas de Costa Rica\n• Opciones personalizadas según requerimientos dietéticos\n\nLos menús se actualizan semanalmente según la disponibilidad de ingredientes frescos y la planificación de nuestro equipo de cocina.' },
        { title: '3. Precios y Pagos', content: '• Todos los precios están expresados en Colones Costarricenses (₡) e incluyen el Impuesto al Valor Agregado (IVA) cuando aplique.\n• Los precios pueden variar sin previo aviso, pero los pedidos confirmados mantendrán el precio acordado al momento de la compra.\n• Aceptamos pagos mediante SINPE Móvil, transferencia bancaria y otros métodos que se indiquen en el proceso de compra.\n• El pago debe realizarse antes de la preparación y entrega del pedido.\n• Los descuentos y promociones tienen condiciones específicas que se indicarán en cada caso.' },
        { title: '4. Entregas y Envíos', content: '• Las entregas se realizan en las zonas de cobertura establecidas. Consulte con nosotros la disponibilidad en su área.\n• Los costos de envío varían según la ubicación y serán informados antes de confirmar el pedido.\n• Los horarios de entrega se coordinarán directamente con el cliente.\n• Es responsabilidad del cliente proporcionar una dirección correcta y estar disponible para recibir el pedido.\n• En caso de no poder recibir el pedido en el horario acordado, debe notificarnos con al menos 2 horas de anticipación.\n• BiKitchen no se hace responsable por retrasos causados por factores externos como tráfico, clima u otras circunstancias fuera de nuestro control.' },
        { title: '5. Cancelaciones y Reembolsos', content: '• Las cancelaciones deben realizarse con al menos 24 horas de anticipación a la fecha de entrega programada.\n• Cancelaciones realizadas con menos de 24 horas de anticipación pueden estar sujetas a cargos parciales.\n• No se aceptan devoluciones de productos alimenticios por razones de seguridad e higiene.\n• En caso de recibir un producto en mal estado o diferente al ordenado, debe notificarnos dentro de las primeras 2 horas después de la entrega para gestionar una solución.\n• Los reembolsos, cuando apliquen, se procesarán en un plazo de 5 a 10 días hábiles.' },
        { title: '6. Alergias e Información Nutricional', content: '• Es responsabilidad del cliente informarnos sobre cualquier alergia alimentaria o restricción dietética antes de realizar su pedido.\n• Aunque tomamos precauciones, nuestras comidas se preparan en una cocina donde se manejan diversos ingredientes, incluyendo alérgenos comunes como gluten, lácteos, huevos, mariscos, frutos secos, entre otros.\n• La información nutricional proporcionada es aproximada y puede variar según los ingredientes disponibles.\n• BiKitchen no se hace responsable por reacciones alérgicas si el cliente no ha informado previamente sobre sus alergias.' },
        { title: '7. Propiedad Intelectual', content: '• Todo el contenido del sitio web, incluyendo textos, imágenes, logos, diseños y código, es propiedad de BiKitchen Food o sus licenciantes.\n• Queda prohibida la reproducción, distribución o uso no autorizado del contenido sin consentimiento previo por escrito.\n• Las recetas y métodos de preparación son propiedad exclusiva de BiKitchen Food.' },
        { title: '8. Limitación de Responsabilidad', content: '• BiKitchen Food no será responsable por daños indirectos, incidentales o consecuentes derivados del uso de nuestros servicios.\n• Nuestra responsabilidad máxima se limita al valor del pedido afectado.\n• No garantizamos que el sitio web esté libre de errores o interrupciones.' },
        { title: '9. Modificaciones', content: 'Nos reservamos el derecho de modificar estos Términos y Condiciones en cualquier momento. Los cambios entrarán en vigor inmediatamente después de su publicación en el sitio web. El uso continuado de nuestros servicios después de cualquier modificación constituye la aceptación de los nuevos términos.' },
        { title: '10. Ley Aplicable', content: 'Estos Términos y Condiciones se rigen por las leyes de la República de Costa Rica. Cualquier disputa será sometida a la jurisdicción de los tribunales de Costa Rica.' },
    ],
    reembolsos: [
        { title: '1. Alcance', content: 'Esta Política de Reembolsos y Cancelaciones aplica a las compras realizadas en BiKitchen Food para nuestros productos y servicios de comida preparada y delivery en Costa Rica.' },
        { title: '2. Cancelaciones y plazos', content: '• Cancelación con ≥ 24 horas antes de la entrega: reembolso completo o crédito a favor.\n• Cancelación con 12–24 horas: reembolso del 50% o crédito del 100% para reprogramar.\n• Cancelación con < 12 horas: no aplica reembolso (puede reprogramarse sujeto a disponibilidad).\n• Pedidos ya en preparación o en ruta: no aplica reembolso.' },
        { title: '3. Planes con múltiples entregas', content: 'Para planes quincenales o mensuales, se podrá solicitar reembolso proporcional por entregas no realizadas, siempre que la solicitud se haga ≥ 24 horas antes de cada fecha programada.' },
        { title: '4. Método de reembolso', content: '• Pagos por tarjeta (p. ej., BAC/TiloPay): reembolso al mismo medio; el plazo depende del emisor (5–10 días hábiles típicamente).\n• SINPE/transferencia: reembolso a la misma cuenta registrada.\n• Cupones o descuentos aplicados: se reembolsan como saldo/cupón, no en efectivo.' },
        { title: '5. Incidencias en el pedido', content: 'Si recibes un producto en mal estado o distinto al solicitado, notifícanos dentro de las primeras 2 horas tras la entrega con evidencia (foto/video). Ofrecemos reposición prioritaria o reembolso según el caso.' },
        { title: '6. Reprogramaciones y créditos', content: 'Podrás reprogramar tu entrega o convertir el monto en crédito para pedidos futuros (cuando aplique y sujeto a agenda y zonas de entrega).' },
        { title: '7. No reembolsables', content: 'No se reembolsan: diferencias por promociones finalizadas, costos de envío ya incurridos, artículos de cortesía y saldos de cupones expirados.' },
        { title: '8. Cómo solicitar un reembolso', content: 'Escríbenos por email a bikitchenfood@gmail.com o WhatsApp +506 8506-7200 indicando: nombre, número de pedido, fecha de entrega y motivo. Nuestro equipo te dará seguimiento en horario laboral.' },
    ],
    privacidad: [
        { title: '1. Introducción', content: 'En BiKitchen Food (en adelante "BiKitchen", "nosotros" o "nuestro"), nos comprometemos a proteger la privacidad de nuestros usuarios y clientes. Esta Política de Privacidad describe cómo recopilamos, usamos, almacenamos y protegemos su información personal cuando utiliza nuestro sitio web y servicios.\n\nAl utilizar nuestros servicios, usted acepta las prácticas descritas en esta política. Le recomendamos leerla detenidamente.' },
        { title: '2. Información que Recopilamos', content: 'Recopilamos diferentes tipos de información para proporcionar y mejorar nuestros servicios:\n\nInformación proporcionada directamente:\n• Nombre completo\n• Número de teléfono\n• Dirección de correo electrónico\n• Dirección de entrega\n• Preferencias alimentarias y alergias\n• Información de pago (procesada de forma segura)\n\nInformación recopilada automáticamente:\n• Dirección IP\n• Tipo de navegador y dispositivo\n• Páginas visitadas y tiempo de permanencia\n• Cookies y tecnologías similares (ver nuestra Política de Cookies)' },
        { title: '3. Uso de la Información', content: 'Utilizamos su información personal para:\n\n• Procesar y entregar sus pedidos\n• Comunicarnos con usted sobre su pedido, promociones y novedades\n• Personalizar su experiencia en nuestro sitio web\n• Mejorar nuestros productos y servicios\n• Enviar información sobre menús semanales y ofertas especiales (con su consentimiento)\n• Cumplir con obligaciones legales y fiscales\n• Prevenir fraudes y garantizar la seguridad de nuestros servicios\n• Responder a sus consultas y solicitudes de soporte' },
        { title: '4. Compartir Información', content: 'No vendemos, alquilamos ni compartimos su información personal con terceros para fines de marketing sin su consentimiento expreso.\n\nPodemos compartir su información con:\n\n• Servicios de entrega: Para coordinar la entrega de sus pedidos\n• Procesadores de pago: Para procesar transacciones de forma segura\n• Proveedores de servicios: Que nos ayudan a operar nuestro negocio (hosting, análisis, etc.)\n• Autoridades legales: Cuando sea requerido por ley o para proteger nuestros derechos\n\nTodos nuestros proveedores están obligados a mantener la confidencialidad de su información.' },
        { title: '5. Seguridad de los Datos', content: 'Implementamos medidas de seguridad técnicas y organizativas para proteger su información personal:\n\n• Encriptación de datos sensibles\n• Acceso restringido a información personal\n• Monitoreo regular de nuestros sistemas\n• Capacitación de nuestro personal en protección de datos\n\nSin embargo, ningún método de transmisión por Internet o almacenamiento electrónico es 100% seguro. Aunque nos esforzamos por proteger su información, no podemos garantizar su seguridad absoluta.' },
        { title: '6. Sus Derechos', content: 'De acuerdo con la legislación costarricense de protección de datos, usted tiene derecho a:\n\n• Acceso: Solicitar una copia de sus datos personales\n• Rectificación: Corregir datos inexactos o incompletos\n• Eliminación: Solicitar la eliminación de sus datos personales\n• Oposición: Oponerse al procesamiento de sus datos para ciertos fines\n• Portabilidad: Recibir sus datos en un formato estructurado\n• Retiro del consentimiento: Retirar su consentimiento en cualquier momento\n\nPara ejercer estos derechos, contáctenos a bikitchenfood@gmail.com' },
        { title: '7. Retención de Datos', content: 'Conservamos su información personal solo durante el tiempo necesario para cumplir con los fines descritos en esta política.\n\n• Datos de pedidos: 5 años (requisitos fiscales)\n• Datos de cuenta: Mientras mantenga una cuenta activa\n• Datos de marketing: Hasta que retire su consentimiento\n\nPuede solicitar la eliminación de sus datos en cualquier momento, sujeto a nuestras obligaciones legales.' },
        { title: '8. Menores de Edad', content: 'Nuestros servicios no están dirigidos a menores de 18 años. No recopilamos intencionalmente información personal de menores. Si descubrimos que hemos recopilado información de un menor sin el consentimiento parental verificable, tomaremos medidas para eliminar esa información.' },
        { title: '9. Enlaces a Terceros', content: 'Nuestro sitio web puede contener enlaces a sitios web de terceros (como redes sociales). No somos responsables de las prácticas de privacidad de estos sitios. Le recomendamos revisar las políticas de privacidad de cualquier sitio que visite.' },
        { title: '10. Cambios a esta Política', content: 'Podemos actualizar esta Política de Privacidad periódicamente. Le notificaremos sobre cambios significativos publicando la nueva política en nuestro sitio web y, cuando sea apropiado, enviándole una notificación por correo electrónico.\n\nLa fecha de "última actualización" al inicio de esta política indica cuándo se realizaron las últimas modificaciones.' },
        { title: '11. Contacto', content: 'Si tiene preguntas, comentarios o solicitudes relacionadas con esta Política de Privacidad o el tratamiento de sus datos personales, puede contactarnos:\n\nBiKitchen Food\n📧 Email: bikitchenfood@gmail.com\n📱 WhatsApp: +506 8506-7200\n📍 Ubicación: Alajuela, Costa Rica' },
    ],
    cookies: [
        { title: '¿Qué son las Cookies?', content: 'Las cookies son pequeños archivos de texto que se almacenan en tu dispositivo (ordenador, tablet o móvil) cuando visitas un sitio web. Se utilizan ampliamente para hacer que los sitios web funcionen de manera más eficiente y proporcionar información a los propietarios del sitio.\n\nLas cookies pueden ser "persistentes" (permanecen en tu dispositivo hasta que las eliminas) o "de sesión" (se eliminan cuando cierras el navegador).' },
        { title: '¿Cómo Usamos las Cookies?', content: 'En BiKitchen Food utilizamos cookies para:\n\n• Funcionamiento del sitio: Permitir funciones esenciales como el carrito de compras y el proceso de pedido.\n• Recordar preferencias: Guardar tu configuración de idioma, tema (claro/oscuro) y otras preferencias.\n• Análisis: Entender cómo los usuarios navegan por nuestro sitio para mejorarlo.\n• Seguridad: Proteger tu cuenta y prevenir fraudes.' },
        { title: 'Cookies de Terceros', content: 'Algunas cookies son colocadas por servicios de terceros que aparecen en nuestras páginas:\n\n• Google Analytics: Para análisis del tráfico web\n• Redes Sociales: Botones de compartir en Instagram y Facebook\n• Servicios de Pago: Para procesar transacciones de forma segura\n\nEstos terceros tienen sus propias políticas de privacidad y cookies.' },
        { title: 'Cómo Gestionar las Cookies', content: 'Puedes controlar y/o eliminar las cookies según desees. Puedes:\n\n• Usar el panel de preferencias: Más abajo en esta página puedes activar o desactivar diferentes tipos de cookies.\n• Configurar tu navegador: La mayoría de navegadores te permiten rechazar o aceptar cookies, así como eliminar las existentes.\n• Eliminar cookies existentes: Puedes eliminar todas las cookies que ya están en tu dispositivo.\n\nNota: Si desactivas ciertas cookies, es posible que algunas funciones del sitio no funcionen correctamente.' },
    ],
};

// ─── Configuración de cada pestaña ────────────────────────────────────────────

const TABS = [
    { id: 'terminos',   label: 'Términos y Condiciones', icon: FileText,  color: 'orange', docKey: 'legal-terminos' },
    { id: 'reembolsos', label: 'Reembolsos',              icon: RefreshCw, color: 'emerald', docKey: 'legal-reembolsos' },
    { id: 'privacidad', label: 'Privacidad',               icon: Shield,    color: 'blue',   docKey: 'legal-privacidad' },
    { id: 'cookies',    label: 'Cookies',                  icon: Cookie,    color: 'amber',  docKey: 'legal-cookies' },
];

const COLOR_MAP = {
    orange:  { tab: 'bg-orange-500 text-white', badge: 'bg-orange-100 text-orange-700', ring: 'ring-orange-300' },
    emerald: { tab: 'bg-emerald-500 text-white', badge: 'bg-emerald-100 text-emerald-700', ring: 'ring-emerald-300' },
    blue:    { tab: 'bg-blue-500 text-white', badge: 'bg-blue-100 text-blue-700', ring: 'ring-blue-300' },
    amber:   { tab: 'bg-amber-500 text-white', badge: 'bg-amber-100 text-amber-700', ring: 'ring-amber-300' },
};

// ─── Componente principal ─────────────────────────────────────────────────────

export default function PoliciesConfigView() {
    const [activeTab, setActiveTab] = useState('terminos');
    // sections per policy, initialized from DEFAULTS
    const [data, setData] = useState(() => {
        const initial = {};
        TABS.forEach(t => { initial[t.id] = DEFAULTS[t.id].map(s => ({ ...s })); });
        return initial;
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [dirty, setDirty] = useState({});          // which tabs have unsaved changes
    const [savedAt, setSavedAt] = useState({});       // last save timestamps
    const [message, setMessage] = useState(null);     // { type: 'success'|'error', text }
    const [confirmReset, setConfirmReset] = useState(false);

    // ── Load all policies from Firestore on mount ────────────────────────────
    useEffect(() => {
        const loadAll = async () => {
            try {
                const results = await Promise.all(
                    TABS.map(t => getDoc(doc(db, 'config', t.docKey)))
                );
                const newData = { ...data };
                const newSavedAt = {};
                results.forEach((snap, i) => {
                    const tabId = TABS[i].id;
                    if (snap.exists() && snap.data().sections?.length > 0) {
                        newData[tabId] = snap.data().sections.map(s => ({ title: s.title || '', content: s.content || '' }));
                    }
                    if (snap.exists() && snap.data().updatedAt) {
                        newSavedAt[tabId] = snap.data().updatedAt;
                    }
                });
                setData(newData);
                setSavedAt(newSavedAt);
            } catch (err) {
                console.error('Error loading policies:', err);
            } finally {
                setLoading(false);
            }
        };
        loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ── Show message helper ──────────────────────────────────────────────────
    const showMessage = (text, type = 'success') => {
        setMessage({ text, type });
        setTimeout(() => setMessage(null), 4000);
    };

    // ── Section CRUD helpers ─────────────────────────────────────────────────
    const markDirty = useCallback(() => {
        setDirty(prev => ({ ...prev, [activeTab]: true }));
    }, [activeTab]);

    const updateSection = (idx, field, value) => {
        setData(prev => {
            const sections = prev[activeTab].map((s, i) =>
                i === idx ? { ...s, [field]: value } : s
            );
            return { ...prev, [activeTab]: sections };
        });
        markDirty();
    };

    const moveSection = (idx, dir) => {
        const sections = [...data[activeTab]];
        const target = idx + dir;
        if (target < 0 || target >= sections.length) return;
        [sections[idx], sections[target]] = [sections[target], sections[idx]];
        setData(prev => ({ ...prev, [activeTab]: sections }));
        markDirty();
    };

    const deleteSection = (idx) => {
        if (data[activeTab].length <= 1) return; // at least 1 section
        setData(prev => ({
            ...prev,
            [activeTab]: prev[activeTab].filter((_, i) => i !== idx)
        }));
        markDirty();
    };

    const addSection = () => {
        setData(prev => ({
            ...prev,
            [activeTab]: [...prev[activeTab], { title: '', content: '' }]
        }));
        markDirty();
        // Scroll to bottom after render
        setTimeout(() => {
            const el = document.getElementById('sections-list');
            if (el) el.scrollTop = el.scrollHeight;
        }, 50);
    };

    // ── Save active tab ──────────────────────────────────────────────────────
    const handleSave = async () => {
        const sections = data[activeTab];
        if (sections.some(s => !s.title.trim())) {
            showMessage('Todas las secciones deben tener un título', 'error');
            return;
        }
        setSaving(true);
        try {
            const tab = TABS.find(t => t.id === activeTab);
            const now = new Date().toISOString();
            await setDoc(doc(db, 'config', tab.docKey), {
                sections: sections.map(s => ({ title: s.title.trim(), content: s.content.trim() })),
                updatedAt: now,
            });
            setDirty(prev => ({ ...prev, [activeTab]: false }));
            setSavedAt(prev => ({ ...prev, [activeTab]: now }));
            showMessage('¡Guardado correctamente! Los cambios ya son visibles en el sitio.', 'success');
        } catch (err) {
            console.error(err);
            showMessage('Error al guardar. Por favor intentá de nuevo.', 'error');
        } finally {
            setSaving(false);
        }
    };

    // ── Reset to defaults ────────────────────────────────────────────────────
    const handleReset = () => {
        setData(prev => ({ ...prev, [activeTab]: DEFAULTS[activeTab].map(s => ({ ...s })) }));
        setDirty(prev => ({ ...prev, [activeTab]: true }));
        setConfirmReset(false);
        showMessage('Contenido restablecido al original. Guardá para aplicar los cambios.', 'success');
    };

    // ─────────────────────────────────────────────────────────────────────────

    const activeTabConfig = TABS.find(t => t.id === activeTab);
    const colors = COLOR_MAP[activeTabConfig.color];
    const sections = data[activeTab];
    const hasDirty = dirty[activeTab];

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 size={32} className="animate-spin text-orange-500" />
            </div>
        );
    }

    return (
        <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6">

            {/* ── Header ────────────────────────────────────────────────── */}
            <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-orange-100 flex items-center justify-center flex-shrink-0">
                    <FileText size={24} className="text-orange-600" />
                </div>
                <div>
                    <h1 className="text-2xl font-black text-gray-900">Políticas Legales</h1>
                    <p className="text-gray-500 text-sm mt-0.5">
                        Editá el contenido de las páginas legales del sitio. Los cambios se publican de inmediato.
                    </p>
                </div>
            </div>

            {/* ── Tabs ──────────────────────────────────────────────────── */}
            <div className="flex flex-wrap gap-2">
                {TABS.map(tab => {
                    const Icon = tab.icon;
                    const isActive = tab.id === activeTab;
                    const isDirtyTab = dirty[tab.id];
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all border ${
                                isActive
                                    ? `${colors.tab} border-transparent shadow-md`
                                    : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                            }`}
                        >
                            <Icon size={16} />
                            {tab.label}
                            {isDirtyTab && (
                                <span className="w-2 h-2 rounded-full bg-amber-400 flex-shrink-0" title="Cambios sin guardar" />
                            )}
                        </button>
                    );
                })}
            </div>

            {/* ── Panel ─────────────────────────────────────────────────── */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">

                {/* Panel header */}
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between gap-4 flex-wrap">
                    <div className="flex items-center gap-3">
                        <activeTabConfig.icon size={20} className="text-gray-500" />
                        <div>
                            <p className="font-bold text-gray-900 text-sm">{activeTabConfig.label}</p>
                            {savedAt[activeTab] ? (
                                <p className="text-xs text-gray-400">
                                    Último guardado: {new Date(savedAt[activeTab]).toLocaleString('es-CR')}
                                </p>
                            ) : (
                                <p className="text-xs text-gray-400">Usando contenido original</p>
                            )}
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {hasDirty && (
                            <span className="text-xs font-semibold text-amber-600 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-lg">
                                Cambios sin guardar
                            </span>
                        )}
                        <a
                            href={`/${activeTab === 'terminos' ? 'terminos' : activeTab === 'reembolsos' ? 'reembolsos' : activeTab === 'privacidad' ? 'privacidad' : 'cookies'}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-800 border border-gray-200 rounded-lg px-2.5 py-1.5 transition-colors"
                        >
                            <Eye size={13} />
                            Ver página
                        </a>
                    </div>
                </div>

                {/* Section list */}
                <div id="sections-list" className="divide-y divide-gray-50 max-h-[60vh] overflow-y-auto">
                    <AnimatePresence initial={false}>
                        {sections.map((section, idx) => (
                            <motion.div
                                key={idx}
                                layout
                                initial={{ opacity: 0, y: -8 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, height: 0 }}
                                transition={{ duration: 0.15 }}
                                className="p-5 space-y-3 hover:bg-gray-50/50 transition-colors"
                            >
                                {/* Section header row */}
                                <div className="flex items-center gap-3">
                                    <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black flex-shrink-0 ${colors.badge}`}>
                                        {idx + 1}
                                    </span>
                                    <input
                                        type="text"
                                        value={section.title}
                                        onChange={e => updateSection(idx, 'title', e.target.value)}
                                        placeholder="Título de la sección..."
                                        className="flex-1 text-sm font-bold text-gray-900 bg-transparent border-0 border-b border-dashed border-gray-200 focus:border-orange-400 focus:outline-none py-1 placeholder:text-gray-300 placeholder:font-normal"
                                    />
                                    {/* Move buttons */}
                                    <div className="flex items-center gap-0.5 flex-shrink-0">
                                        <button
                                            onClick={() => moveSection(idx, -1)}
                                            disabled={idx === 0}
                                            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 disabled:opacity-25 disabled:cursor-not-allowed transition-colors"
                                            title="Subir"
                                        >
                                            <ChevronUp size={15} />
                                        </button>
                                        <button
                                            onClick={() => moveSection(idx, 1)}
                                            disabled={idx === sections.length - 1}
                                            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 disabled:opacity-25 disabled:cursor-not-allowed transition-colors"
                                            title="Bajar"
                                        >
                                            <ChevronDown size={15} />
                                        </button>
                                        <button
                                            onClick={() => deleteSection(idx)}
                                            disabled={sections.length <= 1}
                                            className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 disabled:opacity-25 disabled:cursor-not-allowed transition-colors ml-1"
                                            title="Eliminar sección"
                                        >
                                            <Trash2 size={15} />
                                        </button>
                                    </div>
                                </div>

                                {/* Content textarea */}
                                <textarea
                                    value={section.content}
                                    onChange={e => updateSection(idx, 'content', e.target.value)}
                                    placeholder="Escribí el contenido de esta sección..."
                                    rows={4}
                                    className="w-full text-sm text-gray-700 bg-gray-50 border border-gray-100 focus:border-orange-300 focus:ring-2 focus:ring-orange-100 rounded-xl p-3 resize-y outline-none transition-colors placeholder:text-gray-300 leading-relaxed"
                                />
                                <p className="text-[10px] text-gray-400 text-right">
                                    Tip: Usá • para listas y ↵ para saltos de línea
                                </p>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>

                {/* Add section */}
                <div className="px-5 py-3 border-t border-dashed border-gray-100">
                    <button
                        onClick={addSection}
                        className="flex items-center gap-2 text-sm text-gray-500 hover:text-orange-600 hover:bg-orange-50 px-3 py-2 rounded-xl transition-colors font-medium"
                    >
                        <Plus size={16} />
                        Agregar sección
                    </button>
                </div>

                {/* Footer actions */}
                <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between gap-3 flex-wrap">
                    {/* Restore defaults */}
                    {!confirmReset ? (
                        <button
                            onClick={() => setConfirmReset(true)}
                            className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 transition-colors"
                        >
                            <RotateCcw size={14} />
                            Restaurar contenido original
                        </button>
                    ) : (
                        <div className="flex items-center gap-2 text-sm">
                            <span className="text-amber-700 font-medium">¿Segura? Esto reemplaza todo el contenido de esta página</span>
                            <button
                                onClick={handleReset}
                                className="bg-red-500 text-white px-3 py-1 rounded-lg text-xs font-bold hover:bg-red-600 transition-colors"
                            >
                                Sí, restaurar
                            </button>
                            <button
                                onClick={() => setConfirmReset(false)}
                                className="text-gray-500 px-3 py-1 rounded-lg text-xs border border-gray-200 hover:bg-white transition-colors"
                            >
                                Cancelar
                            </button>
                        </div>
                    )}

                    {/* Save button */}
                    <button
                        onClick={handleSave}
                        disabled={saving || !hasDirty}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${
                            hasDirty
                                ? 'bg-orange-500 hover:bg-orange-600 text-white shadow-md shadow-orange-500/20 active:scale-95'
                                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        }`}
                    >
                        {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                        {saving ? 'Guardando...' : 'Guardar cambios'}
                    </button>
                </div>
            </div>

            {/* ── Toast message ──────────────────────────────────────────── */}
            <AnimatePresence>
                {message && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 20 }}
                        className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-xl text-sm font-semibold ${
                            message.type === 'success'
                                ? 'bg-emerald-500 text-white'
                                : 'bg-red-500 text-white'
                        }`}
                    >
                        {message.type === 'success'
                            ? <CheckCircle size={18} />
                            : <AlertCircle size={18} />
                        }
                        {message.text}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
