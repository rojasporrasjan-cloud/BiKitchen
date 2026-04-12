import React from 'react';
import { motion } from 'framer-motion';
import './BikitchenLogo.css';

/**
 * BikitchenLogo Component
 * SVG Logo con soporte para animaciones
 * - Fondo transparente
 * - Listo para animaciones con Framer Motion
 * - Responsivo y escalable
 * - Incluye subtexto "comida saludable lista para comer"
 */
export default function BikitchenLogo({
  size = 160,
  animated = false,
  showSubtitle = false,
  subtitle = 'comida saludable lista para comer',
  className = '',
  ...props
}) {
  // Variantes de animación para cada letra del subtítulo
  const letterVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: (i) => ({
      opacity: 1,
      y: 0,
      transition: {
        delay: i * 0.05,
        duration: 0.4,
        ease: 'easeOut'
      }
    })
  };

  const LogoContent = (
    <div className="flex flex-col items-center">
      <svg
        viewBox="0 0 300 200"
        width={size}
        height={(size * 200) / 300}
        className={`${className}`}
        {...props}
      >
        {/* BIKITCHEN - Texto arqueado arriba */}
        <defs>
          <path
            id="topCurve"
            d="M 30,100 Q 150,30 270,100"
            fill="none"
          />
        </defs>

        <text
          fontSize="42"
          fontWeight="700"
          letterSpacing="8"
          fill="#FF671D"
          fontFamily="'Raleway', sans-serif"
          className="logo-bikitchen-text"
        >
          <textPath
            href="#topCurve"
            startOffset="50%"
            textAnchor="middle"
            dy="-15"
          >
            BIKITCHEN
          </textPath>
        </text>

        {/* Línea decorativa izquierda */}
        <g className="logo-line-left">
          <line
            x1="25"
            y1="95"
            x2="55"
            y2="105"
            stroke="#FF671D"
            strokeWidth="3"
            strokeLinecap="round"
          />
          <circle
            cx="20"
            cy="98"
            r="2.5"
            fill="#FF671D"
          />
        </g>

        {/* Línea decorativa derecha */}
        <g className="logo-line-right">
          <line
            x1="245"
            y1="105"
            x2="275"
            y2="95"
            stroke="#FF671D"
            strokeWidth="3"
            strokeLinecap="round"
          />
          <circle
            cx="280"
            cy="98"
            r="2.5"
            fill="#FF671D"
          />
        </g>

        {/* FOOD - Texto abajo centrado */}
        <text
          x="150"
          y="160"
          fontSize="44"
          fontWeight="700"
          letterSpacing="6"
          textAnchor="middle"
          fill="#FF671D"
          fontFamily="'Raleway', sans-serif"
          className="logo-food-text"
        >
          FOOD
        </text>
      </svg>

      {/* Subtítulo con animación de letras */}
      {showSubtitle && (
        <motion.div
          className="text-center mt-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
        >
          <div className="text-xs font-medium text-gray-600 tracking-wider">
            {subtitle.split('').map((char, i) => (
              <motion.span
                key={i}
                custom={i}
                variants={letterVariants}
                initial="hidden"
                animate="visible"
                className="inline-block"
              >
                {char === ' ' ? '\u00A0' : char}
              </motion.span>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );

  if (animated) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="inline-block"
      >
        {LogoContent}
      </motion.div>
    );
  }

  return LogoContent;
}
