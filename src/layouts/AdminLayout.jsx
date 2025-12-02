import React, { useState } from 'react';
import { NavLink, Outlet, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu as MenuIcon, Search, Bell, LogOut, X, LayoutDashboard, ShoppingBag, Package, Users, FileText, ClipboardList, Truck, PieChart, UtensilsCrossed } from 'lucide-react';

// Layout principal del panel de administración - BiKitchen Brand
export default function AdminLayout() {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const menuItems = [
        { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
        { to: '/admin/orders', label: 'Pedidos', icon: ShoppingBag },
        { to: '/admin/inventory', label: 'Inventario', icon: Package },
        { to: '/admin/clients', label: 'Clientes', icon: Users },
        { to: '/admin/purchases', label: 'Compras', icon: FileText },
        { to: '/admin/menus', label: 'Menús Semanales', icon: UtensilsCrossed },
        { to: '/admin/sheets', label: 'Hojas de Producción', icon: ClipboardList },
        { to: '/admin/workload', label: 'Carga Laboral', icon: PieChart },
        { to: '/admin/delivery', label: 'Reparto', icon: Truck }
    ];

    const handleLogout = () => {
        window.location.href = '/admin/login';
    };

    const SidebarContent = ({ mobile = false }) => (
        <>
            {/* Header del Sidebar */}
            <div className="flex items-center justify-between p-5 border-b border-white/10">
                <Link to="/" className="flex items-center gap-3 group">
                    <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-md group-hover:shadow-lg transition-shadow">
                        <img
                            src="/assets/logo.jpg"
                            alt="BiKitchen Food"
                            className="h-7 w-auto object-contain"
                        />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-sm font-bold tracking-wide text-white">BiKitchen</span>
                        <span className="text-[10px] text-gray-400 tracking-widest uppercase">Panel Admin</span>
                    </div>
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

            {/* Navegación con scroll */}
            <nav className="flex-1 overflow-y-auto p-3 space-y-1">
                {menuItems.map((item) => (
                    <NavLink
                        key={item.to}
                        to={item.to}
                        end={item.end}
                        onClick={() => mobile && setIsMobileMenuOpen(false)}
                        className={({ isActive }) =>
                            `flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 ${
                                isActive
                                    ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/30'
                                    : 'text-gray-400 hover:text-white hover:bg-white/10'
                            }`
                        }
                    >
                        <item.icon size={18} />
                        <span className="text-sm font-medium">{item.label}</span>
                    </NavLink>
                ))}
            </nav>

            {/* Footer del Sidebar */}
            <div className="p-3 border-t border-white/10">
                <button
                    onClick={handleLogout}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-white/60 hover:text-white hover:bg-white/10 w-full transition-all text-sm"
                >
                    <LogOut size={18} />
                    <span>Cerrar Sesión</span>
                </button>
            </div>
        </>
    );

    return (
        <div className="flex h-screen bg-gray-50 font-sans text-gray-800">
            {/* Desktop Sidebar */}
            <aside className="w-64 bg-gray-900 hidden md:flex flex-col shadow-2xl z-20">
                <SidebarContent />
            </aside>

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
                            className="fixed left-0 top-0 bottom-0 w-64 bg-gray-900 text-white flex flex-col shadow-2xl z-50 md:hidden"
                        >
                            <SidebarContent mobile />
                        </motion.aside>
                    </>
                )}
            </AnimatePresence>

            {/* Main Content */}
            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Header */}
                <header className="bg-white shadow-sm p-4 flex justify-between items-center sticky top-0 z-10 border-b border-gray-100">
                    <button
                        onClick={() => setIsMobileMenuOpen(true)}
                        className="md:hidden text-gray-700 hover:text-orange-500 transition-colors"
                    >
                        <MenuIcon size={24} />
                    </button>

                    {/* Global Search */}
                    <div className="hidden md:flex items-center bg-gray-100 px-4 py-2 rounded-xl w-96">
                        <Search size={16} className="text-gray-400 mr-2" />
                        <input
                            type="text"
                            placeholder="Buscar pedidos, clientes o ítems..."
                            className="bg-transparent border-none outline-none text-sm w-full text-gray-700 placeholder:text-gray-400"
                        />
                    </div>

                    <div className="flex items-center gap-4 ml-auto">
                        {/* Notificaciones */}
                        <button className="relative text-gray-500 hover:text-orange-500 transition-colors p-2 hover:bg-orange-50 rounded-xl">
                            <Bell size={20} />
                            <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-orange-500 rounded-full border-2 border-white"></span>
                        </button>

                        {/* Usuario */}
                        <div className="flex items-center gap-3 pl-4 border-l border-gray-200">
                            <div className="text-right hidden sm:block">
                                <p className="text-sm font-bold text-gray-800">Admin</p>
                                <p className="text-xs text-gray-500">Super Usuario</p>
                            </div>
                            <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-amber-500 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-md">
                                AU
                            </div>
                        </div>
                    </div>
                </header>

                {/* Contenido principal */}
                <main className="flex-1 overflow-auto p-4 sm:p-6 bg-gray-50">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}
