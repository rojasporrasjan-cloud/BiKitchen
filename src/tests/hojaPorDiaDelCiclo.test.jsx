import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

/**
 * La hoja de producción montada ENTERA para cada día del ciclo, con Firebase de
 * mentira. No mide cantidades —eso lo prueba planDelCiclo.test.js—: comprueba
 * que la pantalla carga con cada día, que cada una dice qué trae, y que el
 * sábado arma el empaque del lunes sin lo empacado el viernes.
 *
 * Existe porque la hoja pide sesión de admin y no se puede abrir en el
 * navegador de pruebas: un error de orden de variables solo aparece en tiempo
 * de ejecución, y el build no lo ve.
 */

const SAB = '2026-09-19';
const LUN = '2026-09-21';

const PEDIDOS = [
    {
        id: 'sab-ind', numeroOrden: 'ORD-SAB-IND', cliente: 'Sara Sábado', status: 'confirmed', plan: 'Individuales',
        fecha_entrega: SAB, fechas_entrega: [SAB], zona_envio: 'Moravia',
        items: [{ nombre: 'Tilapia empanizada 250g', cantidad: 2, category: 'individuales' }]
    },
    {
        id: 'lun-bajo', numeroOrden: 'ORD-LUN-BAJO', cliente: 'Luis Lunes Bajo', status: 'confirmed', plan: 'Pack Bajo Calorías',
        fecha_entrega: LUN, fechas_entrega: [LUN], zona_envio: 'Curridabat',
        items: [{ nombre: 'Pack Bajo Calorías', cantidad: 1 }]
    },
    {
        id: 'lun-ind', numeroOrden: 'ORD-LUN-IND', cliente: 'Lorena Lunes Individual', status: 'confirmed', plan: 'Individuales',
        fecha_entrega: LUN, fechas_entrega: [LUN], zona_envio: 'Escazú',
        items: [{ nombre: 'Lomo encebollado 500g', cantidad: 1, category: 'individuales' }]
    }
];

// Las hojas ya mandadas a la cocina en este ciclo (tandas_cocina).
let tandasGuardadas = [];
vi.mock('../firebase/config', () => ({ db: {} }));
vi.mock('../context/AuthContext', () => ({ useAuth: () => ({ currentUser: { uid: 'x' }, isSuperAdmin: () => true }) }));
vi.mock('firebase/firestore', () => ({
    collection: () => ({}), query: () => ({}), where: () => ({}), orderBy: () => ({}),
    doc: () => ({}),
    getDocs: async () => ({ docs: tandasGuardadas.map(t => ({ data: () => t })), size: tandasGuardadas.length }),
    getDoc: async () => ({ exists: () => false, data: () => ({}) }),
    setDoc: async () => {}, updateDoc: async () => {},
    onSnapshot: (_q, ...resto) => {
        // Con o sin opciones: (q, cb) o (q, { includeMetadataChanges }, cb)
        const alLlegar = resto.find(x => typeof x === 'function');
        alLlegar({
            docs: PEDIDOS.map(p => ({ id: p.id, data: () => p })),
            docChanges: () => [],
            metadata: { fromCache: false }
        });
        return () => {};
    }
}));
vi.mock('../utils/firestoreMenus', async (original) => {
    const real = await original();
    return { ...real, getOfficialMenus: async () => real.DEFAULT_MENUS };
});

const { default: PrintProductionView } = await import('../pages/admin/PrintProductionView');

const abrir = (dia) => render(
    <MemoryRouter initialEntries={[`/admin/print-production?date=${SAB},${LUN}&adelanto=${LUN}&dia=${dia}`]}>
        <PrintProductionView />
    </MemoryRouter>
);

let guardado = {};
beforeEach(() => {
    tandasGuardadas = [];
    guardado = {};
    vi.stubGlobal('localStorage', {
        getItem: (k) => (k in guardado ? guardado[k] : null),
        setItem: (k, v) => { guardado[k] = String(v); },
        removeItem: (k) => { delete guardado[k]; }
    });
    // Que el sábado arranque "descontando": es como lo abre el botón.
    guardado['bikitchen.sinRebaja'] = 'false';
});

describe('la hoja de producción por día del ciclo', () => {
    it('JUEVES carga y dice qué trae', async () => {
        abrir('jueves');
        expect(await screen.findByText(/Hoja del JUEVES:/, {}, { timeout: 8000 })).toBeTruthy();
        expect(screen.getByText(/Sin keto ni familiares/)).toBeTruthy();
    });

    it('VIERNES sin nada anotado del jueves: avisa en rojo', async () => {
        abrir('viernes');
        expect(await screen.findByText(/Hoja del VIERNES:/, {}, { timeout: 8000 })).toBeTruthy();
        expect(screen.getByText(/No hay nada anotado del jueves/)).toBeTruthy();
    });

    it('SÁBADO: lo del lunes, con los bajo calorías ya marcados como empacados', async () => {
        abrir('sabado');
        expect(await screen.findByText(/Hoja del SÁBADO:/, {}, { timeout: 8000 })).toBeTruthy();

        const panel = screen.getByText('Del lunes, empacados el viernes').closest('div');
        const bajo = within(panel).getByText('Luis Lunes Bajo').closest('label').querySelector('input');
        const ind = within(panel).getByText('Lorena Lunes Individual').closest('label').querySelector('input');
        expect(bajo.checked).toBe(true);
        expect(ind.checked).toBe(false);

        // El del sábado no está en la lista del lunes
        expect(within(panel).queryByText('Sara Sábado')).toBeNull();
        expect(screen.getByText(/Todavía no se anotó lo que sobró/)).toBeTruthy();
        expect(screen.queryByText('Familias ya cocinadas')).toBeNull();
    });
});

const filaDe = (nombre) => [...document.querySelectorAll('tr')]
    .find(tr => new RegExp(nombre, 'i').test(tr.textContent || ''));
const numerosDe = (tr) => tr ? [...tr.querySelectorAll('input')].map(i => i.value).filter(Boolean) : null;

const CICLO = `${SAB}_${LUN}`;
const cantidadDe = async (nombre) => {
    await screen.findByText(/Hoja del/, {}, { timeout: 8000 });
    const tr = filaDe(nombre);
    return tr ? Number(numerosDe(tr)[0]) : null;
};

describe('las cantidades de cocina de cada día (pantalla real)', () => {
    it('SÁBADO: lo del lunes completo si nadie anotó sobrantes', async () => {
        abrir('sabado');
        expect(await cantidadDe('Lomo encebollado')).toBe(500);
    });

    it('SÁBADO: descuenta lo que Gina dijo que sobró', async () => {
        guardado[`bikitchen.textoDeSobrantes::${CICLO}`] = 'Lomo encebollado 200 g';
        abrir('sabado');
        expect(await cantidadDe('Lomo encebollado')).toBe(300);
    });

    /** El doble descuento: lo cocinado el jueves ya está en las bolsas o en el sobrante. */
    it('SÁBADO: NO vuelve a restar lo cocinado el jueves', async () => {
        tandasGuardadas = [{ clave: CICLO, dia: 'jueves', pedidos: [], cocinado: { 'lomo encebollado 500g|g': 400 }, enviada: '2026-09-18T02:00:00Z' }];
        abrir('sabado');
        // Se deja llegar a las tandas: si se restaran, el numero bajaria DESPUES.
        await screen.findByText(/Hoja del SÁBADO:/, {}, { timeout: 8000 });
        await new Promise(r => setTimeout(r, 1000));
        expect(await cantidadDe('Lomo encebollado')).toBe(500);
    }, 15000);

    it('SÁBADO: nada del sábado en la cocina', async () => {
        abrir('sabado');
        await screen.findByText(/Hoja del SÁBADO:/, {}, { timeout: 8000 });
        expect(filaDe('Tilapia empanizada')).toBeUndefined();
    });

    it('VIERNES: la individual del lunes no se adelanta', async () => {
        abrir('viernes');
        await screen.findByText(/Hoja del VIERNES:/, {}, { timeout: 8000 });
        expect(filaDe('Lomo encebollado')).toBeUndefined();
        expect(filaDe('Tilapia empanizada')).toBeTruthy();
    });

    it('VIERNES: descuenta lo cocinado el jueves', async () => {
        tandasGuardadas = [{ clave: CICLO, dia: 'jueves', pedidos: [], cocinado: { 'tilapia empanizada 250g|g': 200 }, enviada: '2026-09-18T02:00:00Z' }];
        abrir('viernes');
        const sinDescuento = 500;   // 2 x 250 g, individual: sin merma
        // Las tandas llegan despues del primer dibujo: se espera el numero.
        await waitFor(async () => expect(await cantidadDe('Tilapia empanizada')).toBe(sinDescuento - 200), { timeout: 8000 });
    }, 15000);
});
