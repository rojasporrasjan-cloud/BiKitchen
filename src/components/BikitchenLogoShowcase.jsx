import React from 'react';
import BikitchenLogo from './BikitchenLogo';
import './BikitchenLogo.css';

/**
 * Showcase de todas las variaciones del logo
 * Útil para desarrollo y demostración
 */
export default function BikitchenLogoShowcase() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold text-slate-900 mb-2 text-center">
          BikitChen Logo Variations
        </h1>
        <p className="text-center text-slate-600 mb-12">
          Todas las animaciones y variaciones disponibles
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {/* 1. Logo básico */}
          <div className="bg-white rounded-lg p-8 shadow-md flex flex-col items-center justify-center min-h-64">
            <h3 className="text-sm font-semibold text-slate-600 mb-6">
              Básico
            </h3>
            <BikitchenLogo size={120} />
          </div>

          {/* 2. Logo con animación de carga */}
          <div className="bg-white rounded-lg p-8 shadow-md flex flex-col items-center justify-center min-h-64">
            <h3 className="text-sm font-semibold text-slate-600 mb-6">
              Con Animación de Carga
            </h3>
            <BikitchenLogo size={120} animated={true} />
          </div>

          {/* 3. Logo con pulso */}
          <div className="bg-white rounded-lg p-8 shadow-md flex flex-col items-center justify-center min-h-64">
            <h3 className="text-sm font-semibold text-slate-600 mb-6">
              Con Pulso
            </h3>
            <div className="logo-pulse">
              <BikitchenLogo size={120} />
            </div>
          </div>

          {/* 4. Logo flotante */}
          <div className="bg-white rounded-lg p-8 shadow-md flex flex-col items-center justify-center min-h-64">
            <h3 className="text-sm font-semibold text-slate-600 mb-6">
              Flotante
            </h3>
            <div className="logo-float">
              <BikitchenLogo size={120} />
            </div>
          </div>

          {/* 5. Logo con rotación */}
          <div className="bg-white rounded-lg p-8 shadow-md flex flex-col items-center justify-center min-h-64">
            <h3 className="text-sm font-semibold text-slate-600 mb-6">
              Rotación
            </h3>
            <div className="logo-rotate">
              <BikitchenLogo size={120} />
            </div>
          </div>

          {/* 6. Logo flotante + Pulso */}
          <div className="bg-white rounded-lg p-8 shadow-md flex flex-col items-center justify-center min-h-64">
            <h3 className="text-sm font-semibold text-slate-600 mb-6">
              Flotante + Pulso
            </h3>
            <div className="logo-float-pulse">
              <BikitchenLogo size={120} />
            </div>
          </div>

          {/* 7. Logo interactivo (hover) */}
          <div className="bg-white rounded-lg p-8 shadow-md flex flex-col items-center justify-center min-h-64">
            <h3 className="text-sm font-semibold text-slate-600 mb-6">
              Interactivo (Hover)
            </h3>
            <div className="logo-interactive">
              <BikitchenLogo size={120} />
            </div>
          </div>

          {/* 8. Logo con líneas animadas */}
          <div className="bg-white rounded-lg p-8 shadow-md flex flex-col items-center justify-center min-h-64">
            <h3 className="text-sm font-semibold text-slate-600 mb-6">
              Líneas Animadas
            </h3>
            <div className="logo-animated-lines">
              <BikitchenLogo size={120} />
            </div>
          </div>

          {/* 9. Logo más grande */}
          <div className="bg-white rounded-lg p-8 shadow-md flex flex-col items-center justify-center min-h-64">
            <h3 className="text-sm font-semibold text-slate-600 mb-6">
              Tamaño Grande
            </h3>
            <BikitchenLogo size={200} />
          </div>
        </div>

        {/* Sección de código */}
        <div className="mt-16 bg-white rounded-lg p-8 shadow-md">
          <h2 className="text-2xl font-bold text-slate-900 mb-6">
            Cómo usar el Logo
          </h2>

          <div className="space-y-6">
            <div>
              <h3 className="font-semibold text-slate-900 mb-2">
                1. Logo básico:
              </h3>
              <pre className="bg-slate-100 p-4 rounded text-sm overflow-x-auto">
                <code>{`<BikitchenLogo size={120} />`}</code>
              </pre>
            </div>

            <div>
              <h3 className="font-semibold text-slate-900 mb-2">
                2. Con animación de carga:
              </h3>
              <pre className="bg-slate-100 p-4 rounded text-sm overflow-x-auto">
                <code>{`<BikitchenLogo size={120} animated={true} />`}</code>
              </pre>
            </div>

            <div>
              <h3 className="font-semibold text-slate-900 mb-2">
                3. Con clases CSS para animaciones:
              </h3>
              <pre className="bg-slate-100 p-4 rounded text-sm overflow-x-auto">
                <code>{`<div className="logo-pulse">
  <BikitchenLogo size={120} />
</div>`}</code>
              </pre>
            </div>

            <div>
              <h3 className="font-semibold text-slate-900 mb-2">
                Variaciones disponibles:
              </h3>
              <ul className="list-disc list-inside text-slate-600 space-y-2">
                <li><code>logo-pulse</code> - Efecto de pulso</li>
                <li><code>logo-float</code> - Efecto flotante</li>
                <li><code>logo-rotate</code> - Rotación continua</li>
                <li><code>logo-float-pulse</code> - Flotación + Pulso</li>
                <li><code>logo-interactive</code> - Efecto al hover</li>
                <li><code>logo-animated-lines</code> - Líneas animadas</li>
                <li><code>logo-writein</code> - Efecto de escritura</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
