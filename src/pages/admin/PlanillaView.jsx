import React from 'react';
import { Lock } from 'lucide-react';
import PantallaPlanilla from '../../components/planilla/PantallaPlanilla';
import { useAuth } from '../../context/AuthContext';
import { pedirALaPlanilla } from '../../utils/planillaClient';
import { anotarLecturas } from '../../utils/contadorFirestore';

/**
 * Panel → Planilla: quiénes trabajan, cuánto ganan por hora, y el salario de
 * cada persona por día con las marcas del reloj del iPad (/reloj/<código>).
 * Gina (admin) la ve en el panel sin poder cambiar nada; también hay un link
 * para verla sin entrar: /planilla/<código>.
 *
 * Lecturas (regla 17): los empleados (pocos) y las marcas de UNA semana.
 */
const cargarDelPanel = async (desde, hasta) => {
    const [{ empleados }, { marcas }] = await Promise.all([
        pedirALaPlanilla('empleados'),
        pedirALaPlanilla('marcas', { desde, hasta })
    ]);
    anotarLecturas(empleados.length + marcas.length, 'Planilla');
    return { empleados, marcas };
};

// Las admins (Gina) la VEN; cambiar algo es solo del dueño (la función también lo revisa)
export default function PlanillaView() {
    const { isAdmin, isSuperAdmin } = useAuth();
    if (!isAdmin()) {
        return (
            <div className="flex flex-col items-center justify-center py-24 text-center">
                <Lock size={48} className="mb-4 text-gray-300" aria-hidden="true" />
                <h2 className="text-xl font-bold text-gray-800">Acceso restringido</h2>
                <p className="mt-1 text-gray-500">Esta herramienta es solo para administradores.</p>
            </div>
        );
    }
    return <PantallaPlanilla cargarDatos={cargarDelPanel} puedeEditar={isSuperAdmin()} />;
}
