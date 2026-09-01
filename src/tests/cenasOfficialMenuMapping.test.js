import { describe, it, expect } from 'vitest';
import { DEFAULT_MENUS } from '../utils/firestoreMenus';

describe('Cenas Official Menu Mapping Integration', () => {

    it('loads distinct Cenas dishes from officialMenus.cena.bajoCalorias', () => {
        const officialMenus = DEFAULT_MENUS;
        const menuKey = 'bajoCalorias';
        const isCenaSheet = true;

        let rawPlatos = [];
        if (officialMenus && menuKey) {
            if (isCenaSheet) {
                const cenaMenuObj = officialMenus.cena?.[menuKey] || officialMenus[`cena${menuKey.charAt(0).toUpperCase() + menuKey.slice(1)}`];
                if (cenaMenuObj) {
                    rawPlatos = Array.isArray(cenaMenuObj) ? cenaMenuObj : (cenaMenuObj.platos || []);
                }
            }
            if (!rawPlatos || rawPlatos.length === 0) {
                rawPlatos = Array.isArray(officialMenus[menuKey]) ? officialMenus[menuKey] : (officialMenus[menuKey]?.platos || []);
            }
        }

        expect(rawPlatos.length).toBe(5);
        expect(rawPlatos[0].proteina).toBe('Fajitas de cerdo encebolladas');
        expect(rawPlatos[1].proteina).toBe('Pollo mechado en salsa');
        expect(rawPlatos[2].proteina).toBe('Carne molida con verdunitas');
        expect(rawPlatos[3].proteina).toBe('Filet de tilapia al ajillo');
        expect(rawPlatos[4].proteina).toBe('Pollo en salsa de culantro');

        const firstAlmuerzoDish = officialMenus.bajoCalorias[0].proteina;
        expect(firstAlmuerzoDish).toBe('Pollo en salsa criolla');
        expect(rawPlatos[0].proteina).not.toBe(firstAlmuerzoDish);
    });
});
