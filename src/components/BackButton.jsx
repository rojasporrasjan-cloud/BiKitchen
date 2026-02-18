import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';

export default function BackButton({ className = '', light = false }) {
    const navigate = useNavigate();

    return (
        <motion.button
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            onClick={() => navigate(-1)}
            className={`group inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-200 ${
                light 
                    ? 'text-white/80 hover:text-white hover:bg-white/10' 
                    : 'text-gray-600 hover:text-bikitchen-orange hover:bg-bikitchen-orange/5'
            } ${className}`}
        >
            <ArrowLeft 
                size={18} 
                className="transition-transform duration-200 group-hover:-translate-x-1" 
            />
            <span>Volver</span>
        </motion.button>
    );
}
