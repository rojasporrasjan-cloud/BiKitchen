import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Truck, Sparkles } from 'lucide-react';
import { useShippingDiscount } from '../context/ShippingDiscountContext';

export default function ShippingDiscountBanner() {
  const { isEnabled, message, percentage } = useShippingDiscount();
  const [isVisible, setIsVisible] = React.useState(true);

  if (!isEnabled || !isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="fixed bottom-4 left-4 z-50 bg-gradient-to-r from-green-500 via-emerald-500 to-green-600 text-white shadow-2xl rounded-2xl w-[calc(100%-5.5rem)] md:w-full md:max-w-sm overflow-hidden"
      >
        <div className="p-4">
          <div className="flex items-start gap-3">
            <motion.div
              animate={{
                rotate: [0, 10, -10, 10, 0],
                scale: [1, 1.1, 1, 1.1, 1]
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                repeatDelay: 3
              }}
              className="bg-white/20 p-2 rounded-xl backdrop-blur-sm"
            >
              <Truck size={24} className="text-white" />
            </motion.div>

            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <Sparkles size={16} className="text-yellow-300" />
                <span className="font-black text-yellow-300 text-xs uppercase tracking-wider">Oferta Especial</span>
              </div>
              <p className="text-sm font-bold leading-tight mb-2">
                {message}
              </p>
              <div className="bg-white/20 backdrop-blur-sm px-3 py-1 rounded-lg inline-block">
                <span className="text-xs font-black">
                  -{percentage}% en envío
                </span>
              </div>
            </div>

            <button
              onClick={() => setIsVisible(false)}
              className="text-white/80 hover:text-white hover:bg-white/10 p-1 rounded-full transition-all"
              aria-label="Cerrar oferta"
            >
              <span className="sr-only">Cerrar</span>
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
          </div>
        </div>

        {/* Progress bar effect */}
        <motion.div
          initial={{ width: "100%" }}
          animate={{ width: "0%" }}
          transition={{ duration: 10, ease: "linear" }}
          className="h-1 bg-white/30"
        />
      </motion.div>
    </AnimatePresence>
  );
}
