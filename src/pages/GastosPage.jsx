import React, { useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { Receipt } from 'lucide-react';
import SEOHead from '../components/SEOHead';
import PantallaGastos from '../components/gastos/PantallaGastos';
import { pedirGastosConLink } from '../utils/gastosClient';

/**
 * /gastos/:codigo — Gina anota cada gasto desde el celular, sin entrar al panel
 * (Jan, 9 oct 2026). Los datos los guarda netlify/functions/gastos.js; Jan los ve
 * en Panel → Gastos.
 */
export default function GastosPage() {
    const { codigo } = useParams();
    const pedir = useCallback((accion, datos) => pedirGastosConLink(accion, { codigo, ...datos }), [codigo]);

    return (
        <div className="min-h-screen bg-bikitchen-beige">
            <SEOHead title="Gastos | BiKitchen" description="Herramienta interna: anotar los gastos." noindex />
            <header className="px-4 pt-6 pb-8 bg-gradient-to-br from-bikitchen-orange via-orange-500 to-amber-500 text-white">
                <div className="max-w-xl mx-auto">
                    <p className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-white/90">
                        <Receipt size={14} aria-hidden="true" /> BiKitchen
                    </p>
                    <h1 className="mt-1 text-3xl font-black text-white">Gastos</h1>
                    <p className="mt-1 font-semibold text-white/90">Anotá cada pago el día que se hace. Así sabemos en qué se va la plata.</p>
                </div>
            </header>
            <main className="max-w-xl mx-auto px-3 -mt-4 pb-12">
                <PantallaGastos pedir={pedir} />
            </main>
        </div>
    );
}
