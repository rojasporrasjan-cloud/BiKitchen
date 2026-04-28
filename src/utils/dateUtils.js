/**
 * "Nuclear Mode" Date Parser - Ultra Resilient
 * Handles MM/DD/YYYY and DD/MM/YYYY by detecting which part is greater than 12.
 */
export const parseFirebaseDate = (date) => {
    if (!date) return null;
    
    // 1. Firestore Timestamp
    if (typeof date.toDate === 'function') {
        return date.toDate();
    }
    
    // 2. Serialized Timestamp
    const seconds = date.seconds ?? date._seconds ?? date.secondsValue;
    if (seconds !== undefined) {
        return new Date(seconds * 1000);
    }

    // 3. Raw Number
    if (typeof date === 'number') {
        // If it looks like seconds (e.g. 1776...), multiply by 1000
        if (date < 10000000000) return new Date(date * 1000);
        return new Date(date);
    }
    
    // 4. Strings (The complex part)
    if (typeof date === 'string') {
        // Standard YYYY-MM-DD
        if (date.includes('-') && !date.includes('/')) {
            const d = new Date(date);
            if (!isNaN(d.getTime())) return d;
        }

        // Region-specific DD/MM vs MM/DD
        const parts = date.split(/[/ -]/);
        if (parts.length >= 3) {
            const p1 = parseInt(parts[0], 10);
            const p2 = parseInt(parts[1], 10);
            const p3 = parseInt(parts[2], 10);

            let d, m, y;
            
            // Case: YYYY-MM-DD
            if (p1 > 1900) {
                y = p1; m = p2; d = p3;
            } 
            // Case: DD/MM/YYYY or MM/DD/YYYY
            else if (p3 > 1900) {
                y = p3;
                // If p1 > 12, it must be the day (DD/MM)
                if (p1 > 12) {
                    d = p1; m = p2;
                }
                // If p2 > 12, it must be the day (MM/DD)
                else if (p2 > 12) {
                    d = p2; m = p1;
                }
                // Ambiguous (both <= 12). Default to DD/MM (Costa Rica)
                else {
                    d = p1; m = p2;
                }
            } else {
                return null;
            }

            let dateObj = new Date(y, m - 1, d);
            const now = new Date();
            const tomorrow = new Date(now.getTime() + 86400000); // 1 día de gracia para TZ

            // PROTECCIÓN DE VIAJE EN EL TIEMPO:
            // Si la fecha interpretada es en el futuro remoto (> mañana), 
            // probablemente el día y mes están invertidos (ej. 04/10 interpretado como 10 de Mayo)
            if (dateObj > tomorrow) {
                const alternateDate = new Date(y, d - 1, m);
                if (alternateDate <= tomorrow) {
                    console.warn(`[DateFix] Corrigiendo fecha futura: ${dateObj.toLocaleDateString()} -> ${alternateDate.toLocaleDateString()}`);
                    dateObj = alternateDate;
                }
            }
            
            if (!isNaN(dateObj.getTime())) return dateObj;
        }

        const d = new Date(date);
        return isNaN(d.getTime()) ? null : d;
    }
    
    if (date.timestamp) return parseFirebaseDate(date.timestamp);
    if (date.fecha && date.fecha !== date) return parseFirebaseDate(date.fecha);
    if (date instanceof Date) return isNaN(date.getTime()) ? null : date;
    
    return null;
};
