import React from 'react';
import { motion } from 'framer-motion';

const formatPrice = (value) => `₡${value.toLocaleString('es-CR')}`;

export default function IndividualCard({ producto, onClick, onEdit }) {

  return (
    <motion.div
      whileHover={{ y: -4, scale: 1.03 }}
      transition={{ type: 'spring', stiffness: 260, damping: 18 }}
      className="rounded-2xl shadow-md hover:shadow-xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 overflow-hidden flex flex-col cursor-pointer"
      onClick={onClick}
    >
      <div className="h-40 w-full overflow-hidden">
        <img
          src={producto.imagen}
          alt={producto.nombre}
          className="w-full h-full object-cover"
        />
      </div>

      <div className="p-4 flex flex-col gap-2 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="text-base font-bold text-[#FF671D] dark:text-[#FF8C3A] mb-0.5">
              {producto.nombre}
            </h3>
            <p className="text-xs text-gray-600 dark:text-gray-300 leading-snug">
              {producto.descripcion}
            </p>
          </div>
        </div>

        <div className="mt-2 flex flex-col gap-1 text-[11px] text-gray-600 dark:text-gray-300">
          {producto.precio500 ? (
            <div className="flex justify-between">
              <span>500 g</span>
              <span className="font-semibold">{formatPrice(producto.precio500)}</span>
            </div>
          ) : (
            <div className="flex justify-between">
              <span>500 g</span>
              <span className="text-gray-400">No disponible</span>
            </div>
          )}

          {producto.precio1kg ? (
            <div className="flex justify-between">
              <span>1 kg</span>
              <span className="font-semibold">{formatPrice(producto.precio1kg)}</span>
            </div>
          ) : (
            <div className="flex justify-between">
              <span>1 kg</span>
              <span className="text-gray-400">No disponible</span>
            </div>
          )}
        </div>

        <div className="mt-3 flex items-center justify-between gap-2">
          <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-[#FDFBF9] dark:bg-gray-900 text-[10px] text-gray-500 dark:text-gray-300 border border-[#F3E2D7] dark:border-gray-700">
            {producto.categoria}
          </span>

          <div className="flex items-center gap-2 text-[11px] text-[#FF671D] dark:text-[#FF8C3A] font-semibold">
            <span>Ver detalles</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
