import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileSpreadsheet, Upload, CheckCircle2, AlertTriangle, X, ArrowRight, ChefHat, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';
import { parseBiKitchenExcelBuffer } from '../../utils/excelMenuParser';

export default function ExcelImportModal({ isOpen, onClose, onImport }) {
  const [file, setFile] = useState(null);
  const [parsedData, setParsedData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  if (!isOpen) return null;

  const handleFileChange = async (e) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      await processFile(selectedFile);
    }
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    setDragOver(false);
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      await processFile(droppedFile);
    }
  };

  const processFile = async (selectedFile) => {
    if (!selectedFile.name.endsWith('.xlsx') && !selectedFile.name.endsWith('.xls')) {
      toast.error('Por favor selecciona un archivo Excel (.xlsx o .xls)');
      return;
    }

    setFile(selectedFile);
    setLoading(true);
    try {
      const arrayBuffer = await selectedFile.arrayBuffer();
      const result = parseBiKitchenExcelBuffer(arrayBuffer);
      setParsedData(result);
      toast.success('Excel procesado correctamente');
    } catch (error) {
      console.error('[ExcelImportModal] Error al procesar Excel:', error);
      toast.error('Error al leer el archivo Excel. Verifica el formato.');
      setParsedData(null);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmImport = () => {
    if (!parsedData) return;
    onImport(parsedData);
    toast.success('✨ ¡Menú semanal importado con éxito!');
    onClose();
  };

  const resetModal = () => {
    setFile(null);
    setParsedData(null);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full overflow-hidden border border-orange-100"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-orange-500 via-orange-400 to-amber-400 p-6 text-white flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center">
                <FileSpreadsheet size={24} />
              </div>
              <div>
                <h3 className="text-xl font-bold">Importar Menú Semanal desde Excel</h3>
                <p className="text-xs text-white/80">Carga automática de Almuerzos, Cenas, Desayunos y Packs</p>
              </div>
            </div>
            <button
              onClick={() => { resetModal(); onClose(); }}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors text-white"
            >
              <X size={20} />
            </button>
          </div>

          {/* Body */}
          <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
            {!parsedData ? (
              /* Dropzone */
              <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                className={`border-3 border-dashed rounded-3xl p-8 text-center transition-all cursor-pointer ${
                  dragOver
                    ? 'border-orange-500 bg-orange-50/80 scale-[1.01]'
                    : 'border-orange-200 bg-gradient-to-b from-orange-50/30 to-amber-50/20 hover:border-orange-400 hover:bg-orange-50/40'
                }`}
                onClick={() => document.getElementById('excelFileInput')?.click()}
              >
                <input
                  id="excelFileInput"
                  type="file"
                  accept=".xlsx, .xls"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-orange-100 text-orange-500 flex items-center justify-center shadow-md">
                  {loading ? <Sparkles className="animate-spin" size={32} /> : <Upload size={32} />}
                </div>
                <h4 className="text-lg font-bold text-gray-800 mb-1">
                  {loading ? 'Leyendo archivo Excel...' : 'Arrastra tu archivo Excel aquí'}
                </h4>
                <p className="text-sm text-gray-500 max-w-sm mx-auto mb-4">
                  Selecciona el archivo enviador por el equipo (ej. <span className="font-semibold text-orange-600">menu del 18 al 24 de agosto.xlsx</span>)
                </p>
                <span className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-orange-500 text-white text-sm font-semibold shadow-md hover:bg-orange-600 transition-colors">
                  <FileSpreadsheet size={18} />
                  Buscar archivo en mi equipo
                </span>
              </div>
            ) : (
              /* Resumen de lo detectado */
              <div className="space-y-4">
                <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-2xl p-4">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 size={24} className="text-green-600 flex-shrink-0" />
                    <div>
                      <h4 className="text-sm font-bold text-green-900">{file?.name}</h4>
                      <p className="text-xs text-green-700">Formato reconocido y procesado con éxito</p>
                    </div>
                  </div>
                  <button
                    onClick={resetModal}
                    className="text-xs font-semibold px-3 py-1.5 bg-white border border-green-200 text-green-700 rounded-lg hover:bg-green-100 transition-colors"
                  >
                    Cambiar archivo
                  </button>
                </div>

                <h4 className="text-sm font-bold text-gray-700 uppercase tracking-wider flex items-center gap-2 pt-2">
                  <ChefHat size={16} className="text-orange-500" />
                  Resumen de Menús Detectados
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {/* Almuerzos */}
                  <div className="bg-orange-50/60 border border-orange-100 rounded-2xl p-4">
                    <div className="text-xs font-bold text-orange-700 uppercase mb-2">🌞 Almuerzos</div>
                    <ul className="text-xs text-gray-600 space-y-1">
                      <li>• Full Pack: <strong className="text-gray-800">{parsedData.fullPack.length} platos</strong></li>
                      <li>• Regular: <strong className="text-gray-800">{parsedData.regular.length} platos</strong></li>
                      <li>• Bajo Calorías: <strong className="text-gray-800">{parsedData.bajoCalorias.length} platos</strong></li>
                      <li>• Sin Carbos: <strong className="text-gray-800">{parsedData.sinCarbos.length} platos</strong></li>
                      <li>• Keto: <strong className="text-gray-800">{parsedData.keto.length} platos</strong></li>
                      <li>• Vegetariano: <strong className="text-gray-800">{parsedData.vegetariano.length} platos</strong></li>
                      <li>• Casaditos: <strong className="text-gray-800">{parsedData.casaditos.length} platos</strong></li>
                    </ul>
                  </div>

                  {/* Cenas */}
                  <div className="bg-indigo-50/60 border border-indigo-100 rounded-2xl p-4">
                    <div className="text-xs font-bold text-indigo-700 uppercase mb-2">🌙 Cenas (Segundo Menú)</div>
                    <ul className="text-xs text-gray-600 space-y-1">
                      <li>• Full Pack / Regular / Bajo Cal: <strong className="text-gray-800">{parsedData.cena.fullPack?.length || 0} platos</strong></li>
                      <li>• Sin Carbos: <strong className="text-gray-800">{parsedData.cena.sinCarbos?.length || 0} platos</strong></li>
                      <li>• Casaditos: <strong className="text-gray-800">{parsedData.cena.casaditos?.length || 0} platos</strong></li>
                      {parsedData.cena.keto?.length > 0 && parsedData.cena.keto !== parsedData.cena.sinCarbos && (
                        <li>• Keto: <strong className="text-gray-800">{parsedData.cena.keto.length} platos</strong></li>
                      )}
                      {parsedData.cena.vegetariano?.length > 0 && parsedData.cena.vegetariano !== parsedData.vegetariano && (
                        <li>• Vegetariano: <strong className="text-gray-800">{parsedData.cena.vegetariano.length} platos</strong></li>
                      )}
                    </ul>
                  </div>

                  {/* Desayunos */}
                  <div className="bg-amber-50/60 border border-amber-100 rounded-2xl p-4">
                    <div className="text-xs font-bold text-amber-700 uppercase mb-2">☕ Desayunos</div>
                    <p className="text-xs text-gray-600">
                      Se detectaron <strong className="text-gray-800">{parsedData.desayuno.length} opciones</strong> de desayuno.
                    </p>
                  </div>

                  {/* Packs Especiales */}
                  <div className="bg-rose-50/60 border border-rose-100 rounded-2xl p-4">
                    <div className="text-xs font-bold text-rose-700 uppercase mb-2">📦 Packs Especiales</div>
                    <ul className="text-xs text-gray-600 space-y-1">
                      <li>• Proteínas: <strong className="text-gray-800">{parsedData.proteinasDisponibles.length} ítems</strong></li>
                      <li>• Familiar Premium: <strong className="text-gray-800">{parsedData.familiarPremium.length} ítems</strong></li>
                      <li>• Familiar Deluxe: <strong className="text-gray-800">{parsedData.familiarDeluxe.length} ítems</strong></li>
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="bg-gray-50 border-t border-gray-100 p-4 flex items-center justify-between">
            <button
              onClick={() => { resetModal(); onClose(); }}
              className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 transition-colors"
            >
              Cancelar
            </button>
            {parsedData && (
              <button
                onClick={handleConfirmImport}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-orange-500 text-white font-semibold shadow-lg hover:bg-orange-600 transition-all scale-105"
              >
                Cargar Todo al Menú
                <ArrowRight size={18} />
              </button>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
