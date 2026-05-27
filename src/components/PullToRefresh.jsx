import { useState, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { RefreshCw } from 'lucide-react';

/**
 * PullToRefresh - Componente para actualizar deslizando hacia abajo
 */
export default function PullToRefresh({ 
    onRefresh, 
    children,
    threshold = 80,
    disabled = false 
}) {
    const [pullDistance, setPullDistance] = useState(0);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isPulling, setIsPulling] = useState(false);
    const startY = useRef(0);
    const containerRef = useRef(null);

    const handleTouchStart = useCallback((e) => {
        if (disabled || isRefreshing) return;
        
        // Solo activar si estamos en el top del scroll
        if (containerRef.current?.scrollTop === 0) {
            startY.current = e.touches[0].clientY;
            setIsPulling(true);
        }
    }, [disabled, isRefreshing]);

    const handleTouchMove = useCallback((e) => {
        if (!isPulling || disabled || isRefreshing) return;
        
        const currentY = e.touches[0].clientY;
        const diff = currentY - startY.current;
        
        if (diff > 0) {
            // Resistencia al pull (se vuelve más difícil mientras más jalas)
            const resistance = 0.4;
            setPullDistance(Math.min(diff * resistance, threshold * 1.5));
        }
    }, [isPulling, disabled, isRefreshing, threshold]);

    const handleTouchEnd = useCallback(async () => {
        if (!isPulling) return;
        
        setIsPulling(false);
        
        if (pullDistance >= threshold && onRefresh) {
            setIsRefreshing(true);
            try {
                await onRefresh();
            } finally {
                setIsRefreshing(false);
            }
        }
        
        setPullDistance(0);
    }, [isPulling, pullDistance, threshold, onRefresh]);

    const progress = Math.min(pullDistance / threshold, 1);
    const showIndicator = pullDistance > 10 || isRefreshing;

    return (
        <div
            ref={containerRef}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            className="relative overflow-auto"
            style={{ touchAction: isPulling ? 'none' : 'auto' }}
        >
            {/* Indicador de refresh */}
            <motion.div
                initial={false}
                animate={{
                    height: showIndicator ? Math.max(pullDistance, isRefreshing ? 60 : 0) : 0,
                    opacity: showIndicator ? 1 : 0
                }}
                className="flex items-center justify-center overflow-hidden bg-gray-50"
            >
                <motion.div
                    animate={{
                        rotate: isRefreshing ? 360 : progress * 180,
                        scale: isRefreshing ? 1 : 0.8 + progress * 0.2
                    }}
                    transition={{
                        rotate: isRefreshing 
                            ? { duration: 1, repeat: Infinity, ease: 'linear' }
                            : { duration: 0 }
                    }}
                    className={`p-2 rounded-full ${
                        progress >= 1 || isRefreshing 
                            ? 'bg-bikitchen-orange text-white' 
                            : 'bg-gray-200 text-gray-500'
                    }`}
                >
                    <RefreshCw size={20} />
                </motion.div>
            </motion.div>

            {/* Contenido */}
            <motion.div
                animate={{
                    y: isPulling ? pullDistance * 0.3 : 0
                }}
                transition={{ duration: isPulling ? 0 : 0.3 }}
            >
                {children}
            </motion.div>
        </div>
    );
}

/**
 * Hook para pull to refresh
 */
export function usePullToRefresh(onRefresh, options = {}) {
    const { threshold = 80, disabled = false } = options;
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [pullProgress, setPullProgress] = useState(0);

    const handleRefresh = useCallback(async () => {
        if (disabled || isRefreshing) return;
        
        setIsRefreshing(true);
        try {
            await onRefresh?.();
        } finally {
            setIsRefreshing(false);
            setPullProgress(0);
        }
    }, [onRefresh, disabled, isRefreshing]);

    return {
        isRefreshing,
        pullProgress,
        handleRefresh,
        setPullProgress
    };
}
