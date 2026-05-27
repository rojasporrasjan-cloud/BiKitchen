import React, { useState, useEffect } from 'react';
import { Activity, Zap, Droplet } from 'lucide-react';

/**
 * IngredientScanner Component
 * 
 * An interactive component that wraps an image or element. On hover, it displays
 * a futuristic "X-Ray" scanner overlay with nutritional data.
 * 
 * @param {Object} props
 * @param {React.ReactNode} props.children - The content to be wrapped (usually an image).
 * @param {Object} [props.data] - Nutritional data to display.
 * @param {number} props.data.cal - Calories.
 * @param {number} props.data.protein - Protein in grams.
 * @param {number} props.data.carbs - Carbs in grams.
 */
export default function IngredientScanner({ children, data = { cal: 0, protein: 0, carbs: 0 }, className = "" }) {
    const [isHovered, setIsHovered] = useState(false);
    const [displayData, setDisplayData] = useState({ cal: 0, protein: 0, carbs: 0 });

    useEffect(() => {
        let interval;
        if (isHovered) {
            let steps = 0;
            interval = setInterval(() => {
                steps++;
                setDisplayData(prev => ({
                    cal: Math.min(data.cal, Math.floor(prev.cal + (data.cal / 10))),
                    protein: Math.min(data.protein, Math.floor(prev.protein + (data.protein / 10))),
                    carbs: Math.min(data.carbs, Math.floor(prev.carbs + (data.carbs / 10)))
                }));
                if (steps > 15) clearInterval(interval);
            }, 30);
        } else {
            setDisplayData({ cal: 0, protein: 0, carbs: 0 });
        }
        return () => clearInterval(interval);
    }, [isHovered, data]);

    return (
        <div
            className={`relative group overflow-hidden rounded-xl ${className}`}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            {children}

            {/* X-Ray Overlay */}
            <div className={`absolute inset-0 bg-[#0a1f0c]/80 backdrop-blur-[2px] transition-opacity duration-300 flex flex-col justify-center items-center z-10 ${isHovered ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>

                {/* Scanning Line */}
                <div className="absolute top-0 left-0 w-full h-[2px] bg-accent shadow-[0_0_15px_rgba(212,175,55,0.8)] animate-scan opacity-50"></div>

                {/* HUD Corners */}
                <div className="absolute top-4 left-4 w-8 h-8 border-t-2 border-l-2 border-accent/50"></div>
                <div className="absolute top-4 right-4 w-8 h-8 border-t-2 border-r-2 border-accent/50"></div>
                <div className="absolute bottom-4 left-4 w-8 h-8 border-b-2 border-l-2 border-accent/50"></div>
                <div className="absolute bottom-4 right-4 w-8 h-8 border-b-2 border-r-2 border-accent/50"></div>

                {/* Data Grid */}
                <div className="grid grid-cols-3 gap-8 text-center transform translate-y-4 group-hover:translate-y-0 transition-transform duration-500">
                    <div className="flex flex-col items-center gap-2">
                        <Zap size={20} className="text-accent animate-pulse" />
                        <span className="text-3xl font-mono font-bold text-white">{displayData.cal}</span>
                        <span className="text-[10px] uppercase tracking-widest text-white/60">Kcal</span>
                    </div>
                    <div className="flex flex-col items-center gap-2">
                        <Activity size={20} className="text-accent animate-pulse" style={{ animationDelay: '0.1s' }} />
                        <span className="text-3xl font-mono font-bold text-white">{displayData.protein}g</span>
                        <span className="text-[10px] uppercase tracking-widest text-white/60">Prot</span>
                    </div>
                    <div className="flex flex-col items-center gap-2">
                        <Droplet size={20} className="text-accent animate-pulse" style={{ animationDelay: '0.2s' }} />
                        <span className="text-3xl font-mono font-bold text-white">{displayData.carbs}g</span>
                        <span className="text-[10px] uppercase tracking-widest text-white/60">Carbs</span>
                    </div>
                </div>

                {/* Tech Deco */}
                <div className="absolute bottom-8 text-[10px] font-mono text-accent/60 tracking-[0.5em] animate-pulse">
                    SCANNING COMPLETE
                </div>
            </div>

        </div>
    );
}
