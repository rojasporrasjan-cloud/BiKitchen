import React, { useId, useState } from 'react';
import { buscarPlatos } from '../../utils/catalogoDePlatos';

/**
 * Un campo de texto que, al escribir, muestra los platos que coinciden.
 *
 * Se escribe "tilapia" y aparecen todas las tilapias del menú de la semana, de
 * los individuales y de lo que ya se cargó en otros pedidos. No obliga a
 * elegir: si el plato no está, se deja escrito tal cual.
 *
 * No usa `<datalist>`: el del navegador busca con tildes ("caribeno" no trae
 * "caribeño") y en cada navegador se ve distinto.
 */
export default function CampoDePlato({
    value, onChange, onElegir, sugerencias = [], ariaLabel, placeholder, onPaste, id, className = ''
}) {
    const [abierto, setAbierto] = useState(false);
    const [activo, setActivo] = useState(-1);
    const idLista = `${useId()}-platos`;
    const opciones = abierto ? buscarPlatos(sugerencias, value) : [];
    // Si ya está escrito exacto, no hace falta sugerir lo mismo.
    const visibles = opciones.length === 1 && opciones[0] === value ? [] : opciones;

    const elegir = (nombre) => {
        (onElegir || onChange)(nombre);
        setAbierto(false);
        setActivo(-1);
    };

    const alTeclear = (e) => {
        if (!visibles.length) return;
        if (e.key === 'ArrowDown') { e.preventDefault(); setActivo(i => (i + 1) % visibles.length); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); setActivo(i => (i <= 0 ? visibles.length - 1 : i - 1)); }
        else if (e.key === 'Enter' && activo >= 0) { e.preventDefault(); elegir(visibles[activo]); }
        else if (e.key === 'Escape') { setAbierto(false); setActivo(-1); }
    };

    return (
        <div className="relative flex-1 min-w-0">
            <input
                id={id}
                type="text"
                role="combobox"
                aria-expanded={visibles.length > 0}
                aria-controls={idLista}
                aria-autocomplete="list"
                aria-activedescendant={activo >= 0 ? `${idLista}-${activo}` : undefined}
                aria-label={ariaLabel}
                autoComplete="off"
                value={value}
                placeholder={placeholder}
                onChange={(e) => { onChange(e.target.value); setAbierto(true); setActivo(-1); }}
                onFocus={() => setAbierto(true)}
                onBlur={() => setAbierto(false)}
                onKeyDown={alTeclear}
                onPaste={onPaste}
                className={`w-full border border-gray-300 rounded-lg px-3 py-2 text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 ${className}`}
            />
            {visibles.length > 0 && (
                <ul
                    id={idLista}
                    role="listbox"
                    className="absolute z-20 left-0 right-0 mt-1 max-h-60 overflow-y-auto bg-white border border-gray-200 rounded-lg shadow-lg text-sm"
                >
                    {visibles.map((nombre, i) => (
                        <li
                            key={nombre}
                            id={`${idLista}-${i}`}
                            role="option"
                            aria-selected={i === activo}
                            // onMouseDown y no onClick: el blur del campo cierra la lista antes del click.
                            onMouseDown={(e) => { e.preventDefault(); elegir(nombre); }}
                            className={`px-3 py-2 cursor-pointer ${i === activo ? 'bg-orange-100 text-orange-900' : 'text-gray-800 hover:bg-gray-50'}`}
                        >
                            {nombre}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
