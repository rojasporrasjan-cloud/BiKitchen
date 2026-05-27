import { useState, useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Check, AlertCircle, Eye, EyeOff } from 'lucide-react';

/**
 * Input con validación visual y accesibilidad mejorada
 */
export default function FormInput({
    label,
    name,
    type = 'text',
    value,
    onChange,
    onBlur,
    placeholder,
    error,
    success,
    hint,
    required = false,
    disabled = false,
    autoComplete,
    icon: Icon,
    maxLength,
    pattern,
    validate,
    className = '',
    inputClassName = '',
    ...props
}) {
    const [touched, setTouched] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [internalError, setInternalError] = useState('');

    const isPassword = type === 'password';
    const inputType = isPassword && showPassword ? 'text' : type;

    // Validación interna
    useEffect(() => {
        if (touched && validate && value) {
            const validationResult = validate(value);
            if (typeof validationResult === 'string') {
                setInternalError(validationResult);
            } else if (!validationResult) {
                setInternalError('Valor inválido');
            } else {
                setInternalError('');
            }
        }
    }, [value, touched, validate]);

    const displayError = error || internalError;
    const isValid = touched && !displayError && value;

    const handleBlur = (e) => {
        setTouched(true);
        onBlur?.(e);
    };

    // Generar ID único para accesibilidad
    const inputId = `input-${name}`;
    const errorId = `error-${name}`;
    const hintId = `hint-${name}`;

    return (
        <div className={`mb-4 ${className}`}>
            {/* Label */}
            {label && (
                <label 
                    htmlFor={inputId}
                    className="block text-sm font-medium text-gray-700 mb-1.5"
                >
                    {label}
                    {required && <span className="text-red-500 ml-1" aria-hidden="true">*</span>}
                </label>
            )}

            {/* Input container */}
            <div className="relative">
                {/* Icon izquierdo */}
                {Icon && (
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                        <Icon size={18} />
                    </div>
                )}

                {/* Input */}
                <input
                    id={inputId}
                    name={name}
                    type={inputType}
                    value={value}
                    onChange={onChange}
                    onBlur={handleBlur}
                    placeholder={placeholder}
                    disabled={disabled}
                    required={required}
                    autoComplete={autoComplete}
                    maxLength={maxLength}
                    pattern={pattern}
                    aria-invalid={!!displayError}
                    aria-describedby={`${displayError ? errorId : ''} ${hint ? hintId : ''}`.trim() || undefined}
                    className={`
                        w-full px-4 py-3 rounded-xl border-2 transition-all duration-200
                        focus:outline-none focus:ring-2 focus:ring-offset-0
                        disabled:bg-gray-100 disabled:cursor-not-allowed
                        ${Icon ? 'pl-10' : ''}
                        ${isPassword ? 'pr-12' : isValid ? 'pr-10' : displayError ? 'pr-10' : ''}
                        ${displayError 
                            ? 'border-red-300 focus:border-red-500 focus:ring-red-200' 
                            : isValid 
                                ? 'border-green-300 focus:border-green-500 focus:ring-green-200'
                                : 'border-gray-200 focus:border-bikitchen-orange focus:ring-bikitchen-orange/20'
                        }
                        ${inputClassName}
                    `}
                    {...props}
                />

                {/* Indicador de estado (derecha) */}
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                    {/* Toggle password */}
                    {isPassword && (
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="text-gray-400 hover:text-gray-600 focus:outline-none"
                            aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                        >
                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                    )}

                    {/* Icono de validación */}
                    {!isPassword && (
                        <AnimatePresence mode="wait">
                            {displayError && touched && (
                                <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    exit={{ scale: 0 }}
                                    className="text-red-500"
                                >
                                    <AlertCircle size={18} />
                                </motion.div>
                            )}
                            {isValid && (
                                <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    exit={{ scale: 0 }}
                                    className="text-green-500"
                                >
                                    <Check size={18} />
                                </motion.div>
                            )}
                        </AnimatePresence>
                    )}
                </div>
            </div>

            {/* Mensaje de error */}
            <AnimatePresence>
                {displayError && touched && (
                    <motion.p
                        id={errorId}
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="mt-1.5 text-sm text-red-600 flex items-center gap-1"
                        role="alert"
                    >
                        <AlertCircle size={14} />
                        {displayError}
                    </motion.p>
                )}
            </AnimatePresence>

            {/* Hint */}
            {hint && !displayError && (
                <p id={hintId} className="mt-1.5 text-sm text-gray-500">
                    {hint}
                </p>
            )}

            {/* Contador de caracteres */}
            {maxLength && (
                <p className="mt-1 text-xs text-gray-400 text-right">
                    {value?.length || 0}/{maxLength}
                </p>
            )}
        </div>
    );
}

/**
 * Textarea con validación
 */
export function FormTextarea({
    label,
    name,
    value,
    onChange,
    onBlur,
    placeholder,
    error,
    hint,
    required = false,
    disabled = false,
    rows = 4,
    maxLength,
    className = '',
    ...props
}) {
    const [touched, setTouched] = useState(false);

    const handleBlur = (e) => {
        setTouched(true);
        onBlur?.(e);
    };

    const inputId = `textarea-${name}`;
    const errorId = `error-${name}`;

    return (
        <div className={`mb-4 ${className}`}>
            {label && (
                <label htmlFor={inputId} className="block text-sm font-medium text-gray-700 mb-1.5">
                    {label}
                    {required && <span className="text-red-500 ml-1">*</span>}
                </label>
            )}

            <textarea
                id={inputId}
                name={name}
                value={value}
                onChange={onChange}
                onBlur={handleBlur}
                placeholder={placeholder}
                disabled={disabled}
                required={required}
                rows={rows}
                maxLength={maxLength}
                aria-invalid={!!error}
                aria-describedby={error ? errorId : undefined}
                className={`
                    w-full px-4 py-3 rounded-xl border-2 transition-all duration-200
                    focus:outline-none focus:ring-2 focus:ring-offset-0 resize-none
                    disabled:bg-gray-100 disabled:cursor-not-allowed
                    ${error && touched
                        ? 'border-red-300 focus:border-red-500 focus:ring-red-200'
                        : 'border-gray-200 focus:border-bikitchen-orange focus:ring-bikitchen-orange/20'
                    }
                `}
                {...props}
            />

            <AnimatePresence>
                {error && touched && (
                    <motion.p
                        id={errorId}
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="mt-1.5 text-sm text-red-600 flex items-center gap-1"
                        role="alert"
                    >
                        <AlertCircle size={14} />
                        {error}
                    </motion.p>
                )}
            </AnimatePresence>

            {hint && !error && (
                <p className="mt-1.5 text-sm text-gray-500">{hint}</p>
            )}

            {maxLength && (
                <p className="mt-1 text-xs text-gray-400 text-right">
                    {value?.length || 0}/{maxLength}
                </p>
            )}
        </div>
    );
}

/**
 * Select con validación
 */
export function FormSelect({
    label,
    name,
    value,
    onChange,
    options = [],
    placeholder = 'Seleccionar...',
    error,
    required = false,
    disabled = false,
    className = '',
    ...props
}) {
    const [touched, setTouched] = useState(false);
    const inputId = `select-${name}`;

    return (
        <div className={`mb-4 ${className}`}>
            {label && (
                <label htmlFor={inputId} className="block text-sm font-medium text-gray-700 mb-1.5">
                    {label}
                    {required && <span className="text-red-500 ml-1">*</span>}
                </label>
            )}

            <select
                id={inputId}
                name={name}
                value={value}
                onChange={onChange}
                onBlur={() => setTouched(true)}
                disabled={disabled}
                required={required}
                aria-invalid={!!error}
                className={`
                    w-full px-4 py-3 rounded-xl border-2 transition-all duration-200
                    focus:outline-none focus:ring-2 focus:ring-offset-0
                    disabled:bg-gray-100 disabled:cursor-not-allowed
                    ${error && touched
                        ? 'border-red-300 focus:border-red-500 focus:ring-red-200'
                        : 'border-gray-200 focus:border-bikitchen-orange focus:ring-bikitchen-orange/20'
                    }
                `}
                {...props}
            >
                <option value="">{placeholder}</option>
                {options.map((option) => (
                    <option key={option.value} value={option.value}>
                        {option.label}
                    </option>
                ))}
            </select>

            <AnimatePresence>
                {error && touched && (
                    <motion.p
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="mt-1.5 text-sm text-red-600 flex items-center gap-1"
                        role="alert"
                    >
                        <AlertCircle size={14} />
                        {error}
                    </motion.p>
                )}
            </AnimatePresence>
        </div>
    );
}
