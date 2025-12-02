import React, { useEffect, useRef, useState } from 'react';

/**
 * CustomCursor Component
 * 
 * A custom cursor follower that replaces the default system cursor.
 * Features:
 * - Physics-based movement (lag/elasticity).
 * - Dynamic state changes based on hovered elements (buttons, links, data-cursor).
 * - Magnetic attraction logic (though MagneticButton handles its own physics now, this provides a fallback or complementary effect).
 */
export default function CustomCursor() {
    const cursorRef = useRef(null);
    const [cursorText, setCursorText] = useState("");
    const [cursorVariant, setCursorVariant] = useState("default"); // default, text, button

    // Physics state
    const pos = useRef({ x: 0, y: 0 });
    const vel = useRef({ x: 0, y: 0 });
    const target = useRef({ x: 0, y: 0 });

    // Magnetic state
    const magneticEl = useRef(null);

    useEffect(() => {
        const cursor = cursorRef.current;

        const onMouseMove = (e) => {
            if (!magneticEl.current) {
                target.current.x = e.clientX;
                target.current.y = e.clientY;
            }
        };

        const onMouseEnter = (e) => {
            const targetEl = e.target;

            // Check for data-cursor attribute
            const text = targetEl.getAttribute('data-cursor');
            const variant = targetEl.getAttribute('data-cursor-variant');

            if (text) {
                setCursorText(text);
                setCursorVariant(variant || "text");
            } else if (targetEl.tagName === 'BUTTON' || targetEl.tagName === 'A' || targetEl.closest('a') || targetEl.closest('button')) {
                setCursorVariant("button");
            } else {
                setCursorVariant("default");
                setCursorText("");
            }

            // Magnetic Logic
            if (targetEl.classList.contains('magnetic') || targetEl.tagName === 'BUTTON') {
                const rect = targetEl.getBoundingClientRect();
                magneticEl.current = {
                    x: rect.left + rect.width / 2,
                    y: rect.top + rect.height / 2,
                    w: rect.width,
                    h: rect.height
                };
                target.current.x = magneticEl.current.x;
                target.current.y = magneticEl.current.y;
            }
        };

        const onMouseLeave = () => {
            setCursorText("");
            setCursorVariant("default");
            magneticEl.current = null;
        };

        window.addEventListener('mousemove', onMouseMove);

        // Dynamic listeners
        const addListeners = () => {
            const hoverables = document.querySelectorAll('a, button, .cursor-pointer, [data-cursor]');
            hoverables.forEach(el => {
                el.addEventListener('mouseenter', onMouseEnter);
                el.addEventListener('mouseleave', onMouseLeave);
            });
        };
        addListeners();

        const observer = new MutationObserver(addListeners);
        observer.observe(document.body, { childList: true, subtree: true });

        // Physics Loop
        const loop = () => {
            if (!cursor) return;

            const tension = 0.15;
            const friction = 0.75;

            vel.current.x += (target.current.x - pos.current.x) * tension;
            vel.current.y += (target.current.y - pos.current.y) * tension;
            vel.current.x *= friction;
            vel.current.y *= friction;
            pos.current.x += vel.current.x;
            pos.current.y += vel.current.y;

            cursor.style.transform = `translate(${pos.current.x}px, ${pos.current.y}px)`;

            requestAnimationFrame(loop);
        };
        const raf = requestAnimationFrame(loop);

        return () => {
            window.removeEventListener('mousemove', onMouseMove);
            cancelAnimationFrame(raf);
            observer.disconnect();
            const hoverables = document.querySelectorAll('a, button, .cursor-pointer, [data-cursor]');
            hoverables.forEach(el => {
                el.removeEventListener('mouseenter', onMouseEnter);
                el.removeEventListener('mouseleave', onMouseLeave);
            });
        };
    }, []);

    return (
        <div
            ref={cursorRef}
            className={`fixed top-0 left-0 pointer-events-none z-[9999] flex items-center justify-center text-white font-bold text-[10px] tracking-widest uppercase rounded-full transition-all duration-300 ease-out -mt-4 -ml-4 will-change-transform
                ${cursorVariant === 'default' ? 'w-4 h-4 bg-primary mix-blend-difference' : ''}
                ${cursorVariant === 'text' ? 'w-20 h-20 bg-accent text-white mix-blend-normal scale-100' : ''}
                ${cursorVariant === 'button' ? 'w-12 h-12 bg-transparent border border-primary mix-blend-difference' : ''}
            `}
        >
            {cursorText}
        </div>
    );
}
