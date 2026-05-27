import React from 'react';
import { motion } from 'framer-motion';
import { Camera, Plus } from 'lucide-react';

const formatPrice = (value) => `₡${value.toLocaleString('es-CR')}`;

export default function IndividualCard({ producto, onClick, canEditImage, onUploadImage, discountLabel, precioDesde }) {
  const originalPrice = producto.precio500 || producto.precio1kg;
  const startingPrice = precioDesde ?? originalPrice;
  const hasDiscount = !!discountLabel && precioDesde != null && precioDesde < originalPrice;

  return (
    <motion.div
      whileHover={{ y: -6 }}
      whileTap={{ y: 0 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      className="group rounded-[2.5rem] h-80 sm:h-96 w-full shadow-xl hover:shadow-2xl bg-gray-900 overflow-hidden relative cursor-pointer transition-all duration-500"
      onClick={onClick}
    >
      {/* Imagen Full Background */}
      <img
        src={producto.imagen}
        alt={producto.nombre}
        className="absolute inset-0 w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110 opacity-70 group-hover:opacity-100"
      />

      {/* Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />

      {/* Content Overlay */}
      <div className="absolute inset-0 p-6 flex flex-col justify-between z-10">

        {/* Fila superior: precio (izq) + botón editar (der) */}
        <div className="flex justify-between items-start">
          {/* Badge precio — muestra tachado + precio nuevo cuando hay descuento */}
          {startingPrice && (
            <div className={`backdrop-blur-xl px-3 py-2 rounded-2xl border shadow-xl ${hasDiscount ? 'bg-bikitchen-orange/90 border-orange-300/40' : 'bg-white/20 border-white/20'}`}>
              {hasDiscount ? (
                <div className="flex flex-col items-start gap-0.5">
                  <span className="text-[9px] font-bold text-white/60 line-through leading-none">
                    {formatPrice(originalPrice)}
                  </span>
                  <span className="text-[11px] sm:text-xs font-black text-white leading-none">
                    Desde {formatPrice(startingPrice)}
                  </span>
                </div>
              ) : (
                <span className="text-[10px] sm:text-xs font-black text-white tracking-tight">
                  Desde {formatPrice(startingPrice)}
                </span>
              )}
            </div>
          )}

          {/* Botón editar imagen (solo admin, solo al hacer hover) */}
          {canEditImage && (
            <button
              onClick={(e) => { e.stopPropagation(); onUploadImage(); }}
              className="p-3 bg-white/10 backdrop-blur-md rounded-2xl shadow-xl text-white hover:bg-orange-600 transition-all transform hover:scale-110 flex items-center justify-center opacity-0 group-hover:opacity-100 border border-white/10"
              title="Cambiar imagen"
            >
              <Camera size={20} />
            </button>
          )}
        </div>

        {/* Sección inferior: categoría + nombre + acción */}
        <div className="space-y-3">
          {/* Badges fila: categoría + descuento */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="bg-orange-600 text-[8px] sm:text-[9px] font-black text-white px-2.5 py-1.5 rounded-xl uppercase tracking-widest shadow-lg border border-orange-400/30">
              {producto.categoria}
            </span>
            {hasDiscount && (
              <span className="bg-bikitchen-gold text-gray-900 text-[9px] sm:text-[10px] font-black px-2.5 py-1.5 rounded-xl shadow-lg uppercase tracking-wider">
                🔥 {discountLabel}
              </span>
            )}
          </div>

          <div>
            <h3 className="text-xl sm:text-2xl font-black text-white leading-tight" style={{textShadow:'0 2px 12px rgba(0,0,0,0.7)'}}>
              {producto.nombre}
            </h3>
            <p className="text-xs sm:text-sm text-slate-100 line-clamp-2 mt-2 font-semibold leading-relaxed" style={{textShadow:'0 1px 4px rgba(0,0,0,0.6)'}}>
              {producto.descripcion}
            </p>
          </div>

          {/* Action Indicator */}
          <div className="pt-2 flex items-center gap-2 text-[10px] font-black text-white/60 group-hover:text-orange-400 uppercase tracking-widest transition-colors">
            <Plus size={14} strokeWidth={4} className="group-hover:rotate-90 transition-transform duration-300" />
            <span>Personalizar</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
