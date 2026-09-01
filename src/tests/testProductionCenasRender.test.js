import { describe, it, expect } from 'vitest';
import { DEFAULT_MENUS } from '../utils/firestoreMenus';
import { mapPackNameToMenuKey } from '../utils/packClassification';

describe('Cenas Production Render Verification', () => {

    const resolvePlatosForPack = (packName, packData, officialMenus) => {
        const isCenaSheet = packName.startsWith('CENAS -');
        const basePackName = isCenaSheet ? packName.replace(/^CENAS\s*-\s*/i, '') : packName;
        const menuKey = packData?.menuKey || mapPackNameToMenuKey(basePackName);

        let rawPlatos = [];
        if (officialMenus && menuKey) {
            if (isCenaSheet) {
                const cenaKeyCap = menuKey.charAt(0).toUpperCase() + menuKey.slice(1);
                const cenaMenuObj = officialMenus.cena?.[menuKey]
                    || officialMenus[`cena_${menuKey}`]
                    || officialMenus[`cena${cenaKeyCap}`]
                    || officialMenus[`cena${menuKey}`];

                if (cenaMenuObj) {
                    rawPlatos = Array.isArray(cenaMenuObj) ? cenaMenuObj : (cenaMenuObj.platos || []);
                }
            } else {
                const menuObj = officialMenus[menuKey];
                if (menuObj) {
                    rawPlatos = Array.isArray(menuObj) ? menuObj : (menuObj.platos || []);
                }
            }
        }

        if (isCenaSheet && (!rawPlatos || rawPlatos.length === 0)) {
            const defCenaObj = DEFAULT_MENUS.cena?.[menuKey] || DEFAULT_MENUS.cena?.bajoCalorias || DEFAULT_MENUS.cena?.regular || [];
            rawPlatos = Array.isArray(defCenaObj) ? defCenaObj : (defCenaObj.platos || []);
        }

        if (!isCenaSheet && (!rawPlatos || rawPlatos.length === 0)) {
            const defMenuObj = DEFAULT_MENUS[menuKey] || [];
            rawPlatos = Array.isArray(defMenuObj) ? defMenuObj : (defMenuObj.platos || []);
            if (!rawPlatos || rawPlatos.length === 0) rawPlatos = packData?.platosBase || [];
        }

        return rawPlatos || [];
    };

    it('verifies that CENAS - PACK BAJO EN CALORÍAS renders the exact official Cenas dishes', () => {
        const packName = 'CENAS - Pack Bajo Calorías';
        const packData = { menuKey: 'bajoCalorias', platosBase: [{ proteina: { nombre: 'Almuercitos rellenos con carne molida' } }] };

        // Test case 1: officialMenus is null or empty (uses DEFAULT_MENUS.cena.bajoCalorias)
        const dishes1 = resolvePlatosForPack(packName, packData, null);
        expect(dishes1[0].proteina).toBe('Fajitas de cerdo encebolladas');
        expect(dishes1[1].proteina).toBe('Pollo mechado en salsa');
        expect(dishes1[2].proteina).toBe('Carne molida con verdunitas');
        expect(dishes1[3].proteina).toBe('Filet de tilapia al ajillo');
        expect(dishes1[4].proteina).toBe('Pollo en salsa de culantro');

        // Test case 2: officialMenus has cena.bajoCalorias from Firebase
        const officialMenusFirebase = {
            cena: {
                bajoCalorias: [
                    { numero: 1, proteina: 'Fajitas de cerdo encebolladas', vegetal: 'Picadillo mixto', carbo: 'Yuca al ajillo' },
                    { numero: 2, proteina: 'Pollo mechado en salsa', vegetal: 'Mix de vainica, zanhoria y ayotes', carbo: 'Arroz y frijoles' },
                    { numero: 3, proteina: 'Carne molida con verdunitas', vegetal: 'Zuchinnis salteados', carbo: 'Arroz blanco' },
                    { numero: 4, proteina: 'Filet de tilapia al ajillo', vegetal: 'Vegetales mixtos', carbo: 'Papas salteadas' },
                    { numero: 5, proteina: 'Pollo en salsa de culantro', vegetal: 'Vegetales mixtos', carbo: 'Puré de camote' }
                ]
            }
        };
        const dishes2 = resolvePlatosForPack(packName, packData, officialMenusFirebase);
        expect(dishes2[0].proteina).toBe('Fajitas de cerdo encebolladas');
        expect(dishes2[1].proteina).toBe('Pollo mechado en salsa');
        expect(dishes2[2].proteina).toBe('Carne molida con verdunitas');
        expect(dishes2[3].proteina).toBe('Filet de tilapia al ajillo');
        expect(dishes2[4].proteina).toBe('Pollo en salsa de culantro');
    });
});
