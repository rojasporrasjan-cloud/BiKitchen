import React from 'react';
import { motion } from 'framer-motion';
import { Camera, Plus } from 'lucide-react';
import { formatPrice } from '../utils/formatters';
import { WHATSAPP_MESSAGES } from '../config/whatsappMessages';

export default function IndividualCard({ producto, onClick, canEditImage, onUploadImage, discountLabel, precioDesde, whatsappPhone }) {
  const originalPrice = producto.precio500 || producto.precio1kg;
  const startingPrice = precioDesde ?? originalPrice;
  const hasDiscount = !!discountLabel && precioDesde != null && precioDesde < originalPrice;

  const waOrderUrl = whatsappPhone
    ? `https://wa.me/${whatsappPhone}?text=${encodeURIComponent(WHATSAPP_MESSAGES.INDIVIDUAL_ORDER(producto.nombre, formatPrice(startingPrice)))}`
    : '#';

  return (
    <div
      className="group rounded-[1.75rem] sm:rounded-[2.5rem] h-72 sm:h-80 lg:h-96 w-full shadow-xl hover:shadow-2xl hover:-translate-y-1.5 active:translate-y-0 bg-gray-900 overflow-hidden relative cursor-pointer transition-all duration-300"
      onClick={onClick}
    >
      {/* Imagen Full Background */}
      <img
        src={producto.imagen}
        alt={producto.nombre}
        className="absolute inset-0 w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110 opacity-85 group-hover:opacity-100"
      />

      {/* Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />

      {/* Content Overlay */}
      <div className="absolute inset-0 p-3 sm:p-6 flex flex-col justify-between z-10">

        {/* Fila superior: precio (izq) + botón editar (der) */}
        <div className="flex justify-between items-start">
          {/* Badge precio — muestra tachado + precio nuevo cuando hay descuento */}
          {startingPrice && (
            <div className={`px-2 py-1.5 sm:px-3 sm:py-2 rounded-xl sm:rounded-2xl border shadow-xl ${hasDiscount ? 'bg-bikitchen-orange/90 border-orange-300/40' : 'bg-white/20 border-white/20'}`}>
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
        <div className="space-y-2 pb-9">
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
            <h3 className="text-sm sm:text-xl lg:text-2xl font-black text-white leading-tight" style={{textShadow:'0 2px 12px rgba(0,0,0,0.7)'}}>
              {producto.nombre}
            </h3>
            <p className="text-[9px] sm:text-xs lg:text-sm text-slate-100 line-clamp-1 sm:line-clamp-2 mt-1 sm:mt-2 font-semibold leading-snug" style={{textShadow:'0 1px 4px rgba(0,0,0,0.6)'}}>
              {producto.descripcion}
            </p>
          </div>

          {/* Action Indicator */}
          <div className="pt-1 sm:pt-2 flex items-center gap-1.5 text-[10px] font-black text-white/60 group-hover:text-orange-400 uppercase tracking-widest transition-colors">
            <Plus size={12} strokeWidth={4} className="group-hover:rotate-90 transition-transform duration-300" />
            <span className="hidden sm:inline">Personalizar</span>
          </div>
        </div>
      </div>

      {/* WhatsApp button — absolute bottom, siempre visible */}
      {whatsappPhone && (
        <a
          href={waOrderUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          aria-label={`Pedir ${producto.nombre} por WhatsApp`}
          className="absolute bottom-0 inset-x-0 z-20 flex items-center justify-center gap-2 bg-green-500 hover:bg-green-400 active:bg-green-600 text-white text-[11px] font-black py-2.5 transition-colors uppercase tracking-wider"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
          </svg>
          <span>Pedir por WhatsApp</span>
        </a>
      )}
    </div>
  );
}
