import React, { useState, useEffect } from 'react';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useContactConfig } from '../../context/ContactConfigContext';
import { MessageCircle, CheckCircle, AlertCircle, ExternalLink, RefreshCw } from 'lucide-react';

// Convierte "50685067200" → "8506-7200"
const toLocal = (full) => {
    const digits = (full || '').replace(/\D/g, '');
    const local = digits.startsWith('506') ? digits.slice(3) : digits;
    if (local.length === 8) return `${local.slice(0, 4)}-${local.slice(4)}`;
    return local;
};

// Convierte "85067200" o "8506-7200" → "50685067200"
const toFull = (local) => {
    const digits = (local || '').replace(/\D/g, '');
    return digits.length === 8 ? `506${digits}` : null;
};

// Solo permite dígitos y guion, máximo 9 chars (8 dígitos + 1 guion)
const formatInput = (raw) => {
    const digits = raw.replace(/\D/g, '').slice(0, 8);
    if (digits.length > 4) return `${digits.slice(0, 4)}-${digits.slice(4)}`;
    return digits;
};

function PhoneField({ label, value, onChange, error }) {
    return (
        <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-700">{label}</label>
            <div className={`flex items-center rounded-2xl border-2 overflow-hidden transition-colors ${error ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-white focus-within:border-orange-400'}`}>
                {/* Prefijo fijo */}
                <div className="flex items-center gap-2 px-4 py-3.5 bg-gray-50 border-r-2 border-gray-200 shrink-0">
                    <span className="text-xl">🇨🇷</span>
                    <span className="text-sm font-bold text-gray-500">+506</span>
                </div>
                {/* Input local */}
                <input
                    type="tel"
                    value={value}
                    onChange={(e) => onChange(formatInput(e.target.value))}
                    placeholder="XXXX-XXXX"
                    className="flex-1 px-4 py-3.5 text-lg font-mono font-bold text-gray-900 bg-transparent outline-none placeholder:text-gray-300"
                    maxLength={9}
                />
            </div>
            {error && <p className="text-xs text-red-500 font-medium">{error}</p>}
        </div>
    );
}

export default function WhatsAppConfigView() {
    const { whatsappPhone, whatsappPhoneAlt, loading } = useContactConfig();

    const [principal, setPrincipal] = useState('');
    const [alternativo, setAlternativo] = useState('');
    const [errors, setErrors] = useState({});
    const [saving, setSaving] = useState(false);
    const [success, setSuccess] = useState(false);

    // Cargar valores actuales al abrir
    useEffect(() => {
        if (!loading) {
            setPrincipal(toLocal(whatsappPhone));
            setAlternativo(toLocal(whatsappPhoneAlt));
        }
    }, [loading, whatsappPhone, whatsappPhoneAlt]);

    const validate = () => {
        const e = {};
        const p = principal.replace(/\D/g, '');
        const a = alternativo.replace(/\D/g, '');
        if (p.length !== 8) e.principal = 'Debe tener exactamente 8 dígitos';
        if (a && a.length !== 8) e.alternativo = 'Debe tener exactamente 8 dígitos';
        return e;
    };

    const handleSave = async () => {
        const e = validate();
        if (Object.keys(e).length) { setErrors(e); return; }
        setErrors({});
        setSaving(true);
        try {
            await setDoc(doc(db, 'config', 'contact'), {
                whatsappPhone: toFull(principal),
                whatsappPhoneAlt: toFull(alternativo) || whatsappPhoneAlt,
                updatedAt: new Date().toISOString(),
            });
            setSuccess(true);
            setTimeout(() => setSuccess(false), 4000);
        } catch (err) {
            setErrors({ general: 'Error al guardar: ' + err.message });
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <RefreshCw className="w-8 h-8 animate-spin text-orange-500" />
            </div>
        );
    }

    const principalFull = toFull(principal);
    const alternativoFull = toFull(alternativo);

    return (
        <div className="max-w-lg mx-auto p-6 space-y-6">

            {/* Header */}
            <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-green-100 rounded-2xl flex items-center justify-center">
                    <MessageCircle size={28} className="text-green-600" />
                </div>
                <div>
                    <h1 className="text-2xl font-black text-gray-900">WhatsApp</h1>
                    <p className="text-sm text-gray-500">Números de contacto de BiKitchen</p>
                </div>
            </div>

            {/* Card principal */}
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 space-y-6">

                <PhoneField
                    label="Número Principal"
                    value={principal}
                    onChange={setPrincipal}
                    error={errors.principal}
                />

                <PhoneField
                    label="Número Alternativo"
                    value={alternativo}
                    onChange={setAlternativo}
                    error={errors.alternativo}
                />

                {errors.general && (
                    <div className="flex items-center gap-2 p-3 bg-red-50 rounded-xl text-red-600 text-sm font-medium">
                        <AlertCircle size={16} />
                        {errors.general}
                    </div>
                )}

                {success && (
                    <div className="flex items-center gap-2 p-3 bg-green-50 rounded-xl text-green-700 text-sm font-semibold">
                        <CheckCircle size={16} />
                        ¡Números guardados! Los cambios ya aplican en la app.
                    </div>
                )}

                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="w-full bg-gray-900 hover:bg-orange-600 text-white font-black py-4 rounded-2xl transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 text-sm uppercase tracking-widest"
                >
                    {saving ? <><RefreshCw size={16} className="animate-spin" /> Guardando...</> : 'Guardar Cambios'}
                </button>
            </div>

            {/* Probar links */}
            {(principalFull || alternativoFull) && (
                <div className="bg-gray-50 rounded-2xl border border-gray-100 p-4 space-y-2">
                    <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3">Probar en WhatsApp</p>
                    {principalFull && (
                        <a
                            href={`https://wa.me/${principalFull}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-between p-3 bg-white rounded-xl border border-gray-100 hover:border-green-300 hover:bg-green-50 transition-all group"
                        >
                            <div>
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Principal</p>
                                <p className="text-base font-black text-gray-900 font-mono">{principal}</p>
                            </div>
                            <ExternalLink size={16} className="text-gray-300 group-hover:text-green-500 transition-colors" />
                        </a>
                    )}
                    {alternativoFull && (
                        <a
                            href={`https://wa.me/${alternativoFull}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-between p-3 bg-white rounded-xl border border-gray-100 hover:border-green-300 hover:bg-green-50 transition-all group"
                        >
                            <div>
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Alternativo</p>
                                <p className="text-base font-black text-gray-900 font-mono">{alternativo}</p>
                            </div>
                            <ExternalLink size={16} className="text-gray-300 group-hover:text-green-500 transition-colors" />
                        </a>
                    )}
                </div>
            )}
        </div>
    );
}
