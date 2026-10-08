import React, { useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { Eye } from 'lucide-react';
import SEOHead from '../components/SEOHead';
import PantallaPlanilla from '../components/planilla/PantallaPlanilla';
import { pedirAlReloj } from '../utils/planillaClient';

/**
 * /planilla/:codigo — la planilla para Gina, sin entrar al panel.
 *
 * Ve lo mismo que Jan en Panel → Planilla (quién está trabajando, horas y
 * salario de cada día, el Excel), pero no puede cambiar marcas ni tarifas.
 * Los datos los da netlify/functions/planilla.js (acción `verGina`), con un
 * código distinto al del reloj: el link del iPad no abre esta página.
 */
export default function PlanillaGinaPage() {
    const { codigo } = useParams();
    const cargarDatos = useCallback(
        (desde, hasta) => pedirAlReloj('verGina', { codigo, desde, hasta }),
        [codigo]
    );

    return (
        <div className="min-h-screen px-3 py-4 sm:px-6 sm:py-6 bg-bikitchen-beige text-gray-800">
            <SEOHead title="Planilla | BiKitchen" description="Herramienta interna: horas y salarios de la cocina." noindex />
            <div className="max-w-6xl mx-auto">
                <p className="inline-flex items-center gap-1.5 mb-3 px-3 py-1 bg-white border border-gray-200 rounded-full text-xs font-bold text-gray-600">
                    <Eye size={13} aria-hidden="true" /> Solo para ver · si algo está mal, avisale a Jan
                </p>
                <PantallaPlanilla cargarDatos={cargarDatos} />
            </div>
        </div>
    );
}
