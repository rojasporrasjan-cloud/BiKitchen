import React, { useState, useEffect } from 'react';
import { Users, AlertTriangle, PieChart, Calendar } from 'lucide-react';
import { motion } from 'framer-motion';
import { db } from '../../firebase/config';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import {
  mapPedidosFromLegacy,
  assignWorkload
} from '../../utils/logisticsUtils';

// Vista de gestión de personal y reparto de carga (cocina / empaquetado)
// Usa pedidos reales de la colección "pedidos" filtrados por fecha de entrega

const defaultWorkers = {
  cocina: [
    { nombre: 'María', porcentaje: 70 },
    { nombre: 'Luis', porcentaje: 30 }
  ],
  empaquetado: [
    { nombre: 'Ana', porcentaje: 60 },
    { nombre: 'José', porcentaje: 25 },
    { nombre: 'Carla', porcentaje: 15 }
  ]
};

export default function WorkloadView() {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [workers, setWorkers] = useState(defaultWorkers);
  const [orders, setOrders] = useState([]); // pedidos normalizados
  const [loading, setLoading] = useState(false);

  // Cargar pedidos reales para la fecha seleccionada
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const q = query(
          collection(db, 'pedidos'),
          where('fecha_entrega', '==', selectedDate),
          orderBy('cliente', 'asc')
        );
        const snapshot = await getDocs(q);
        const raw = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
        const normalized = mapPedidosFromLegacy(raw);
        setOrders(normalized);
      } catch (error) {
        console.error('[Workload] Error loading pedidos:', error);
      }
      setLoading(false);
    };

    load();
  }, [selectedDate]);

  // Helpers para totales de porcentaje
  const totalCocina = workers.cocina.reduce((acc, w) => acc + (Number(w.porcentaje) || 0), 0);
  const totalEmpaquetado = workers.empaquetado.reduce(
    (acc, w) => acc + (Number(w.porcentaje) || 0),
    0
  );

  const workloadSummary = assignWorkload(orders, {}, workers);

  const handleWorkerChange = (type, index, field, value) => {
    setWorkers((prev) => {
      const updated = { ...prev, [type]: [...prev[type]] };
      updated[type][index] = {
        ...updated[type][index],
        [field]: field === 'porcentaje' ? Number(value) || 0 : value
      };
      return updated;
    });
  };

  const addWorker = (type) => {
    setWorkers((prev) => ({
      ...prev,
      [type]: [...prev[type], { nombre: '', porcentaje: 0 }]
    }));
  };

  const removeWorker = (type, index) => {
    setWorkers((prev) => ({
      ...prev,
      [type]: prev[type].filter((_, i) => i !== index)
    }));
  };

  const renderWorkerTable = (type, title) => {
    const list = workers[type];
    const total = type === 'cocina' ? totalCocina : totalEmpaquetado;

    return (
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Users size={18} className="text-orange-500" />
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          </div>
          <button
            onClick={() => addWorker(type)}
            className="text-sm px-3 py-1.5 rounded-lg bg-gray-900 text-white hover:bg-black transition-colors"
          >
            + Añadir
          </button>
        </div>

        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500 border-b">
              <th className="py-2">Nombre</th>
              <th className="py-2 w-32">Porcentaje</th>
              <th className="py-2 w-16 text-right">&nbsp;</th>
            </tr>
          </thead>
          <tbody>
            {list.map((w, index) => (
              <tr key={index} className="border-b last:border-b-0">
                <td className="py-2 pr-4">
                  <input
                    type="text"
                    value={w.nombre}
                    onChange={(e) => handleWorkerChange(type, index, 'nombre', e.target.value)}
                    className="w-full px-2 py-1 border border-gray-200 rounded-md text-sm"
                    placeholder="Nombre"
                  />
                </td>
                <td className="py-2 pr-4">
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={w.porcentaje}
                      onChange={(e) => handleWorkerChange(type, index, 'porcentaje', e.target.value)}
                      className="w-full px-2 py-1 border border-gray-200 rounded-md text-sm"
                    />
                    <span className="text-xs text-gray-500">%</span>
                  </div>
                </td>
                <td className="py-2 text-right">
                  <button
                    onClick={() => removeWorker(type, index)}
                    className="text-xs text-red-500 hover:text-red-600"
                  >
                    Eliminar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-3 flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <span className="font-medium">Total:</span>
            <span>{total}%</span>
          </div>
          {total !== 100 && (
            <div className="flex items-center gap-1 text-xs text-orange-600">
              <AlertTriangle size={14} />
              <span>La suma debe ser 100% para reparto exacto.</span>
            </div>
          )}
        </div>
      </div>
    );
  };

  const totalPedidos = orders.length;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Gestión de Personal y Carga</h1>
          <p className="text-sm text-gray-500 mt-1">
            Define quién cocina y quién empaca, y reparte la carga de trabajo según porcentajes.
          </p>
        </div>
        <div className="flex items-center gap-3 bg-white rounded-lg border border-gray-200 px-3 py-2 shadow-sm">
          <Calendar size={18} className="text-orange-500" />
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-2 py-1 border border-gray-200 rounded-md text-sm"
          />
          <span className="text-xs text-gray-500">
            {loading ? 'Cargando...' : `${totalPedidos} pedido${totalPedidos !== 1 ? 's' : ''}`}
          </span>
        </div>
      </div>

      {/* Tablas de personal */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {renderWorkerTable('cocina', 'Personal de Cocina')}
        {renderWorkerTable('empaquetado', 'Personal de Empaquetado')}
      </div>

      {/* Resumen de carga calculado */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <div className="flex items-center gap-2 mb-4">
          <PieChart size={18} className="text-orange-500" />
          <h3 className="text-lg font-semibold text-gray-900">Resumen de Carga Calculada</h3>
        </div>

        {orders.length === 0 ? (
          <p className="text-sm text-gray-500">
            No hay pedidos para la fecha seleccionada. Crea pedidos para ver el reparto de trabajo.
          </p>
        ) : (
          <>
            {/* Barras de porcentaje visuales */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6 text-xs">
              {/* Barra de empaquetado */}
              <div>
                <p className="font-semibold mb-1">Empaquetado (% carga)</p>
                <div className="w-full h-3 rounded-full bg-gray-100 overflow-hidden flex">
                  {workers.empaquetado.map((w, idx) => {
                    const pct = Number(w.porcentaje) || 0;
                    if (pct <= 0) return null;
                    return (
                      <div
                        key={w.nombre + idx}
                        style={{ width: `${pct}%` }}
                        className="h-full flex items-center justify-center text-[9px] text-white"
                      >
                        <span className="px-1 truncate bg-gradient-to-r from-orange-500 to-emerald-500">
                          {w.nombre || 'Sin nombre'} ({pct}%)
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Barra de cocina */}
              <div>
                <p className="font-semibold mb-1">Cocina (% carga)</p>
                <div className="w-full h-3 rounded-full bg-gray-100 overflow-hidden flex">
                  {workers.cocina.map((w, idx) => {
                    const pct = Number(w.porcentaje) || 0;
                    if (pct <= 0) return null;
                    return (
                      <div
                        key={w.nombre + idx}
                        style={{ width: `${pct}%` }}
                        className="h-full flex items-center justify-center text-[9px] text-white"
                      >
                        <span className="px-1 truncate bg-gradient-to-r from-sky-500 to-indigo-500">
                          {w.nombre || 'Sin nombre'} ({pct}%)
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Detalle numérico por persona y menú */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
              {/* Empaquetado */}
              <div>
                <h4 className="font-semibold mb-2">Empaquetado</h4>
                <div className="space-y-2">
                  {workloadSummary.empaquetado.map((w) => (
                    <div
                      key={w.nombre}
                      className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2"
                    >
                      <div>
                        <p className="font-medium text-gray-900">{w.nombre}</p>
                        <p className="text-xs text-gray-500">
                          {Object.entries(w.tareas)
                            .map(([tipo, cant]) => `${tipo}: ${cant}`)
                            .join(' • ') || 'Sin tareas asignadas'}
                        </p>
                      </div>
                      <span className="text-xs font-semibold text-gray-700">
                        {w.totalPlatos} platos
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Cocina */}
              <div>
                <h4 className="font-semibold mb-2">Cocina</h4>
                <div className="space-y-2">
                  {workloadSummary.cocina.map((w) => (
                    <div
                      key={w.nombre}
                      className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2"
                    >
                      <div>
                        <p className="font-medium text-gray-900">{w.nombre}</p>
                        <p className="text-xs text-gray-500">
                          {Object.entries(w.detalles)
                            .map(([tipo, cant]) => `${tipo}: ${cant}`)
                            .join(' • ') || 'Sin tareas asignadas'}
                        </p>
                      </div>
                      <span className="text-xs font-semibold text-gray-700">
                        {w.totalTareas} tareas
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
