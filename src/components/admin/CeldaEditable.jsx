import React, { useState, useEffect, useRef } from 'react';

/**
 * Una celda de la hoja que se edita tocandola.
 *
 * Se ve como texto normal y SE IMPRIME COMO TEXTO NORMAL: en papel no aparece
 * ninguna caja ni borde. La unica pista en pantalla es un subrayado punteado al
 * pasar el mouse, para que se note que se puede tocar sin que la hoja parezca
 * un formulario.
 *
 * Guarda al salir del campo o con Enter, y cancela con Escape. No guarda si el
 * texto no cambio: cada guardado escribe en Firestore y toca el menu de todos.
 */
export default function CeldaEditable({
    valor, onGuardar, titulo, className = '', placeholder = '—', deshabilitado = false
}) {
    const [editando, setEditando] = useState(false);
    const [texto, setTexto] = useState(valor ?? '');
    const [guardando, setGuardando] = useState(false);
    const ref = useRef(null);

    // Si el valor cambia por fuera —otra edicion, una recarga— la celda lo sigue
    useEffect(() => { if (!editando) setTexto(valor ?? ''); }, [valor, editando]);

    useEffect(() => { if (editando && ref.current) ref.current.select(); }, [editando]);

    const terminar = async (guardar) => {
        if (!guardar) {
            setTexto(valor ?? '');
            setEditando(false);
            return;
        }
        const limpio = String(texto).trim();
        if (limpio === String(valor ?? '').trim()) {
            setEditando(false);
            return;
        }
        setGuardando(true);
        try {
            await onGuardar(limpio);
        } catch {
            setTexto(valor ?? '');   // no se guardo: no mostrar algo que no existe
        }
        setGuardando(false);
        setEditando(false);
    };

    if (deshabilitado) return <span className={className}>{valor || ''}</span>;

    if (!editando) {
        return (
            <button
                type="button"
                onClick={() => setEditando(true)}
                title={titulo}
                className={`text-left w-full hover:underline decoration-dotted underline-offset-2 hover:text-blue-700 print:hover:no-underline ${className}`}
            >
                {valor || <span className="text-gray-400 print:text-black">{placeholder}</span>}
            </button>
        );
    }

    return (
        <input
            ref={ref}
            value={texto}
            disabled={guardando}
            onChange={(e) => setTexto(e.target.value)}
            onBlur={() => terminar(true)}
            onKeyDown={(e) => {
                if (e.key === 'Enter') { e.preventDefault(); terminar(true); }
                if (e.key === 'Escape') { e.preventDefault(); terminar(false); }
            }}
            aria-label={titulo}
            className={`w-full bg-sky-50 border border-sky-500 rounded px-1 py-0.5 focus:outline-none ${className}`}
        />
    );
}
