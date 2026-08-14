/**
 * Test: Hoja de Empaque — Zona, Nombre, Especificaciones con packs cruzados
 * 
 * Verifica que la cadena de datos desde Firebase hasta la hoja de empaque
 * siempre propaga: zona_envio, nombre del cliente, y la referencia a otros
 * packs que el mismo cliente haya comprado.
 */
import { describe, it, expect } from 'vitest';
import { mapPedidosFromLegacy, buildPackagingSheetData } from '../utils/logisticsUtils.js';

// ---------- helpers ----------
const fakePedido = (overrides = {}) => ({
  id: 'test-001',
  cliente: 'Alejandro Rojas',
  telefono: '88887777',
  direccion: 'Casa #5',
  zona_envio: 'Heredia',
  tipoMenu: 'Pack Full',
  plan: 'Pack Full',
  cantidadMenus: 1,
  fecha_entrega: '2026-08-18',
  observaciones: '',
  incluyeDesayuno: false,
  status: 'confirmado',
  items: [
    { nombre: 'Pollo al pesto', cantidad: 1, proteina: 'Pollo al pesto', proteinaGramos: '150g', ensalada: 'Crema de vegetales', ensaladaCantidad: '1 taza', carbo: 'Pasta al pesto', carboCantidad: '0.5 taza' },
  ],
  ...overrides,
});

// ---------- tests ----------
describe('Hoja de Empaque — propagación de zona_envio', () => {

  it('mapPedidosFromLegacy conserva zona_envio del pedido original', () => {
    const raw = [fakePedido({ zona_envio: 'Belén' })];
    const mapped = mapPedidosFromLegacy(raw);
    expect(mapped[0].zona_envio).toBe('Belén');
  });

  it('mapPedidosFromLegacy lee zona_de_envio como fallback', () => {
    const raw = [fakePedido({ zona_envio: undefined, zona_de_envio: 'Escazú' })];
    const mapped = mapPedidosFromLegacy(raw);
    expect(mapped[0].zona_envio).toBe('Escazú');
  });

  it('mapPedidosFromLegacy lee campo zona como último fallback', () => {
    const raw = [fakePedido({ zona_envio: undefined, zona_de_envio: undefined, zona: 'Moravia' })];
    const mapped = mapPedidosFromLegacy(raw);
    expect(mapped[0].zona_envio).toBe('Moravia');
  });

  it('buildPackagingSheetData propaga zona_envio al objeto de cliente', () => {
    const raw = [fakePedido({ zona_envio: 'Curridabat' })];
    const mapped = mapPedidosFromLegacy(raw);
    const packaging = buildPackagingSheetData(mapped, {}, null);
    
    expect(packaging.clientes).toHaveLength(1);
    expect(packaging.clientes[0].zona_envio).toBe('Curridabat');
    expect(packaging.clientes[0].cliente).toBe('Alejandro Rojas');
  });

  it('zona_envio vacía no rompe nada (devuelve string vacío)', () => {
    const raw = [fakePedido({ zona_envio: undefined, zona_de_envio: undefined, zona: undefined })];
    const mapped = mapPedidosFromLegacy(raw);
    const packaging = buildPackagingSheetData(mapped, {}, null);
    
    expect(packaging.clientes[0].zona_envio).toBe('');
  });
});

describe('Hoja de Empaque — cliente con múltiples packs', () => {

  it('cliente con 2 packs distintos aparece en ambos grupos', () => {
    const pedidos = [
      fakePedido({ 
        id: 'p1', cliente: 'Gybran Jimenez', zona_envio: 'San José',
        plan: 'Pack Full', tipoMenu: 'Pack Full'
      }),
      fakePedido({ 
        id: 'p2', cliente: 'Gybran Jimenez', zona_envio: 'San José',
        plan: 'Pack de Desayunos', tipoMenu: 'Pack de Desayunos'
      }),
    ];

    const mapped = mapPedidosFromLegacy(pedidos);
    const packaging = buildPackagingSheetData(mapped, {}, null);

    const gybranEntries = packaging.clientes.filter(c => c.cliente === 'Gybran Jimenez');
    expect(gybranEntries).toHaveLength(2);
    
    const plans = gybranEntries.map(c => c.plan);
    expect(plans).toContain('Pack Full');
    expect(plans).toContain('Pack de Desayunos');
    
    // Ambos deben tener zona
    gybranEntries.forEach(c => {
      expect(c.zona_envio).toBe('San José');
    });
  });

  it('incluyeDesayuno se propaga correctamente', () => {
    const pedidos = [
      fakePedido({ incluyeDesayuno: true, zona_envio: 'Heredia' }),
    ];
    const mapped = mapPedidosFromLegacy(pedidos);
    const packaging = buildPackagingSheetData(mapped, {}, null);
    
    expect(packaging.clientes[0].incluyeDesayuno).toBe(true);
    expect(packaging.desayunos).toHaveLength(1);
    expect(packaging.desayunos[0].cliente).toBe('Alejandro Rojas');
  });
});

describe('Hoja de Empaque — observaciones y plan se mantienen', () => {
  
  it('observaciones del pedido llegan al objeto de packaging', () => {
    const pedidos = [
      fakePedido({ observaciones: 'Pack vegetariano quincenal. Gracias.' }),
    ];
    const mapped = mapPedidosFromLegacy(pedidos);
    const packaging = buildPackagingSheetData(mapped, {}, null);
    
    expect(packaging.clientes[0].observaciones).toBe('Pack vegetariano quincenal. Gracias.');
  });

  it('plan comercial se conserva', () => {
    const pedidos = [
      fakePedido({ plan: 'PACK BAJO EN CALORIAS PROMOCION ALMUERZO Y CENA CON REGALIA DE DESAYUNOS' }),
    ];
    const mapped = mapPedidosFromLegacy(pedidos);
    const packaging = buildPackagingSheetData(mapped, {}, null);
    
    expect(packaging.clientes[0].plan).toBe('PACK BAJO EN CALORIAS PROMOCION ALMUERZO Y CENA CON REGALIA DE DESAYUNOS');
  });
});
