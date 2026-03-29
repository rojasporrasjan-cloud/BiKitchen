import React, { useEffect, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { getOfficialMenus } from '../../utils/firestoreMenus';
import { Utensils, ShoppingCart, Plus, Minus, MessageSquare, ChevronDown, Check, X } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import toast from 'react-hot-toast';

// Etiquetas legibles para cada tipo de menú de Firestore
const MENU_LABELS = {
  fullPack: 'Full Pack',
  keto: 'Keto',
  bajoCalorias: 'Bajo Calorías',
  sinCarbos: 'Sin Carbos',
  regular: 'Regular',
  vegetariano: 'Vegetariano',
  casaditos: 'Casaditos'
};

// Información de porciones por tipo de pack
const PACK_PORTIONS = {
  fullPack: {
    protein: '150g',
    carbos: 3,
    veggies: 2,
    description: 'Porción completa con máxima variedad',
    color: 'from-purple-500 to-indigo-500'
  },
  regular: {
    protein: '100g',
    carbos: 2,
    veggies: 1,
    description: 'Porción balanceada ideal para el día a día',
    color: 'from-blue-500 to-cyan-500'
  },
  bajoCalorias: {
    protein: '120g',
    carbos: 1,
    veggies: 2,
    description: 'Más vegetales, menos carbohidratos',
    color: 'from-green-500 to-emerald-500'
  },
  sinCarbos: {
    protein: '120g',
    carbos: 0,
    veggies: 3,
    description: 'Sin carbohidratos, máximos vegetales',
    color: 'from-red-500 to-orange-500'
  },
  keto: {
    protein: '200g',
    carbos: 0,
    veggies: 3,
    description: 'Alto en proteína y grasas saludables',
    color: 'from-amber-500 to-yellow-500'
  },
  vegetariano: {
    protein: 'Vegetal',
    carbos: 2,
    veggies: 2,
    description: 'Proteína 100% vegetal',
    color: 'from-lime-500 to-green-500'
  },
  casaditos: {
    protein: '100g',
    carbos: 2,
    veggies: 1,
    description: 'Estilo tradicional costarricense',
    color: 'from-orange-500 to-amber-500'
  }
};

// Menús oficiales de la semana 2024-11-22 (fuente única de verdad para fallback)
const OFFICIAL_MENUS_2024_11_22 = {
  sinCarbos: [
    { numero: 1, proteina: 'Trocitos de res en salsa de hongos', vegetal: 'Ayotes salteados', carbo: '—' },
    { numero: 2, proteina: 'Pollo en salsa criolla', vegetal: 'Picadillo mixto', carbo: '—' },
    { numero: 3, proteina: 'Bistec de cerdo encebollado', vegetal: 'Vegetales asados', carbo: '—' },
    { numero: 4, proteina: 'Fajitas de pollo encebolladas', vegetal: 'Picadillo mixto', carbo: '—' },
    { numero: 5, proteina: 'Pollo en salsa BBQ', vegetal: 'Ensalada coleslaw', carbo: '—' }
  ],
  bajoCalorias: [
    { numero: 1, proteina: 'Canelones relleno de carne molida', vegetal: 'Ayotes salteados', carbo: 'Arroz blanco' },
    { numero: 2, proteina: 'Pollo en salsa criolla', vegetal: 'Guiso de chayote con maíz dulce', carbo: 'Arroz blanco' },
    { numero: 3, proteina: 'Bistec de cerdo encebollado', vegetal: 'Vegetales asados', carbo: 'Puré de papa' },
    { numero: 4, proteina: 'Fajitas de pollo encebolladas', vegetal: 'Picadillo mixto', carbo: 'Arroz jardinero' },
    { numero: 5, proteina: 'Pollo en salsa BBQ', vegetal: 'Ensalada coleslaw', carbo: 'Yuca frita' }
  ],
  regular: [
    { numero: 1, proteina: 'Canelones relleno de carne molida', vegetal: 'Ayotes salteados', carbo: 'Arroz blanco' },
    { numero: 2, proteina: 'Pollo en salsa criolla', vegetal: 'Guiso de chayote con maíz dulce', carbo: 'Arroz blanco' },
    { numero: 3, proteina: 'Bistec de cerdo encebollado', vegetal: 'Vegetales asados', carbo: 'Puré de papa' },
    { numero: 4, proteina: 'Fajitas de pollo encebolladas', vegetal: 'Picadillo mixto', carbo: 'Arroz jardinero' },
    { numero: 5, proteina: 'Pollo en salsa BBQ', vegetal: 'Ensalada coleslaw', carbo: 'Yuca frita' }
  ],
  keto: [
    { numero: 1, proteina: 'Zucchini rellenos con carne molida', vegetal: 'Vegetales salteados', carbo: '—' },
    { numero: 2, proteina: 'Pollo al curry con crema de coco', vegetal: 'Brócoli salteado', carbo: '—' },
    { numero: 3, proteina: 'Bistec de res con mantequilla de ajo', vegetal: 'Zanahoria baby y kale', carbo: '—' },
    { numero: 4, proteina: 'Pechuga de pollo rellena de queso crema', vegetal: 'Zuchinni asado', carbo: '—' },
    { numero: 5, proteina: 'Pollo BBQ con tocino', vegetal: 'Ensalada coleslaw keto', carbo: '—' }
  ],
  vegetariano: [
    { numero: 1, proteina: 'Tofu en salsa teriyaki', vegetal: 'Brócoli salteado', carbo: 'Arroz integral' },
    { numero: 2, proteina: 'Hamburguesa de lentejas', vegetal: 'Zanahoria y repollo al vapor', carbo: 'Puré de papa' },
    { numero: 3, proteina: 'Canelones rellenos de espinaca y ricotta', vegetal: 'Ayotes salteados', carbo: 'Arroz blanco' },
    { numero: 4, proteina: 'Tortilla de vegetales', vegetal: 'Picadillo mixto', carbo: 'Yuca frita' },
    { numero: 5, proteina: 'Ensalada de garbanzos con aguacate', vegetal: 'Ensalada verde', carbo: 'Quinoa' }
  ],
  casaditos: [
    { numero: 1, proteina: 'Pollo en salsa criolla', vegetal: 'Ensalada verde', carbo: 'Arroz y frijoles' },
    { numero: 2, proteina: 'Bistec encebollado', vegetal: 'Picadillo de papa', carbo: 'Arroz blanco' },
    { numero: 3, proteina: 'Carne mechada', vegetal: 'Picadillo de chayote', carbo: 'Arroz blanco' },
    { numero: 4, proteina: 'Pescado empanizado', vegetal: 'Ensalada coleslaw', carbo: 'Purê de papa' },
    { numero: 5, proteina: 'Cerdo en salsa BBQ', vegetal: 'Zanahoria salteada', carbo: 'Arroz integral' }
  ],
  fullPack: [
    { numero: 1, proteina: 'Pollo en salsa BBQ', vegetal: 'Picadillo mixto', carbo: 'Puré de papa' },
    { numero: 2, proteina: 'Bistec encebollado', vegetal: 'Vegetales asados', carbo: 'Arroz blanco' },
    { numero: 3, proteina: 'Fajitas de pollo encebolladas', vegetal: 'Ensalada coleslaw', carbo: 'Yuca frita' },
    { numero: 4, proteina: 'Carne en salsa criolla', vegetal: 'Ayotes salteados', carbo: 'Arroz jardinero' },
    { numero: 5, proteina: 'Pollo al curry', vegetal: 'Guiso de chayote con maíz dulce', carbo: 'Arroz blanco' }
  ]
};

export default function MenuDetailsModal({ menuKey, isOpen, onClose, packInfo }) {
  const [loading, setLoading] = useState(false);
  const [dishes, setDishes] = useState([]);
  const [title, setTitle] = useState('Menú semanal');
  const scrollContainerRef = useRef(null);

  // Estados para personalización
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState('');
  const [showNotes, setShowNotes] = useState(false);

  // Cart context
  const { addToCart } = useCart();

  // Precio base del pack
  const basePrice = packInfo?.numericPrice || 0;

  // Precio total por unidad (sin extras de proteína)
  const unitPrice = basePrice;

  // Precio total con cantidad
  const totalPrice = unitPrice * quantity;


  // Añadir al carrito
  const handleAddToCart = () => {
    addToCart({
      id: `menu-${menuKey}-${Date.now()}`,
      name: title,
      desc: packInfo?.desc || 'Menú semanal BiKitchen',
      image: packInfo?.image || '/assets/menu-default.jpg',
      price: unitPrice,
      numericPrice: unitPrice,
      quantity: quantity,
      menuKey,
      plan: packInfo?.plan || 'Semanal',
      discountBadge: packInfo?.discountBadge,
      customizations: {
        notes: notes.trim()
      }
    });

    toast.success(`${title} añadido al carrito`);

    // Reset y cerrar
    resetForm();
    onClose();
  };

  const resetForm = () => {
    setQuantity(1);
    setNotes('');
    setShowNotes(false);
  };

  // Reset al cerrar
  useEffect(() => {
    if (!isOpen) {
      resetForm();
    }
  }, [isOpen]);

  // Cargar menú oficial
  useEffect(() => {
    if (!isOpen || !menuKey) return;

    const load = async () => {
      setLoading(true);
      try {
        // CRÍTICO: Forzar recarga desde servidor para que los cambios se vean en móviles
        // y en el pack mensual con desayunos gratis
        const data = await getOfficialMenus(true);

        console.log('[MenuDetailsModal] Datos recibidos de Firebase:', {
          menuKey,
          hasData: !!data,
          hasMenuKey: !!data[menuKey],
          platosCount: data[menuKey]?.length || 0,
          allKeys: Object.keys(data),
          firstPlato: data[menuKey]?.[0]
        });

        // Buscar los platos del tipo de menú seleccionado
        let platos = data[menuKey] || [];

        console.log('[MenuDetailsModal] Platos encontrados:', {
          menuKey,
          platosLength: platos.length,
          platos: platos.slice(0, 2) // Mostrar primeros 2 platos
        });

        // IMPORTANTE: NO usar fallback local - si no hay datos en Firebase, mostrar vacío
        // Esto asegura que SIEMPRE se vean los datos actuales de Firebase
        if (!Array.isArray(platos)) {
          platos = [];
        }

        setDishes(platos.slice(0, 5));
      } catch (e) {
        console.error('[MenuDetailsModal] Error loading menu details', e);
        // Mostrar mensaje de error al usuario en lugar de fallar silenciosamente
        alert('Error cargando el menú desde Firebase. Por favor, verifica que los menús estén configurados correctamente en el admin.');
        // En caso de error, mostrar vacío en lugar de datos antiguos
        setDishes([]);
      }
      setLoading(false);
    };

    load();
  }, [isOpen, menuKey]);

  useEffect(() => {
    if (!menuKey) return;
    const label = MENU_LABELS[menuKey] || menuKey;
    setTitle(`Menú ${label}`);
  }, [menuKey]);

  // Obtener información de porciones del pack actual
  const portionInfo = PACK_PORTIONS[menuKey] || PACK_PORTIONS.regular;

  // Detectar si es menú sin carbohidratos (Keto o Sin Carbos)
  const isNoCarbsMenu = menuKey === 'keto' || menuKey === 'sinCarbos' || menuKey === 'cenaKeto' || menuKey === 'cenaSinCarbos';

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-lg">
        {/* Header con gradiente naranja BiKitchen */}
        <DialogHeader className="bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center text-2xl">
                {packInfo?.icon || '🍽️'}
              </div>
              <div>
                <DialogTitle className="text-white text-lg">{title}</DialogTitle>
                <p className="text-white/80 text-sm">5 platos diferentes por semana</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </DialogHeader>

        {/* Contenido con scroll */}
        <div
          ref={scrollContainerRef}
          className="flex-1 overflow-y-auto overscroll-contain p-4 space-y-4"
          style={{
            maxHeight: 'calc(80vh - 280px)',
            WebkitOverflowScrolling: 'touch'
          }}
        >
          {/* Card de información de porciones */}
          <div className={`bg-gradient-to-r ${portionInfo.color} rounded-2xl p-4 text-white shadow-lg`}>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg">📏</span>
              <h4 className="font-bold text-sm">Cada plato incluye:</h4>
            </div>

            <div className="grid grid-cols-3 gap-2 mb-3">
              {/* Proteína */}
              <div className="bg-white/20 backdrop-blur-sm rounded-xl p-3 text-center">
                <div className="text-2xl mb-1">🍗</div>
                <div className="text-lg font-bold">{portionInfo.protein}</div>
                <div className="text-xs text-white/80">Proteína</div>
              </div>

              {/* Vegetales */}
              <div className="bg-white/20 backdrop-blur-sm rounded-xl p-3 text-center">
                <div className="text-2xl mb-1">🥦</div>
                <div className="text-lg font-bold">{portionInfo.veggies}</div>
                <div className="text-xs text-white/80">{portionInfo.veggies === 1 ? 'Vegetal' : 'Vegetales'}</div>
              </div>

              {/* Carbohidratos - Solo mostrar si NO es menú Keto/Sin Carbos */}
              {!isNoCarbsMenu ? (
                <div className="bg-white/20 backdrop-blur-sm rounded-xl p-3 text-center">
                  <div className="text-2xl mb-1">🍚</div>
                  <div className="text-lg font-bold">{portionInfo.carbos}</div>
                  <div className="text-xs text-white/80">{portionInfo.carbos === 1 ? 'Carbo' : 'Carbos'}</div>
                </div>
              ) : (
                <div className="bg-white/20 backdrop-blur-sm rounded-xl p-3 text-center">
                  <div className="text-2xl mb-1">🚫</div>
                  <div className="text-lg font-bold">0</div>
                  <div className="text-xs text-white/80">Sin carbos</div>
                </div>
              )}
            </div>

            <p className="text-xs text-white/90 text-center italic">
              ✨ {portionInfo.description}
            </p>
          </div>

          {loading && (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
              <span className="ml-3 text-gray-500">Cargando menú...</span>
            </div>
          )}

          {!loading && dishes.length === 0 && (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Utensils size={24} className="text-gray-400" />
              </div>
              <p className="text-gray-500">No hay platos definidos para este menú.</p>
            </div>
          )}

          {/* Lista de platos */}
          {!loading && dishes.length > 0 && (
            <>
              {/* Platos del menú */}
              <div>
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                  Platos de la semana
                </h4>
                <div className="space-y-2">
                  {dishes.map((dish, index) => (
                    <div
                      key={dish.numero}
                      className="bg-gradient-to-r from-orange-50 to-amber-50 rounded-xl p-3 border border-orange-100"
                      style={{ animation: `fadeSlideIn 0.3s ease-out ${index * 0.05}s both` }}
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-7 h-7 bg-orange-500 text-white rounded-lg flex items-center justify-center font-bold text-sm flex-shrink-0">
                          {dish.numero}
                        </div>
                        <div className="flex-1 min-w-0 space-y-1">
                          <p className="text-sm font-medium text-gray-800">{dish.proteina || '-'}</p>
                          <div className="flex flex-wrap gap-2 text-xs text-gray-600">
                            <span className="bg-white px-2 py-0.5 rounded-full">🥦 {dish.vegetal || '-'}</span>
                            {!isNoCarbsMenu && (
                              <span className="bg-white px-2 py-0.5 rounded-full">🍚 {dish.carbo || '-'}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Separador */}
              <div className="border-t border-gray-200 pt-4">
                <h4 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
                  <MessageSquare size={18} className="text-orange-500" />
                  Anotaciones especiales
                </h4>

                {/* Anotaciones */}
                <div>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Ej: Sin zanahoria, sin repollo, alergia a mariscos, preferencia de proteína..."
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 resize-none"
                    rows={3}
                  />
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer con cantidad y botón de añadir */}
        <div className="flex-shrink-0 px-4 py-4 bg-gray-50 border-t border-gray-200 rounded-b-2xl">
          {/* Resumen de precio */}
          <div className="space-y-1 mb-3">
            <div className="flex justify-between text-sm text-gray-600">
              <span>Precio por unidad:</span>
              <span>₡{basePrice.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-base font-bold text-gray-900 pt-1 border-t border-gray-200">
              <span>Total:</span>
              <span className="text-orange-600">₡{totalPrice.toLocaleString()}</span>
            </div>
          </div>

          {/* Selector de cantidad */}
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-gray-700">Cantidad:</span>
            <div className="flex items-center gap-3 bg-white rounded-xl border border-gray-200 px-2 py-1">
              <button
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="w-8 h-8 flex items-center justify-center text-gray-500 hover:text-orange-500 hover:bg-orange-50 rounded-lg transition-colors"
              >
                <Minus size={18} />
              </button>
              <span className="w-8 text-center font-bold text-gray-900">{quantity}</span>
              <button
                onClick={() => setQuantity(quantity + 1)}
                className="w-8 h-8 flex items-center justify-center text-gray-500 hover:text-orange-500 hover:bg-orange-50 rounded-lg transition-colors"
              >
                <Plus size={18} />
              </button>
            </div>
          </div>

          <button
            onClick={handleAddToCart}
            disabled={loading || dishes.length === 0}
            className="w-full bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold py-3.5 px-4 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-orange-500/30 active:scale-[0.98]"
          >
            <ShoppingCart size={20} />
            <span>Agregar al carrito — ₡{totalPrice.toLocaleString()}</span>
          </button>
        </div>

        {/* CSS para animación */}
        <style>{`
          @keyframes fadeSlideIn {
            from {
              opacity: 0;
              transform: translateY(8px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
        `}</style>
      </DialogContent>
    </Dialog>
  );
}
