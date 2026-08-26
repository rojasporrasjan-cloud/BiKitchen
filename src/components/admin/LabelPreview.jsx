import React, { useEffect, useRef, useState } from 'react';
import { renderLabel, mmToPx } from '../../utils/labels/labelRenderer';

/**
 * Vista previa de una etiqueta 30 × 20 mm.
 *
 * El canvas se dibuja SIEMPRE a la resolución real de la impresora (240 × 160 px)
 * y se escala por CSS solo para verlo. Si un nombre no cabe en el papel, tampoco
 * cabe acá: es el punto de la vista previa.
 */
export default function LabelPreview({ label, scale = 2, className = '', settings = {}, logo = null, compact = false }) {
    const canvasRef = useRef(null);
    const [truncated, setTruncated] = useState(false);

    const anchoMm = settings.widthMm || 30;
    const altoMm = settings.heightMm || 20;
    const W = mmToPx(anchoMm);
    const H = mmToPx(altoMm);
    const anchoMostrado = W * scale / 2;

    // La vista previa usa EXACTAMENTE las mismas opciones que el adaptador:
    // si acá se viera distinto de lo que sale impreso, no serviría de nada.
    useEffect(() => {
        if (!canvasRef.current || !label) return;
        const result = renderLabel(canvasRef.current, label, {
            ...settings,
            widthMm: anchoMm,
            heightMm: altoMm,
            logo: settings.useLogo === false ? null : logo
        });
        setTruncated(!!result?.truncated);
    }, [label, logo, settings]);

    if (!label) return null;

    return (
        <div className={className}>
            <div
                className="inline-block bg-white border-2 border-dashed border-gray-300 rounded-lg p-1 shadow-sm"
                style={{ lineHeight: 0 }}
            >
                <canvas
                    ref={canvasRef}
                    width={W}
                    height={H}
                    style={{
                        width: anchoMostrado,
                        height: H * scale / 2,
                        // `pixelated` solo sirve cuando la etiqueta se AMPLÍA: ahí
                        // muestra el punto real del cabezal. Al reducirla produce
                        // dentado y se ve borrosa, así que ahí conviene suavizar.
                        imageRendering: anchoMostrado >= W ? 'pixelated' : 'auto'
                    }}
                    aria-label={`Etiqueta: ${label.type}, ${label.protein}, vence ${label.expirationDate}`}
                />
            </div>
            {!compact && (
                <p className="text-[11px] text-gray-400 mt-1.5 text-center">
                    {anchoMm} × {altoMm} mm · 203 dpi
                </p>
            )}
            {truncated && (
                <p className="text-[11px] text-amber-600 font-semibold text-center mt-0.5">
                    {compact ? 'Nombre recortado' : 'Nombre recortado para que quepa'}
                </p>
            )}
        </div>
    );
}
