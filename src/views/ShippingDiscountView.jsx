import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Truck, Save, AlertCircle, Check, Sparkles } from 'lucide-react';
import { db } from '../firebase/config';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import toast from 'react-hot-toast';
import AdminPageHeader from '../components/admin/AdminPageHeader';

export default function ShippingDiscountView() {
  const [config, setConfig] = useState({
    enabled: false,
    percentage: 50,
    message: '🎉 50% de descuento en envío en TODOS los pedidos'
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const docRef = doc(db, 'config', 'shippingDiscount');
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        setConfig(docSnap.data());
      }
    } catch (error) {
      console.error('Error loading shipping discount config:', error);
      toast.error('Error al cargar configuración');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const docRef = doc(db, 'config', 'shippingDiscount');
      await setDoc(docRef, {
        ...config,
        updatedAt: new Date()
      });
      
      toast.success('✅ Configuración guardada correctamente');
    } catch (error) {
      console.error('Error saving shipping discount config:', error);
      toast.error('Error al guardar configuración');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando configuración...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <AdminPageHeader 
        title="Descuento en Envío"
        subtitle="Configura descuentos promocionales en el costo de envío"
        icon={Truck}
      />

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Preview del banner */}
        {config.enabled && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
              <Sparkles size={16} className="text-orange-500" />
              Vista previa del banner
            </h3>
            <div className="bg-gradient-to-r from-green-500 via-emerald-500 to-green-600 text-white rounded-2xl shadow-xl p-4">
              <div className="flex items-center justify-center gap-3">
                <Truck size={24} />
                <p className="text-sm md:text-base font-black">
                  {config.message}
                </p>
                <div className="bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full">
                  <span className="text-sm font-black">-{config.percentage}%</span>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Configuración */}
        <div className="bg-white rounded-2xl shadow-lg p-6 space-y-6">
          {/* Toggle activar/desactivar */}
          <div className="flex items-center justify-between p-4 bg-gradient-to-r from-orange-50 to-amber-50 rounded-xl border-2 border-orange-200">
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                config.enabled 
                  ? 'bg-green-500 text-white' 
                  : 'bg-gray-300 text-gray-600'
              }`}>
                {config.enabled ? <Check size={24} /> : <AlertCircle size={24} />}
              </div>
              <div>
                <h3 className="font-black text-gray-900">Estado de la promoción</h3>
                <p className="text-sm text-gray-600">
                  {config.enabled ? 'Activa - Los clientes ven el descuento' : 'Inactiva - Sin descuento'}
                </p>
              </div>
            </div>
            <button
              onClick={() => setConfig({ ...config, enabled: !config.enabled })}
              className={`relative inline-flex h-8 w-16 items-center rounded-full transition-colors ${
                config.enabled ? 'bg-green-500' : 'bg-gray-300'
              }`}
            >
              <span
                className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                  config.enabled ? 'translate-x-9' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Porcentaje de descuento */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-3">
              Porcentaje de descuento
            </label>
            <div className="flex items-center gap-4">
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={config.percentage}
                onChange={(e) => setConfig({ ...config, percentage: parseInt(e.target.value) })}
                className="flex-1 h-3 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-orange-500"
              />
              <div className="w-24 text-center">
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={config.percentage}
                  onChange={(e) => setConfig({ ...config, percentage: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 text-center text-2xl font-black text-orange-600 bg-orange-50 border-2 border-orange-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
                <p className="text-xs text-gray-500 mt-1">%</p>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-5 gap-2">
              {[0, 25, 50, 75, 100].map((value) => (
                <button
                  key={value}
                  onClick={() => setConfig({ ...config, percentage: value })}
                  className={`py-2 px-3 rounded-lg font-bold text-sm transition-all ${
                    config.percentage === value
                      ? 'bg-orange-500 text-white shadow-lg'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {value}%
                </button>
              ))}
            </div>
          </div>

          {/* Mensaje personalizado */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-3">
              Mensaje del banner
            </label>
            <textarea
              value={config.message}
              onChange={(e) => setConfig({ ...config, message: e.target.value })}
              rows={3}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 resize-none"
              placeholder="Ej: 🎉 50% de descuento en envío en TODOS los pedidos"
            />
            <p className="text-xs text-gray-500 mt-2">
              💡 Tip: Usa emojis para hacer el mensaje más atractivo
            </p>
          </div>

          {/* Ejemplo de cálculo */}
          <div className="p-4 bg-blue-50 rounded-xl border-2 border-blue-200">
            <h4 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
              <AlertCircle size={18} className="text-blue-600" />
              Ejemplo de cálculo
            </h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Costo de envío original:</span>
                <span className="font-bold">₡3,000</span>
              </div>
              <div className="flex justify-between text-green-600">
                <span>Descuento ({config.percentage}%):</span>
                <span className="font-bold">-₡{Math.round(3000 * (config.percentage / 100)).toLocaleString('es-CR')}</span>
              </div>
              <div className="pt-2 border-t-2 border-blue-300 flex justify-between text-lg">
                <span className="font-black text-gray-900">Costo final:</span>
                <span className="font-black text-orange-600">
                  ₡{(3000 - Math.round(3000 * (config.percentage / 100))).toLocaleString('es-CR')}
                </span>
              </div>
            </div>
          </div>

          {/* Botón guardar */}
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-black py-4 rounded-xl flex items-center justify-center gap-3 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                Guardando...
              </>
            ) : (
              <>
                <Save size={20} />
                Guardar configuración
              </>
            )}
          </button>
        </div>

        {/* Información adicional */}
        <div className="mt-6 p-4 bg-yellow-50 rounded-xl border-2 border-yellow-200">
          <h4 className="font-bold text-gray-900 mb-2 flex items-center gap-2">
            <AlertCircle size={18} className="text-yellow-600" />
            Información importante
          </h4>
          <ul className="text-sm text-gray-700 space-y-1 list-disc list-inside">
            <li>Los cambios se aplican inmediatamente en toda la aplicación</li>
            <li>El banner aparece en todas las páginas cuando está activado</li>
            <li>El descuento se aplica automáticamente en el carrito de compras</li>
            <li>Puedes cambiar el porcentaje en cualquier momento</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
