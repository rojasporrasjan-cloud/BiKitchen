import { motion } from 'framer-motion';
import { Check, Loader2 } from 'lucide-react';

/**
 * Botón con micro-animaciones
 */
export default function AnimatedButton({
    children,
    onClick,
    variant = 'primary',
    size = 'md',
    loading = false,
    success = false,
    disabled = false,
    icon: Icon,
    iconPosition = 'left',
    fullWidth = false,
    className = '',
    ...props
}) {
    const variants = {
        primary: 'bg-bikitchen-orange text-white hover:bg-orange-600 shadow-lg shadow-bikitchen-orange/20',
        secondary: 'bg-gray-100 text-gray-700 hover:bg-gray-200',
        outline: 'border-2 border-bikitchen-orange text-bikitchen-orange hover:bg-bikitchen-orange hover:text-white',
        ghost: 'text-gray-600 hover:bg-gray-100',
        success: 'bg-green-500 text-white hover:bg-green-600',
        danger: 'bg-red-500 text-white hover:bg-red-600'
    };

    const sizes = {
        sm: 'px-3 py-1.5 text-sm gap-1.5',
        md: 'px-4 py-2.5 text-sm gap-2',
        lg: 'px-6 py-3 text-base gap-2',
        xl: 'px-8 py-4 text-lg gap-3'
    };

    const isDisabled = disabled || loading;

    return (
        <motion.button
            onClick={onClick}
            disabled={isDisabled}
            whileHover={!isDisabled ? { scale: 1.02 } : {}}
            whileTap={!isDisabled ? { scale: 0.98 } : {}}
            className={`
                relative inline-flex items-center justify-center font-semibold rounded-xl
                transition-colors duration-200 overflow-hidden
                ${variants[success ? 'success' : variant]}
                ${sizes[size]}
                ${fullWidth ? 'w-full' : ''}
                ${isDisabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}
                ${className}
            `}
            {...props}
        >
            {/* Ripple effect on click */}
            <motion.span
                className="absolute inset-0 bg-white/20"
                initial={{ scale: 0, opacity: 1 }}
                whileTap={{ scale: 2, opacity: 0 }}
                transition={{ duration: 0.5 }}
            />

            {/* Content */}
            <span className="relative flex items-center gap-2">
                {loading ? (
                    <motion.span
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    >
                        <Loader2 size={size === 'sm' ? 14 : size === 'lg' ? 20 : 16} />
                    </motion.span>
                ) : success ? (
                    <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                    >
                        <Check size={size === 'sm' ? 14 : size === 'lg' ? 20 : 16} />
                    </motion.span>
                ) : Icon && iconPosition === 'left' ? (
                    <Icon size={size === 'sm' ? 14 : size === 'lg' ? 20 : 16} />
                ) : null}

                <span>{success ? '¡Listo!' : children}</span>

                {Icon && iconPosition === 'right' && !loading && !success && (
                    <Icon size={size === 'sm' ? 14 : size === 'lg' ? 20 : 16} />
                )}
            </span>
        </motion.button>
    );
}

/**
 * Botón con contador (para agregar al carrito)
 */
export function CounterButton({ 
    count = 0, 
    onIncrement, 
    onDecrement, 
    min = 0, 
    max = 99,
    size = 'md' 
}) {
    const sizes = {
        sm: 'h-8 text-sm',
        md: 'h-10 text-base',
        lg: 'h-12 text-lg'
    };

    return (
        <div className={`inline-flex items-center bg-gray-100 rounded-xl overflow-hidden ${sizes[size]}`}>
            <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={onDecrement}
                disabled={count <= min}
                className="px-3 h-full text-gray-600 hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
                −
            </motion.button>
            
            <motion.span
                key={count}
                initial={{ scale: 1.2, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="w-10 text-center font-semibold"
            >
                {count}
            </motion.span>
            
            <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={onIncrement}
                disabled={count >= max}
                className="px-3 h-full text-gray-600 hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
                +
            </motion.button>
        </div>
    );
}

/**
 * Botón de like/favorito con animación
 */
export function LikeButton({ liked = false, onToggle, size = 24 }) {
    return (
        <motion.button
            onClick={onToggle}
            whileTap={{ scale: 0.8 }}
            className="relative p-2 rounded-full hover:bg-gray-100 transition-colors"
        >
            <motion.svg
                xmlns="http://www.w3.org/2000/svg"
                width={size}
                height={size}
                viewBox="0 0 24 24"
                fill={liked ? '#FF671D' : 'none'}
                stroke={liked ? '#FF671D' : 'currentColor'}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                animate={liked ? { scale: [1, 1.3, 1] } : {}}
                transition={{ duration: 0.3 }}
            >
                <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
            </motion.svg>
            
            {/* Partículas al dar like */}
            {liked && (
                <motion.div
                    initial={{ opacity: 1 }}
                    animate={{ opacity: 0 }}
                    transition={{ duration: 0.6 }}
                    className="absolute inset-0 pointer-events-none"
                >
                    {[...Array(6)].map((_, i) => (
                        <motion.span
                            key={i}
                            initial={{ scale: 0, x: 0, y: 0 }}
                            animate={{
                                scale: [0, 1, 0],
                                x: Math.cos(i * 60 * Math.PI / 180) * 20,
                                y: Math.sin(i * 60 * Math.PI / 180) * 20
                            }}
                            transition={{ duration: 0.4 }}
                            className="absolute top-1/2 left-1/2 w-1.5 h-1.5 bg-bikitchen-orange rounded-full"
                        />
                    ))}
                </motion.div>
            )}
        </motion.button>
    );
}

/**
 * Botón de toggle con animación
 */
export function ToggleSwitch({ checked = false, onChange, disabled = false }) {
    return (
        <motion.button
            onClick={() => !disabled && onChange?.(!checked)}
            disabled={disabled}
            className={`
                relative w-12 h-7 rounded-full transition-colors duration-200
                ${checked ? 'bg-bikitchen-orange' : 'bg-gray-300'}
                ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            `}
        >
            <motion.span
                animate={{ x: checked ? 22 : 2 }}
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                className="absolute top-1 w-5 h-5 bg-white rounded-full shadow-md"
            />
        </motion.button>
    );
}
