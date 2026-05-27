import { useState, useRef, useCallback } from 'react';

/**
 * Hook para detectar gestos de swipe
 */
export function useSwipe({ 
    onSwipeLeft, 
    onSwipeRight, 
    onSwipeUp, 
    onSwipeDown,
    threshold = 50,
    enabled = true 
}) {
    const touchStart = useRef({ x: 0, y: 0 });
    const touchEnd = useRef({ x: 0, y: 0 });

    const onTouchStart = useCallback((e) => {
        if (!enabled) return;
        touchStart.current = {
            x: e.targetTouches[0].clientX,
            y: e.targetTouches[0].clientY
        };
    }, [enabled]);

    const onTouchMove = useCallback((e) => {
        if (!enabled) return;
        touchEnd.current = {
            x: e.targetTouches[0].clientX,
            y: e.targetTouches[0].clientY
        };
    }, [enabled]);

    const onTouchEnd = useCallback(() => {
        if (!enabled) return;
        
        const deltaX = touchStart.current.x - touchEnd.current.x;
        const deltaY = touchStart.current.y - touchEnd.current.y;
        const absX = Math.abs(deltaX);
        const absY = Math.abs(deltaY);

        // Determinar si es swipe horizontal o vertical
        if (absX > absY && absX > threshold) {
            if (deltaX > 0) {
                onSwipeLeft?.();
            } else {
                onSwipeRight?.();
            }
        } else if (absY > absX && absY > threshold) {
            if (deltaY > 0) {
                onSwipeUp?.();
            } else {
                onSwipeDown?.();
            }
        }
    }, [enabled, threshold, onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown]);

    return {
        onTouchStart,
        onTouchMove,
        onTouchEnd
    };
}

/**
 * Hook para swipe con animación de arrastre
 */
export function useSwipeToDismiss({ onDismiss, direction = 'right', threshold = 100 }) {
    const [offset, setOffset] = useState(0);
    const [isDragging, setIsDragging] = useState(false);
    const startX = useRef(0);

    const handlers = {
        onTouchStart: (e) => {
            startX.current = e.touches[0].clientX;
            setIsDragging(true);
        },
        onTouchMove: (e) => {
            if (!isDragging) return;
            const currentX = e.touches[0].clientX;
            const diff = currentX - startX.current;
            
            // Solo permitir swipe en la dirección correcta
            if (direction === 'right' && diff > 0) {
                setOffset(diff);
            } else if (direction === 'left' && diff < 0) {
                setOffset(diff);
            }
        },
        onTouchEnd: () => {
            setIsDragging(false);
            if (Math.abs(offset) > threshold) {
                onDismiss?.();
            }
            setOffset(0);
        }
    };

    return {
        offset,
        isDragging,
        handlers,
        style: {
            transform: `translateX(${offset}px)`,
            transition: isDragging ? 'none' : 'transform 0.3s ease-out',
            opacity: 1 - Math.abs(offset) / (threshold * 2)
        }
    };
}

export default useSwipe;
