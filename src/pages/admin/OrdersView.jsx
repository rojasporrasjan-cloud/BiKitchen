import React, { useState, useMemo, useEffect } from 'react';
import { parseDateStr, getScheduleFromOrder } from '../../utils/orderDates';
import {
    Search,
    Package,
    DollarSign,
    Calendar,
    X,
    User,
    Phone,
    MapPin,
    Clock,
    CheckCircle,
    AlertCircle,
    FileText,
    Printer,
    Download,
    Eye,
    CreditCard,
    Truck,
    ShoppingBag,
    MessageCircle,
    History,
    ChevronDown,
    Filter,
    Copy,
    CalendarDays,
    Plus,
    Trash2,
    ClipboardList,
    UserPlus,
    TrendingUp
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useOrders } from '../../context/OrdersContext';
import { individualesData, INDIVIDUALES_CATEGORIES } from '../../data/individualesData';
import { PACKS_DATA } from '../../data/packsData';
import { getPackPrices } from '../../utils/firestoreMenus';
import AdminPageHeader from '../../components/admin/AdminPageHeader';
import { useSearchParams } from 'react-router-dom';
import { db } from '../../firebase/config';
import { collection, query, where, getDocs, addDoc, updateDoc, doc, increment, getDoc, limit } from 'firebase/firestore';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useMenus } from '../../context/MenusContext';
import { useAuth } from '../../context/AuthContext';
import { useShipping } from '../../context/ShippingContext';
import ClientProfileModal from '../../components/admin/ClientProfileModal';
import { parseFirebaseDate } from '../../utils/dateUtils';

// Generar próximas fechas de entrega disponibles (lógica mirror de Checkout)
const getNextDeliveryDatesForZone = (zoneId) => {
    if (!zoneId) return [];

    // Reglas simples por zona (hardcoded para admin mirror, idealmente de config)
    // GAM: Lunes, Miércoles, Viernes (o Sabado, revisar checkout) -> Checkout dice Lunes(1), Miercoles(3), Sabado(6)
    // Cartago: Solo Miercoles(3)? O Sabado? -> Checkout no distingue por zona en el helper general, pero Admin quizás quiera.
    // Usaremos la lógica general de Checkout: Lunes, Miércoles, Sábado

    const dates = [];
    const now = new Date();
    const deliveryDays = [1, 3, 6]; // Lunes=1, Miércoles=3, Sábado=6

    // Función para obtener la fecha límite de pedido
    const getDeadline = (deliveryDate) => {
        const deadline = new Date(deliveryDate);
        deadline.setHours(22, 0, 0, 0); // 10:00 PM del día límite

        const day = deliveryDate.getDay();
        if (day === 1) { // Lunes -> Viernes anterior
            deadline.setDate(deliveryDate.getDate() - 3);
        } else if (day === 3) { // Miércoles -> Lunes anterior
            deadline.setDate(deliveryDate.getDate() - 2);
        } else if (day === 6) { // Sábado -> Jueves anterior
            deadline.setDate(deliveryDate.getDate() - 2);
        }
        return deadline;
    };

    for (let i = 0; i < 21; i++) { // Próximos 21 días
        const date = new Date(now);
        date.setDate(now.getDate() + i);
        date.setHours(0, 0, 0, 0);

        if (deliveryDays.includes(date.getDay())) {
            // Nota: Para admin, quizás queramos ignorar el deadline strict para poder agendar fuerza mayor?
            // Pero el usuario pidió "lógica como checkout".
            // Aun así, Admin debería poder agendar para "mañana" aunque haya pasado el deadline si es necesario.
            // Dejaremos pasar todas las fechas futuras para admin.

            if (date >= now) {
                const value = date.getFullYear() + '-' +
                    String(date.getMonth() + 1).padStart(2, '0') + '-' +
                    String(date.getDate()).padStart(2, '0');

                const blockedDates = [];
                if (blockedDates.includes(value)) {
                    continue; // Saltar esta fecha
                }

                dates.push({
                    value: value,
                    dayName: date.toLocaleDateString('es-CR', { weekday: 'long' }),
                    dayNumber: date.getDate(),
                    month: date.toLocaleDateString('es-CR', { month: 'short' })
                });
            }
        }
    }
    return dates.slice(0, 6); // Max 6 opciones
};


// Datos de Packs por defecto para pedidos manuales
const DEFAULT_PACKS_DATA = {
    '5_comidas': {
        title: '5 Comidas',
        subtitle: 'Lunes a Viernes',
        icon: '🥗',
        packs: [
            { name: 'Pack Sin Carbos', desc: 'Proteína + vegetales', icon: '🥩', weekly: 22000, biweekly: 42000, monthly: 78000 },
            { name: 'Pack Bajo Calorías', desc: 'Balanceado y ligero', icon: '🥗', weekly: 23000, biweekly: 44000, monthly: 80000 },
            { name: 'Pack Regular', desc: 'Comida completa', icon: '🍱', weekly: 24000, biweekly: 45500, monthly: 82000 },
            { name: 'Pack Casaditos', desc: 'Estilo tradicional', icon: '🍚', weekly: 25000, biweekly: 47000, monthly: 85000 },
            { name: 'Full Pack', desc: 'Máxima variedad', icon: '🍽️', weekly: 27000, biweekly: 49000, monthly: 88000 },
            { name: 'Pack Vegetariano', desc: 'Plant-based', icon: '🥦', weekly: 23500, biweekly: 44500, monthly: 81000 },
            { name: 'Pack Keto', desc: 'Alto en grasas', icon: '🥑', weekly: 26000, biweekly: 48000, monthly: 86000 }
        ]
    },
    '10_comidas': {
        title: '10 Comidas',
        subtitle: 'Almuerzo y Cena',
        icon: '🍗',
        packs: [
            { name: 'Pack Sin Carbos', desc: 'Proteína + vegetales', icon: '🥩', weekly: 40000, biweekly: 75000, monthly: 142000 },
            { name: 'Pack Bajo Calorías', desc: 'Balanceado y ligero', icon: '🥗', weekly: 42000, biweekly: 78000, monthly: 148000 },
            { name: 'Pack Regular', desc: 'Comida completa', icon: '🍱', weekly: 43500, biweekly: 80000, monthly: 150000 },
            { name: 'Pack Casaditos', desc: 'Estilo tradicional', icon: '🍚', weekly: 45000, biweekly: 82000, monthly: 154000 },
            { name: 'Full Pack', desc: 'Máxima variedad', icon: '🍽️', weekly: 47000, biweekly: 86000, monthly: 158000 },
            { name: 'Pack Vegetariano', desc: 'Plant-based', icon: '🥦', weekly: 41500, biweekly: 77000, monthly: 145000 },
            { name: 'Pack Keto', desc: 'Alto en grasas', icon: '🥑', weekly: 46000, biweekly: 84000, monthly: 156000 }
        ]
    },
    '15_comidas': {
        title: '15 Comidas',
        subtitle: 'Desayuno, Almuerzo y Cena',
        icon: '🌅',
        packs: [
            { name: 'Pack Sin Carbos', desc: 'Proteína + vegetales', icon: '🥩', weekly: 65000, biweekly: 120000, monthly: 228000 },
            { name: 'Pack Bajo Calorías', desc: 'Balanceado y ligero', icon: '🥗', weekly: 68000, biweekly: 126000, monthly: 240000 },
            { name: 'Pack Regular', desc: 'Comida completa', icon: '🍱', weekly: 70000, biweekly: 130000, monthly: 248000 },
            { name: 'Pack Casaditos', desc: 'Estilo tradicional', icon: '🍚', weekly: 72000, biweekly: 134000, monthly: 256000 },
            { name: 'Pack Vegetariano', desc: 'Plant-based', icon: '🥦', weekly: 67000, biweekly: 122000, monthly: 235000 },
            { name: 'Pack Keto', desc: 'Alto en grasas', icon: '🥑', weekly: 74000, biweekly: 136000, monthly: 258000 }
        ]
    },
    'two_pack': {
        title: 'Two Pack',
        subtitle: '2 personas - 5 comidas c/u',
        icon: '👥',
        packs: [
            { name: 'Pack Sin Carbos', desc: 'Proteína + vegetales', icon: '🥩', weekly: 40000, biweekly: 75000, monthly: 142000 },
            { name: 'Pack Bajo Calorías', desc: 'Balanceado y ligero', icon: '🥗', weekly: 42000, biweekly: 78000, monthly: 148000 },
            { name: 'Pack Regular', desc: 'Comida completa', icon: '🍱', weekly: 43500, biweekly: 80000, monthly: 150000 },
            { name: 'Pack Casaditos', desc: 'Estilo tradicional', icon: '🍚', weekly: 45000, biweekly: 82000, monthly: 154000 },
            { name: 'Full Pack', desc: 'Máxima variedad', icon: '🍽️', weekly: 47000, biweekly: 86000, monthly: 158000 },
            { name: 'Pack Vegetariano', desc: 'Plant-based', icon: '🥦', weekly: 41500, biweekly: 77000, monthly: 145000 },
            { name: 'Pack Keto', desc: 'Alto en grasas', icon: '🥑', weekly: 46000, biweekly: 84000, monthly: 156000 }
        ]
    }
};

// Estados de pedido unificados (consistente con DeliveryView)
const ORDER_STATUS = {
    pending_payment: { label: '💳 Pago Pendiente', color: 'bg-orange-100 text-orange-700', icon: CreditCard },
    payment_failed: { label: '❌ Pago Fallido', color: 'bg-red-100 text-red-700', icon: AlertCircle },
    pending: { label: 'Pendiente', color: 'bg-yellow-100 text-yellow-700', icon: Clock },
    confirmed: { label: '✅ Confirmado', color: 'bg-blue-100 text-blue-700', icon: CheckCircle },
    in_transit: { label: 'En Ruta', color: 'bg-purple-100 text-purple-700', icon: Truck },
    delivered: { label: 'Entregado', color: 'bg-green-100 text-green-700', icon: CheckCircle },
    cancelled: { label: 'Cancelado', color: 'bg-red-100 text-red-700', icon: AlertCircle }
};

// Filtros disponibles
const FILTER_OPTIONS = [
    { id: 'all', label: 'Todos' },
    { id: 'pending_payment', label: '💳 Pago Pendiente' },
    { id: 'payment_failed', label: '❌ Pago Fallido' },
    { id: 'pending', label: 'Pendientes' },
    { id: 'confirmed', label: 'Confirmados' },
    { id: 'in_transit', label: 'En Ruta' },
    { id: 'delivered', label: 'Entregados' },
    { id: 'cancelled', label: 'Cancelados' },
    { id: 'pending_shipments', label: 'Envíos pendientes' }
];

// Filtros de fecha
const DATE_FILTERS = [
    { id: 'all', label: 'Todas las fechas' },
    { id: 'today', label: 'Hoy' },
    { id: 'week', label: 'Esta semana' },
    { id: 'month', label: 'Este mes' }
];

export default function OrdersView() {
    const { SHIPPING_ZONES } = useShipping();
    const { orders, updateOrderStatus, addOrder, getStats, formatTotal, deleteAllOrders, deleteOrder, loading } = useOrders();
    const { currentUser } = useAuth();
    // Use menus for individual products
    const { menus } = useMenus();
    const [searchParams] = useSearchParams();

    const [selectedOrder, setSelectedOrder] = useState(null);
    const [showErrorModal, setShowErrorModal] = useState(false);
    const [selectedError, setSelectedError] = useState(null);
    const [showDateDropdown, setShowDateDropdown] = useState(false);
    const [isSyncingNMI, setIsSyncingNMI] = useState(false);
    const [showManualOrderModal, setShowManualOrderModal] = useState(false);
    const [manualOrderData, setManualOrderData] = useState({
        clientName: '',
        phone: '',
        address: '',
        notes: '',
        paymentMethod: 'Efectivo',
        deliveryDate: '', // New field for scheduled delivery
        discount: 0,
        discountType: 'percentage', // 'percentage' | 'amount'
        items: []
    });
    const [productSearch, setProductSearch] = useState('');
    const [showProductDropdown, setShowProductDropdown] = useState(false);
    const [clientSearchTerm, setClientSearchTerm] = useState('');
    const [showClientSuggestions, setShowClientSuggestions] = useState(false);
    const [orderType, setOrderType] = useState('packs'); // 'packs' o 'individuales'
    const [selectedPackCategory, setSelectedPackCategory] = useState('5_comidas');
    const [selectedPlan, setSelectedPlan] = useState('weekly'); // 'weekly', 'biweekly', 'monthly'
    const [packsData, setPacksData] = useState(DEFAULT_PACKS_DATA);
    const [customerHistory, setCustomerHistory] = useState(null); // Historial del cliente
    const [loadingHistory, setLoadingHistory] = useState(false);
    const [showClientProfile, setShowClientProfile] = useState(false);
    const [clientProfile, setClientProfile] = useState(null);
    const [clientPoints, setClientPoints] = useState(null);
    const [clientRelatedOrders, setClientRelatedOrders] = useState([]);
    const [isRepairing, setIsRepairing] = useState(false);

    const stats = getStats();
    // Normalizador de nombres (remueve acentos y palabras Pack/Menú)
    const normalizeName = (s) => {
        if (!s) return '';
        return s.toString()
            .toLowerCase()
            .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
            .replace(/\b(pack|menu|menu)\b/g, '')
            .replace(/\s+/g, ' ')
            .trim();
    };

    const syncNMIHistory = async () => {
        setIsSyncingNMI(true);
        try {
            const approved = [
                "ORD-VRU3F", "ORD-XDT3C", "ORD-XE150", "ORD-YWT2", "ORD-ZK77F", "ORD-ZNF7Y", "ORD-1SPW", "ORD-46CCE", "ORD-4E4ZV", "ORD-5C2PF", "ORD-5K5JS", "ORD-79T6C", "ORD-7EMO", "ORD-8PPDV", "ORD-8YIHR", "ORD-B9R11", "ORD-BJ87I", "ORD-D108C", "ORD-HBSIV", "ORD-IGPG1", "ORD-LKBDF", "ORD-LOFV",
                "ORD-3AXI1", "ORD-K6BY4", "ORD-GVWH", "ORD-IR109", "ORD-JOU24", "ORD-O6H44", "ORD-KYAT4", "ORD-YSOQ", "ORD-XQ8W", "ORD-JVR25", "ORD-00T39", "ORD-39749", "ORD-XIK82", "ORD-0HTS7", "ORD-OIDV4", "ORD-VKN52", "ORD-1CBO5", "ORD-TZ5Q7", "ORD-N7ZU8", "ORD-PHUM", "ORD-R8G0Y", "ORD-RHPN0", "ORD-RLF5F", "ORD-T0RW"
            ];
            const failed = {
                "ORD-VGKH": "INVALID CARD", "ORD-VY734": "RES NEGATIVE IN SECURITY CODE", "ORD-ZIRLX": "DENIED INSUFFICIENT FUNDS",
                "ORD-058PI": "RES NEGATIVE IN SECURITY CODE", "ORD-43ORI": "RES NEGATIVE IN SECURITY CODE", "ORD-KCUH": "INVALID CARD",
                "ORD-LIVJF2": "EXPIRED CARD", "ORD-LKU2V": "CALL ISSUER", "ORD-LL1YE": "CALL ISSUER",
                "ORD-P9W2": "INVALID SECURITY CODE", "ORD-VEAZ3": "INVALID SECURITY CODE", "ORD-BN3E2": "INVALID CARD",
                "ORD-53V12": "INVALID CARD", "ORD-YW8C": "CALL ISSUER", "ORD-9IFW6": "INVALID SECURITY CODE",
                "ORD-SF267": "RES NEGATIVE IN SECURITY CODE", "ORD-UDR13": "INVALID CARD", "ORD-YB2R1": "CALL ISSUER",
                "ORD-2EQ63": "CALL ISSUER", "ORD-K91H1": "CALL ISSUER", "ORD-DUI18": "INVALID SECURITY CODE", "ORD-RKR9J": "INVALID CARD"
            };

            let updatedCount = 0;
            for (const order of orders) {
                if (order.status !== 'pending_payment' && order.status !== 'pending') continue;
                
                const rawId = (order.displayId || order.numeroOrden || order.id || '').toUpperCase();
                
                const isApproved = approved.some(id => rawId.includes(id.replace('ORD-', '')));
                if (isApproved) {
                    await updateOrderStatus(order.id, 'confirmed', { paymentStatus: 'paid', pendingReason: 'Pago recuperado (Automático)' });
                    updatedCount++;
                } else {
                    const failedId = Object.keys(failed).find(id => rawId.includes(id.replace('ORD-', '')));
                    if (failedId) {
                        await updateOrderStatus(order.id, 'payment_failed', { paymentStatus: 'failed', paymentError: failed[failedId], isPaymentError: true });
                        updatedCount++;
                    }
                }
            }
            alert(`Sincronización completa. Se actualizaron ${updatedCount} pedidos históricos.`);
        } catch (e) {
            console.error(e);
            alert('Error sincronizando historial');
        } finally {
            setIsSyncingNMI(false);
        }
    };

    const openClientProfile = async (order) => {
        try {
            const nombre = order.client || order.cliente || '';
            const telefonoRaw = order.details?.phone || order.telefono || '';
            const telefono = (telefonoRaw || '').replace(/[^0-9]/g, '');
            const correo = (order.details?.email || order.correo || '').toLowerCase();
            const direccion = order.details?.address || order.direccion || '';

            const related = orders.filter(o => {
                const op = (o.details?.phone || o.telefono || '').replace(/[^0-9]/g, '');
                const oc = (o.details?.email || o.correo || '').toLowerCase();
                if (telefono && op) return op === telefono;
                if (correo && oc) return oc === correo;
                const on = (o.client || o.cliente || '').toLowerCase();
                return on === (nombre || '').toLowerCase();
            });

            const totalOrders = related.length;
            const totalSpent = related.reduce((acc, o) => acc + (typeof o.totalValue === 'number' ? o.totalValue : (typeof o.total === 'number' ? o.total : 0)), 0);
            const deliveredOrders = related.filter(o => o.status === 'delivered' || o.deliveryStatus === 'delivered').length;
            const coupons = Array.from(new Set(related.map(o => o.cupon || o.coupon || o.details?.coupon).filter(Boolean)));

            let puntos = null;
            if (correo) {
                try {
                    const lpRef = doc(db, 'loyalty_points', correo);
                    const lpSnap = await getDoc(lpRef);
                    if (lpSnap.exists()) puntos = lpSnap.data();
                } catch { }
            }

            let clienteDb = null;
            try {
                if (telefono) {
                    const q1 = query(collection(db, 'clientes'), where('telefono', '==', telefono), limit(1));
                    const s1 = await getDocs(q1);
                    if (!s1.empty) clienteDb = { id: s1.docs[0].id, ...s1.docs[0].data() };
                }
                if (!clienteDb && correo) {
                    const q2 = query(collection(db, 'clientes'), where('correo', '==', correo), limit(1));
                    const s2 = await getDocs(q2);
                    if (!s2.empty) clienteDb = { id: s2.docs[0].id, ...s2.docs[0].data() };
                }
            } catch { }

            setClientRelatedOrders(related);
            setClientPoints(puntos);
            setClientProfile({ nombre, telefono, correo, direccion, totalOrders, totalSpent, deliveredOrders, coupons, clienteDb });
            setShowClientProfile(true);
        } catch {
            alert('No se pudo abrir el perfil');
        }
    };
    // Mapa rápido de packs del Two Pack por nombre para detección basada en precio
    const twoPackList = useMemo(() => PACKS_DATA?.['two_pack']?.packs || [], []);
    const twoPackByNormName = useMemo(() => {
        const map = {};
        twoPackList.forEach(p => { map[normalizeName(p.name)] = p; });
        return map;
    }, [twoPackList]);

    // Mapa de gramos de proteína por nombre de pack (de todos los grupos)
    const proteinByNormName = useMemo(() => {
        const map = {};
        try {
            Object.keys(PACKS_DATA || {}).forEach(catKey => {
                const packs = PACKS_DATA[catKey]?.packs || [];
                packs.forEach(p => {
                    const m = (p.desc || '').match(/([0-9]+)\s*g/i);
                    if (m) map[normalizeName(p.name)] = `${m[1]}g`;
                });
            });
        } catch { }
        return map;
    }, []);

    // Cargar historial del cliente cuando se selecciona un pedido
    useEffect(() => {
        if (!selectedOrder) {
            setCustomerHistory(null);
            return;
        }

        const loadCustomerHistory = () => {
            setLoadingHistory(true);

            // Buscar pedidos del mismo cliente por teléfono o nombre
            const customerPhone = selectedOrder.details?.phone || selectedOrder.telefono;
            const customerName = selectedOrder.client || selectedOrder.cliente;

            const customerOrders = orders.filter(order => {
                const orderPhone = order.details?.phone || order.telefono;
                const orderName = order.client || order.cliente;

                // Coincidir por teléfono (más confiable) o por nombre exacto
                if (customerPhone && orderPhone) {
                    return orderPhone.replace(/[^0-9]/g, '') === customerPhone.replace(/[^0-9]/g, '');
                }
                return orderName?.toLowerCase() === customerName?.toLowerCase();
            });

            // Calcular estadísticas
            const totalOrders = customerOrders.length;
            const totalSpent = customerOrders.reduce((acc, order) => {
                const total = typeof order.totalValue === 'number' ? order.totalValue :
                    typeof order.total === 'number' ? order.total : 0;
                return acc + total;
            }, 0);

            const deliveredOrders = customerOrders.filter(o =>
                o.status === 'delivered' || o.deliveryStatus === 'delivered'
            ).length;

            // Obtener fecha del primer pedido
            const sortedByDate = [...customerOrders].sort((a, b) => {
                const dateA = a.createdAt?.toDate?.() || new Date(a.createdAt || 0);
                const dateB = b.createdAt?.toDate?.() || new Date(b.createdAt || 0);
                return dateA - dateB;
            });
            const firstOrderDate = sortedByDate[0]?.createdAt;

            setCustomerHistory({
                totalOrders,
                totalSpent,
                deliveredOrders,
                firstOrderDate,
                isNewCustomer: totalOrders <= 1,
                isFrequent: totalOrders >= 5,
                recentOrders: customerOrders
                    .filter(o => o.id !== selectedOrder.id)
                    .slice(0, 3)
            });
            setLoadingHistory(false);
        };

        loadCustomerHistory();
    }, [selectedOrder, orders]);

    // Obtener zonas únicas de los pedidos
    const uniqueZones = useMemo(() => {
        const zones = new Set();
        orders.forEach(order => {
            const zona = order.zona_envio || order.details?.zona;
            if (zona) zones.add(zona);
        });
        return ['all', ...Array.from(zones)].sort();
    }, [orders]);

    // Extraer clientes únicos para el autocompletado
    const uniqueClients = useMemo(() => {
        const clientsMap = {};
        orders.forEach(order => {
            const phone = order.telefono || order.details?.phone;
            const name = order.cliente || order.client || order.details?.clientName;
            if (phone && name) {
                const createdAt = order.createdAt?.toDate?.()?.getTime() || new Date(order.createdAt || 0).getTime();
                if (!clientsMap[phone] || (createdAt > clientsMap[phone].createdAt)) {
                    clientsMap[phone] = {
                        name,
                        phone,
                        address: order.direccion || order.details?.address || '',
                        zoneId: order.zona_envio || order.details?.zoneId || '',
                        zoneName: order.zona_nombre || order.details?.zoneName || '',
                        createdAt
                    };
                }
            }
        });
        return Object.values(clientsMap);
    }, [orders]);

    // Manejador para duplicar un pedido existente
    const handleDuplicateOrder = (order) => {
        setManualOrderData({
            clientName: order.cliente || order.client || order.details?.clientName || '',
            phone: order.telefono || order.details?.phone || '',
            address: order.direccion || order.details?.address || '',
            paymentMethod: order.metodo_pago || order.paymentMethod || 'Efectivo',
            deliveryDate: '', // Siempre requerir nueva fecha
            zoneId: order.zona_envio || order.details?.zoneId || '',
            zoneName: order.zona_nombre || order.details?.zoneName || '',
            shippingCost: order.costo_envio !== undefined ? order.costo_envio : (order.details?.shippingCost || 0),
            discount: order.descuento || order.details?.discount || 0,
            discountType: order.discountType || 'percentage',
            notes: order.observaciones || order.details?.notes || '',
            items: order.items || []
        });
        setShowManualOrderModal(true);
    };

    // Obtener todas las fechas de entrega únicas presentes en los pedidos (para el filtro de Cierre)
    const uniqueDeliveryDates = useMemo(() => {
        const dates = new Set();
        orders.forEach(order => {
            const date = order.fecha_entrega || order.details?.fechaEntrega;
            if (date) dates.add(date);
        });
        // Ordenar fechas (asumiendo formato YYYY-MM-DD o similar que se pueda sortear)
        return ['all', ...Array.from(dates).sort((a, b) => b.localeCompare(a))];
    }, [orders]);

    // Cargar precios de packs desde Firestore
    useEffect(() => {
        const loadPrices = async () => {
            try {
                const pricesFromDb = await getPackPrices();
                if (pricesFromDb) {
                    // Merge prices from DB with default pack data
                    const mergedData = { ...DEFAULT_PACKS_DATA };
                    Object.keys(pricesFromDb).forEach(categoryKey => {
                        if (mergedData[categoryKey] && pricesFromDb[categoryKey]?.packs) {
                            mergedData[categoryKey] = {
                                ...mergedData[categoryKey],
                                packs: mergedData[categoryKey].packs.map(pack => {
                                    const dbPrices = pricesFromDb[categoryKey].packs[pack.name];
                                    if (dbPrices) {
                                        return {
                                            ...pack,
                                            weekly: dbPrices.weekly || pack.weekly,
                                            biweekly: dbPrices.biweekly || pack.biweekly,
                                            monthly: dbPrices.monthly || pack.monthly
                                        };
                                    }
                                    return pack;
                                })
                            };
                        }
                    });
                    setPacksData(mergedData);
                }
            } catch (error) {
                console.error('Error loading pack prices:', error);
            }
        };
        loadPrices();
    }, []);

    // Filtrar productos para el buscador
    const filteredProducts = useMemo(() => {
        if (!productSearch.trim()) return [];
        return individualesData.filter(p =>
            p.nombre.toLowerCase().includes(productSearch.toLowerCase())
        ).slice(0, 10);
    }, [productSearch]);

    // Agregar producto al pedido manual
    const addProductToOrder = (product) => {
        const existingIndex = manualOrderData.items.findIndex(i => i.id === product.id);
        if (existingIndex >= 0) {
            const newItems = [...manualOrderData.items];
            newItems[existingIndex].quantity += 1;
            setManualOrderData(prev => ({ ...prev, items: newItems }));
        } else {
            setManualOrderData(prev => ({
                ...prev,
                items: [...prev.items, {
                    id: product.id,
                    name: product.nombre,
                    price: product.precio500,
                    quantity: 1,
                    size: '500g'
                }]
            }));
        }
        setProductSearch('');
        setShowProductDropdown(false);
    };

    // Cambiar tamaño del producto
    const updateItemSize = (index, size) => {
        const newItems = [...manualOrderData.items];
        const product = individualesData.find(p => p.id === newItems[index].id);
        newItems[index].size = size;
        newItems[index].price = size === '500g' ? product.precio500 : product.precio1kg;
        setManualOrderData(prev => ({ ...prev, items: newItems }));
    };

    // Cambiar cantidad
    const updateItemQuantity = (index, quantity) => {
        if (quantity < 1) return;
        const newItems = [...manualOrderData.items];
        newItems[index].quantity = quantity;
        setManualOrderData(prev => ({ ...prev, items: newItems }));
    };

    // Eliminar producto
    const removeItem = (index) => {
        setManualOrderData(prev => ({
            ...prev,
            items: prev.items.filter((_, i) => i !== index)
        }));
    };

    // State for Protein Pack Size selector
    const [proteinPackSize, setProteinPackSize] = useState('250g');

    // Agregar pack al pedido
    const addPackToOrder = (pack, category) => {
        // Confirmar antes de agregar
        if (!window.confirm(`¿Deseas agregar el pack "${pack.name}" (${selectedPlan}) al pedido?`)) {
            return;
        }

        const planLabels = { weekly: 'Semanal', biweekly: 'Quincenal', monthly: 'Mensual' };
        const categoryData = PACKS_DATA[category];

        // Determine price and id based on size (for proteinas) or standard
        let price = pack[selectedPlan];
        let packId = `${category}-${pack.name}-${selectedPlan}`;
        let packSizeLabel = planLabels[selectedPlan];

        if (category === 'proteinas') {
            if (proteinPackSize === '500g') {
                price = pack[`${selectedPlan}_500`];
                packId += '-500g';
                packSizeLabel += ' (500g)';
            } else {
                packId += '-250g';
                packSizeLabel += ' (250g)';
            }
        }

        // Verificar si ya existe este pack exacto
        const existingIndex = manualOrderData.items.findIndex(i => i.id === packId);
        if (existingIndex >= 0) {
            const newItems = [...manualOrderData.items];
            newItems[existingIndex].quantity += 1;
            setManualOrderData(prev => ({ ...prev, items: newItems }));
        } else {
            setManualOrderData(prev => ({
                ...prev,
                items: [...prev.items, {
                    id: packId,
                    name: `${pack.name} (${categoryData.title})`,
                    desc: pack.desc,
                    icon: pack.icon,
                    price: price || 0,
                    quantity: 1,
                    size: packSizeLabel,
                    isPack: true,
                    category: category,
                    plan: selectedPlan // keep internal plan key
                }]
            }));
        }
    };

    // Calcular total del pedido manual
    const manualOrderTotal = useMemo(() => {
        const subtotal = manualOrderData.items.reduce((acc, item) => acc + (item.price * item.quantity), 0);
        const shipping = Number(manualOrderData.shippingCost) || 0;

        let discountVal = 0;
        const disc = Number(manualOrderData.discount) || 0;
        if (disc > 0) {
            if (manualOrderData.discountType === 'percentage') {
                discountVal = subtotal * (disc / 100);
            } else {
                discountVal = disc;
            }
        }

        const total = Math.max(0, subtotal - discountVal + shipping);

        return {
            subtotal,
            discountValue: discountVal,
            finalTotal: total
        };
    }, [manualOrderData.items, manualOrderData.discount, manualOrderData.discountType, manualOrderData.shippingCost]);

    // Guardar pedido manual
    const handleSaveManualOrder = async () => {
        if (!manualOrderData.clientName.trim() || manualOrderData.items.length === 0) {
            alert('Por favor ingresa el nombre del cliente y al menos un producto');
            return;
        }

        try {
            const cartItems = manualOrderData.items.map(item => ({
                ...item,
                planLabel: item.size
            }));

            // Prepare order data with all new fields
            const orderPayload = {
                name: manualOrderData.clientName || 'Cliente Manual',
                phone: manualOrderData.phone || '',
                address: manualOrderData.address || '',
                email: 'cliente@manual.com', // Placeholder
                notes: manualOrderData.notes || '',
                deliveryDate: manualOrderData.deliveryDate || null, // Important: must be null if empty
                paymentMethod: manualOrderData.paymentMethod || 'Efectivo',

                // New shipping fields
                zoneId: manualOrderData.zoneId || null,
                zoneName: manualOrderData.zoneName || 'Por definir',
                shippingCost: manualOrderData.shippingCost || 0,
                // Pass discount fields
                discount: manualOrderData.discount,
                discountType: manualOrderData.discountType,

                source: 'manual'
            };

            await addOrder(cartItems, orderPayload, null, currentUser?.email);

            // Resetear formulario
            setManualOrderData({
                clientName: '',
                phone: '',
                address: '',
                notes: '',
                paymentMethod: 'Efectivo',
                deliveryDate: '',
                zoneId: '',
                zoneName: '',
                shippingCost: 0,
                discount: 0,
                discountType: 'percentage',
                items: []
            });
            setShowManualOrderModal(false);
        } catch (error) {
            console.error('Error al crear pedido:', error);
            alert('Error al crear el pedido');
        }
    };

    // Reparar pedidos antiguos (formato legacy / total 0)
    const repairOrders = async () => {
        if (!window.confirm('¿Deseas reparar pedidos con total 0 y migrar datos antiguos?')) return;

        setIsRepairing(true);
        try {
            const querySnapshot = await getDocs(collection(db, 'pedidos'));
            let fixedCount = 0;

            for (const d of querySnapshot.docs) {
                const data = d.data();
                let needsUpdate = false;
                const updateData = {};

                // 1. Migrar menu -> items (el admin espera 'items')
                if (data.menu && !data.items) {
                    updateData.items = data.menu;
                    needsUpdate = true;
                }

                // 2. Corregir total si es 0
                const currentTotal = Number(data.total) || 0;
                if (currentTotal === 0) {
                    const itemsToCalc = data.items || data.menu;
                    if (itemsToCalc && Array.isArray(itemsToCalc)) {
                        let calculatedTotal = 0;
                        itemsToCalc.forEach(item => {
                            const price = Number(item.price || item.precio) || 0;
                            const qty = Number(item.quantity || item.cantidad) || 1;
                            calculatedTotal += (price * qty);
                        });

                        calculatedTotal += (Number(data.costo_envio) || Number(data.shippingCost) || 0);
                        calculatedTotal -= (Number(data.descuento) || Number(data.discount) || 0);

                        if (calculatedTotal > 0) {
                            updateData.total = calculatedTotal;
                            needsUpdate = true;
                        }
                    }
                }

                // 3. Renombrar nmi -> Tarjeta
                if (data.metodo_pago === 'nmi') {
                    updateData.metodo_pago = 'Tarjeta';
                    needsUpdate = true;
                }

                if (needsUpdate) {
                    await updateDoc(doc(db, "pedidos", d.id), updateData);
                    fixedCount++;
                }
            }
            alert(`Reparación finalizada. Se actualizaron ${fixedCount} pedidos.`);
        } catch (error) {
            console.error('Error reparando pedidos:', error);
            alert('Error al reparar pedidos: ' + error.message);
        } finally {
            setIsRepairing(false);
        }
    };

    const [activeTab, setActiveTab] = useState('pending'); // 'pending' | 'processing' | 'history'

    // --- SISTEMA DE FILTROS ---
    // Estados Reales (Criterios activos de filtrado)
    const [activeFilter, setActiveFilter] = useState('all');
    const [dateFilter, setDateFilter] = useState('all');
    const [paymentMethodFilter, setPaymentMethodFilter] = useState('all');
    const [zoneFilter, setZoneFilter] = useState('all');
    const [sourceFilter, setSourceFilter] = useState('all');
    const [deliveryDateFilter, setDeliveryDateFilter] = useState('all');
    const [stagedSearchTerm, setStagedSearchTerm] = useState("");
    const [appliedSearchTerm, setAppliedSearchTerm] = useState("");

    // Detect URL params on mount
    useEffect(() => {
        const sourceParam = searchParams.get('source');
        const rangeParam = searchParams.get('range');
        
        if (sourceParam || rangeParam) {
            if (sourceParam && sourceParam !== 'all') {
                setSourceFilter(sourceParam);
                setStagedFilters(prev => ({ ...prev, sourceFilter: sourceParam }));
                // When coming from Dashboard, we usually want to search in all history
                setActiveTab('history');
            }
            if (rangeParam && rangeParam !== 'all') {
                setDateFilter(rangeParam);
                setStagedFilters(prev => ({ ...prev, dateFilter: rangeParam }));
            }
        }
    }, [searchParams]);

    // Estados Temporales (Lo que el usuario está eligiendo antes de dar "Aplicar")
    const [stagedFilters, setStagedFilters] = useState({
        activeFilter: 'all',
        dateFilter: 'all',
        paymentMethodFilter: 'all',
        zoneFilter: 'all',
        sourceFilter: 'all',
        deliveryDateFilter: 'all'
    });

    // Detectar si hay cambios pendientes de aplicar
    const hasPendingFilters = useMemo(() => {
        return stagedFilters.activeFilter !== activeFilter ||
            stagedFilters.dateFilter !== dateFilter ||
            stagedFilters.paymentMethodFilter !== paymentMethodFilter ||
            stagedFilters.zoneFilter !== zoneFilter ||
            stagedFilters.sourceFilter !== sourceFilter ||
            stagedFilters.deliveryDateFilter !== deliveryDateFilter ||
            stagedSearchTerm !== appliedSearchTerm;
    }, [stagedFilters, activeFilter, dateFilter, paymentMethodFilter, zoneFilter, sourceFilter, deliveryDateFilter, stagedSearchTerm, appliedSearchTerm]);

    const handleApplyFilters = () => {
        setActiveFilter(stagedFilters.activeFilter);
        setDateFilter(stagedFilters.dateFilter);
        setPaymentMethodFilter(stagedFilters.paymentMethodFilter);
        setZoneFilter(stagedFilters.zoneFilter);
        setSourceFilter(stagedFilters.sourceFilter);
        setDeliveryDateFilter(stagedFilters.deliveryDateFilter);
        setAppliedSearchTerm(stagedSearchTerm);
    };

    // Conteos para los Tabs (Sincronizado con la lógica de filtrado de abajo)
    const tabCounts = useMemo(() => {
        const counts = { pending: 0, processing: 0, history: 0 };
        orders.forEach(o => {
            const status = o.status || '';
            if (['pending', 'pending_payment', 'new'].includes(status)) counts.pending++;
            else if (['confirmed', 'in_transit', 'making', 'ready'].includes(status)) counts.processing++;
            else counts.history++;
        });
        return counts;
    }, [orders]);

    const handleClearFilters = () => {
        const reset = {
            activeFilter: 'all',
            dateFilter: 'all',
            paymentMethodFilter: 'all',
            zoneFilter: 'all',
            sourceFilter: 'all',
            deliveryDateFilter: 'all'
        };
        setStagedFilters(reset);
        setActiveFilter('all');
        setDateFilter('all');
        setPaymentMethodFilter('all');
        setZoneFilter('all');
        setSourceFilter('all');
        setDeliveryDateFilter('all');
        setStagedSearchTerm("");
        setAppliedSearchTerm("");
    };

    // Filtrado de pedidos
    const filteredOrders = useMemo(() => {
        if (!orders) return [];

        let result = orders;

        // 1. Filtrar por Tab (Pendientes vs Proceso vs Historial)
        if (activeTab === 'pending') {
            result = result.filter(o =>
                ['pending', 'pending_payment', 'payment_failed', 'new'].includes(o.status)
            );
        } else if (activeTab === 'processing') {
            result = result.filter(o => 
                ['confirmed', 'in_transit', 'making', 'ready'].includes(o.status)
            );
        } else {
            // Historial (Entregados, Cancelados y cualquier otro estado finalizado)
            result = result.filter(o => 
                ['delivered', 'cancelled'].includes(o.status) || !o.status
            );
        }

        // 2. Filtro de Búsqueda
        if (appliedSearchTerm) {
            const lowerTerm = appliedSearchTerm.toLowerCase();
            result = result.filter(order =>
                order.client?.toLowerCase().includes(lowerTerm) ||
                order.displayId?.toLowerCase().includes(lowerTerm) ||
                order.details?.phone?.includes(appliedSearchTerm)
            );
        }

        // 3. Filtro de Método de Pago
        if (paymentMethodFilter !== 'all') {
            result = result.filter(order => {
                const method = (order.details?.paymentMethod || order.paymentMethod || '').toLowerCase();
                if (paymentMethodFilter === 'sinpe') return method.includes('sinpe') || method.includes('whatsapp');
                if (paymentMethodFilter === 'card') return method.includes('card') || method.includes('tarjeta');
                if (paymentMethodFilter === 'cash') return method.includes('efectivo') || method.includes('cash');
                return true;
            });
        }

        // 3. Filtro de Estado (Específico dentro del Tab)
        if (activeFilter !== 'all') {
            result = result.filter(order => order.status === activeFilter);
        }

        // 4. Filtro de Zona
        if (zoneFilter !== 'all') {
            result = result.filter(order =>
                (order.zona_envio === zoneFilter) ||
                (order.details?.zona === zoneFilter)
            );
        }

        // 5. Filtro de Fuente (Marketing)
        if (sourceFilter !== 'all') {
            result = result.filter(order => {
                const src = (order.fuente || order.source || '').toLowerCase();
                const creator = (order.createdBy || '').toLowerCase();

                if (sourceFilter === 'only_clients') {
                    // Excluir si tiene marca de manual/admin, si tiene un creador admin, 
                    // o si el total es exactamente 100 (usado típicamente para pruebas de admin)
                    const isManual = src === 'manual' || src === 'admin' || !!creator;
                    const isTestPrice = order.totalValue === 100 || order.total === 100 || order.total === '100' || order.total === '₡100';

                    return !isManual && !isTestPrice;
                }
                if (sourceFilter === 'meta') return src.includes('facebook') || src.includes('instagram') || src.includes('meta');
                if (sourceFilter === 'google') return src.includes('google');
                if (sourceFilter === 'directo') return src.includes('direct') || (!src && order.source !== 'manual' && order.source !== 'admin');
                if (sourceFilter === 'manual') return src.includes('manual') || src.includes('admin');

                // Filtros específicos de Admin
                if (sourceFilter === 'byron') return creator === 'bikitchenfood@gmail.com' || creator === 'rojasporrasjan@gmail.com';
                if (sourceFilter === 'gina') return creator === 'ginamaroli@gmail.com';

                return true;
            });
        }

        // 6. Filtro de Fecha de Creación / Rango Temporal
        if (dateFilter !== 'all') {
            const now = new Date();
            const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

            result = result.filter(order => {
                const orderDate = parseFirebaseDate(order.createdAt);

                // Si no hay fecha, mostramos el pedido por defecto para evitar que desaparezca
                if (!orderDate) return true;

                if (dateFilter === 'today') {
                    return orderDate >= startOfToday;
                }
                if (dateFilter === 'week') {
                    const weekAgo = new Date(startOfToday);
                    weekAgo.setDate(weekAgo.getDate() - 7);
                    return orderDate >= weekAgo;
                }
                if (dateFilter === 'month') {
                    const monthAgo = new Date(startOfToday);
                    monthAgo.setMonth(monthAgo.getMonth() - 1);
                    return orderDate >= monthAgo;
                }
                return true;
            });
        }

        // 7. Filtro por Fecha de Entrega Específica (Cierre)
        if (deliveryDateFilter !== 'all') {
            result = result.filter(order => {
                const d = order.fecha_entrega || order.details?.fechaEntrega;
                return d === deliveryDateFilter;
            });
        }

        // ORDENAMIENTO POR DEFECTO: Nuevos primero
        return result.sort((a, b) => {
            // Helper to get timestamp value
            const getTimestamp = (order) => {
                const ts = order.createdAt;
                if (!ts) return 0;

                // Handle corrupted serverTimestamp objects
                if (ts && typeof ts === 'object' && ts._methodName === 'serverTimestamp') {
                    return -1; // Put corrupted timestamps at the end
                }

                // Handle Firestore Timestamp
                if (ts?.toDate && typeof ts.toDate === 'function') {
                    return ts.toDate().getTime();
                }

                // Handle Timestamp with seconds
                if (ts && typeof ts === 'object' && 'seconds' in ts) {
                    return ts.seconds * 1000;
                }

                // Handle Date, String, or Number
                try {
                    const date = new Date(ts);
                    return isNaN(date.getTime()) ? 0 : date.getTime();
                } catch {
                    return 0;
                }
            };

            const dateA = getTimestamp(a);
            const dateB = getTimestamp(b);

            // Put corrupted timestamps (-1) at the end
            if (dateA === -1 && dateB !== -1) return 1;
            if (dateB === -1 && dateA !== -1) return -1;
            if (dateA === -1 && dateB === -1) return 0;

            // Normal sorting: newest first
            return dateB - dateA;
        });

    }, [orders, appliedSearchTerm, activeFilter, dateFilter, zoneFilter, activeTab, sourceFilter, paymentMethodFilter, deliveryDateFilter]);

    // =====================
    // Envíos pendientes
    // =====================
    // Las utilidades parseDateStr y getScheduleFromOrder ahora se importan desde ../../utils/orderDates

    const getPendingShipmentInfo = (order) => {
        const schedule = getScheduleFromOrder(order);
        const today = new Date(); today.setHours(0, 0, 0, 0);
        const upcoming = schedule
            .map(parseDateStr)
            .filter(d => d && d >= today)
            .sort((a, b) => a - b);

        const hasPendingBySchedule = (order.status !== 'delivered' && order.status !== 'cancelled') && upcoming.length > 0;
        const hasPendingByFlag = order.envio_por_confirmar === true;

        const next = upcoming[0] ? `${upcoming[0].getFullYear()}-${String(upcoming[0].getMonth() + 1).padStart(2, '0')}-${String(upcoming[0].getDate()).padStart(2, '0')}` : null;
        return { hasPending: !!(hasPendingBySchedule || hasPendingByFlag), nextDate: next, count: upcoming.length, schedule };
    };

    // Mapeo para compatibilidad con el resto del componente
    const sortedOrders = filteredOrders;

    const handleStatusChange = async (orderId, newStatus) => {
        await updateOrderStatus(orderId, newStatus);
        if (selectedOrder?.id === orderId) {
            setSelectedOrder(prev => ({ ...prev, status: newStatus }));
        }
    };

    const formatDate = (timestamp) => {
        if (!timestamp) return 'Sin fecha';

        let date;
        try {
            // Handle serverTimestamp() sentinel - this means the timestamp was never resolved
            // This only happens with OLD orders that were saved incorrectly
            if (timestamp && typeof timestamp === 'object' && timestamp._methodName === 'serverTimestamp') {
                // These are old orders that were saved incorrectly
                return 'Fecha no disponible';
            }

            // Handle Firestore Timestamp object (has toDate method)
            if (timestamp?.toDate && typeof timestamp.toDate === 'function') {
                date = timestamp.toDate();
            }
            // Handle JavaScript Date object
            else if (timestamp instanceof Date) {
                date = timestamp;
            }
            // Handle Firestore Timestamp with seconds/nanoseconds
            else if (timestamp && typeof timestamp === 'object' && 'seconds' in timestamp) {
                // Firestore Timestamp format: { seconds: number, nanoseconds: number }
                date = new Date(timestamp.seconds * 1000);
            }
            // Handle String (ISO format)
            else if (typeof timestamp === 'string') {
                date = new Date(timestamp);
            }
            // Handle Number (milliseconds since epoch)
            else if (typeof timestamp === 'number') {
                date = new Date(timestamp);
            }
            // Unknown format
            else {
                console.warn('Unknown timestamp format:', timestamp, 'Type:', typeof timestamp);
                return 'Sin fecha';
            }

            // Check validity
            if (!date || isNaN(date.getTime())) {
                console.warn('Invalid date created from timestamp:', timestamp);
                return 'Sin fecha';
            }

            return date.toLocaleDateString('es-CR', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch (error) {
            console.error('Error formatting date:', error, 'Timestamp:', timestamp);
            return 'Sin fecha';
        }
    };

    const getPaymentMethodInfo = (order) => {
        const raw = (order.details?.paymentMethod || '').toString().toLowerCase();
        if (raw === 'whatsapp') return { label: 'WhatsApp', color: 'bg-green-100 text-green-700' };
        if (raw === 'card') return { label: 'Tarjeta', color: 'bg-purple-100 text-purple-700' };
        if (raw === 'efectivo') return { label: 'Efectivo', color: 'bg-yellow-100 text-yellow-700' };
        if (raw) return { label: raw.charAt(0).toUpperCase() + raw.slice(1), color: 'bg-gray-100 text-gray-700' };
        return { label: 'N/A', color: 'bg-gray-100 text-gray-400' };
    };

    // =====================
    // Envíos pendientes
    // =====================
    // Eliminar todos los pedidos

    // Eliminar todos los pedidos
    const handleDeleteAllOrders = async () => {
        const confirmed = window.confirm(
            `⚠️ ADVERTENCIA: Esto eliminará TODOS los ${orders.length} pedidos de forma permanente.

` +
            `Esta acción NO se puede deshacer.

` +
            `¿Estás seguro de que deseas continuar?`
        );

        if (!confirmed) return;

        // Segunda confirmación
        const doubleConfirmed = window.confirm(
            `🚨 ÚLTIMA CONFIRMACIÓN

` +
            `Estás a punto de eliminar ${orders.length} pedidos.

` +
            `Escribe "ELIMINAR" en tu mente y presiona OK para confirmar.`
        );

        if (!doubleConfirmed) return;

        try {
            const deletedCount = await deleteAllOrders();
            alert(`✅ ${deletedCount} pedidos eliminados exitosamente`);
        } catch (error) {
            alert(`❌ Error al eliminar pedidos: ${error.message}`);
        }
    };

    // Exportar PDF tipo factura (una por pedido, o solo el seleccionado si está abierto)
    const exportInvoicesPDF = async (mode = 'download') => {
        const doc = new jsPDF();
        const ordersToExport = selectedOrder ? [selectedOrder] : sortedOrders;
        const parseAmount = (v) => typeof v === 'number' ? v : parseInt(String(v ?? '').replace(/[^0-9]/g, '')) || 0;
        // Evitar problemas con el símbolo ₡ en fuentes por defecto
        const currency = (n) => `CRC ${Number(n || 0).toLocaleString('es-CR')}`;

        // Normalización de nombres para buscar en PACKS_DATA
        const normalize = (s) => (s || '')
            .toString()
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/\bmen[uú]\b/g, 'pack')
            .replace(/[^a-z0-9\s]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();

        const extractGrams = (txt) => {
            if (!txt) return null;
            const m = String(txt).match(/(\d+)\s*g/i);
            return m ? `${m[1]}g` : null;
        };

        // Buscar categoría y gramos por nombre de pack en PACKS_DATA
        const findPackMeta = (name) => {
            const target = normalize(name || '');
            if (!target) return null;
            try {
                const entries = Object.entries(PACKS_DATA || {});
                for (const [catKey, cat] of entries) {
                    const packs = (cat && cat.packs) || [];
                    for (const p of packs) {
                        const pn = normalize(p.name);
                        if (pn && (pn === target || pn.includes(target) || target.includes(pn))) {
                            const grams = extractGrams(p.desc);
                            return { categoryTitle: cat.title, grams, packName: p.name };
                        }
                    }
                }
            } catch { }
            return null;
        };

        // Remover gramos incrustados en el nombre (ej. "(150g)") para no duplicar ni confundir
        const stripGrams = (s) => {
            if (!s) return '';
            return String(s)
                .replace(/\(\s*\d+\s*g\s*\)/ig, '') // (150g)
                .replace(/\b\d+\s*g\b/ig, '')        // 150 g
                .replace(/\s{2,}/g, ' ')
                .trim();
        };

        // Etiquetas de estado sin emoji para PDF
        const plainStatusLabel = (status) => {
            switch (status) {
                case 'pending_payment': return 'Pago Pendiente';
                case 'payment_failed': return 'Pago Fallido';
                case 'pending': return 'Pendiente';
                case 'confirmed': return 'Confirmado';
                case 'in_transit': return 'En Ruta';
                case 'delivered': return 'Entregado';
                case 'cancelled': return 'Cancelado';
                default: return status || '';
            }
        };

        const loadImageAsDataURL = async (url) => {
            try {
                const res = await fetch(url);
                if (!res.ok) return null;
                const blob = await res.blob();
                return await new Promise((resolve) => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve(reader.result);
                    reader.readAsDataURL(blob);
                });
            } catch {
                return null;
            }
        };

        // Intentar cargar logo (opcional)
        const logoDataUrl = await loadImageAsDataURL('/assets/logo.png');

        ordersToExport.forEach((order, idx) => {
            if (idx > 0) doc.addPage();
            const pageWidth = doc.internal.pageSize.getWidth();

            let headerY = 12;
            let leftX = 14;
            let titleX = leftX;

            // Encabezado con logo
            if (logoDataUrl) {
                try {
                    doc.addImage(logoDataUrl, 'JPEG', leftX, headerY, 20, 20);
                    titleX = leftX + 24;
                } catch { }
            }

            doc.setFontSize(18);
            doc.text('BiKitchen Food', titleX, headerY + 12);

            // Datos de cabecera a la derecha
            doc.setFontSize(12);
            const facturaId = order.displayId || order.id;
            const createdText = formatDate(order.createdAt);
            const entregaRaw = order.fecha_entrega || order.details?.fechaEntrega || '';
            let entregaFmt = '';
            if (entregaRaw) {
                const d = new Date(`${entregaRaw}T12:00:00`);
                if (!isNaN(d.getTime())) {
                    entregaFmt = d.toLocaleDateString('es-CR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
                } else {
                    entregaFmt = entregaRaw;
                }
            }
            doc.text(`Factura: ${facturaId}`, pageWidth - 14, headerY + 2, { align: 'right' });
            doc.text(`Fecha pedido: ${createdText}`, pageWidth - 14, headerY + 8, { align: 'right' });
            if (entregaFmt) doc.text(`Entrega: ${entregaFmt}`, pageWidth - 14, headerY + 14, { align: 'right' });

            // Línea divisoria
            doc.setDrawColor(200);
            doc.line(14, headerY + 22, pageWidth - 14, headerY + 22);

            // Datos del cliente
            const cliente = order.client || order.cliente || 'Sin nombre';
            const phone = order.details?.phone || order.telefono || '';
            const address = order.details?.address || order.direccion || '';
            const zona = order.zona_envio || order.details?.zona || '';
            const pago = getPaymentMethodInfo(order).label;
            const estado = plainStatusLabel(order.status);
            const horario = order.horario_preferido || order.details?.horarioPreferido || order.details?.timeSlot || order.timeSlot || '';

            let yCursor = headerY + 30;
            doc.setFontSize(11);
            // Forzar fuente normal para evitar espaciado extraño en algunas líneas
            try { doc.setFont('helvetica', 'normal'); } catch { }
            doc.text(`Cliente: ${cliente}`, leftX, yCursor); yCursor += 6;
            if (phone) { doc.text(`Tel: ${phone}`, leftX, yCursor); yCursor += 6; }
            if (address) { doc.text(`Dirección: ${address}`, leftX, yCursor); yCursor += 6; }
            if (zona) { doc.text(`Zona: ${zona}`, leftX, yCursor); yCursor += 6; }
            doc.text(`Pago: ${pago}`, leftX, yCursor); yCursor += 6;
            if (estado) {
                try { if (typeof doc.setCharSpace === 'function') doc.setCharSpace(0); } catch { }
                try { doc.setFont('times', 'normal'); } catch { }
                doc.text(`Estado: ${estado}`, leftX, yCursor);
                try { doc.setFont('helvetica', 'normal'); } catch { }
                yCursor += 6;
            }
            if (horario) { doc.text(`Horario preferido: ${horario}`, leftX, yCursor); yCursor += 8; } else { yCursor += 2; }

            // Entregas programadas (multi-envío)
            const scheduleArr = getScheduleFromOrder(order);
            if (Array.isArray(scheduleArr) && scheduleArr.length > 1) {
                try { doc.setFont(undefined, 'bold'); } catch { }
                doc.text('Entregas programadas:', leftX, yCursor); yCursor += 6;
                try { doc.setFont(undefined, 'normal'); } catch { }
                scheduleArr.forEach(s => {
                    const d = parseDateStr(s);
                    const fmt = d ? d.toLocaleDateString('es-CR', { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' }) : s;
                    doc.text(`• ${fmt}  9:00 AM - 2:00 PM`, leftX, yCursor);
                    yCursor += 6;
                });
                yCursor += 2;
            }

            // Mostrar tipo de pack/plan general si disponible
            const itemsSrc = (Array.isArray(order.items) && order.items.length > 0)
                ? order.items
                : ((order.details?.cart && Array.isArray(order.details.cart)) ? order.details.cart : (order.menu || []));
            let packInfo = '';
            let metaHeader = null;
            if (itemsSrc.length > 0) {
                const first = itemsSrc[0] || {};
                metaHeader = findPackMeta(stripGrams(first.name || first.nombre || order.plan));
                const tags = [];
                if (metaHeader?.categoryTitle) tags.push(metaHeader.categoryTitle);
                if (first.categoryLabel && !tags.includes(first.categoryLabel)) tags.push(first.categoryLabel);
                if (first.planLabel) tags.push(first.planLabel);
                packInfo = [metaHeader?.packName || (order.plan || ''), ...tags].filter(Boolean).join(' · ');
            }
            if (!packInfo) {
                metaHeader = findPackMeta(order.plan);
                if (metaHeader) {
                    packInfo = `${metaHeader.packName} · ${metaHeader.categoryTitle}`;
                } else if (order.plan) {
                    packInfo = order.plan;
                }
            }
            if (packInfo) { doc.text(`Pack/Menu: ${packInfo}`, leftX, yCursor); yCursor += 8; }

            // Items
            let startY = yCursor;
            const items = itemsSrc;
            let bodyRows = [];
            let subTotal = 0;
            if (items.length > 0) {
                bodyRows = items.map(i => {
                    const baseRaw = i.name || i.nombre || 'Item';
                    const base = stripGrams(baseRaw);
                    const details = [];
                    const meta = findPackMeta(base);
                    if (meta?.categoryTitle) details.push(meta.categoryTitle);
                    if (i.categoryLabel && !details.includes(i.categoryLabel)) details.push(i.categoryLabel);
                    if (i.planLabel) details.push(i.planLabel);
                    // Determinar gramos correctos: preferir catálogo (corrige 150g -> 120g)
                    const grams = meta?.grams || extractGrams(i.protein || i.proteina);
                    if (grams) details.push(grams);
                    let desc = details.length ? `${base} (${details.join(' · ')})` : base;
                    const extras = [];
                    if (Array.isArray(i.proteinas) && i.proteinas.length) {
                        extras.push(`Incluye: ${i.proteinas.join(', ')}`);
                    }
                    if (i.desc && !extras.length) {
                        extras.push(String(i.desc));
                    }
                    if (extras.length) {
                        desc = `${desc}\n${extras.join('\n')}`;
                    }
                    const qty = i.quantity || i.cantidad || 1;
                    const unit = parseAmount(i.price ?? i.precio);
                    const lineTotal = unit * qty;
                    subTotal += lineTotal;
                    return [desc, String(qty), unit ? currency(unit) : '-', currency(lineTotal)];
                });
            } else {
                const envioTmp = parseAmount(order.costo_envio ?? order.details?.costoEnvio);
                const totalValTmp = (typeof order.totalValue === 'number' ? order.totalValue : (typeof order.total === 'number' ? order.total : parseAmount(order.total)));
                const lineTotal = Math.max(0, totalValTmp - envioTmp);
                subTotal = lineTotal;
                const planName = (metaHeader?.packName && metaHeader?.categoryTitle)
                    ? `${metaHeader.packName} (${metaHeader.categoryTitle})`
                    : (order.plan || packInfo || 'Pedido');
                bodyRows = [[planName, '1', lineTotal ? currency(lineTotal) : '-', currency(lineTotal)]];
            }

            autoTable(doc, {
                startY,
                head: [['Descripción', 'Cant.', 'Precio U.', 'Total']],
                body: bodyRows,
                theme: 'grid',
                styles: { fontSize: 9 },
                headStyles: { fillColor: [66, 165, 245], textColor: 255 },
                columnStyles: {
                    0: { cellWidth: 90 },
                    1: { cellWidth: 20, halign: 'center' },
                    2: { cellWidth: 40, halign: 'right' },
                    3: { cellWidth: 40, halign: 'right' }
                }
            });

            const afterTableY = doc.lastAutoTable ? doc.lastAutoTable.finalY : startY + 10;
            const envio = parseAmount(order.costo_envio ?? order.details?.costoEnvio);
            const totalVal = (typeof order.totalValue === 'number' ? order.totalValue : (typeof order.total === 'number' ? order.total : parseAmount(order.total)));
            const totalCalc = totalVal || (subTotal + envio);

            const sumX = pageWidth - 80;
            let y = afterTableY + 8;
            doc.setFontSize(11);
            doc.text('Subtotal:', sumX, y);
            doc.text(currency(subTotal), pageWidth - 14, y, { align: 'right' });
            y += 6;
            doc.text('Envío:', sumX, y);
            doc.text(currency(envio), pageWidth - 14, y, { align: 'right' });
            y += 6;
            doc.setFont(undefined, 'bold');
            doc.text('Total:', sumX, y);
            doc.text(currency(totalCalc), pageWidth - 14, y, { align: 'right' });
            doc.setFont(undefined, 'normal');

            // Notas
            const notas = order.observaciones || order.notes || order.details?.observaciones || order.details?.notes || '';
            if (notas) {
                y += 10;
                doc.setFont(undefined, 'bold');
                doc.text('Notas:', leftX, y);
                doc.setFont(undefined, 'normal');
                const wrapped = doc.splitTextToSize(String(notas), pageWidth - leftX - 14);
                doc.text(wrapped, leftX, y + 6);
            }
        });

        const fileName = selectedOrder ? `Factura_${(selectedOrder.displayId || selectedOrder.id)}.pdf` : `Facturas_BiKitchen_${new Date().toISOString().slice(0, 10)}.pdf`;
        if (mode === 'print') {
            try { doc.autoPrint(); } catch { }
            const blobUrl = doc.output('bloburl');
            const win = window.open(blobUrl);
            if (!win) {
                alert('Permite ventanas emergentes para imprimir la factura');
            }
        } else {
            doc.save(fileName);
        }
    };

    const addClientFromOrder = async (order) => {
        try {
            const nombre = order.client || order.cliente || '';
            const telefonoRaw = order.details?.phone || order.telefono || '';
            const telefono = (telefonoRaw || '').replace(/[^0-9]/g, '');
            const correo = (order.details?.email || order.correo || '').toLowerCase();
            const direccion = order.details?.address || order.direccion || '';
            if (!nombre || (!telefono && !correo)) {
                alert('Faltan datos: se requiere al menos nombre y teléfono o correo');
                return;
            }

            let existingId = null;
            if (telefono) {
                const q1 = query(collection(db, 'clientes'), where('telefono', '==', telefono));
                const s1 = await getDocs(q1);
                if (!s1.empty) existingId = s1.docs[0].id;
            }
            if (!existingId && correo) {
                const q2 = query(collection(db, 'clientes'), where('correo', '==', correo));
                const s2 = await getDocs(q2);
                if (!s2.empty) existingId = s2.docs[0].id;
            }

            if (existingId) {
                const ref = doc(db, 'clientes', existingId);
                const payload = {
                    nombre,
                    lastOrderAt: new Date().toISOString(),
                    lastOrderId: order.id,
                };
                if (direccion) payload.direccion = direccion;
                if (telefono) payload.telefono = telefono;
                if (correo) payload.correo = correo;
                await updateDoc(ref, payload);
                alert('Cliente actualizado');
            } else {
                await addDoc(collection(db, 'clientes'), {
                    nombre,
                    telefono,
                    correo,
                    direccion,
                    fechaRegistro: new Date().toISOString(),
                    totalPedidos: 1,
                    lastOrderAt: new Date().toISOString(),
                    lastOrderId: order.id,
                });
                alert('Cliente agregado');
            }
        } catch (e) {
            console.error('addClientFromOrder error', e);
            alert('No se pudo agregar el cliente');
        }
    };

    return (
        <div className="pb-20">
            {/* Header */}
            <div className="mb-6">
                <AdminPageHeader
                    icon={ClipboardList}
                    title="Pedidos"
                    subtitle="Gestiona y visualiza todos los pedidos recibidos en tiempo real"
                    gradient="from-blue-500 via-indigo-400 to-purple-400"
                    stats={[
                        { value: orders.length, label: 'Total' },
                        { value: stats.pending, label: 'Pendientes' },
                        { value: `₡${(stats.totalSales / 1000).toFixed(0)}K`, label: 'Ventas' }
                    ]}
                    actions={[
                        <button
                            key="sync-nmi"
                            disabled={isSyncingNMI}
                            onClick={syncNMIHistory}
                            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 shadow-md transition-colors disabled:opacity-50"
                        >
                            <History size={16} className={isSyncingNMI ? 'animate-spin' : ''} /> 
                            {isSyncingNMI ? 'Sincronizando...' : 'Arreglar Automáticamente'}
                        </button>,
                        <button
                            key="new"
                            onClick={() => setShowManualOrderModal(true)}
                            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white text-blue-600 text-sm font-semibold hover:bg-blue-50 shadow-md transition-colors"
                        >
                            <Plus size={16} /> Nuevo Pedido
                        </button>,
                        <button
                            key="repair"
                            disabled={isRepairing}
                            onClick={repairOrders}
                            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold shadow-md transition-colors ${isRepairing
                                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                : 'bg-orange-500 text-white hover:bg-orange-600'
                                }`}
                        >
                            <History size={16} className={isRepairing ? 'animate-spin' : ''} />
                            {isRepairing ? 'Reparando...' : 'Reparar Pedidos'}
                        </button>,
                        <button
                            key="delete-all"
                            onClick={handleDeleteAllOrders}
                            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-500 text-white text-sm font-semibold hover:bg-red-600 shadow-md transition-colors"
                        >
                            <Trash2 size={16} /> Eliminar Todos
                        </button>,
                        <button
                            key="export"
                            onClick={exportInvoicesPDF}
                            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/20 backdrop-blur-sm text-sm text-white hover:bg-white/30 transition-colors"
                        >
                            <Download size={16} /> Exportar
                        </button>,
                        <button
                            key="print"
                            onClick={() => exportInvoicesPDF('print')}
                            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/20 backdrop-blur-sm text-sm text-white hover:bg-white/30 transition-colors"
                        >
                            <Printer size={16} /> Imprimir
                        </button>
                    ]}
                />

                {/* Stats Cards */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-6"
                >
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.3 }}
                        className="bg-gradient-to-br from-white via-green-50/20 to-white p-3 md:p-4 rounded-2xl md:rounded-3xl shadow-xl border border-gray-100/50 flex flex-col sm:flex-row items-center sm:items-start gap-2 sm:gap-4 text-center sm:text-left hover:shadow-2xl hover:scale-105 transition-all duration-300"
                    >
                        <div className="p-2 md:p-3 bg-gradient-to-br from-green-400 to-emerald-500 text-white rounded-xl md:rounded-2xl shadow-lg">
                            <DollarSign size={20} className="md:w-6 md:h-6" />
                        </div>
                        <div>
                            <div className="text-xs md:text-sm text-gray-600 font-medium whitespace-nowrap">Ventas Totales</div>
                            <div className="text-lg md:text-2xl font-bold text-gray-900">₡{stats.totalSales.toLocaleString('es-CR')}</div>
                        </div>
                    </motion.div>
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.4 }}
                        className="bg-gradient-to-br from-white via-blue-50/20 to-white p-3 md:p-4 rounded-2xl md:rounded-3xl shadow-xl border border-gray-100/50 flex flex-col sm:flex-row items-center sm:items-start gap-2 sm:gap-4 text-center sm:text-left hover:shadow-2xl hover:scale-105 transition-all duration-300"
                    >
                        <div className="p-2 md:p-3 bg-gradient-to-br from-blue-400 to-cyan-500 text-white rounded-xl md:rounded-2xl shadow-lg">
                            <ShoppingBag size={20} className="md:w-6 md:h-6" />
                        </div>
                        <div>
                            <div className="text-xs md:text-sm text-gray-600 font-medium whitespace-nowrap">Total Pedidos</div>
                            <div className="text-lg md:text-2xl font-bold text-gray-900">{orders.length}</div>
                        </div>
                    </motion.div>
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.5 }}
                        className="bg-gradient-to-br from-white via-yellow-50/20 to-white p-3 md:p-4 rounded-2xl md:rounded-3xl shadow-xl border border-gray-100/50 flex flex-col sm:flex-row items-center sm:items-start gap-2 sm:gap-4 text-center sm:text-left hover:shadow-2xl hover:scale-105 transition-all duration-300"
                    >
                        <div className="p-2 md:p-3 bg-gradient-to-br from-yellow-400 to-orange-500 text-white rounded-xl md:rounded-2xl shadow-lg">
                            <Clock size={20} className="md:w-6 md:h-6" />
                        </div>
                        <div>
                            <div className="text-xs md:text-sm text-gray-600 font-medium whitespace-nowrap">Pendientes</div>
                            <div className="text-lg md:text-2xl font-bold text-gray-900">
                                {stats.pending}
                            </div>
                        </div>
                    </motion.div>
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.6 }}
                        className="bg-gradient-to-br from-white via-green-50/20 to-white p-3 md:p-4 rounded-2xl md:rounded-3xl shadow-xl border border-gray-100/50 flex flex-col sm:flex-row items-center sm:items-start gap-2 sm:gap-4 text-center sm:text-left hover:shadow-2xl hover:scale-105 transition-all duration-300"
                    >
                        <div className="p-2 md:p-3 bg-gradient-to-br from-green-400 to-emerald-500 text-white rounded-xl md:rounded-2xl shadow-lg">
                            <CheckCircle size={20} className="md:w-6 md:h-6" />
                        </div>
                        <div>
                            <div className="text-xs md:text-sm text-gray-600 font-medium whitespace-nowrap">Entregados</div>
                            <div className="text-lg md:text-2xl font-bold text-gray-900">{stats.delivered}</div>
                        </div>
                    </motion.div>
                </motion.div>

                {/* Tabs de Vistas Principales */}
                <div className="flex bg-gray-100 p-1 rounded-xl w-full sm:w-fit mb-6 overflow-x-auto no-scrollbar">
                    <button
                        onClick={() => setActiveTab('pending')}
                        className={`flex-1 sm:flex-none px-4 sm:px-6 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 whitespace-nowrap ${activeTab === 'pending'
                            ? 'bg-white text-orange-600 shadow-sm ring-1 ring-orange-100'
                            : 'text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        Pendientes
                        {tabCounts.pending > 0 && (
                            <span className="ml-2 px-1.5 py-0.5 bg-orange-100 text-orange-600 rounded-md text-[10px] font-black">
                                {tabCounts.pending}
                            </span>
                        )}
                    </button>
                    <button
                        onClick={() => setActiveTab('processing')}
                        className={`flex-1 sm:flex-none px-4 sm:px-6 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 whitespace-nowrap ${activeTab === 'processing'
                            ? 'bg-white text-blue-600 shadow-sm ring-1 ring-blue-100'
                            : 'text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        <Package size={16} />
                        En Proceso
                        {tabCounts.processing > 0 && (
                            <span className="ml-2 px-1.5 py-0.5 bg-blue-100 text-blue-600 rounded-md text-[10px] font-black">
                                {tabCounts.processing}
                            </span>
                        )}
                    </button>
                    <button
                        onClick={() => setActiveTab('history')}
                        className={`flex-1 sm:flex-none px-4 sm:px-6 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 whitespace-nowrap ${activeTab === 'history'
                            ? 'bg-white text-gray-800 shadow-sm'
                            : 'text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        <History size={16} />
                        Historial
                        {tabCounts.history > 0 && (
                            <span className="ml-2 px-1.5 py-0.5 bg-gray-200 text-gray-700 rounded-md text-[10px] font-black">
                                {tabCounts.history}
                            </span>
                        )}
                    </button>
                </div>

                {/* Search & Filters */}
                <div className="flex flex-wrap gap-4 items-center mb-4">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input
                            type="text"
                            placeholder="Buscar por nombre, ID o teléfono..."
                            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-200 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none"
                            value={stagedSearchTerm}
                            onChange={(e) => setStagedSearchTerm(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleApplyFilters()}
                        />
                    </div>

                    {/* Quick Filter: HOY */}
                    <button
                        onClick={() => {
                            const val = stagedFilters.dateFilter === 'today' ? 'all' : 'today';
                            setStagedFilters(prev => ({ ...prev, dateFilter: val }));
                        }}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold transition-all shadow-sm ${stagedFilters.dateFilter === 'today'
                            ? 'bg-orange-100 text-orange-700 border border-orange-200 ring-2 ring-orange-500/20'
                            : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 hover:text-orange-600'
                            }`}
                    >
                        <Calendar size={16} className={stagedFilters.dateFilter === 'today' ? 'text-orange-600' : 'text-gray-400'} />
                        HOY
                    </button>

                    {/* Payment Method Filter */}
                    <div className="relative">
                        <select
                            value={stagedFilters.paymentMethodFilter}
                            onChange={(e) => setStagedFilters(prev => ({ ...prev, paymentMethodFilter: e.target.value }))}
                            className="px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 appearance-none pr-8 cursor-pointer"
                        >
                            <option value="all">💳 Todos los pagos</option>
                            <option value="sinpe">SINPE / WhatsApp</option>
                            <option value="card">Tarjeta</option>
                            <option value="cash">Efectivo</option>
                        </select>
                        <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    </div>

                    {/* Date Filter Dropdown */}
                    <div className="relative">
                        <button
                            onClick={() => setShowDateDropdown(!showDateDropdown)}
                            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50"
                        >
                            <CalendarDays size={16} />
                            {DATE_FILTERS.find(f => f.id === stagedFilters.dateFilter)?.label}
                            <ChevronDown size={16} />
                        </button>

                        {showDateDropdown && (
                            <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 min-w-[160px]">
                                {DATE_FILTERS.map(f => (
                                    <button
                                        key={f.id}
                                        onClick={() => {
                                            setStagedFilters(prev => ({ ...prev, dateFilter: f.id }));
                                            setShowDateDropdown(false);
                                        }}
                                        className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 first:rounded-t-lg last:rounded-b-lg ${stagedFilters.dateFilter === f.id ? 'bg-orange-50 text-orange-600' : 'text-gray-600'
                                            }`}
                                    >
                                        {f.label}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Zone Filter Dropdown */}
                    {uniqueZones.length > 1 && (
                        <select
                            value={stagedFilters.zoneFilter}
                            onChange={(e) => setStagedFilters(prev => ({ ...prev, zoneFilter: e.target.value }))}
                            className="px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                        >
                            <option value="all">🚚 Todas las zonas</option>
                            {uniqueZones.filter(z => z !== 'all').map(zone => (
                                <option key={zone} value={zone}>{zone}</option>
                            ))}
                        </select>
                    )}

                    <div className="flex items-center bg-white px-4 py-2.5 rounded-xl border border-gray-200 shadow-sm">
                        <TrendingUp size={16} className="text-gray-400 mr-2" />
                        <select
                            className="bg-transparent border-none focus:ring-0 text-sm font-bold text-gray-800 cursor-pointer p-0"
                            value={stagedFilters.sourceFilter}
                            onChange={(e) => setStagedFilters(prev => ({ ...prev, sourceFilter: e.target.value }))}
                        >
                            <option value="all">Todas las Fuentes</option>
                            <option value="only_clients">✨ Solo Clientes (Real)</option>
                            <option value="meta">Meta (FB/IG)</option>
                            <option value="google">Google</option>
                            <option value="directo">Directo</option>
                            <option value="manual">Admin / Manual (Todos)</option>
                            <option value="byron">Admin: Byron</option>
                            <option value="gina">Admin: Gina</option>
                        </select>
                    </div>

                    {/* New Filter: Cierre de Pedidos (Delivery Date) */}
                    <div className="flex items-center bg-white px-4 py-2.5 rounded-xl border border-gray-200 shadow-sm">
                        <Calendar size={16} className="text-orange-500 mr-2" />
                        <select
                            className="bg-transparent border-none focus:ring-0 text-sm font-bold text-gray-800 cursor-pointer p-0"
                            value={stagedFilters.deliveryDateFilter}
                            onChange={(e) => setStagedFilters(prev => ({ ...prev, deliveryDateFilter: e.target.value }))}
                        >
                            <option value="all">📅 Todos los Cierres</option>
                            {uniqueDeliveryDates.filter(d => d !== 'all').map(date => (
                                <option key={date} value={date}>{date}</option>
                            ))}
                        </select>
                    </div>

                    {/* Botones de Acción de Filtros */}
                    <div className="flex items-center gap-2 ml-auto">
                        <button
                            onClick={handleClearFilters}
                            className="px-4 py-2.5 text-sm font-bold text-gray-500 hover:text-gray-700 transition-colors"
                        >
                            Limpiar
                        </button>
                        <button
                            onClick={handleApplyFilters}
                            className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all shadow-md flex items-center gap-2 ${hasPendingFilters
                                ? 'bg-orange-500 text-white hover:bg-orange-600 scale-105 shadow-orange-200'
                                : 'bg-gray-100 text-gray-400 cursor-default'
                                }`}
                        >
                            <Filter size={16} />
                            Aplicar Filtros
                            {hasPendingFilters && (
                                <span className="flex h-2 w-2 rounded-full bg-white animate-pulse" />
                            )}
                        </button>
                    </div>

                    {/* Status Filters - Only show helpful sub-filters based on Tab */}
                    <div className="flex gap-2 flex-wrap">
                        {activeTab === 'pending' && [
                            { id: 'pending', label: '⏳ Por Confirmar' },
                            { id: 'pending_payment', label: '💳 Falta Pago' },
                            { id: 'payment_failed', label: '❌ Pago Fallido' }
                        ].map(filter => (
                            <button
                                key={filter.id}
                                onClick={() => setStagedFilters(prev => ({ ...prev, activeFilter: prev.activeFilter === filter.id ? 'all' : filter.id }))}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${stagedFilters.activeFilter === filter.id
                                    ? 'bg-orange-500 text-white shadow-md'
                                    : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                                    }`}
                            >
                                {filter.label}
                            </button>
                        ))}

                        {activeTab === 'processing' && [
                            { id: 'confirmed', label: '✅ Confirmados' },
                            { id: 'making', label: '👨‍🍳 En Cocina' },
                            { id: 'ready', label: '🥡 Listo/Empacado' },
                            { id: 'in_transit', label: '🚚 En Ruta' }
                        ].map(filter => (
                            <button
                                key={filter.id}
                                onClick={() => setStagedFilters(prev => ({ ...prev, activeFilter: prev.activeFilter === filter.id ? 'all' : filter.id }))}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${stagedFilters.activeFilter === filter.id
                                    ? 'bg-blue-500 text-white shadow-md'
                                    : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                                    }`}
                            >
                                {filter.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Orders Table - Desktop */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 hidden md:block">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-100">
                            <tr>
                                <th className="text-left py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">Pedido</th>
                                <th className="text-left py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">Cliente</th>
                                <th className="text-left py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">Zona</th>
                                <th className="text-left py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">Total</th>
                                <th className="text-left py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">Pago</th>
                                <th className="text-left py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">Estado</th>
                                <th className="text-left py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">Fecha Entrega</th>
                                <th className="text-center py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {loading ? (
                                <tr>
                                    <td colSpan="8" className="py-12 text-center text-gray-500">
                                        Cargando pedidos...
                                    </td>
                                </tr>
                            ) : sortedOrders.length === 0 ? (
                                <tr>
                                    <td colSpan="8" className="py-12 text-center text-gray-500">
                                        <Package size={48} className="mx-auto mb-4 text-gray-300" />
                                        <p>No hay pedidos que mostrar</p>
                                    </td>
                                </tr>
                            ) : (
                                sortedOrders.map(order => {
                                    const status = ORDER_STATUS[order.status] || ORDER_STATUS.pending;
                                    const StatusIcon = status.icon;
                                    const pm = getPaymentMethodInfo(order);

                                    return (
                                        <tr
                                            key={order.id}
                                            className="hover:bg-gray-50/50 cursor-pointer transition-colors"
                                            onClick={() => setSelectedOrder(order)}
                                        >
                                            <td className="py-4 px-6">
                                                <span className="font-bold text-gray-800 block">{order.displayId}</span>
                                                <span className="text-xs text-gray-500 font-medium flex items-center gap-1 mt-1">
                                                    <Clock size={12} className="text-gray-400" />
                                                    {formatDate(order.createdAt)}
                                                </span>
                                            </td>
                                            <td className="py-4 px-6">
                                                <div className="font-medium text-gray-800">{order.client}</div>
                                                <div className="text-sm text-gray-500">{order.details?.phone || 'Sin teléfono'}</div>
                                                <div className="flex flex-col gap-0.5 mt-1">
                                                    <div className="flex items-center gap-1 text-[10px] uppercase font-bold text-gray-400">
                                                        <TrendingUp size={10} />
                                                        {order.fuente || order.source || 'Directo'}
                                                    </div>
                                                    {order.createdBy && (
                                                        <div className="text-[9px] font-medium text-blue-500/70 italic px-1 rounded bg-blue-50/50 w-fit">
                                                            Pd: {order.createdBy.split('@')[0]}
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="py-4 px-6">
                                                <div className="text-sm text-gray-700 font-medium">
                                                    {order.zona_envio || order.details?.zona || 'Sin zona'}
                                                </div>
                                                <div className="text-xs text-gray-400">
                                                    {order.costo_envio !== undefined && order.costo_envio !== null
                                                        ? (order.costo_envio === 0 ? 'Envío: Gratis' : `Envío: ₡${order.costo_envio?.toLocaleString('es-CR')}`)
                                                        : order.details?.costoEnvio !== undefined
                                                            ? (order.details.costoEnvio === 0 ? 'Envío: Gratis' : `Envío: ₡${order.details.costoEnvio?.toLocaleString('es-CR')}`)
                                                            : ''
                                                    }
                                                </div>
                                            </td>
                                            <td className="py-4 px-6">
                                                <span className="font-bold text-orange-500">{formatTotal(order)}</span>
                                            </td>
                                            <td className="py-4 px-6">
                                                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-medium ${pm.color}`}>
                                                    <CreditCard size={12} className="mr-1" />
                                                    {pm.label}
                                                </span>
                                            </td>
                                            <td className="py-4 px-6">
                                                <div className="flex flex-col gap-2">
                                                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${status.color} w-fit`}>
                                                        <StatusIcon size={12} />
                                                        {status.label}
                                                    </span>
                                                    {order.status === 'pending_payment' && (
                                                        <span className="text-[10px] text-orange-600 bg-orange-50 px-2 py-1 rounded-md max-w-[180px] leading-tight font-medium border border-orange-100">
                                                            {order.pendingReason || 'Pago no completado (Abandono/Rechazo)'}
                                                        </span>
                                                    )}
                                                    {order.isPaymentError && (
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setSelectedError(order.paymentError);
                                                                setShowErrorModal(true);
                                                            }}
                                                            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700 hover:bg-red-200 transition-all w-fit"
                                                        >
                                                            <AlertCircle size={12} />
                                                            Error de Pago
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="py-4 px-6 text-sm text-gray-700">
                                                {(() => {
                                                    const first = order.fecha_entrega || order.details?.fechaEntrega;
                                                    const sch = getScheduleFromOrder(order);
                                                    const info = getPendingShipmentInfo(order);
                                                    if (first) {
                                                        return (
                                                            <div className="flex flex-col">
                                                                <span className="font-medium text-gray-800">{first}</span>
                                                                {sch.length > 1 && (
                                                                    <span className="text-xs text-gray-500">{sch.length} envíos{info.nextDate ? ` • Próx: ${info.nextDate}` : ''}</span>
                                                                )}
                                                                <span className="text-xs text-gray-400">Pedido: {formatDate(order.createdAt)}</span>
                                                            </div>
                                                        );
                                                    }
                                                    return <span className="text-gray-500">{formatDate(order.createdAt)}</span>;
                                                })()}
                                            </td>
                                            <td className="py-4 px-6 text-center">
                                                <div className="flex items-center justify-center gap-1">
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setSelectedOrder(order);
                                                        }}
                                                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-500 hover:text-orange-500"
                                                        title="Ver Detalles"
                                                    >
                                                        <Eye size={18} />
                                                    </button>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleDuplicateOrder(order);
                                                        }}
                                                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-500 hover:text-green-600"
                                                        title="Repetir Pedido (Copiar)"
                                                    >
                                                        <Copy size={18} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Orders Cards - Mobile */}
            <div className="md:hidden mt-4 space-y-4 pb-24">
                <AnimatePresence>
                    {loading ? (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 text-center text-gray-500"
                        >
                            Cargando pedidos...
                        </motion.div>
                    ) : sortedOrders.length === 0 ? (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center text-gray-500"
                        >
                            <Package size={48} className="mx-auto mb-4 text-gray-300" />
                            <p className="text-lg font-medium text-gray-600">No hay pedidos</p>
                        </motion.div>
                    ) : (
                        sortedOrders.map(order => {
                            const status = ORDER_STATUS[order.status] || ORDER_STATUS.pending;
                            const StatusIcon = status.icon;
                            const pm = getPaymentMethodInfo(order);

                            return (
                                <motion.div
                                    key={order.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex flex-col gap-4 active:scale-[0.98] transition-transform"
                                    onClick={() => setSelectedOrder(order)}
                                >
                                    <div className="flex items-start justify-between gap-4">
                                        <div>
                                            <div className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-1">Pedido {order.displayId}</div>
                                            <div className="text-xs font-semibold text-gray-800 flex items-center gap-1 bg-gray-100 px-2 py-1 rounded w-fit">
                                                <Clock size={12} className="text-gray-500" />
                                                {formatDate(order.createdAt)}
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-1">Total</div>
                                            <div className="text-lg font-bold text-orange-600">{formatTotal(order)}</div>
                                        </div>
                                    </div>

                                    <div className="border-t border-b border-gray-50 py-3 my-1">
                                        <div className="font-semibold text-gray-900 text-base mb-1">{order.client}</div>
                                        <div className="text-sm text-gray-500 flex items-center gap-2">
                                            <Phone size={14} />
                                            {order.details?.phone || 'Sin teléfono'}
                                        </div>
                                    </div>

                                    {/* Zona de envío - Mobile */}
                                    <div className="flex items-center justify-between bg-blue-50/50 rounded-lg px-3 py-2.5">
                                        <div className="flex items-center gap-2">
                                            <Truck size={16} className="text-blue-600" />
                                            <span className="text-sm font-semibold text-gray-700 truncate max-w-[150px]">
                                                {order.zona_envio || order.details?.zona || 'Sin zona'}
                                            </span>
                                        </div>
                                        <span className="text-sm font-medium text-blue-700">
                                            {order.costo_envio !== undefined && order.costo_envio !== null
                                                ? (order.costo_envio === 0 ? 'Envío Gratis' : `+ ₡${order.costo_envio?.toLocaleString('es-CR')}`)
                                                : order.details?.costoEnvio !== undefined
                                                    ? (order.details.costoEnvio === 0 ? 'Envío Gratis' : `+ ₡${order.details.costoEnvio?.toLocaleString('es-CR')}`)
                                                    : ''
                                            }
                                        </span>
                                    </div>

                                    <div className="flex flex-col items-end gap-2 mt-2 pt-2">
                                        <div className="w-full flex flex-col items-end gap-2">
                                            <div className="w-full flex items-center justify-between">
                                                <div className="text-sm text-gray-500 font-medium">{pm.label}</div>
                                                <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wide ${status.color}`}>
                                                    <StatusIcon size={14} />
                                                    {status.label}
                                                </span>
                                            </div>
                                            {order.status === 'pending_payment' && (
                                                <span className="text-[10px] text-orange-600 bg-orange-50 px-2 py-1 rounded-md max-w-[200px] text-right leading-tight font-medium border border-orange-100">
                                                    {order.pendingReason || 'Pago no completado (Abandono/Rechazo)'}
                                                </span>
                                            )}
                                        {order.isPaymentError && (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setSelectedError(order.paymentError);
                                                    setShowErrorModal(true);
                                                }}
                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-red-100 text-red-700 hover:bg-red-200 transition-all w-fit mt-1"
                                            >
                                                <AlertCircle size={14} />
                                                Ver Error de Pago
                                            </button>
                                        )}
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleDuplicateOrder(order);
                                            }}
                                            className="w-full mt-3 py-2 px-4 bg-orange-50 text-orange-600 rounded-lg font-medium text-sm flex items-center justify-center gap-2 border border-orange-100 hover:bg-orange-100 transition-colors"
                                        >
                                            <Copy size={16} />
                                            Repetir Pedido
                                        </button>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between text-xs text-gray-400 mt-1">
                                        {(() => {
                                            const sch = getScheduleFromOrder(order);
                                            if (Array.isArray(sch) && sch.length > 1) {
                                                return (
                                                    <div className="mt-2 flex items-start gap-2 bg-white/50 p-2 rounded text-xs text-gray-600">
                                                        <Calendar size={14} className="mt-0.5 text-gray-400" />
                                                        <div>
                                                            <span className="font-medium">Entregas programadas:</span>
                                                            <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-1">
                                                                {sch.map((d, i) => (
                                                                    <span key={i}>{d}</span>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            }
                                            return (
                                                <div className="flex items-center gap-1.5">
                                                    <Calendar size={14} />
                                                    {(() => {
                                                        const first = order.fecha_entrega || order.details?.fechaEntrega;
                                                        const info = getPendingShipmentInfo(order);
                                                        if (first) {
                                                            return (
                                                                <span className="font-medium">
                                                                    {first}
                                                                    {info.nextDate ? ` (próx: ${info.nextDate})` : ''}
                                                                </span>
                                                            );
                                                        }
                                                        return <span>Sin fecha de entrega</span>;
                                                    })()}
                                                </div>
                                            );
                                        })()}
                                    </div>
                                    <div>                                    <div>
                                        <span className="font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded-md">{order.plan}</span>
                                    </div>
                                    </div>
                                </motion.div>
                            );
                        })
                    )}
                </AnimatePresence>
            </div>

            {/* Order Detail Modal - Full Screen on Mobile */}
            <AnimatePresence>
                {selectedOrder && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end md:items-center justify-center z-50"
                        onClick={() => setSelectedOrder(null)}
                    >
                        <motion.div
                            initial={{ y: '100%' }}
                            animate={{ y: 0 }}
                            exit={{ y: '100%' }}
                            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                            className="bg-white w-full h-[90vh] md:h-auto md:max-h-[90vh] md:max-w-3xl rounded-t-2xl md:rounded-2xl shadow-2xl overflow-hidden flex flex-col absolute bottom-0 md:relative"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Modal Header */}
                            <div className="flex items-center justify-between p-6 border-b border-gray-100">
                                <div>
                                    <h2 className="text-xl font-bold text-gray-800">
                                        Pedido {selectedOrder.displayId}
                                    </h2>
                                    <p className="text-sm text-gray-500">
                                        {formatDate(selectedOrder.createdAt)}
                                    </p>
                                </div>
                                <button
                                    onClick={() => setSelectedOrder(null)}
                                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            {/* Modal Content */}
                            <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
                                {/* Status & Actions */}
                                <div className="flex items-center justify-between mb-6 p-4 bg-gray-50 rounded-xl">
                                    <div className="flex items-center gap-3">
                                        <span className="text-sm text-gray-500">Estado:</span>
                                        <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${ORDER_STATUS[selectedOrder.status]?.color || 'bg-gray-100 text-gray-600'}`}>
                                            {ORDER_STATUS[selectedOrder.status]?.label || 'Desconocido'}
                                        </span>
                                    </div>
                                    <div className="flex gap-2 flex-wrap">
                                        {/* Botón para confirmar pago - da los puntos al cliente */}
                                        {(selectedOrder.status === 'pending_payment' || selectedOrder.status === 'pending' || selectedOrder.status === 'payment_failed') && (
                                            <button
                                                onClick={() => handleStatusChange(selectedOrder.id, 'confirmed')}
                                                className="px-4 py-2 bg-green-500 text-white text-sm font-medium rounded-lg hover:bg-green-600 transition-colors flex items-center gap-2"
                                            >
                                                <CheckCircle size={16} />
                                                ✅ Confirmar Pago
                                                {selectedOrder.pointsToAward > 0 && !selectedOrder.pointsAwarded && (
                                                    <span className="bg-yellow-400 text-yellow-900 text-xs px-1.5 py-0.5 rounded-full ml-1">
                                                        +{selectedOrder.pointsToAward} pts
                                                    </span>
                                                )}
                                            </button>
                                        )}
                                        {selectedOrder.status === 'confirmed' && (
                                            <button
                                                onClick={() => handleStatusChange(selectedOrder.id, 'in_transit')}
                                                className="px-4 py-2 bg-purple-500 text-white text-sm font-medium rounded-lg hover:bg-purple-600 transition-colors"
                                            >
                                                En Ruta
                                            </button>
                                        )}
                                        {selectedOrder.status === 'in_transit' && (
                                            <button
                                                onClick={() => handleStatusChange(selectedOrder.id, 'delivered')}
                                                className="px-4 py-2 bg-green-500 text-white text-sm font-medium rounded-lg hover:bg-green-600 transition-colors"
                                            >
                                                Entregado
                                            </button>
                                        )}
                                        {selectedOrder.status !== 'cancelled' && selectedOrder.status !== 'delivered' && (
                                            <button
                                                onClick={() => handleStatusChange(selectedOrder.id, 'cancelled')}
                                                className="px-4 py-2 bg-white border border-red-200 text-red-500 text-sm font-medium rounded-lg hover:bg-red-50 transition-colors"
                                            >
                                                Cancelar
                                            </button>
                                        )}
                                    </div>

                                    {/* Indicador de puntos otorgados */}
                                    {selectedOrder.pointsAwarded && (
                                        <div className="mt-2 text-xs text-green-600 flex items-center gap-1">
                                            <CheckCircle size={12} />
                                            Puntos otorgados: +{selectedOrder.pointsToAward || 0} pts
                                        </div>
                                    )}
                                </div>

                                {/* Customer Info */}
                                <div className="mb-6">
                                    <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
                                        Información del Cliente
                                    </h3>
                                    <div className="bg-white border border-gray-100 rounded-xl p-4 space-y-3">
                                        <div className="flex items-center gap-3">
                                            <User size={18} className="text-gray-400" />
                                            <span className="font-medium text-gray-800">{selectedOrder.client}</span>
                                        </div>
                                        {(selectedOrder.telefono || selectedOrder.details?.phone) && (
                                            <div className="flex items-center gap-3">
                                                <Phone size={18} className="text-gray-400" />
                                                <span className="text-gray-600">{selectedOrder.telefono || selectedOrder.details.phone}</span>
                                            </div>
                                        )}
                                        {(selectedOrder.correo || selectedOrder.details?.email) && (
                                            <div className="flex items-center gap-3">
                                                <FileText size={18} className="text-gray-400" />
                                                <span className="text-gray-600">{selectedOrder.correo || selectedOrder.details.email}</span>
                                            </div>
                                        )}
                                        {(selectedOrder.direccion || selectedOrder.details?.address) && (
                                            <div className="flex items-start gap-3">
                                                <MapPin size={18} className="text-gray-400 mt-0.5" />
                                                <span className="text-gray-600">{selectedOrder.direccion || selectedOrder.details.address}</span>
                                            </div>
                                        )}
                                        {/* Botones de contacto rápido */}
                                        {(selectedOrder.telefono || selectedOrder.details?.phone) && (
                                            <div className="flex gap-2 pt-3 border-t border-gray-100 mt-3">
                                                <a
                                                    href={`tel:${(selectedOrder.telefono || selectedOrder.details.phone).replace(/[^0-9]/g, '')}`}
                                                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-500 text-white text-sm font-medium rounded-lg hover:bg-blue-600 transition-colors"
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    <Phone size={16} />
                                                    Llamar
                                                </a>
                                                <a
                                                    href={`https://wa.me/506${(selectedOrder.telefono || selectedOrder.details.phone).replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
                                                        `Hola ${selectedOrder.client}! 👋

Somos de BiKitchen, te contactamos sobre tu pedido ${selectedOrder.displayId}.

¿En qué podemos ayudarte?`
                                                    )}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-green-500 text-white text-sm font-medium rounded-lg hover:bg-green-600 transition-colors"
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    <MessageCircle size={16} />
                                                    WhatsApp
                                                </a>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Historial del Cliente */}
                                {customerHistory && (
                                    <div className="mb-6">
                                        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                                            <History size={14} />
                                            Historial del Cliente
                                        </h3>
                                        <div className={`rounded-xl p-4 border ${customerHistory.isNewCustomer
                                            ? 'bg-blue-50 border-blue-200'
                                            : customerHistory.isFrequent
                                                ? 'bg-green-50 border-green-200'
                                                : 'bg-white border-gray-100'
                                            }`}>
                                            {/* Badge de tipo de cliente */}
                                            <div className="flex items-center justify-between mb-3">
                                                {customerHistory.isNewCustomer ? (
                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full">
                                                        ✨ Cliente Nuevo
                                                    </span>
                                                ) : customerHistory.isFrequent ? (
                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-full">
                                                        ⭐ Cliente Frecuente
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-gray-100 text-gray-600 text-xs font-semibold rounded-full">
                                                        👤 Cliente Recurrente
                                                    </span>
                                                )}
                                            </div>

                                            {/* Estadísticas */}
                                            <div className="grid grid-cols-3 gap-3 mb-3">
                                                <div className="text-center p-2 bg-white/60 rounded-lg">
                                                    <div className="text-lg font-bold text-gray-800">{customerHistory.totalOrders}</div>
                                                    <div className="text-[10px] text-gray-500 uppercase">Pedidos</div>
                                                </div>
                                                <div className="text-center p-2 bg-white/60 rounded-lg">
                                                    <div className="text-lg font-bold text-orange-600">₡{customerHistory.totalSpent.toLocaleString('es-CR')}</div>
                                                    <div className="text-[10px] text-gray-500 uppercase">Total Gastado</div>
                                                </div>
                                                <div className="text-center p-2 bg-white/60 rounded-lg">
                                                    <div className="text-lg font-bold text-green-600">{customerHistory.deliveredOrders}</div>
                                                    <div className="text-[10px] text-gray-500 uppercase">Entregados</div>
                                                </div>
                                            </div>

                                            {/* Pedidos anteriores */}
                                            {customerHistory.recentOrders.length > 0 && (
                                                <div className="border-t border-gray-200/50 pt-3 mt-2">
                                                    <div className="text-xs text-gray-500 mb-2">Pedidos anteriores:</div>
                                                    <div className="space-y-1.5">
                                                        {customerHistory.recentOrders.map(order => (
                                                            <div key={order.id} className="flex items-center justify-between text-xs bg-white/80 px-2 py-1.5 rounded">
                                                                <span className="font-medium text-gray-700">{order.displayId}</span>
                                                                <span className="text-gray-500">{order.plan}</span>
                                                                <span className="font-semibold text-gray-800">{formatTotal(order)}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Zona de Envío */}
                                {selectedOrder.details?.zona && (
                                    <div className="mb-6">
                                        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
                                            Zona de Envío
                                        </h3>
                                        <div className="bg-white border border-gray-100 rounded-xl p-4 space-y-3">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <Truck size={18} className="text-orange-500" />
                                                    <span className="font-medium text-gray-800">{selectedOrder.details.zona}</span>
                                                </div>
                                                <span className="font-bold text-orange-600">
                                                    {selectedOrder.details.costoEnvio === 0
                                                        ? 'Gratis'
                                                        : `₡${selectedOrder.details.costoEnvio?.toLocaleString('es-CR') || 0}`
                                                    }
                                                </span>
                                            </div>
                                            {selectedOrder.details.ubicacionFueraCobertura && (
                                                <div className="flex items-start gap-3 bg-amber-50 p-3 rounded-lg border border-amber-200">
                                                    <AlertCircle size={18} className="text-amber-600 mt-0.5" />
                                                    <div>
                                                        <span className="text-xs font-medium text-amber-700 block">Fuera de cobertura - Dirección exacta:</span>
                                                        <span className="text-amber-800">{selectedOrder.details.ubicacionFueraCobertura}</span>
                                                    </div>
                                                </div>
                                            )}
                                            {(() => {
                                                const sch = getScheduleFromOrder(selectedOrder);
                                                if (Array.isArray(sch) && sch.length > 1) {
                                                    return (
                                                        <div className="flex items-start gap-3 text-sm text-gray-600">
                                                            <Calendar size={16} className="text-gray-400 mt-0.5" />
                                                            <div>
                                                                <div className="font-medium text-gray-700">Entregas programadas</div>
                                                                <ul className="mt-1 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 list-disc list-inside text-gray-600">
                                                                    {sch.map((d, i) => (
                                                                        <li key={i}> {d} <span className="text-gray-400">(9am-2pm)</span></li>
                                                                    ))}
                                                                </ul>
                                                            </div>
                                                        </div>
                                                    );
                                                }
                                                if (selectedOrder.fecha_entrega || selectedOrder.details.fechaEntrega) {
                                                    return (
                                                        <div className="flex items-center gap-3 text-sm text-gray-600">
                                                            <Calendar size={16} className="text-gray-400" />
                                                            <span>Entrega: {selectedOrder.fecha_entrega || selectedOrder.details.fechaEntrega}</span>
                                                        </div>
                                                    );
                                                }
                                                return null;
                                            })()}
                                            {selectedOrder.details.horarioEntrega && (
                                                <div className="flex items-center gap-3 text-sm text-gray-600">
                                                    <Clock size={16} className="text-gray-400" />
                                                    <span>Horario: {selectedOrder.details.horarioEntrega}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Products */}
                                <div className="mb-6">
                                    <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
                                        Productos del Pedido
                                    </h3>
                                    <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
                                        {(selectedOrder.items?.length > 0 || selectedOrder.details?.cart?.length > 0 || selectedOrder.menu?.length > 0) ? (
                                            <div className="divide-y divide-gray-50">
                                                {(selectedOrder.items || selectedOrder.details?.cart || selectedOrder.menu || []).map((item, idx) => (
                                                    <div key={idx} className="p-4 flex justify-between items-start">
                                                        <div className="flex-1">
                                                            <div className="font-medium text-gray-800">
                                                                {item.name || item.nombre}
                                                            </div>
                                                            {(() => {
                                                                const packName = item.name || item.nombre;
                                                                const normName = normalizeName(packName);
                                                                const rawPrice = (item.price ?? item.precio);
                                                                const priceValue = typeof rawPrice === 'number' ? rawPrice : parseInt(String(rawPrice).replace(/[^0-9]/g, '')) || 0;
                                                                let tp = null;
                                                                // Detectar Two Pack solo si es explícito por categoría/etiqueta, o por coincidencia de precio (fallback)
                                                                let isTwoPack = (item.category === 'two_pack') || /two\s*pack/i.test(item.categoryLabel || '');
                                                                if (!isTwoPack && priceValue > 0) {
                                                                    tp = twoPackList.find(p => [p.weekly, p.biweekly, p.monthly].includes(priceValue));
                                                                    isTwoPack = !!tp;
                                                                } else if (isTwoPack) {
                                                                    tp = twoPackList.find(p => normalizeName(p.name) === normName) || null;
                                                                }
                                                                const effectiveCategoryLabel = item.categoryLabel || (isTwoPack ? 'Two Pack' : null);
                                                                const planLbl = item.planLabel;
                                                                const desc = item.desc;
                                                                let finalProtein = proteinByNormName[normName] || item.protein || item.proteina || '';
                                                                if (isTwoPack && tp && tp.desc) {
                                                                    const m = (tp.desc || '').match(/([0-9]+)\s*g/i);
                                                                    if (m) finalProtein = `${m[1]}g`;
                                                                }
                                                                return (
                                                                    <>
                                                                        {planLbl && (
                                                                            <div className="text-sm text-orange-500">{planLbl}</div>
                                                                        )}
                                                                        {effectiveCategoryLabel && (
                                                                            <div className="text-xs text-purple-600 font-semibold">{effectiveCategoryLabel}</div>
                                                                        )}
                                                                        {desc && (
                                                                            <div className="text-sm text-gray-500 mt-1">{desc}</div>
                                                                        )}
                                                                        {Array.isArray(item.proteinas) && item.proteinas.length > 0 && (
                                                                            <div className="text-sm text-gray-500 mt-1">Incluye: {item.proteinas.join(', ')}</div>
                                                                        )}
                                                                        {finalProtein && (
                                                                            <div className="text-xs text-gray-400 mt-1">Proteína: {finalProtein}</div>
                                                                        )}
                                                                    </>
                                                                );
                                                            })()}
                                                            {item.extras?.length > 0 && (
                                                                <div className="text-xs text-gray-400">
                                                                    Extras: {item.extras.join(', ')}
                                                                </div>
                                                            )}
                                                            {/* SUSTITUCIONES — caja unificada para todos los formatos */}
                                                            {(() => {
                                                                const c = item.customizations || {};
                                                                const lines = [];
                                                                // Formato nuevo (3 categorías por plato)
                                                                (c.proteinChanges || []).forEach(d => lines.push({ icon: '🍗', text: `Plato ${d.dishNumber} (${d.dishName}) → ${d.newValue}` }));
                                                                (c.vegeChanges    || []).forEach(d => lines.push({ icon: '🥦', text: `Plato ${d.dishNumber} (${d.dishName}) → ${d.newValue}` }));
                                                                (c.carboChanges   || []).forEach(d => lines.push({ icon: '🍚', text: `Plato ${d.dishNumber} (${d.dishName}) → ${d.newValue}` }));
                                                                // Formato anterior
                                                                (c.dishChanges    || []).forEach(d => lines.push({ icon: '🍗', text: `Plato ${d.dishNumber} (${d.dishName}) → ${d.newProtein || d.newValue}` }));
                                                                // Legacy global
                                                                if (c.vegetal)  lines.push({ icon: '🥦', text: `Vegetal → ${c.vegetal}` });
                                                                if (c.carbo)    lines.push({ icon: '🍚', text: `Carbo → ${c.carbo}` });
                                                                if (c.protein)  lines.push({ icon: '🍗', text: `Proteína → ${c.protein}` });
                                                                if (lines.length === 0) return null;
                                                                return (
                                                                    <div className="mt-2 p-2 bg-orange-50 border border-orange-200 rounded-lg">
                                                                        <p className="text-orange-700 font-semibold text-xs mb-1">🔄 Sustituciones:</p>
                                                                        <div className="space-y-0.5">
                                                                            {lines.map((l, li) => (
                                                                                <p key={li} className="text-orange-800 text-xs">
                                                                                    {l.icon} <strong>{l.text}</strong>
                                                                                </p>
                                                                            ))}
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })()}
                                                            {/* NOTAS ESPECIALES - Destacadas (legacy) */}
                                                            {(item.notas || item.notes || item.customizations?.notes) && (
                                                                <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded-lg">
                                                                    <div className="flex items-start gap-2">
                                                                        <span className="text-amber-600 font-semibold text-sm">📝 Notas especiales:</span>
                                                                        <span className="text-amber-800 text-sm flex-1">
                                                                            {item.notas || item.notes || item.customizations.notes}
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div className="text-right ml-4">
                                                            <div className="font-bold text-gray-800">
                                                                ₡{((item.price || item.precio) * (item.quantity || item.cantidad)).toLocaleString('es-CR')}
                                                            </div>
                                                            <div className="text-sm text-gray-400">
                                                                x{item.quantity || item.cantidad}
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="p-4 text-center text-gray-500">
                                                <p className="font-medium">{selectedOrder.plan}</p>
                                                <p className="text-sm">{selectedOrder.items}</p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Notes */}
                                {selectedOrder.details?.notes && (
                                    <div className="mb-6">
                                        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
                                            Notas del Pedido
                                        </h3>
                                        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                                            <p className="text-amber-800">{selectedOrder.details.notes}</p>
                                        </div>
                                    </div>
                                )}

                                {/* Payment Info */}
                                <div className="mb-6">
                                    <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
                                        Información de Pago
                                    </h3>
                                    <div className="bg-white border border-gray-100 rounded-xl p-4">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-gray-500">Método de pago:</span>
                                            <span className="flex items-center gap-2 text-gray-800">
                                                <CreditCard size={16} />
                                                {selectedOrder.details?.paymentMethod || 'Por definir'}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                                            <span className="font-semibold text-gray-800">Total:</span>
                                            <span className="text-2xl font-bold text-orange-500">{formatTotal(selectedOrder)}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Quick Actions */}
                                <div className="mb-6">
                                    <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
                                        Acciones Rápidas
                                    </h3>
                                    <div className="flex flex-wrap gap-2">
                                        {selectedOrder.status === 'pending_payment' && (
                                            <button
                                                onClick={async () => {
                                                    const ok = window.confirm('¿Verificaste en el banco que el pago sí entró? Al confirmar, el pedido pasará a la hoja de cocina.');
                                                    if (!ok) return;
                                                    try {
                                                        await updateOrderStatus(selectedOrder.id, 'confirmed', { paymentStatus: 'paid', pendingReason: 'Confirmado manualmente por el admin' });
                                                        setSelectedOrder(prev => ({ ...prev, status: 'confirmed', paymentStatus: 'paid', pendingReason: 'Confirmado manualmente por el admin' }));
                                                    } catch (e) {
                                                        alert('Error al confirmar el pedido');
                                                    }
                                                }}
                                                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                                            >
                                                <CheckCircle size={16} />
                                                Forzar Confirmación
                                            </button>
                                        )}
                                        {selectedOrder.details?.phone && (
                                            <a
                                                href={`https://wa.me/506${selectedOrder.details.phone.replace(/\D/g, '')}?text=Hola ${selectedOrder.client}, gracias por tu pedido ${selectedOrder.displayId} en BiKitchen! 🍽️`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-green-500 text-white text-sm font-medium rounded-lg hover:bg-green-600 transition-colors"
                                            >
                                                <MessageCircle size={16} />
                                                WhatsApp
                                            </a>
                                        )}
                                        <button
                                            onClick={() => {
                                                const phone = selectedOrder.details?.phone;
                                                if (phone) {
                                                    window.location.href = `tel:${phone}`;
                                                }
                                            }}
                                            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-blue-500 text-white text-sm font-medium rounded-lg hover:bg-blue-600 transition-colors"
                                        >
                                            <Phone size={16} />
                                            Llamar
                                        </button>
                                        <button
                                            onClick={() => openClientProfile(selectedOrder)}
                                            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-white border text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
                                        >
                                            <Eye size={16} />
                                            Ver Perfil
                                        </button>
                                        <button
                                            onClick={() => addClientFromOrder(selectedOrder)}
                                            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-orange-500 text-white text-sm font-medium rounded-lg hover:bg-orange-600 transition-colors"
                                        >
                                            <UserPlus size={16} />
                                            Agregar a Clientes
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Modal Footer */}
                            <div className="flex items-center justify-between p-6 border-t border-gray-100 bg-gray-50">
                                <button
                                    onClick={() => exportInvoicesPDF('print')}
                                    className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:bg-gray-200 rounded-lg transition-colors"
                                >
                                    <Printer size={18} />
                                    Imprimir
                                </button>
                                <div className="flex items-center gap-2">
                                    {selectedOrder?.status === 'cancelled' && (
                                        <button
                                            onClick={async () => {
                                                const ok = window.confirm('¿Eliminar este pedido cancelado de forma permanente? Esta acción no se puede deshacer.');
                                                if (!ok) return;
                                                try {
                                                    await deleteOrder(selectedOrder.id);
                                                    setSelectedOrder(null);
                                                } catch (e) {
                                                    alert('Error al eliminar el pedido');
                                                }
                                            }}
                                            className="px-4 py-2 bg-red-500 text-white font-medium rounded-lg hover:bg-red-600 transition-colors"
                                        >
                                            Eliminar
                                        </button>
                                    )}
                                    <button
                                        onClick={() => setSelectedOrder(null)}
                                        className="px-6 py-2 bg-gray-800 text-white font-medium rounded-lg hover:bg-gray-900 transition-colors"
                                    >
                                        Cerrar
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Manual Order Modal */}
            <AnimatePresence>
                {showManualOrderModal && (
                    <div
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
                        onClick={() => setShowManualOrderModal(false)}
                    >
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            transition={{ duration: 0.2 }}
                            className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Modal Header */}
                            <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-gradient-to-r from-orange-500 to-orange-600">
                                <div>
                                    <h2 className="text-xl font-bold text-white">
                                        Nuevo Pedido Manual
                                    </h2>
                                    <p className="text-sm text-orange-100">
                                        Pedido vía WhatsApp u otro canal
                                    </p>
                                </div>
                                <button
                                    onClick={() => setShowManualOrderModal(false)}
                                    className="p-2 hover:bg-white/20 rounded-lg transition-colors text-white"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            {/* Modal Content */}
                            <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
                                {/* Customer Info */}
                                <div className="mb-6">
                                    <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
                                        Información del Cliente
                                    </h3>
                                {/* Buscador Rápido */}
                                <div className="mb-6 bg-orange-50/50 p-4 rounded-xl border border-orange-100">
                                    <label className="block text-sm font-medium text-orange-800 mb-1 flex items-center gap-2">
                                        <Search size={16} />
                                        Autocompletar Cliente Registrado
                                    </label>
                                    <div className="relative">
                                        <input
                                            type="text"
                                            placeholder="Buscar por nombre o teléfono..."
                                            value={clientSearchTerm}
                                            onChange={(e) => {
                                                setClientSearchTerm(e.target.value);
                                                setShowClientSuggestions(true);
                                            }}
                                            onFocus={() => setShowClientSuggestions(true)}
                                            className="w-full px-4 py-2.5 rounded-lg border border-orange-200 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none"
                                        />
                                        {showClientSuggestions && clientSearchTerm && (
                                            <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                                                {uniqueClients
                                                    .filter(c => c.name.toLowerCase().includes(clientSearchTerm.toLowerCase()) || c.phone.includes(clientSearchTerm))
                                                    .slice(0, 10) // Mostrar max 10 sugerencias
                                                    .map((client, idx) => (
                                                        <div
                                                            key={idx}
                                                            className="p-3 hover:bg-orange-50 cursor-pointer border-b border-gray-50 last:border-0"
                                                            onClick={() => {
                                                                setManualOrderData(prev => ({
                                                                    ...prev,
                                                                    clientName: client.name,
                                                                    phone: client.phone,
                                                                    address: client.address,
                                                                    zoneId: client.zoneId,
                                                                    zoneName: client.zoneName
                                                                }));
                                                                setClientSearchTerm('');
                                                                setShowClientSuggestions(false);
                                                            }}
                                                        >
                                                            <div className="font-medium text-gray-900">{client.name}</div>
                                                            <div className="text-sm text-gray-500">{client.phone} • {client.address?.substring(0, 40)}{client.address?.length > 40 ? '...' : ''}</div>
                                                        </div>
                                                    ))}
                                                {uniqueClients.filter(c => c.name.toLowerCase().includes(clientSearchTerm.toLowerCase()) || c.phone.includes(clientSearchTerm)).length === 0 && (
                                                    <div className="p-3 text-sm text-gray-500 text-center">No se encontraron clientes</div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Nombre del Cliente *
                                            </label>
                                            <input
                                                type="text"
                                                value={manualOrderData.clientName}
                                                onChange={(e) => setManualOrderData(prev => ({ ...prev, clientName: e.target.value }))}
                                                className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none"
                                                placeholder="Nombre completo"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Teléfono
                                            </label>
                                            <input
                                                type="tel"
                                                value={manualOrderData.phone}
                                                onChange={(e) => setManualOrderData(prev => ({ ...prev, phone: e.target.value }))}
                                                className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none"
                                                placeholder="8888-8888"
                                            />
                                        </div>
                                        <div className="col-span-2">
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Dirección de Entrega
                                            </label>
                                            <input
                                                type="text"
                                                value={manualOrderData.address}
                                                onChange={(e) => setManualOrderData(prev => ({ ...prev, address: e.target.value }))}
                                                className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none"
                                                placeholder="Dirección completa"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Método de Pago
                                            </label>
                                            <select
                                                value={manualOrderData.paymentMethod}
                                                onChange={(e) => setManualOrderData(prev => ({ ...prev, paymentMethod: e.target.value }))}
                                                className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none"
                                            >
                                                <option value="Efectivo">Efectivo (Contra Entrega)</option>
                                                <option value="sinpe">SINPE Móvil</option>
                                                <option value="transfer">Transferencia Bancaria</option>
                                                <option value="whatsapp">A convenir (WhatsApp)</option>
                                                <option value="Tarjeta">Tarjeta (Datafono)</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Zona de Envío
                                            </label>
                                            <select
                                                value={manualOrderData.zoneId || ''}
                                                onChange={(e) => {
                                                    const zoneId = e.target.value;
                                                    const zone = SHIPPING_ZONES.find(z => z.id === zoneId);
                                                    setManualOrderData(prev => ({
                                                        ...prev,
                                                        zoneId: zoneId,
                                                        zoneName: zone ? zone.name : '',
                                                        shippingCost: zone ? zone.cost : 0,
                                                        deliveryDate: '' // Reset date on zone change
                                                    }));
                                                }}
                                                className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none disabled:bg-gray-100 disabled:text-gray-400"
                                            >
                                                <option value="">Seleccionar Zona...</option>
                                                {SHIPPING_ZONES.map(zone => (
                                                    <option key={zone.id} value={zone.id}>
                                                        {zone.name} - ₡{zone.cost.toLocaleString()}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Fecha de Entrega / Inicio
                                            </label>
                                            <select
                                                value={manualOrderData.deliveryDate}
                                                onChange={(e) => setManualOrderData(prev => ({ ...prev, deliveryDate: e.target.value }))}
                                                disabled={!manualOrderData.zoneId}
                                                className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none disabled:bg-gray-100 disabled:text-gray-400"
                                            >
                                                <option value="">Seleccionar Fecha...</option>
                                                {getNextDeliveryDatesForZone(manualOrderData.zoneId).map((dateOpt, idx) => (
                                                    <option key={idx} value={dateOpt.value}>
                                                        {dateOpt.dayName} {dateOpt.dayNumber} de {dateOpt.month}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Notas
                                            </label>
                                            <input
                                                type="text"
                                                value={manualOrderData.notes}
                                                onChange={(e) => setManualOrderData(prev => ({ ...prev, notes: e.target.value }))}
                                                className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none"
                                                placeholder="Notas adicionales..."
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Products/Packs Tabs */}
                                <div className="mb-6">
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
                                            Agregar al Pedido
                                        </h3>
                                        <div className="flex bg-gray-100 rounded-lg p-1">
                                            <button
                                                onClick={() => setOrderType('packs')}
                                                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${orderType === 'packs'
                                                    ? 'bg-white text-orange-600 shadow-sm'
                                                    : 'text-gray-600 hover:text-gray-800'
                                                    }`}
                                            >
                                                📦 Packs
                                            </button>
                                            <button
                                                onClick={() => setOrderType('individuales')}
                                                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${orderType === 'individuales'
                                                    ? 'bg-white text-orange-600 shadow-sm'
                                                    : 'text-gray-600 hover:text-gray-800'
                                                    }`}
                                            >
                                                🍽️ Individuales
                                            </button>
                                        </div>
                                    </div>

                                    {/* Packs Section */}
                                    {orderType === 'packs' && (
                                        <div>
                                            {/* Plan Selector */}
                                            <div className="grid grid-cols-3 gap-1 mb-4">
                                                <button
                                                    onClick={() => setSelectedPlan('weekly')}
                                                    className={`py-2 px-1 rounded-lg text-xs sm:text-sm font-medium transition-all ${selectedPlan === 'weekly'
                                                        ? 'bg-orange-500 text-white shadow-md'
                                                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                                        }`}
                                                >
                                                    Semanal
                                                </button>
                                                <button
                                                    onClick={() => setSelectedPlan('biweekly')}
                                                    className={`py-2 px-1 rounded-lg text-xs sm:text-sm font-medium transition-all ${selectedPlan === 'biweekly'
                                                        ? 'bg-orange-500 text-white shadow-md'
                                                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                                        }`}
                                                >
                                                    Quincenal
                                                </button>
                                                <button
                                                    onClick={() => setSelectedPlan('monthly')}
                                                    className={`py-2 px-1 rounded-lg text-xs sm:text-sm font-medium transition-all ${selectedPlan === 'monthly'
                                                        ? 'bg-orange-500 text-white shadow-md'
                                                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                                        }`}
                                                >
                                                    Mensual
                                                </button>
                                            </div>

                                            {/* Category Tabs */}
                                            <div className="flex gap-2 mb-4 overflow-x-auto pb-2 scrollbar-hide">
                                                {Object.entries(PACKS_DATA).map(([key, data]) => (
                                                    <button
                                                        key={key}
                                                        onClick={() => setSelectedPackCategory(key)}
                                                        className={`flex-shrink-0 px-3 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${selectedPackCategory === key
                                                            ? 'bg-orange-100 text-orange-700 border border-orange-200'
                                                            : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border border-transparent'
                                                            }`}
                                                    >
                                                        {data.icon} {data.title}
                                                    </button>
                                                ))}
                                            </div>

                                            {/* Protein Pack Size Selector */}
                                            {selectedPackCategory === 'proteinas' && (
                                                <div className="flex justify-center mb-4">
                                                    <div className="flex bg-gray-100 rounded-lg p-1">
                                                        <button
                                                            onClick={() => setProteinPackSize('250g')}
                                                            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${proteinPackSize === '250g'
                                                                ? 'bg-white text-orange-600 shadow-sm'
                                                                : 'text-gray-600 hover:text-gray-800'
                                                                }`}
                                                        >
                                                            250g
                                                        </button>
                                                        <button
                                                            onClick={() => setProteinPackSize('500g')}
                                                            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${proteinPackSize === '500g'
                                                                ? 'bg-white text-orange-600 shadow-sm'
                                                                : 'text-gray-600 hover:text-gray-800'
                                                                }`}
                                                        >
                                                            500g
                                                        </button>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Pack Cards */}
                                            <div className="grid grid-cols-2 gap-2 sm:gap-3 max-h-64 overflow-y-auto">
                                                {PACKS_DATA[selectedPackCategory]?.packs.map((pack, idx) => {
                                                    // Determine price based on selected plan and size (for protein packs)
                                                    let price = 0;
                                                    if (selectedPackCategory === 'proteinas' && proteinPackSize === '500g') {
                                                        price = pack[`${selectedPlan}_500`] || 0;
                                                    } else {
                                                        price = pack[selectedPlan] || 0;
                                                    }

                                                    return (
                                                        <button
                                                            key={idx}
                                                            onClick={() => addPackToOrder(pack, selectedPackCategory)}
                                                            className="p-2 sm:p-3 bg-white border border-gray-200 rounded-xl hover:border-orange-300 hover:shadow-md transition-all text-left group flex flex-col justify-between h-full"
                                                        >
                                                            <div className="flex items-start gap-2 w-full">
                                                                <span className="text-xl sm:text-2xl">{pack.icon}</span>
                                                                <div className="flex-1 min-w-0">
                                                                    <div className="font-semibold text-gray-800 text-xs sm:text-sm leading-tight mb-1 group-hover:text-orange-600">
                                                                        {pack.name}
                                                                    </div>
                                                                    <div className="text-[10px] sm:text-xs text-gray-500 leading-tight mb-1 line-clamp-3">{pack.desc}</div>
                                                                    <div className="text-sm font-bold text-orange-500">
                                                                        {selectedPackCategory === 'proteinas' && (
                                                                            <span className="text-xs font-normal text-gray-400 mr-1">{proteinPackSize}</span>
                                                                        )}
                                                                        ₡{price.toLocaleString()}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}

                                    {/* Individuales Section */}
                                    {orderType === 'individuales' && (
                                        <div className="relative">
                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                            <input
                                                type="text"
                                                value={productSearch}
                                                onChange={(e) => {
                                                    setProductSearch(e.target.value);
                                                    setShowProductDropdown(true);
                                                }}
                                                onFocus={() => setShowProductDropdown(true)}
                                                className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-200 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none"
                                                placeholder="Buscar producto individual..."
                                            />

                                            {/* Product Dropdown */}
                                            {showProductDropdown && filteredProducts.length > 0 && (
                                                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 max-h-60 overflow-y-auto">
                                                    {filteredProducts.map(product => (
                                                        <button
                                                            key={product.id}
                                                            onClick={() => addProductToOrder(product)}
                                                            className="w-full text-left px-4 py-3 hover:bg-orange-50 flex justify-between items-start border-b border-gray-50 last:border-0"
                                                        >
                                                            <div className="flex-1 mr-4">
                                                                <div className="font-medium text-gray-800">{product.nombre}</div>
                                                                {/* Show description or ingredients for better identification */}
                                                                {(product.desc || product.descripcion || (product.ingredientes && product.ingredientes.length > 0)) && (
                                                                    <div className="text-xs text-gray-500 mt-0.5 line-clamp-2">
                                                                        {product.desc || product.descripcion || (Array.isArray(product.ingredientes) ? product.ingredientes.join(', ') : product.ingredientes)}
                                                                    </div>
                                                                )}
                                                                <div className="text-xs text-gray-400 mt-1 capitalize inline-block bg-gray-100 rounded px-1.5 py-0.5">
                                                                    {product.categoria}
                                                                </div>
                                                            </div>
                                                            <div className="text-right flex-shrink-0">
                                                                <div className="text-sm font-medium text-orange-500">₡{product.precio500.toLocaleString()}</div>
                                                                <div className="text-xs text-gray-400">500g</div>
                                                            </div>
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                </div>

                                {/* Selected Products/Packs */}
                                <div className="mb-6">
                                    <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
                                        Resumen del Pedido ({manualOrderData.items.length} items)
                                    </h3>
                                    {manualOrderData.items.length === 0 ? (
                                        <div className="text-center py-8 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                                            <Package size={40} className="mx-auto mb-2 text-gray-300" />
                                            <p className="text-gray-500">No hay productos agregados</p>
                                            <p className="text-sm text-gray-400">Selecciona packs o busca productos individuales</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-2 max-h-48 overflow-y-auto">
                                            {manualOrderData.items.map((item, index) => (
                                                <div key={index} className={`flex items-center gap-3 p-3 rounded-lg ${item.isPack ? 'bg-orange-50 border border-orange-100' : 'bg-gray-50'}`}>
                                                    {item.isPack && <span className="text-xl">{item.icon}</span>}
                                                    <div className="flex-1 min-w-0">
                                                        <div className="font-medium text-gray-800 truncate">
                                                            {item.name}
                                                        </div>
                                                        <div className="text-sm text-orange-500">
                                                            ₡{item.price.toLocaleString()} × {item.quantity} = ₡{(item.price * item.quantity).toLocaleString()}
                                                        </div>
                                                        {item.isPack && (
                                                            <span className="inline-block mt-1 px-2 py-0.5 bg-orange-100 text-orange-700 text-xs rounded-full">
                                                                {item.size}
                                                            </span>
                                                        )}
                                                    </div>
                                                    {!item.isPack && (
                                                        <select
                                                            value={item.size}
                                                            onChange={(e) => updateItemSize(index, e.target.value)}
                                                            className="px-2 py-1 text-sm border border-gray-200 rounded-lg"
                                                        >
                                                            <option value="500g">500g</option>
                                                            <option value="1kg">1kg</option>
                                                        </select>
                                                    )}
                                                    <div className="flex items-center gap-1">
                                                        <button
                                                            onClick={() => updateItemQuantity(index, item.quantity - 1)}
                                                            className="w-7 h-7 flex items-center justify-center bg-white border border-gray-200 rounded-lg hover:bg-gray-100 text-sm"
                                                        >
                                                            -
                                                        </button>
                                                        <span className="w-6 text-center font-medium text-sm">{item.quantity}</span>
                                                        <button
                                                            onClick={() => updateItemQuantity(index, item.quantity + 1)}
                                                            className="w-7 h-7 flex items-center justify-center bg-white border border-gray-200 rounded-lg hover:bg-gray-100 text-sm"
                                                        >
                                                            +
                                                        </button>
                                                    </div>
                                                    <button
                                                        onClick={() => removeItem(index)}
                                                        className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Total */}
                                {/* Total & Discount */}
                                {manualOrderData.items.length > 0 && (
                                    <div className="space-y-4">
                                        {/* Discount Control */}
                                        <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                                            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
                                                Descuentos
                                            </h3>
                                            <div className="flex gap-4 items-end">
                                                <div className="flex-1">
                                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                                        Valor del Descuento
                                                    </label>
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        value={manualOrderData.discount}
                                                        onChange={(e) => setManualOrderData(prev => ({ ...prev, discount: Number(e.target.value) }))}
                                                        className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none"
                                                    />
                                                </div>
                                                <div className="flex bg-white rounded-lg border border-gray-200 p-1 h-[42px]">
                                                    <button
                                                        onClick={() => setManualOrderData(prev => ({ ...prev, discountType: 'percentage' }))}
                                                        className={`px-3 rounded-md text-sm font-medium transition-all ${manualOrderData.discountType === 'percentage'
                                                            ? 'bg-orange-100 text-orange-700'
                                                            : 'text-gray-500 hover:bg-gray-50'
                                                            }`}
                                                    >
                                                        %
                                                    </button>
                                                    <button
                                                        onClick={() => setManualOrderData(prev => ({ ...prev, discountType: 'amount' }))}
                                                        className={`px-3 rounded-md text-sm font-medium transition-all ${manualOrderData.discountType === 'amount'
                                                            ? 'bg-orange-100 text-orange-700'
                                                            : 'text-gray-500 hover:bg-gray-50'
                                                            }`}
                                                    >
                                                        ₡
                                                    </button>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Final Calculation */}
                                        <div className="p-4 bg-orange-50 rounded-xl border border-orange-100">
                                            <div className="space-y-2 mb-3 pb-3 border-b border-orange-200/50">
                                                <div className="flex justify-between items-center text-sm text-gray-600">
                                                    <span>Subtotal:</span>
                                                    <span>₡{manualOrderTotal.subtotal.toLocaleString('es-CR')}</span>
                                                </div>
                                                {(manualOrderData.shippingCost > 0) && (
                                                    <div className="flex justify-between items-center text-sm text-gray-600">
                                                        <span>Envío:</span>
                                                        <span>+ ₡{Number(manualOrderData.shippingCost).toLocaleString('es-CR')}</span>
                                                    </div>
                                                )}
                                                {manualOrderTotal.discountValue > 0 && (
                                                    <div className="flex justify-between items-center text-sm font-medium text-green-600">
                                                        <span>Descuento {manualOrderData.discountType === 'percentage' ? `(${manualOrderData.discount}%)` : ''}:</span>
                                                        <span>- ₡{manualOrderTotal.discountValue.toLocaleString('es-CR')}</span>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <span className="text-lg font-medium text-gray-700">Total Final:</span>
                                                <span className="text-2xl font-bold text-orange-500">
                                                    ₡{manualOrderTotal.finalTotal.toLocaleString('es-CR')}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Modal Footer */}
                            <div className="flex items-center justify-between p-6 border-t border-gray-100 bg-gray-50">
                                <button
                                    onClick={() => setShowManualOrderModal(false)}
                                    className="px-6 py-2.5 text-gray-600 hover:bg-gray-200 rounded-lg transition-colors font-medium"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleSaveManualOrder}
                                    disabled={!manualOrderData.clientName.trim() || manualOrderData.items.length === 0}
                                    className="px-6 py-2.5 bg-orange-500 text-white font-medium rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                >
                                    <Plus size={18} />
                                    Crear Pedido
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
            {/* Error Payment Modal */}
            <AnimatePresence>
                {showErrorModal && selectedError && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
                        onClick={() => setShowErrorModal(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.95, y: 20 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6"
                        >
                            <div className="flex items-start gap-4">
                                <div className="flex-shrink-0">
                                    <div className="flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                                        <AlertCircle className="h-6 w-6 text-red-600" />
                                    </div>
                                </div>
                                <div className="flex-1">
                                    <h3 className="text-lg font-bold text-gray-900">Error de Pago</h3>
                                    <div className="mt-4 p-4 bg-red-50 rounded-lg border border-red-200">
                                        <p className="text-red-800 text-sm font-medium whitespace-pre-wrap break-words">
                                            {selectedError}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-6 flex gap-3">
                                <button
                                    onClick={() => setShowErrorModal(false)}
                                    className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                                >
                                    Cerrar
                                </button>
                                <button
                                    onClick={() => {
                                        navigator.clipboard.writeText(selectedError);
                                        setShowErrorModal(false);
                                    }}
                                    className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium"
                                >
                                    Copiar
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Client Profile Modal (Shared) */}
            <ClientProfileModal
                isOpen={showClientProfile}
                onClose={() => setShowClientProfile(false)}
                clientProfile={clientProfile}
                relatedOrders={clientRelatedOrders}
                clientPoints={clientPoints}
            />
        </div>
    );
}

