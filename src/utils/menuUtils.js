/**
 * Formats a dish item for display.
 * Logic:
 * - If only protein is present: returns protein
 * - If protein and vegetal are present: returns "Proteina (Vegetal)"
 * - Handles empty strings, whitespace, and "—" placeholder for vegetal.
 * 
 * @param {Object} dish - The dish object { proteina, vegetal, ... }
 * @returns {string} Formatted string
 */
export const formatDishItem = (dish) => {
    if (!dish) return '';
    const proteina = dish.proteina || '';

    // Check if vegetal exists and has meaningful content
    // We treat "—" (em dash) or "-" (hyphen) as empty/placeholder
    const hasVegetal = dish.vegetal &&
        dish.vegetal.trim().length > 0 &&
        dish.vegetal !== '—' &&
        dish.vegetal !== '-';

    if (hasVegetal) {
        return `${proteina} (${dish.vegetal})`;
    }

    // Safety check: if the protein string itself ends with empty parentheses "()", remove them.
    // Also remove trailing whitespace.
    return proteina.replace(/\s*\(\s*\)$/, '').trim();
};
