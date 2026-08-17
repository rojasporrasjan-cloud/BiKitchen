import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { lazy, Suspense, Component, useEffect } from 'react';
import { checkAppVersion } from './utils/appVersion'; // Sistema de versión para forzar actualizaciones
import { hardRefresh } from './utils/cacheUtils';
import { captureSource } from './services/sourceTracking';

// Critical pages - loaded immediately
import LandingPage from './pages/LandingPage';

// Retry wrapper for lazy imports — prevents "Failed to fetch dynamically imported module"
// loop on iOS Safari when a new deploy invalidates cached chunk URLs.
const lazyWithRetry = (importFn) =>
  lazy(() =>
    importFn().catch(() => {
      // On chunk load failure, do a hard reload once so the browser fetches the new chunk URLs.
      // The ErrorBoundary sessionStorage guard prevents an infinite loop.
      const reloadKey = 'bk_chunk_reload';
      const lastReload = parseInt(sessionStorage.getItem(reloadKey) || '0', 10);
      const now = Date.now();
      if (now - lastReload > 30000) {
        sessionStorage.setItem(reloadKey, String(now));
        window.location.reload();
      }
      // Return a dummy module so React doesn't crash before the reload fires
      return { default: () => null };
    })
  );

// Lazy loaded pages - loaded on demand
const CatalogPage = lazyWithRetry(() => import('./pages/CatalogPage'));
const IndividualesView = lazyWithRetry(() => import('./views/IndividualesView'));
const PacksPage = lazyWithRetry(() => import('./pages/PacksPage'));
const PromocionesPage = lazyWithRetry(() => import('./pages/PromocionesPage'));
const NosotrosPage = lazyWithRetry(() => import('./pages/NosotrosPage'));
const ComoFuncionaPage = lazyWithRetry(() => import('./pages/ComoFuncionaPage'));
const LoginPage = lazyWithRetry(() => import('./pages/LoginPage'));
const TerminosPage = lazyWithRetry(() => import('./pages/TerminosPage'));
const PrivacidadPage = lazyWithRetry(() => import('./pages/PrivacidadPage'));
const CookiesPage = lazyWithRetry(() => import('./pages/CookiesPage'));
const ReembolsosPage = lazyWithRetry(() => import('./pages/ReembolsosPage'));
const FAQPage = lazyWithRetry(() => import('./pages/FAQPage'));
const ComparadorPage = lazyWithRetry(() => import('./pages/ComparadorPage'));
const CalculadoraAhorroPage = lazyWithRetry(() => import('./pages/CalculadoraAhorroPage'));
const ReferidosPage = lazyWithRetry(() => import('./pages/ReferidosPage'));
const MiImpactoPage = lazyWithRetry(() => import('./pages/MiImpactoPage'));
const MisPedidosPage = lazyWithRetry(() => import('./pages/MisPedidosPage'));
const GiftCardsPage = lazyWithRetry(() => import('./pages/GiftCardsPage'));
const FidelidadPage = lazyWithRetry(() => import('./pages/FidelidadPage'));
const RewardStore = lazyWithRetry(() => import('./pages/RewardStore'));
const MiCuentaPage = lazyWithRetry(() => import('./pages/MiCuentaPage'));
const MisCuponesPage = lazyWithRetry(() => import('./pages/MisCuponesPage'));
const AccesoDenegadoPage = lazyWithRetry(() => import('./pages/AccesoDenegadoPage'));
const NotFoundPage = lazyWithRetry(() => import('./pages/NotFoundPage'));
const TilopayReturnPage = lazyWithRetry(() => import('./pages/TilopayReturnPage'));
const TestWhatsAppPage = lazyWithRetry(() => import('./pages/TestWhatsAppPage'));

// Admin pages - lazy loaded
const AdminLayout = lazyWithRetry(() => import('./layouts/AdminLayout'));
const DashboardView = lazyWithRetry(() => import('./pages/admin/DashboardView'));
const OrdersView = lazyWithRetry(() => import('./pages/admin/OrdersView'));
const ClientsView = lazyWithRetry(() => import('./pages/admin/ClientsView'));
const SheetsView = lazyWithRetry(() => import('./pages/admin/SheetsView'));
const DeliveryView = lazyWithRetry(() => import('./pages/admin/DeliveryView'));
const MenusView = lazyWithRetry(() => import('./views/MenusView'));
const PromotionsView = lazyWithRetry(() => import('./pages/admin/PromotionsView'));
const CouponsView = lazyWithRetry(() => import('./pages/admin/CouponsView'));
const PackImagesView = lazyWithRetry(() => import('./pages/admin/PackImagesView'));
const NotificationsView = lazyWithRetry(() => import('./pages/admin/NotificationsView'));
const DispatchSheetView = lazyWithRetry(() => import('./pages/admin/DispatchSheetView'));
const WhatsAppConfigView = lazyWithRetry(() => import('./pages/admin/WhatsAppConfigView'));
const PhoneAuditView = lazyWithRetry(() => import('./pages/admin/PhoneAuditView'));
const ShippingDiscountView = lazyWithRetry(() => import('./views/ShippingDiscountView'));
const GiftCardsView = lazyWithRetry(() => import('./pages/admin/GiftCardsView'));
const ShippingView = lazyWithRetry(() => import('./pages/admin/ShippingView'));
const Login = lazyWithRetry(() => import('./pages/admin/Login'));
const ReportsView = lazyWithRetry(() => import('./pages/admin/ReportsView'));
const DiscountsManagerView = lazyWithRetry(() => import('./pages/admin/DiscountsManagerView'));
const NotificationsConfigView = lazyWithRetry(() => import('./pages/admin/NotificationsConfigView'));
const PoliciesConfigView = lazyWithRetry(() => import('./pages/admin/PoliciesConfigView'));
const SubstitutionsConfigView = lazyWithRetry(() => import('./pages/admin/SubstitutionsConfigView'));
const PrintProductionView = lazyWithRetry(() => import('./pages/admin/PrintProductionView'));
const WhatsAppImportView = lazyWithRetry(() => import('./pages/admin/WhatsAppImportView'));
const MonthlyPacksView = lazyWithRetry(() => import('./pages/admin/MonthlyPacksView'));
const BroadcastView = lazyWithRetry(() => import('./pages/admin/BroadcastView'));
const DriverPortalView = lazyWithRetry(() => import('./pages/driver/DriverPortalView'));

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
import NotificationPopupManager from './components/NotificationPopupManager';

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
        // Guard against infinite reload loop on iOS Safari:
        // Only auto-reload once per session. If it already reloaded and still crashes, show error screen.
        const reloadKey = 'bk_chunk_reload';
        const lastReload = parseInt(sessionStorage.getItem(reloadKey) || '0', 10);
        const now = Date.now();
        if (now - lastReload > 30000) {
          sessionStorage.setItem(reloadKey, String(now));
          setTimeout(() => hardRefresh(), 0);
        }
        // If less than 30s since last reload, fall through and show error UI instead of looping
      }
    } catch { }
  }

  render() {
    if (this.state.hasError) {
      const errMsg = this.state.error ? (this.state.error.message || String(this.state.error)) : 'Unknown error';
      const errStack = this.state.error?.stack || '';
      return (
        <div className="min-h-screen flex items-center justify-center bg-bikitchen-beige p-4">
          <div className="text-center max-w-md w-full">
            <div className="text-6xl mb-4">😕</div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">Algo salió mal</h2>
            <div className="bg-red-50 border border-red-200 rounded p-3 mb-4 text-left overflow-auto max-h-48">
              <p className="text-red-700 font-mono text-xs break-all">{errMsg}</p>
              {errStack && <p className="text-red-400 font-mono text-xs break-all mt-2 whitespace-pre-wrap">{errStack.slice(0, 600)}</p>}
            </div>
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
      {/* {!hideFloating && <AISommelier />} */}
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
          <Routes location={location} key={location.pathname.startsWith('/admin') ? 'admin' : location.pathname}>
            {/* Public Routes */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/menu" element={<CatalogPage />} />
            <Route path="/individuales" element={<IndividualesView />} />
            <Route path="/individuales/:slug" element={<IndividualesView />} />
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

            {/* Tilopay payment return */}
            <Route path="/tilopay/return" element={<TilopayReturnPage />} />

            {/* Repartidores Route - Protected */}
            <Route path="/repartidor" element={
              <ProtectedRoute requireDriver={true}>
                <DriverPortalView />
              </ProtectedRoute>
            } />

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
              <Route path="menus" element={<MenusView />} />
              <Route path="pack-images" element={<PackImagesView />} />
              <Route path="promotions" element={<PromotionsView />} />
              <Route path="coupons" element={<CouponsView />} />
              <Route path="notifications" element={<NotificationsView />} />
              <Route path="discounts" element={<DiscountsManagerView />} />
              <Route path="gift-cards" element={<GiftCardsView />} />
              <Route path="whatsapp-config" element={<WhatsAppConfigView />} />
              <Route path="test-whatsapp" element={<TestWhatsAppPage />} />
              <Route path="phone-audit" element={<PhoneAuditView />} />
              <Route path="shipping-discount" element={<ShippingDiscountView />} />
              <Route path="shipping" element={<ShippingView />} />
              <Route path="reports" element={<ReportsView />} />
              <Route path="notifications-config" element={<NotificationsConfigView />} />
              <Route path="policies-config" element={<PoliciesConfigView />} />
              <Route path="substitutions-config" element={<SubstitutionsConfigView />} />
              <Route path="print-production" element={<PrintProductionView />} />
              {/* Herramienta interna del dueño — la vista valida isSuperAdmin() por su cuenta,
                  para que esconder la opción del menú no sea la única barrera. */}
              <Route path="whatsapp-import" element={<WhatsAppImportView />} />
              <Route path="monthly-packs" element={<MonthlyPacksView />} />
              <Route path="broadcast" element={<BroadcastView />} />
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
        <NotificationPopupManager />
        <AnimatedRoutes />
      </div>
    </div>
  );
}

export default App;
