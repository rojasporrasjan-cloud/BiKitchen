import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { lazy, Suspense, Component, useEffect } from 'react';
import './utils/updateWhatsAppNumber'; // Script para actualizar número de WhatsApp
import { checkAppVersion } from './utils/appVersion'; // Sistema de versión para forzar actualizaciones
import { hardRefresh } from './utils/cacheUtils';
import { captureSource } from './services/sourceTracking';

// Critical pages - loaded immediately
import LandingPage from './pages/LandingPage';

// Lazy loaded pages - loaded on demand
const CatalogPage = lazy(() => import('./pages/CatalogPage'));
const IndividualesView = lazy(() => import('./views/IndividualesView'));
const PacksPage = lazy(() => import('./pages/PacksPage'));
const PromocionesPage = lazy(() => import('./pages/PromocionesPage'));
const NosotrosPage = lazy(() => import('./pages/NosotrosPage'));
const ComoFuncionaPage = lazy(() => import('./pages/ComoFuncionaPage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const TerminosPage = lazy(() => import('./pages/TerminosPage'));
const PrivacidadPage = lazy(() => import('./pages/PrivacidadPage'));
const CookiesPage = lazy(() => import('./pages/CookiesPage'));
const ReembolsosPage = lazy(() => import('./pages/ReembolsosPage'));
const FAQPage = lazy(() => import('./pages/FAQPage'));
const ComparadorPage = lazy(() => import('./pages/ComparadorPage'));
const CalculadoraAhorroPage = lazy(() => import('./pages/CalculadoraAhorroPage'));
const ReferidosPage = lazy(() => import('./pages/ReferidosPage'));
const MiImpactoPage = lazy(() => import('./pages/MiImpactoPage'));
const MisPedidosPage = lazy(() => import('./pages/MisPedidosPage'));
const GiftCardsPage = lazy(() => import('./pages/GiftCardsPage'));
const FidelidadPage = lazy(() => import('./pages/FidelidadPage'));
const RewardStore = lazy(() => import('./pages/RewardStore'));
const MiCuentaPage = lazy(() => import('./pages/MiCuentaPage'));
const MisCuponesPage = lazy(() => import('./pages/MisCuponesPage'));
const AccesoDenegadoPage = lazy(() => import('./pages/AccesoDenegadoPage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));
const TilopayReturnPage = lazy(() => import('./pages/TilopayReturnPage'));
const TestWhatsAppPage = lazy(() => import('./pages/TestWhatsAppPage'));

// Admin pages - lazy loaded
const AdminLayout = lazy(() => import('./layouts/AdminLayout'));
const DashboardView = lazy(() => import('./pages/admin/DashboardView'));
const OrdersView = lazy(() => import('./pages/admin/OrdersView'));
const ClientsView = lazy(() => import('./pages/admin/ClientsView'));
const SheetsView = lazy(() => import('./pages/admin/SheetsView'));
const DeliveryView = lazy(() => import('./pages/admin/DeliveryView'));
const InventoryView = lazy(() => import('./pages/admin/InventoryView'));
const MenusView = lazy(() => import('./views/MenusView'));
const PromotionsView = lazy(() => import('./pages/admin/PromotionsView'));
const CouponsView = lazy(() => import('./pages/admin/CouponsView'));
const PackImagesView = lazy(() => import('./pages/admin/PackImagesView'));
const NotificationsView = lazy(() => import('./pages/admin/NotificationsView'));
const ImageUploadPage = lazy(() => import('./pages/admin/ImageUploadPage'));
const DispatchSheetView = lazy(() => import('./pages/admin/DispatchSheetView'));
const WhatsAppConfigView = lazy(() => import('./pages/admin/WhatsAppConfigView'));
const ShippingDiscountView = lazy(() => import('./views/ShippingDiscountView'));
const GiftCardsView = lazy(() => import('./pages/admin/GiftCardsView'));
const Login = lazy(() => import('./pages/admin/Login'));

import SmoothScroll from './components/SmoothScroll';
import ScrollToTop from './components/ScrollToTop';
import CinematicPreloader from './components/CinematicPreloader';
import CinematicGrain from './components/CinematicGrain';
import CartDrawer from './components/CartDrawer';
import BottomNav from './components/BottomNav';
import AISommelier from './components/AISommelier';
import WhatsAppButton from './components/WhatsAppButton';
import ProtectedRoute from './components/ProtectedRoute';
import ToastNotification from './components/ToastNotification';
import PWAPrompt from './components/PWAPrompt';
// Christmas effects deshabilitados
import PromoBanner from './components/PromoBanner';

import { useCart } from './context/CartContext';
import { useAuth } from './context/AuthContext';
import { AppProviders } from './context/AppProviders';
import ShippingDiscountBanner from './components/ShippingDiscountBanner';
import { useUI } from './context/UIContext';

// Loading fallback component
function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-bikitchen-beige">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-bikitchen-orange border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-gray-600">Cargando...</p>
      </div>
    </div>
  );
}

// Error Boundary para capturar errores en componentes lazy

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error en la página:', error, errorInfo);
    try {
      const msg = (error && (error.message || String(error))) || '';
      if (/Failed to fetch dynamically imported module/i.test(msg) || /Unexpected token/i.test(msg)) {
        setTimeout(() => {
          hardRefresh();
        }, 0);
      }
    } catch { }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-bikitchen-beige p-4">
          <div className="text-center max-w-md">
            <div className="text-6xl mb-4">😕</div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">Algo salió mal</h2>
            <p className="text-gray-600 mb-4">Hubo un error al cargar la página.</p>
            <button
              onClick={() => window.location.reload()}
              className="bg-bikitchen-orange text-white px-6 py-2 rounded-full font-medium hover:bg-orange-600 transition-colors"
            >
              Recargar página
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Componente que usa el contexto del carrito para pasar estado a ChristmasEffects
function PublicRouteExtras() {
  const { isCartOpen, setIsCartOpen } = useCart() || {};
  const { isMobileMenuOpen } = useUI() || {};
  const { isAdmin } = useAuth() || {};
  const location = useLocation();
  const pathname = location?.pathname || '';
  const isLoginPage = pathname === '/login';
  const hideFloating = [
    /^\/terminos(\/|$)/,
    /^\/privacidad(\/|$)/,
    /^\/cookies(\/|$)/,
    /^\/reembolsos(\/|$)/
  ].some((re) => re.test(pathname)) || isMobileMenuOpen || isCartOpen || isLoginPage;
  return (
    <>
      <ShippingDiscountBanner />
      <PromoBanner />
      <CartDrawer />
      {!hideFloating && <WhatsAppButton />}
      <PWAPrompt />
      {/* Christmas effects y banner deshabilitados */}
    </>
  );
}

function AnimatedRoutes() {
  const location = useLocation();

  // CRÍTICO: Verificar versión de la app al cargar y limpiar caché si hay actualización
  useEffect(() => {
    checkAppVersion();
  }, []);

  return (
    <ErrorBoundary>
      <Suspense fallback={<PageLoader />}>
        <AnimatePresence mode="wait">
          <Routes location={location} key={location.pathname}>
            {/* Public Routes */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/menu" element={<CatalogPage />} />
            <Route path="/individuales" element={<IndividualesView />} />
            <Route path="/packs" element={<PacksPage />} />
            <Route path="/promociones" element={<PromocionesPage />} />
            <Route path="/como-funciona" element={<ComoFuncionaPage />} />
            <Route path="/nosotros" element={<NosotrosPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/terminos" element={<TerminosPage />} />
            <Route path="/privacidad" element={<PrivacidadPage />} />
            <Route path="/cookies" element={<CookiesPage />} />
            <Route path="/reembolsos" element={<ReembolsosPage />} />
            <Route path="/faq" element={<FAQPage />} />
            <Route path="/preguntas-frecuentes" element={<FAQPage />} />
            <Route path="/comparador" element={<ComparadorPage />} />
            <Route path="/comparar-packs" element={<ComparadorPage />} />
            <Route path="/calculadora" element={<CalculadoraAhorroPage />} />
            <Route path="/ahorro" element={<CalculadoraAhorroPage />} />
            <Route path="/referidos" element={<ReferidosPage />} />
            <Route path="/invitar" element={<ReferidosPage />} />
            <Route path="/mi-impacto" element={<MiImpactoPage />} />
            <Route path="/impacto" element={<MiImpactoPage />} />
            <Route path="/mis-pedidos" element={<MisPedidosPage />} />
            <Route path="/historial" element={<MisPedidosPage />} />
            <Route path="/gift-cards" element={<GiftCardsPage />} />
            <Route path="/tarjetas-regalo" element={<GiftCardsPage />} />
            <Route path="/regalar" element={<GiftCardsPage />} />
            <Route path="/fidelidad" element={<FidelidadPage />} />
            <Route path="/puntos" element={<FidelidadPage />} />
            <Route path="/canje" element={<RewardStore />} />
            <Route path="/tienda-vip" element={<RewardStore />} />
            <Route path="/mi-cuenta" element={<MiCuentaPage />} />
            <Route path="/mis-cupones" element={<MisCuponesPage />} />
            <Route path="/acceso-denegado" element={<AccesoDenegadoPage />} />

            {/* Test WhatsApp */}
            <Route path="/test-whatsapp" element={<TestWhatsAppPage />} />

            {/* Tilopay payment return */}
            <Route path="/tilopay/return" element={<TilopayReturnPage />} />

            {/* Admin Routes - Protected */}
            <Route path="/admin/login" element={<Login />} />
            <Route path="/admin" element={
              <ProtectedRoute requireAdmin={true}>
                <AdminLayout />
              </ProtectedRoute>
            }>
              <Route index element={<DashboardView />} />
              <Route path="orders" element={<OrdersView />} />
              <Route path="clients" element={<ClientsView />} />
              <Route path="sheets" element={<SheetsView />} />
              <Route path="dispatch-sheet" element={<DispatchSheetView />} />
              <Route path="delivery" element={<DeliveryView />} />
              <Route path="inventory" element={<InventoryView />} />
              <Route path="menus" element={<MenusView />} />
              <Route path="pack-images" element={<PackImagesView />} />
              <Route path="promotions" element={<PromotionsView />} />
              <Route path="coupons" element={<CouponsView />} />
              <Route path="notifications" element={<NotificationsView />} />
              <Route path="gift-cards" element={<GiftCardsView />} />
              <Route path="imagenes" element={<ImageUploadPage />} />
              <Route path="whatsapp-config" element={<WhatsAppConfigView />} />
              <Route path="shipping-discount" element={<ShippingDiscountView />} />
            </Route>

            {/* 404 - Catch all */}
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </AnimatePresence>
      </Suspense>
    </ErrorBoundary>
  );
}

function App() {
  return (
    <Router>
      <AppProviders>
        <AppContent />
      </AppProviders>
    </Router>
  );
}

function AppContent() {
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith('/admin');

  // Capturar fuente de tráfico (UTMs, Referrer) en cada navegación
  useEffect(() => {
    captureSource();
  }, [location]);

  return (
    <div className="App min-h-screen bg-white transition-colors duration-300">
      <ScrollToTop />
      <CinematicGrain />
      <CinematicPreloader />
      <SmoothScroll />

      {/* Only show these on public routes */}
      {!isAdminRoute && <PublicRouteExtras />}
      {!isAdminRoute && <BottomNav />}

      <div className={`relative z-10 ${!isAdminRoute ? 'pb-20 md:pb-0' : ''}`}>
        <ToastNotification />
        <AnimatedRoutes />
      </div>
    </div>
  );
}

export default App;
