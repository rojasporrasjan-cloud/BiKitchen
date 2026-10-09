import React, { useCallback, useState } from 'react';
import { Receipt, Lock, Download } from 'lucide-react';
import PantallaGastos from '../../components/gastos/PantallaGastos';
import LinkDelReloj from '../../components/planilla/LinkDelReloj';
import { useAuth } from '../../context/AuthContext';
import { pedirGastosDelPanel } from '../../utils/gastosClient';
import { categoriaDe } from '../../data/gastos';
import { totalesDeGastos } from '../../utils/gastos';
import { fechaCR } from '../../utils/planilla';

/**
 * Panel → Gastos: lo que Gina anota con su link (y lo que anote Jan), por semana y
 * por categoría, con el Excel. Solo el dueño cambia; las admins solo ven.
 * Los montos NO se escriben en el repo (es público): viven en Firestore.
 */
const descargarExcel = async (desde, hasta) => {
    const { gastos } = await pedirGastosDelPanel('lista', { desde, hasta });
    const XLSX = await import('xlsx');
    const libro = XLSX.utils.book_new();
    const filas = [...gastos].sort((a, b) => a.fecha.localeCompare(b.fecha)).map(g => ({
        Fecha: g.fecha, Categoría: categoriaDe(g.categoria).nombre, 'Qué fue': g.que, 'A quién': g.proveedor, Pago: g.pago, 'Monto ₡': g.monto
    }));
    const hoja = XLSX.utils.json_to_sheet(filas);
    hoja['!cols'] = [{ wch: 12 }, { wch: 24 }, { wch: 36 }, { wch: 24 }, { wch: 14 }, { wch: 12 }];
    XLSX.utils.book_append_sheet(libro, hoja, 'Gastos');
    const { porCategoria, total } = totalesDeGastos(gastos);
    const resumen = XLSX.utils.json_to_sheet([...porCategoria.map(c => ({ Categoría: c.nombre, 'Total ₡': c.total })), { Categoría: 'TOTAL', 'Total ₡': total }]);
    resumen['!cols'] = [{ wch: 26 }, { wch: 14 }];
    XLSX.utils.book_append_sheet(libro, resumen, 'Por categoría');
    XLSX.writeFile(libro, `Gastos BiKitchen ${desde} al ${hasta}.xlsx`);
};

function ExcelDelMes() {
    const hoy = fechaCR();
    const [mes, setMes] = useState(hoy.slice(0, 7));
    const [error, setError] = useState('');
    const handleBajar = async () => {
        setError('');
        const [a, m] = mes.split('-').map(Number);
        const ultimo = new Date(Date.UTC(a, m, 0)).toISOString().slice(0, 10);
        try { await descargarExcel(`${mes}-01`, ultimo); } catch (e) { setError(e.message); }
    };
    return (
        <section className="p-5 bg-white rounded-3xl shadow-sm ring-1 ring-black/5">
            <h2 className="flex items-center gap-2 text-lg font-black text-gray-900"><Download size={18} className="text-bikitchen-orange" aria-hidden="true" /> Excel del mes</h2>
            <div className="flex flex-wrap items-center gap-2 mt-3">
                <input type="month" value={mes} max={hoy.slice(0, 7)} onChange={e => setMes(e.target.value)} aria-label="Mes"
                    className="px-3 py-2 border-2 border-gray-200 rounded-xl font-bold" />
                <button type="button" onClick={handleBajar} className="px-4 py-2 bg-bikitchen-orange hover:bg-bikitchen-orange-dark text-white text-sm font-bold rounded-xl">
                    Descargar
                </button>
            </div>
            {error && <p role="alert" className="mt-2 text-sm font-bold text-red-700">{error}</p>}
        </section>
    );
}

export default function GastosView() {
    const { isAdmin, isSuperAdmin } = useAuth();
    const pedir = useCallback((accion, datos) => pedirGastosDelPanel(accion, datos), []);
    if (!isAdmin()) {
        return (
            <div className="flex flex-col items-center justify-center py-24 text-center">
                <Lock size={48} className="mb-4 text-gray-300" aria-hidden="true" />
                <h2 className="text-xl font-bold text-gray-800">Acceso restringido</h2>
                <p className="mt-1 text-gray-500">Esta herramienta es solo para administradores.</p>
            </div>
        );
    }
    const dueno = isSuperAdmin();
    return (
        <div className="max-w-3xl mx-auto space-y-4">
            <header className="flex items-center gap-4 p-6 bg-gradient-to-br from-bikitchen-orange via-orange-500 to-amber-500 text-white rounded-3xl shadow-xl">
                <span className="flex items-center justify-center w-14 h-14 bg-white/20 rounded-2xl" aria-hidden="true"><Receipt size={28} /></span>
                <div>
                    <h1 className="text-3xl font-black text-white">Gastos</h1>
                    <p className="text-sm font-semibold text-white/90">Lo que se paga cada día y en qué se va la plata</p>
                </div>
            </header>
            <PantallaGastos pedir={pedir} soloVer={!dueno}
                abajo={(
                    <div className="grid sm:grid-cols-2 gap-4">
                        <ExcelDelMes />
                        {dueno && <LinkDelReloj cual="gastos" />}
                    </div>
                )} />
        </div>
    );
}
