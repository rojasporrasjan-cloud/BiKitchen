import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu as MenuIcon, LogOut, X, LayoutDashboard, ShoppingBag, Package, Users, ClipboardList, Truck, UtensilsCrossed, Gift, Tag, Search, Bell, Monitor, Smartphone, Image, Upload, MessageCircle, FileText, Target } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useOrders } from '../context/OrdersContext';
import { getAllCoupons } from '../utils/firestoreCoupons';
import '../utils/deleteAllData'; // Importar script de eliminación (disponible en consola)


// Hook para detectar si es móvil
function useIsMobile() {
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 1024); // Menos de 1024px = móvil/tablet
        };

        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    return isMobile;
}

// Layout principal del panel de administración - BiKitchen Brand
export default function AdminLayout() {
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [pendingOrdersCount, setPendingOrdersCount] = useState(0);
    const { logout, currentUser } = useAuth();
    const navigate = useNavigate();
    const isMobile = useIsMobile();
    const { orders, getStats } = useOrders();

    const [pendingGiftCardsCount, setPendingGiftCardsCount] = useState(0);

    // Usar OrdersContext para obtener conteo de pedidos pendientes (evita listener duplicado)
    useEffect(() => {
        try {
            const stats = getStats?.();
            if (stats && typeof stats.pendingOrders === 'number') {
                setPendingOrdersCount(stats.pendingOrders);
            }
        } catch (e) { }
    }, [orders, getStats]);

    // Obtener conteo de tarjetas de regalo pendientes
    useEffect(() => {
        const loadPendingGiftCards = async () => {
            try {
                const coupons = await getAllCoupons();
                const pending = coupons.filter(c => c.isGiftCard && c.paymentStatus === 'pending');
                setPendingGiftCardsCount(pending.length);
            } catch (e) {
                console.error('Error loading pending gift cards for badge:', e);
            }
        };

        loadPendingGiftCards();
        // Podríamos añadir un intervalo o un listener si fuera crítico
    }, []);

    // Bloquear acceso en móviles - DESHABILITADO para permitir acceso a Gina
    // if (isMobile) {
    //     return (
    //         <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-6">
    //             <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md text-center">
    //                 <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-6">
    //                     <Monitor size={40} className="text-orange-500" />
    //                 </div>
    //                 <h1 className="text-2xl font-bold text-gray-900 mb-3">
    //                     Panel de Administración
    //                 </h1>
    //                 <p className="text-gray-600 mb-6">
    //                     El panel de administración está optimizado para computadoras. 
    //                     Por favor, accede desde una laptop o PC para una mejor experiencia.
    //                 </p>
    //                 <div className="flex items-center justify-center gap-2 text-sm text-gray-400 mb-6">
    //                     <Smartphone size={16} />
    //                     <span>Dispositivo móvil detectado</span>
    //                 </div>
    //                 <Link 
    //                     to="/"
    //                     className="inline-flex items-center gap-2 px-6 py-3 bg-orange-500 text-white rounded-xl font-medium hover:bg-orange-600 transition-colors"
    //                 >
    //                     Volver al Inicio
    //                 </Link>
    //             </div>
    //         </div>
    //     );
    // }

    // Menú organizado por flujo de trabajo
    const menuItems = [
        // 📊 General
        { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },

        // 🛒 Ventas
        { to: '/admin/orders', label: 'Pedidos', icon: ShoppingBag, badge: pendingOrdersCount },
        { to: '/admin/clients', label: 'Clientes', icon: Users },

        // 🍳 Operaciones
        { to: '/admin/sheets', label: 'Producción', icon: ClipboardList },
        { to: '/admin/dispatch-sheet', label: 'Hoja de Despacho', icon: FileText },
        { to: '/admin/delivery', label: 'Reparto', icon: Truck },

        // 📦 Inventario
        { to: '/admin/inventory', label: 'Inventario', icon: Package },

        // 🎁 Marketing
        { to: '/admin/menus', label: 'Menús', icon: UtensilsCrossed },
        { to: '/admin/pack-images', label: 'Imágenes Packs', icon: Image },
        { to: '/admin/promotions', label: 'Promociones', icon: Gift },
        { to: '/admin/coupons', label: 'Cupones', icon: Tag },
        { to: '/admin/gift-cards', label: 'Tarjeta de Regalo', icon: Gift, badge: pendingGiftCardsCount },
        { to: '/admin/reports', label: 'Admin', icon: Target, highlight: true },
        { to: '/admin/notifications', label: 'Notificaciones', icon: Bell },
        { to: '/admin/imagenes', label: 'Subir Imágenes', icon: Upload },

        // ⚙️ Configuración
        { to: '/admin/whatsapp-config', label: 'WhatsApp', icon: MessageCircle },
        { to: '/admin/shipping', label: 'Costos de Envío', icon: Truck },
        { to: '/admin/shipping-discount', label: 'Descuento Envío', icon: Truck },
    ];

    const handleLogout = async () => {
        await logout();
        navigate('/');
    };

    const SidebarContent = ({ mobile = false, collapsed = false }) => (
        <>
            {/* Header del Sidebar */}
            <div className={`p-5 border-b border-white/10 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex justify-between items-center ${collapsed ? 'px-4' : ''}`}>
                <Link to="/" className="flex items-center gap-3 group">
                    <div className="shrink-0 w-12 h-12 bg-gradient-to-br from-orange-500 via-amber-500 to-orange-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:shadow-xl group-hover:scale-105 transition-all duration-300 overflow-hidden">
                        <img
                            src="/assets/logo.png"
                            alt="BiKitchen Food"
                            className="h-8 w-auto object-contain block mx-auto"
                        />
                    </div>
                    {!collapsed && (
                        <motion.div
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="flex flex-col"
                        >
                            <span className="text-base font-bold tracking-wide bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">BiKitchen</span>
                            <span className="text-[10px] text-orange-400 tracking-widest uppercase font-semibold">Panel Admin</span>
                        </motion.div>
                    )}
                </Link>
                {mobile && (
                    <button
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="text-white/60 hover:text-white transition-colors md:hidden p-1"
                    >
                        <X size={20} />
                    </button>
                )}
            </div>

            {/* Navegación con scroll - Fixed scroll issue */}
            <nav className="flex-1 overflow-y-auto overscroll-contain p-3 space-y-1.5" style={{ scrollbarGutter: 'stable' }}>
                {menuItems.map((item, index) => (
                    <motion.div
                        key={item.to}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.03 }}
                    >
                        <NavLink
                            to={item.to}
                            end={item.end}
                            onClick={() => mobile && setIsMobileMenuOpen(false)}
                            title={collapsed ? item.label : ''}
                            className={({ isActive }) =>
                                `flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 group ${isActive
                                    ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-lg shadow-orange-500/40 scale-105'
                                    : item.highlight
                                        ? 'text-bikitchen-gold hover:text-white hover:bg-gradient-to-r hover:from-orange-500/20 hover:to-amber-500/20'
                                        : 'text-gray-400 hover:text-white hover:bg-white/10 hover:scale-102'
                                } ${collapsed ? 'justify-center px-0' : ''}`
                            }
                        >
                            {({ isActive }) => (
                                <>
                                    <div className={`shrink-0 transition-transform duration-300 ${isActive ? 'scale-110' : 'group-hover:scale-110'
                                        }`}>
                                        <item.icon size={20} />
                                    </div>
                                    {!collapsed && (
                                        <motion.span
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            className="text-sm font-semibold whitespace-nowrap"
                                        >
                                            {item.label}
                                        </motion.span>
                                    )}
                                    {item.badge > 0 && (
                                        <span className={`${collapsed ? 'absolute -top-1 -right-1' : 'ml-auto'} min-w-[22px] h-6 flex items-center justify-center text-[11px] bg-gradient-to-r from-red-500 to-rose-500 text-white px-2 rounded-full font-bold shadow-lg animate-pulse`}>
                                            {item.badge}
                                        </span>
                                    )}
                                    {item.highlight && !item.badge && !collapsed && (
                                        <span className="ml-auto text-[10px] bg-gradient-to-r from-yellow-400 to-orange-400 text-gray-900 px-2 py-1 rounded-full font-bold shadow-md">
                                            NEW
                                        </span>
                                    )}
                                </>
                            )}
                        </NavLink>
                    </motion.div>
                ))}
            </nav>

            {/* Footer del Sidebar */}
            <div className={`p-3 border-t border-white/10 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 ${collapsed ? 'px-2' : ''}`}>
                {/* User Info */}
                {currentUser && !collapsed && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="px-4 py-3 mb-2 bg-white/5 rounded-xl border border-white/10"
                    >
                        <p className="text-xs text-gray-300 truncate font-medium">{currentUser.email}</p>
                        <p className="text-[10px] text-orange-400 font-bold uppercase tracking-wider mt-0.5">Administrador</p>
                    </motion.div>
                )}
                <button
                    onClick={handleLogout}
                    title={collapsed ? 'Cerrar Sesión' : ''}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl text-white/70 hover:text-white hover:bg-gradient-to-r hover:from-red-500/20 hover:to-rose-500/20 w-full transition-all text-sm font-medium group ${collapsed ? 'justify-center px-0' : ''}`}
                >
                    <LogOut size={18} className="shrink-0 group-hover:scale-110 transition-transform" />
                    {!collapsed && <span>Cerrar Sesión</span>}
                </button>
            </div>
        </>
    );

    return (
        <div className="flex h-screen bg-gray-50 font-sans text-gray-800 overflow-hidden">
            {/* Desktop Sidebar */}
            <motion.aside
                initial={false}
                animate={{ width: isSidebarCollapsed ? 80 : 256 }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 hidden md:flex flex-col shadow-2xl border-r border-white/5 z-20 overflow-hidden"
            >
                <SidebarContent collapsed={isSidebarCollapsed} />
            </motion.aside>

            {/* Mobile Sidebar Drawer */}
            <AnimatePresence>
                {isMobileMenuOpen && (
                    <>
                        {/* Backdrop */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsMobileMenuOpen(false)}
                            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
                        />

                        {/* Drawer */}
                        <motion.aside
                            initial={{ x: -280 }}
                            animate={{ x: 0 }}
                            exit={{ x: -280 }}
                            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                            className="fixed left-0 top-0 bottom-0 w-72 bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 text-white flex flex-col shadow-2xl border-r border-white/5 z-50 md:hidden"
                        >
                            <SidebarContent mobile />
                        </motion.aside>
                    </>
                )}
            </AnimatePresence>

            {/* Main Content */}
            <div className="flex-1 flex flex-col h-full overflow-hidden relative">
                {/* Header */}
                <header className="bg-gradient-to-r from-white via-gray-50 to-white shadow-sm p-3 md:p-4 flex justify-between items-center sticky top-0 z-10 border-b border-gray-200 backdrop-blur-sm shrink-0">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setIsMobileMenuOpen(true)}
                            className="md:hidden p-2.5 text-gray-700 hover:text-orange-500 hover:bg-orange-50 rounded-xl transition-all active:scale-95"
                        >
                            <MenuIcon size={24} />
                        </button>

                        {/* Toggle Sidebar Desktop */}
                        <button
                            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                            className="hidden md:flex p-2.5 text-gray-700 hover:text-orange-500 hover:bg-orange-50 rounded-xl transition-all active:scale-95"
                            title={isSidebarCollapsed ? "Expandir menú" : "Contraer menú"}
                        >
                            <MenuIcon size={24} className={`transition-transform duration-300 ${isSidebarCollapsed ? 'rotate-180' : ''}`} />
                        </button>
                    </div>

                    {/* Global Search */}
                    <div className="hidden md:flex items-center bg-gradient-to-r from-gray-100 to-gray-50 px-4 py-2.5 rounded-2xl w-96 border border-gray-200 hover:border-orange-300 transition-all shadow-sm hover:shadow-md">
                        <Search size={18} className="text-gray-400 mr-2" />
                        <input
                            type="text"
                            placeholder="Buscar pedidos, clientes o ítems..."
                            className="bg-transparent border-none outline-none text-sm w-full text-gray-700 placeholder:text-gray-400 font-medium"
                        />
                    </div>

                    <div className="flex items-center gap-3 ml-auto">
                        {/* Notificaciones */}
                        <button className="relative text-gray-500 hover:text-orange-500 transition-all p-2.5 hover:bg-orange-50 rounded-xl group">
                            <Bell size={20} className="group-hover:scale-110 transition-transform" />
                            <span className="absolute top-2 right-2 w-2 h-2 bg-gradient-to-r from-orange-500 to-red-500 rounded-full border border-white animate-pulse shadow-sm"></span>
                        </button>

                        {/* Usuario */}
                        <div className="flex items-center gap-3 pl-2 md:pl-4 md:border-l-2 border-gray-200">
                            <div className="text-right hidden sm:block">
                                <p className="text-sm font-bold text-gray-800">Admin</p>
                                <p className="text-xs text-orange-500 font-semibold">Super Usuario</p>
                            </div>
                            <div className="w-10 h-10 md:w-11 md:h-11 bg-gradient-to-br from-orange-500 via-amber-500 to-orange-600 rounded-xl md:rounded-2xl flex items-center justify-center text-white font-bold text-sm shadow-lg hover:shadow-xl hover:scale-105 transition-all cursor-pointer">
                                AU
                            </div>
                        </div>
                    </div>
                </header>

                {/* Contenido principal */}
                <main className="flex-1 overflow-y-auto overflow-x-hidden p-3 md:p-6 bg-gradient-to-br from-gray-50 via-white to-gray-50">

                    <Outlet />
                </main>
            </div>
        </div>
    );
}
