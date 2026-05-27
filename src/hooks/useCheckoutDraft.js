import { useState, useEffect, useCallback } from 'react';

const DRAFT_KEY = 'bikitchen_checkout_draft';
const DRAFT_EXPIRY = 2 * 60 * 60 * 1000; // 2 hours (reduced from 24h for security)

/**
 * Hook para guardar y recuperar borrador del checkout
 * Evita que el usuario pierda sus datos si cierra la página
 */
export function useCheckoutDraft(initialData = {}) {
    const [formData, setFormData] = useState(initialData);
    const [hasDraft, setHasDraft] = useState(false);
    const [draftAge, setDraftAge] = useState(null);

    // Cargar borrador al iniciar
    useEffect(() => {
        const savedDraft = localStorage.getItem(DRAFT_KEY);
        if (savedDraft) {
            try {
                const { data, timestamp } = JSON.parse(savedDraft);
                const age = Date.now() - timestamp;
                
                // Solo restaurar si no ha expirado
                if (age < DRAFT_EXPIRY) {
                    setFormData(prev => ({ ...prev, ...data }));
                    setHasDraft(true);
                    setDraftAge(age);
                } else {
                    // Limpiar borrador expirado
                    localStorage.removeItem(DRAFT_KEY);
                }
            } catch (e) {
                localStorage.removeItem(DRAFT_KEY);
            }
        }
    }, []);

    // Guardar borrador cuando cambian los datos
    const saveDraft = useCallback((data) => {
        const draft = {
            data,
            timestamp: Date.now()
        };
        localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
        setHasDraft(true);
    }, []);

    // Actualizar campo y guardar
    const updateField = useCallback((field, value) => {
        setFormData(prev => {
            const updated = { ...prev, [field]: value };
            saveDraft(updated);
            return updated;
        });
    }, [saveDraft]);

    // Actualizar múltiples campos
    const updateFields = useCallback((fields) => {
        setFormData(prev => {
            const updated = { ...prev, ...fields };
            saveDraft(updated);
            return updated;
        });
    }, [saveDraft]);

    // Limpiar borrador (después de completar pedido)
    const clearDraft = useCallback(() => {
        localStorage.removeItem(DRAFT_KEY);
        setFormData(initialData);
        setHasDraft(false);
        setDraftAge(null);
    }, [initialData]);

    // Descartar borrador y empezar de nuevo
    const discardDraft = useCallback(() => {
        localStorage.removeItem(DRAFT_KEY);
        setFormData(initialData);
        setHasDraft(false);
        setDraftAge(null);
    }, [initialData]);

    // Formatear edad del borrador
    const formatDraftAge = useCallback(() => {
        if (!draftAge) return null;
        
        const minutes = Math.floor(draftAge / 60000);
        const hours = Math.floor(minutes / 60);
        
        if (hours > 0) {
            return `hace ${hours} hora${hours > 1 ? 's' : ''}`;
        }
        if (minutes > 0) {
            return `hace ${minutes} minuto${minutes > 1 ? 's' : ''}`;
        }
        return 'hace un momento';
    }, [draftAge]);

    return {
        formData,
        setFormData,
        updateField,
        updateFields,
        saveDraft,
        clearDraft,
        discardDraft,
        hasDraft,
        draftAge: formatDraftAge()
    };
}

/**
 * Componente de banner para restaurar borrador
 */
export function DraftBanner({ onRestore, onDiscard, draftAge }) {
    return (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4">
            <div className="flex items-start gap-3">
                <span className="text-2xl">💾</span>
                <div className="flex-1">
                    <p className="font-medium text-amber-800">
                        Tienes un pedido sin terminar
                    </p>
                    <p className="text-sm text-amber-600 mt-0.5">
                        Guardado {draftAge}
                    </p>
                </div>
            </div>
            <div className="flex gap-2 mt-3">
                <button
                    onClick={onRestore}
                    className="flex-1 bg-amber-500 text-white py-2 px-4 rounded-lg font-medium hover:bg-amber-600 transition-colors"
                >
                    Continuar pedido
                </button>
                <button
                    onClick={onDiscard}
                    className="px-4 py-2 text-amber-700 hover:bg-amber-100 rounded-lg transition-colors"
                >
                    Descartar
                </button>
            </div>
        </div>
    );
}

export default useCheckoutDraft;
