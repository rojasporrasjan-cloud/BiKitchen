import React from 'react';
import { motion } from 'framer-motion';

const variants = {
    initial: {
        opacity: 0,
        y: 20,
        filter: 'blur(10px)',
        scale: 0.98
    },
    animate: {
        opacity: 1,
        y: 0,
        filter: 'blur(0px)',
        scale: 1,
        transition: {
            duration: 0.6,
            ease: [0.22, 1, 0.36, 1] // Custom "Liquid" Bezier
        }
    },
    exit: {
        opacity: 0,
        y: -20,
        filter: 'blur(10px)',
        scale: 0.98,
        transition: {
            duration: 0.4,
            ease: "easeInOut"
        }
    }
};

/**
 * PageTransition Component
 * 
 * Wraps page content to provide smooth enter/exit animations using Framer Motion.
 * It implements a "liquid" feel with custom bezier curves and blur effects.
 * 
 * @param {Object} props
 * @param {React.ReactNode} props.children - The page content.
 */
export default function PageTransition({ children }) {
    return (
        <motion.div
            variants={variants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="w-full"
        >
            {children}
        </motion.div>
    );
}
