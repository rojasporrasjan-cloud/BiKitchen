import React from 'react';
import { motion } from 'framer-motion';
import { Camera, Plus, Eye } from 'lucide-react';

const formatPrice = (value) => `₡${value.toLocaleString('es-CR')}`;

export default function IndividualCard({ producto, onClick, canEditImage, onUploadImage }) {
  const startingPrice = producto.precio500 || producto.precio1kg;

  return (
    <motion.div
      whileHover={{ y: -8, scale: 1.02 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      className="group rounded-[2rem] h-full shadow-lg hover:shadow-2xl bg-white border-2 border-gray-50 hover:border-orange-200 overflow-hidden flex flex-col cursor-pointer transition-all duration-300"
      onClick={onClick}
    >
      {/* Imagen con Overlay */}
      <div className="h-44 sm:h-40 w-full overflow-hidden relative">
        <img
          src={producto.imagen}
          alt={producto.nombre}
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
        />
        
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-60 group-hover:opacity-80 transition-opacity" />

        {/* Price Badge over Image */}
        {startingPrice && (
          <div className="absolute bottom-3 left-3 bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-xl shadow-lg border border-white/20">
            <span className="text-xs font-black text-gray-900">
              {formatPrice(startingPrice)}
            </span>
          </div>
        )}
        
        {canEditImage && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onUploadImage();
            }}
            className="absolute top-3 right-3 p-2.5 bg-white/90 rounded-full shadow-lg text-[#FF671D] hover:bg-white transition-all transform hover:scale-110 flex items-center justify-center opacity-0 group-hover:opacity-100 z-10"
            title="Cambiar imagen"
          >
            <Camera size={18} />
          </button>
        )}
      </div>

      <div className="p-3.5 sm:p-5 flex flex-col gap-2 flex-1">
        <div>
          <h3 className="text-lg font-black text-gray-900 group-hover:text-bikitchen-orange transition-colors line-clamp-1">
            {producto.nombre}
          </h3>
          <p className="text-xs text-gray-500 line-clamp-2 mt-1 font-medium leading-relaxed">
            {producto.descripcion}
          </p>
        </div>

        {/* Stats / Categories / Badges */}
        <div className="flex flex-wrap gap-2 items-center mt-auto pt-3">
          <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-orange-50 text-[10px] font-black text-orange-600 border border-orange-100 uppercase tracking-wider">
            {producto.categoria}
          </span>
        </div>

        {/* Bottom Action Area */}
        <div className="mt-auto pt-2 flex items-center justify-between border-t border-gray-50 group-hover:border-orange-50 transition-colors">
          <div className="flex items-center gap-1.5 text-xs font-black text-orange-600 uppercase tracking-tight">
            <Plus size={14} strokeWidth={3} />
            Seleccionar
          </div>
          <motion.div 
            className="w-8 h-8 rounded-full bg-gray-50 text-gray-400 flex items-center justify-center group-hover:bg-orange-500 group-hover:text-white transition-all shadow-sm"
            whileHover={{ scale: 1.1 }}
          >
            <Eye size={16} />
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}
