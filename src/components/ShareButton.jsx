import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Share2, X, Copy, Check, MessageCircle, Send } from 'lucide-react';
import toast from 'react-hot-toast';

/**
 * Botón de compartir con múltiples opciones
 */
export default function ShareButton({ 
    url, 
    title, 
    description,
    image,
    variant = 'icon', // 'icon' | 'button' | 'text'
    className = ''
}) {
    const [isOpen, setIsOpen] = useState(false);
    const [copied, setCopied] = useState(false);

    const shareUrl = url || window.location.href;
    const shareTitle = title || 'BiKitchen Food';
    const shareText = description || 'Ingredientes frescos, sabor de casa';

    // Usar Web Share API si está disponible
    const handleNativeShare = async () => {
        if (navigator.share) {
            try {
                await navigator.share({
                    title: shareTitle,
                    text: shareText,
                    url: shareUrl
                });
            } catch (err) {
                if (err.name !== 'AbortError') {
                    setIsOpen(true);
                }
            }
        } else {
            setIsOpen(true);
        }
    };

    // Copiar al portapapeles
    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(shareUrl);
            setCopied(true);
            toast.success('¡Enlace copiado!');
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            toast.error('No se pudo copiar');
        }
    };

    // Opciones de compartir
    const shareOptions = [
        {
            name: 'WhatsApp',
            icon: MessageCircle,
            color: 'bg-green-500',
            url: `https://wa.me/?text=${encodeURIComponent(`${shareTitle}\n${shareText}\n${shareUrl}`)}`
        },
        {
            name: 'Facebook',
            icon: () => (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
            ),
            color: 'bg-blue-600',
            url: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`
        },
        {
            name: 'Twitter',
            icon: () => (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                </svg>
            ),
            color: 'bg-black',
            url: `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareTitle)}&url=${encodeURIComponent(shareUrl)}`
        },
        {
            name: 'Telegram',
            icon: Send,
            color: 'bg-sky-500',
            url: `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareTitle)}`
        }
    ];

    const handleShareClick = (option) => {
        window.open(option.url, '_blank', 'width=600,height=400');
        setIsOpen(false);
    };

    // Variantes de renderizado
    const renderTrigger = () => {
        switch (variant) {
            case 'button':
                return (
                    <button
                        onClick={handleNativeShare}
                        className={`flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors ${className}`}
                    >
                        <Share2 size={18} />
                        <span>Compartir</span>
                    </button>
                );
            case 'text':
                return (
                    <button
                        onClick={handleNativeShare}
                        className={`text-bikitchen-orange hover:text-orange-600 font-medium ${className}`}
                    >
                        Compartir
                    </button>
                );
            default:
                return (
                    <button
                        onClick={handleNativeShare}
                        className={`p-2 hover:bg-gray-100 rounded-xl transition-colors ${className}`}
                    >
                        <Share2 size={20} className="text-gray-600" />
                    </button>
                );
        }
    };

    return (
        <>
            {renderTrigger()}

            {/* Modal de opciones */}
            <AnimatePresence>
                {isOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsOpen(false)}
                            className="fixed inset-0 bg-black/50 z-[200]"
                        />
                        <motion.div
                            initial={{ opacity: 0, y: 100 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 100 }}
                            className="fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl z-[201] p-6 pb-8"
                        >
                            {/* Header */}
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-lg font-semibold">Compartir</h3>
                                <button
                                    onClick={() => setIsOpen(false)}
                                    className="p-2 hover:bg-gray-100 rounded-full"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            {/* Preview */}
                            <div className="bg-gray-50 rounded-xl p-4 mb-6">
                                <p className="font-medium text-gray-900 truncate">{shareTitle}</p>
                                <p className="text-sm text-gray-500 truncate">{shareUrl}</p>
                            </div>

                            {/* Share options */}
                            <div className="grid grid-cols-4 gap-4 mb-6">
                                {shareOptions.map((option) => {
                                    const Icon = option.icon;
                                    return (
                                        <button
                                            key={option.name}
                                            onClick={() => handleShareClick(option)}
                                            className="flex flex-col items-center gap-2"
                                        >
                                            <div className={`w-12 h-12 ${option.color} rounded-full flex items-center justify-center text-white`}>
                                                <Icon />
                                            </div>
                                            <span className="text-xs text-gray-600">{option.name}</span>
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Copy link */}
                            <button
                                onClick={handleCopy}
                                className="w-full flex items-center justify-center gap-2 py-3 border-2 border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
                            >
                                {copied ? (
                                    <>
                                        <Check size={18} className="text-green-500" />
                                        <span className="text-green-600 font-medium">¡Copiado!</span>
                                    </>
                                ) : (
                                    <>
                                        <Copy size={18} className="text-gray-500" />
                                        <span className="text-gray-700 font-medium">Copiar enlace</span>
                                    </>
                                )}
                            </button>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </>
    );
}

/**
 * Hook para compartir
 */
export function useShare() {
    const share = async ({ url, title, text }) => {
        if (navigator.share) {
            try {
                await navigator.share({ url, title, text });
                return { success: true };
            } catch (err) {
                return { success: false, error: err };
            }
        }
        
        // Fallback: copiar al portapapeles
        try {
            await navigator.clipboard.writeText(url || window.location.href);
            return { success: true, copied: true };
        } catch (err) {
            return { success: false, error: err };
        }
    };

    const canShare = typeof navigator !== 'undefined' && !!navigator.share;

    return { share, canShare };
}
