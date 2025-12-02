import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import LandingPage from './pages/LandingPage';
import CatalogPage from './pages/CatalogPage';
import IndividualesView from './views/IndividualesView';
import PacksPage from './pages/PacksPage';
import AdminLayout from './layouts/AdminLayout';
import DashboardView from './pages/admin/DashboardView';
import OrdersView from './pages/admin/OrdersView';
import InventoryView from './pages/admin/InventoryView';
import ClientsView from './pages/admin/ClientsView';
import PurchasesView from './pages/admin/PurchasesView';
import SheetsView from './pages/admin/SheetsView';
import KitchenView from './pages/admin/KitchenView';
import PackagingView from './pages/admin/PackagingView';
import DeliveryView from './pages/admin/DeliveryView';
import WorkloadView from './pages/admin/WorkloadView';
import MenusView from './views/MenusView';
import Login from './pages/admin/Login';

import SmoothScroll from './components/SmoothScroll';
import CinematicPreloader from './components/CinematicPreloader';
import CinematicGrain from './components/CinematicGrain';
import CartDrawer from './components/CartDrawer';
import CartButton from './components/CartButton';
import AISommelier from './components/AISommelier';

import { AudioProvider } from './context/AudioContext';
import { ThemeProvider } from './context/ThemeContext';
import { CartProvider } from './context/CartContext';
import { OrdersProvider } from './context/OrdersContext';
import ThemeToggle from './components/ThemeToggle';

function AnimatedRoutes() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        {/* Public Routes */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/menu" element={<CatalogPage />} />
        <Route path="/individuales" element={<IndividualesView />} />
        <Route path="/packs" element={<PacksPage />} />

        {/* Admin Routes */}
        <Route path="/admin/login" element={<Login />} />
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<DashboardView />} />
          <Route path="orders" element={<OrdersView />} />
          <Route path="inventory" element={<InventoryView />} />
          <Route path="clients" element={<ClientsView />} />
          <Route path="purchases" element={<PurchasesView />} />
          <Route path="menus" element={<MenusView />} />
          <Route path="sheets" element={<SheetsView />} />
          <Route path="kitchen" element={<KitchenView />} />
          <Route path="packaging" element={<PackagingView />} />
          <Route path="delivery" element={<DeliveryView />} />
          <Route path="workload" element={<WorkloadView />} />
        </Route>
      </Routes>
    </AnimatePresence>
  );
}

function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

function AppContent() {
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith('/admin');

  return (
    <AudioProvider>
      <ThemeProvider>
        <CartProvider>
          <OrdersProvider>
            <div className="App min-h-screen bg-white dark:bg-gray-900 transition-colors duration-300">
              <CinematicGrain />
              <CinematicPreloader />
              <SmoothScroll />

              {/* Only show these on public routes */}
              {!isAdminRoute && (
                <>
                  <ThemeToggle />
                  <CartButton />
                  <CartDrawer />
                  <AISommelier />
                </>
              )}

              <AnimatedRoutes />
            </div>
          </OrdersProvider>
        </CartProvider>
      </ThemeProvider>
    </AudioProvider>
  );
}

export default App;
