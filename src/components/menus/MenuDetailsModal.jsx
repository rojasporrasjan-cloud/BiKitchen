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
  ceroCarbos: 'Sin Carbos',
  sinCarbos: 'Sin Carbos',
  regular: 'Regular',
  vegetariano: 'Vegetariano',
  casaditos: 'Casaditos'
};

// Opciones de proteína preferida con precio adicional para algunas
const PROTEIN_OPTIONS = [
  { id: 'default', label: 'Según menú', icon: '🍽️', price: 0 },
  { id: 'pollo', label: 'Pollo', icon: '🍗', price: 0 },
  { id: 'res', label: 'Res', icon: '🥩', price: 500 },
  { id: 'cerdo', label: 'Cerdo', icon: '🥓', price: 0 },
  { id: 'pescado', label: 'Pescado', icon: '🐟', price: 800 }
];

// Opciones de extras con precio
const EXTRAS_OPTIONS = [
  { id: 'proteina_extra', label: 'Proteína extra (+50g)', price: 1500, icon: '🥩', desc: 'Porción adicional de proteína' },
  { id: 'doble_proteina', label: 'Doble proteína (+100g)', price: 2500, icon: '💪', desc: 'El doble de proteína en tu plato' },
  { id: 'carbos_extra', label: 'Carbohidratos extra', price: 800, icon: '🍚', desc: 'Porción adicional de carbos' },
  { id: 'vegetales_extra', label: 'Vegetales extra', price: 600, icon: '🥦', desc: 'Más vegetales frescos' }
];

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
  const [selectedProtein, setSelectedProtein] = useState('default');
  const [selectedExtras, setSelectedExtras] = useState([]);
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState('');
  const [showNotes, setShowNotes] = useState(false);
  
  // Cart context
  const { addToCart } = useCart();
  
  // Calcular precio de proteína seleccionada
  const proteinPrice = PROTEIN_OPTIONS.find(p => p.id === selectedProtein)?.price || 0;
  
  // Calcular precio de extras
  const extrasTotal = selectedExtras.reduce((sum, extraId) => {
    const extra = EXTRAS_OPTIONS.find(e => e.id === extraId);
    return sum + (extra?.price || 0);
  }, 0);
  
  // Precio base del pack
  const basePrice = packInfo?.numericPrice || 0;
  
  // Precio total por unidad
  const unitPrice = basePrice + proteinPrice + extrasTotal;
  
  // Precio total con cantidad
  const totalPrice = unitPrice * quantity;
  
  // Toggle extra
  const toggleExtra = (extraId) => {
    // Si selecciona doble proteína, quitar proteína extra y viceversa
    if (extraId === 'doble_proteina' && selectedExtras.includes('proteina_extra')) {
      setSelectedExtras(prev => prev.filter(id => id !== 'proteina_extra').concat(extraId));
    } else if (extraId === 'proteina_extra' && selectedExtras.includes('doble_proteina')) {
      setSelectedExtras(prev => prev.filter(id => id !== 'doble_proteina').concat(extraId));
    } else {
      setSelectedExtras(prev => 
        prev.includes(extraId) 
          ? prev.filter(id => id !== extraId)
          : [...prev, extraId]
      );
    }
  };
  
  // Añadir al carrito
  const handleAddToCart = () => {
    const protein = PROTEIN_OPTIONS.find(p => p.id === selectedProtein);
    const extras = selectedExtras.map(id => EXTRAS_OPTIONS.find(e => e.id === id));
    
    addToCart({
      id: `menu-${menuKey}-${Date.now()}`,
      name: title,
      desc: packInfo?.desc || 'Menú semanal BiKitchen',
      image: packInfo?.image || '/assets/menu-default.jpg',
      price: `₡${unitPrice.toLocaleString('es-CR')}`,
      numericPrice: unitPrice,
      quantity: quantity,
      menuKey,
      plan: packInfo?.plan || 'Semanal',
      customizations: {
        protein: protein?.id !== 'default' ? protein?.label : null,
        proteinPrice: proteinPrice,
        extras: extras.map(e => ({ label: e?.label, price: e?.price })).filter(e => e.label),
        notes: notes.trim()
      }
    });
    
    toast.success(`${title} añadido al carrito`);
    
    // Reset y cerrar
    resetForm();
    onClose();
  };
  
  const resetForm = () => {
    setSelectedProtein('default');
    setSelectedExtras([]);
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
        // Cargar menú oficial (sin fechas)
        const data = await getOfficialMenus();
        
        // Buscar los platos del tipo de menú seleccionado
        let platos = data[menuKey] || data.ceroCarbos || [];
        
        // Si no hay platos, usar fallback local
        if (!Array.isArray(platos) || platos.length === 0) {
          platos = OFFICIAL_MENUS_2024_11_22[menuKey] || OFFICIAL_MENUS_2024_11_22.fullPack || [];
        }

        setDishes(platos.slice(0, 5));
      } catch (e) {
        console.error('[MenuDetailsModal] Error loading menu details', e);
        // Usar fallback local en caso de error
        const fallback = OFFICIAL_MENUS_2024_11_22[menuKey] || OFFICIAL_MENUS_2024_11_22.fullPack || [];
        setDishes(fallback.slice(0, 5));
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
                            <span className="bg-white px-2 py-0.5 rounded-full">🍚 {dish.carbo || '-'}</span>
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
                  <span className="w-6 h-6 bg-orange-500 text-white rounded-lg flex items-center justify-center text-xs">✨</span>
                  Personaliza tu pedido
                </h4>
                
                {/* Selector de proteína preferida */}
                <div className="mb-4">
                  <label className="text-xs font-medium text-gray-600 mb-2 block">
                    Elige tu proteína preferida
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {PROTEIN_OPTIONS.map(option => (
                      <button
                        key={option.id}
                        onClick={() => setSelectedProtein(option.id)}
                        className={`relative px-3 py-2.5 rounded-xl text-sm font-medium transition-all border-2 ${
                          selectedProtein === option.id
                            ? 'bg-orange-500 text-white border-orange-500 shadow-lg shadow-orange-500/30'
                            : 'bg-white text-gray-700 border-gray-200 hover:border-orange-300 hover:bg-orange-50'
                        }`}
                      >
                        <span className="text-lg mr-1">{option.icon}</span>
                        <span>{option.label}</span>
                        {option.price > 0 && (
                          <span className={`block text-[10px] mt-0.5 ${selectedProtein === option.id ? 'text-orange-100' : 'text-orange-500'}`}>
                            +₡{option.price.toLocaleString()}
                          </span>
                        )}
                        {selectedProtein === option.id && (
                          <div className="absolute -top-1 -right-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                            <Check size={12} className="text-white" />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Extras de proteína */}
                <div className="mb-4">
                  <label className="text-xs font-medium text-gray-600 mb-2 block">
                    ¿Quieres más proteína? 💪
                  </label>
                  <div className="space-y-2">
                    {EXTRAS_OPTIONS.map(extra => (
                      <button
                        key={extra.id}
                        onClick={() => toggleExtra(extra.id)}
                        className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm transition-all border-2 ${
                          selectedExtras.includes(extra.id)
                            ? 'bg-orange-50 border-orange-500 shadow-sm'
                            : 'bg-white border-gray-200 hover:border-orange-300'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-xl">{extra.icon}</span>
                          <div className="text-left">
                            <p className={`font-medium ${selectedExtras.includes(extra.id) ? 'text-orange-700' : 'text-gray-800'}`}>
                              {extra.label}
                            </p>
                            <p className="text-xs text-gray-500">{extra.desc}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-orange-600 font-bold">+₡{extra.price.toLocaleString()}</span>
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center transition-colors ${
                            selectedExtras.includes(extra.id) 
                              ? 'bg-orange-500 text-white' 
                              : 'bg-gray-100 text-gray-400'
                          }`}>
                            {selectedExtras.includes(extra.id) ? <Check size={14} /> : <Plus size={14} />}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Anotaciones */}
                <div>
                  <button
                    onClick={() => setShowNotes(!showNotes)}
                    className="flex items-center gap-2 text-sm text-gray-600 hover:text-orange-500 transition-colors"
                  >
                    <MessageSquare size={16} />
                    <span>Agregar anotaciones especiales</span>
                    <ChevronDown size={14} className={`transition-transform ${showNotes ? 'rotate-180' : ''}`} />
                  </button>
                  
                  {showNotes && (
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Ej: Sin zanahoria, sin repollo, alergia a mariscos..."
                      className="mt-2 w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 resize-none"
                      rows={2}
                    />
                  )}
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
              <span>Precio base:</span>
              <span>₡{basePrice.toLocaleString()}</span>
            </div>
            {proteinPrice > 0 && (
              <div className="flex justify-between text-sm text-gray-600">
                <span>Proteína ({PROTEIN_OPTIONS.find(p => p.id === selectedProtein)?.label}):</span>
                <span>+₡{proteinPrice.toLocaleString()}</span>
              </div>
            )}
            {extrasTotal > 0 && (
              <div className="flex justify-between text-sm text-gray-600">
                <span>Extras:</span>
                <span>+₡{extrasTotal.toLocaleString()}</span>
              </div>
            )}
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
