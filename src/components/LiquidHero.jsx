import React, { useRef } from 'react';

/**
 * LiquidHero Component
 * 
 * Renders an image with a "liquid" distortion effect using SVG filters.
 * On hover, the turbulence frequency is animated to create a rippling water effect.
 * 
 * @param {Object} props
 * @param {string} props.src - Image source URL.
 * @param {string} props.alt - Image alt text.
 * @param {string} [props.className] - Additional CSS classes.
 */
export default function LiquidHero({ src, alt, className }) {
    const filterRef = useRef(null);
    const turbulenceRef = useRef(null);

    const onMouseEnter = () => {
        if (turbulenceRef.current) {
            turbulenceRef.current.setAttribute('baseFrequency', '0.01 0.02');
        }
    };



    const onMouseLeave = () => {
        if (turbulenceRef.current) {
            turbulenceRef.current.setAttribute('baseFrequency', '0');
        }
    };

    return (
        <div
            className="relative overflow-hidden group"
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
        >
            <svg className="absolute w-0 h-0">
                <defs>
                    <filter id="liquid-filter">
                        <feTurbulence
                            ref={turbulenceRef}
                            type="fractalNoise"
                            baseFrequency="0"
                            numOctaves="3"
                            result="warp"
                        >
                            <animate
                                attributeName="baseFrequency"
                                dur="10s"
                                values="0.01 0.02;0.02 0.04;0.01 0.02"
                                repeatCount="indefinite"
                                begin="mouseenter"
                                end="mouseleave"
                            />
                        </feTurbulence>
                        <feDisplacementMap xChannelSelector="R" yChannelSelector="G" scale="30" in="SourceGraphic" in2="warp" />
                    </filter>
                </defs>
            </svg>

            <img
                src={src}
                alt={alt}
                className={`${className} transition-all duration-700`}
                style={{ filter: 'url(#liquid-filter)' }}
                data-cursor="LIQUID"
            />
        </div>
    );
}
