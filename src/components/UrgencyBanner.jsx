import { useState, useEffect } from 'react';
import { Clock, Truck } from 'lucide-react';

/**
 * UrgencyBanner — Muestra el tiempo que falta para que cierren pedidos.
 * Horario de Costa Rica (UTC-6).
 * - Lunes: cierre Viernes 22:00
 * - Miércoles: cierre Lunes 22:00
 * - Sábado: cierre Jueves 22:00
 */

const DEADLINES = [
    { deadlineDay: 5, deadlineHour: 22, deliveryDay: 'Lunes' },    // Cierre Viernes → entrega Lunes
    { deadlineDay: 1, deadlineHour: 22, deliveryDay: 'Miércoles' }, // Cierre Lunes → entrega Miércoles
    { deadlineDay: 4, deadlineHour: 22, deliveryDay: 'Sábado' },    // Cierre Jueves → entrega Sábado
];

function getCRTime() {
    // Costa Rica es UTC-6, sin horario de verano
    const utcMs = Date.now() + new Date().getTimezoneOffset() * 60000;
    return new Date(utcMs - 6 * 3600000);
}

function getNextDeadline() {
    const now = getCRTime();
    const day = now.getDay();   // 0=Dom...6=Sáb
    const hour = now.getHours();
    const minute = now.getMinutes();
    const second = now.getSeconds();

    let best = null;
    let bestMs = Infinity;

    for (const d of DEADLINES) {
        // Calcular cuántos días faltan hasta ese deadlineDay
        let daysAhead = (d.deadlineDay - day + 7) % 7;
        // Si es el mismo día pero ya pasó la hora, buscar la siguiente semana
        if (daysAhead === 0 && (hour > d.deadlineHour || (hour === d.deadlineHour && (minute > 0 || second > 0)))) {
            daysAhead = 7;
        }

        const deadlineDate = new Date(now);
        deadlineDate.setDate(now.getDate() + daysAhead);
        deadlineDate.setHours(d.deadlineHour, 0, 0, 0);

        const ms = deadlineDate - now;
        if (ms > 0 && ms < bestMs) {
            bestMs = ms;
            best = { ms, deliveryDay: d.deliveryDay };
        }
    }

    return best;
}

function formatCountdown(ms) {
    const totalSeconds = Math.floor(ms / 1000);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (days > 0) {
        return `${days}d ${hours}h ${String(minutes).padStart(2, '0')}m`;
    }
    if (hours > 0) {
        return `${hours}h ${String(minutes).padStart(2, '0')}m ${String(seconds).padStart(2, '0')}s`;
    }
    return `${String(minutes).padStart(2, '0')}m ${String(seconds).padStart(2, '0')}s`;
}

function getUrgencyLevel(ms) {
    const hours = ms / 3600000;
    if (hours < 3) return 'critical';  // Menos de 3h
    if (hours < 12) return 'high';     // Menos de 12h
    if (hours < 24) return 'medium';   // Menos de 24h
    return 'low';
}

export default function UrgencyBanner({ className = '' }) {
    const [deadline, setDeadline] = useState(null);
    const [countdown, setCountdown] = useState('');
    const [urgency, setUrgency] = useState('low');

    useEffect(() => {
        const tick = () => {
            const next = getNextDeadline();
            if (next) {
                setDeadline(next);
                setCountdown(formatCountdown(next.ms));
                setUrgency(getUrgencyLevel(next.ms));
            }
        };

        tick();
        const interval = setInterval(tick, 1000);
        return () => clearInterval(interval);
    }, []);

    if (!deadline) return null;

    const styles = {
        critical: {
            bg: 'bg-red-600',
            text: 'text-white',
            badge: 'bg-red-800',
            pulse: true,
            emoji: '🔥',
            label: '¡Últimas horas!'
        },
        high: {
            bg: 'bg-orange-500',
            text: 'text-white',
            badge: 'bg-orange-700',
            pulse: false,
            emoji: '⏰',
            label: 'Cierra pronto'
        },
        medium: {
            bg: 'bg-amber-500',
            text: 'text-white',
            badge: 'bg-amber-700',
            pulse: false,
            emoji: '🕐',
            label: 'Cerrando hoy'
        },
        low: {
            bg: 'bg-slate-800',
            text: 'text-white',
            badge: 'bg-slate-600',
            pulse: false,
            emoji: '📦',
            label: `Próx. entrega ${deadline.deliveryDay}`
        }
    };

    const s = styles[urgency];

    return (
        <div className={`${s.bg} ${s.text} ${className} flex overflow-hidden`}>
            {/* Barra lateral izquierda — acento visual pegado al borde superior */}
            <div className={`w-1 flex-shrink-0 self-stretch ${s.badge}`} aria-hidden="true" />

            {/* Contenido principal */}
            <div className="flex items-center justify-center gap-2 sm:gap-4 px-3 sm:px-5 py-2 flex-1 flex-wrap min-w-0">
                {/* Entrega */}
                <div className="flex items-center gap-1.5 flex-shrink-0">
                    <Truck size={13} className="opacity-80" aria-hidden="true" />
                    <span className="text-[11px] sm:text-xs font-bold opacity-90 whitespace-nowrap">
                        Entrega el <strong>{deadline.deliveryDay}</strong>
                    </span>
                </div>

                <span className="opacity-30 text-xs" aria-hidden="true">·</span>

                {/* Cuenta regresiva */}
                <div className="flex items-center gap-1.5 flex-shrink-0">
                    <Clock size={13} className={`opacity-80 ${s.pulse ? 'animate-pulse' : ''}`} aria-hidden="true" />
                    <span className="text-[11px] sm:text-xs font-semibold opacity-90 whitespace-nowrap">
                        {s.label} —
                    </span>
                    <span className={`font-black text-xs sm:text-sm px-2 py-0.5 rounded-md tabular-nums ${s.badge}`}>
                        {countdown}
                    </span>
                </div>

                {/* Emoji urgencia */}
                <span className="text-sm flex-shrink-0" aria-hidden="true">{s.emoji}</span>
            </div>
        </div>
    );
}
