import React from 'react';
import { motion } from 'framer-motion';
import BikitchenLogo from '../components/BikitchenLogo';
import '../components/BikitchenLogo.css';

export default function LogoDemoPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 pt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-16"
        >
          <h1 className="text-5xl md:text-6xl font-bold text-slate-900 mb-4">
            BiKitchen Logo
          </h1>
          <p className="text-xl text-slate-600">
            Nuevo logo con animaciones fluidas y subtítulo personalizado
          </p>
        </motion.div>

        {/* Logo Principal con Subtítulo */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6 }}
          className="bg-white rounded-3xl shadow-2xl p-12 mb-16 text-center"
        >
          <div className="inline-block">
            <BikitchenLogo
              size={240}
              showSubtitle={true}
              subtitle="comida saludable lista para comer"
            />
          </div>
        </motion.div>

        {/* Grid de Variaciones */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
          {/* 1. Logo básico */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-2xl shadow-lg p-8 text-center"
          >
            <h3 className="text-sm font-semibold text-slate-600 mb-6">
              Básico
            </h3>
            <BikitchenLogo size={120} />
          </motion.div>

          {/* 2. Con animación de carga */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-2xl shadow-lg p-8 text-center"
          >
            <h3 className="text-sm font-semibold text-slate-600 mb-6">
              Con Animación de Carga
            </h3>
            <BikitchenLogo size={120} animated={true} />
          </motion.div>

          {/* 3. Con pulso */
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white rounded-2xl shadow-lg p-8 text-center"
          >
            <h3 className="text-sm font-semibold text-slate-600 mb-6">
              Con Pulso
            </h3>
            <div className="logo-pulse">
              <BikitchenLogo size={120} />
            </div>
          </motion.div>

          {/* 4. Flotante */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-white rounded-2xl shadow-lg p-8 text-center"
          >
            <h3 className="text-sm font-semibold text-slate-600 mb-6">
              Flotante
            </h3>
            <div className="logo-float">
              <BikitchenLogo size={120} />
            </div>
          </motion.div>

          {/* 5. Con rotación */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-white rounded-2xl shadow-lg p-8 text-center"
          >
            <h3 className="text-sm font-semibold text-slate-600 mb-6">
              Rotación
            </h3>
            <div className="logo-rotate">
              <BikitchenLogo size={120} />
            </div>
          </motion.div>

          {/* 6. Flotante + Pulso */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="bg-white rounded-2xl shadow-lg p-8 text-center"
          >
            <h3 className="text-sm font-semibold text-slate-600 mb-6">
              Flotante + Pulso
            </h3>
            <div className="logo-float-pulse">
              <BikitchenLogo size={120} />
            </div>
          </motion.div>
        </div>

        {/* Documentación */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="bg-white rounded-2xl shadow-lg p-8 mb-8"
        >
          <h2 className="text-2xl font-bold text-slate-900 mb-6">
            Cómo Usar el Logo
          </h2>

          <div className="space-y-6">
            <div>
              <h3 className="font-semibold text-slate-900 mb-2">
                1. Logo Básico:
              </h3>
              <pre className="bg-slate-100 p-4 rounded text-sm overflow-x-auto">
                <code>{`<BikitchenLogo size={120} />`}</code>
              </pre>
            </div>

            <div>
              <h3 className="font-semibold text-slate-900 mb-2">
                2. Con Subtítulo "comida saludable lista para comer":
              </h3>
              <pre className="bg-slate-100 p-4 rounded text-sm overflow-x-auto">
                <code>{`<BikitchenLogo
  size={120}
  showSubtitle={true}
  subtitle="comida saludable lista para comer"
/>`}</code>
              </pre>
            </div>

            <div>
              <h3 className="font-semibold text-slate-900 mb-2">
                3. Con Animación de Carga:
              </h3>
              <pre className="bg-slate-100 p-4 rounded text-sm overflow-x-auto">
                <code>{`<BikitchenLogo
  size={120}
  animated={true}
/>`}</code>
              </pre>
            </div>

            <div>
              <h3 className="font-semibold text-slate-900 mb-2">
                4. Clases CSS Disponibles para Animaciones:
              </h3>
              <div className="bg-slate-100 p-4 rounded">
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2">
                    <code className="bg-slate-200 px-2 py-1 rounded">logo-pulse</code>
                    <span>Efecto de pulso suave</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <code className="bg-slate-200 px-2 py-1 rounded">logo-float</code>
                    <span>Efecto flotante</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <code className="bg-slate-200 px-2 py-1 rounded">logo-rotate</code>
                    <span>Rotación continua</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <code className="bg-slate-200 px-2 py-1 rounded">logo-float-pulse</code>
                    <span>Flotación + Pulso combinado</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <code className="bg-slate-200 px-2 py-1 rounded">logo-interactive</code>
                    <span>Efecto al hacer hover</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <code className="bg-slate-200 px-2 py-1 rounded">logo-animated-lines</code>
                    <span>Líneas decorativas animadas</span>
                  </li>
                </ul>
              </div>
            </div>

            <div>
              <h3 className="font-semibold text-slate-900 mb-2">
                5. Props Disponibles:
              </h3>
              <div className="bg-slate-100 p-4 rounded text-sm space-y-2">
                <p><code className="bg-slate-200 px-2 py-1 rounded">size</code> - Tamaño del logo (default: 160)</p>
                <p><code className="bg-slate-200 px-2 py-1 rounded">animated</code> - Mostrar animación de carga (default: false)</p>
                <p><code className="bg-slate-200 px-2 py-1 rounded">showSubtitle</code> - Mostrar subtítulo (default: false)</p>
                <p><code className="bg-slate-200 px-2 py-1 rounded">subtitle</code> - Texto del subtítulo personalizado</p>
                <p><code className="bg-slate-200 px-2 py-1 rounded">className</code> - Clases CSS adicionales</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Notes */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="bg-blue-50 border border-blue-200 rounded-2xl p-6 mb-8"
        >
          <p className="text-sm text-blue-900">
            ✨ <strong>Nota:</strong> El logo SVG tiene fondo transparente y las animaciones se aplican automáticamente en la carga. El subtítulo de cada letra aparece con efecto escalonado para una experiencia visual más fluida.
          </p>
        </motion.div>
      </div>
    </div>
  );
}
