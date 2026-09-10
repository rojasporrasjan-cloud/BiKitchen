import { describe, it, expect } from 'vitest';
import {
    ETIQUETAS_POR_ROLLO, tamanoValido, cortarPorRollo, planDeRollos, proximoRollo
} from '../utils/labels/rollosDeEtiquetas';
import { contarPorGrupo, anotarImpresas, gruposQueFaltan, leerImpresas } from '../services/printing/etiquetasImpresas';

/**
 * Sacar las etiquetas de rollo en rollo, sin perder la cuenta.
 *
 * El rollo trae ~220 y se acaba sin avisar. Lo que importa es que al volver, el
 * sistema sepa exactamente cuales ya salieron para seguir con las que faltan.
 */
const tira = (n, groupId = 'g1') =>
    Array.from({ length: n }, (_, i) => ({ groupId, i }));

describe('rollos de 220', () => {
    it('parte la tira en rollos del tamano del papel', () => {
        const rollos = cortarPorRollo(tira(500), 220);
        expect(rollos.map(r => r.length)).toEqual([220, 220, 60]);
    });

    it('una tira que cabe en un rollo no se parte', () => {
        expect(cortarPorRollo(tira(138), 220).map(r => r.length)).toEqual([138]);
    });

    it('el plan se puede leer antes de mandar nada', () => {
        const plan = planDeRollos(640, 220);
        expect(plan.rollos).toBe(3);
        expect(plan.cortes).toEqual([220, 220, 200]);
        expect(plan.ultimoParcial).toBe(true);
    });

    it('cuando calza exacto no marca un rollo parcial', () => {
        const plan = planDeRollos(440, 220);
        expect(plan.cortes).toEqual([220, 220]);
        expect(plan.ultimoParcial).toBe(false);
    });

    it('sin etiquetas no hay rollos', () => {
        expect(planDeRollos(0, 220).rollos).toBe(0);
        expect(cortarPorRollo([], 220)).toEqual([]);
    });

    it('un tamano invalido cae en el de siempre', () => {
        expect(tamanoValido('')).toBe(ETIQUETAS_POR_ROLLO);
        expect(tamanoValido(0)).toBe(ETIQUETAS_POR_ROLLO);
        expect(tamanoValido(-5)).toBe(ETIQUETAS_POR_ROLLO);
        expect(tamanoValido('200')).toBe(200);
    });

    it('el proximo rollo son las primeras que faltan', () => {
        expect(proximoRollo(tira(500), 220).length).toBe(220);
        expect(proximoRollo(tira(60), 220).length).toBe(60);
    });
});

describe('la cuenta sobrevive entre rollos', () => {
    it('despues de un rollo, lo que falta arranca donde quedo', () => {
        localStorage.clear();
        const fecha = '2026-09-12';
        const grupos = [{ id: 'g1', cantidad: 500 }];
        const todas = tira(500);

        // Primer rollo: salen 220
        const rollo1 = proximoRollo(todas, 220);
        anotarImpresas(fecha, contarPorGrupo(rollo1, rollo1.length));
        expect(gruposQueFaltan(grupos, leerImpresas(fecha))[0].cantidad).toBe(280);

        // Segundo rollo
        const rollo2 = proximoRollo(tira(280), 220);
        anotarImpresas(fecha, contarPorGrupo(rollo2, rollo2.length));
        expect(gruposQueFaltan(grupos, leerImpresas(fecha))[0].cantidad).toBe(60);

        // Tercero: se acaba
        const rollo3 = proximoRollo(tira(60), 220);
        anotarImpresas(fecha, contarPorGrupo(rollo3, rollo3.length));
        expect(gruposQueFaltan(grupos, leerImpresas(fecha))).toEqual([]);
    });

    it('si la impresora se traba a la mitad, solo cuenta lo que salio', () => {
        localStorage.clear();
        const fecha = '2026-09-12';
        const grupos = [{ id: 'g1', cantidad: 500 }];
        const rollo = proximoRollo(tira(500), 220);

        // Se mandaron 220 pero la cola confirmo 130
        anotarImpresas(fecha, contarPorGrupo(rollo, 130));
        expect(gruposQueFaltan(grupos, leerImpresas(fecha))[0].cantidad).toBe(370);
    });

    it('el rollo 2 NO puede salir del lote completo, o repite las mismas', () => {
        // Esta era la falla: la casilla "solo lo que falta" venia apagada, asi
        // que el lote seguia siendo el completo y "Solo este rollo" volvia a
        // mandar las MISMAS 220 del principio. Se imprimian dos veces las
        // primeras y al final faltaban las ultimas — y eso se descubre en la
        // mesa de empaque, cuando ya no hay etiqueta para el ultimo cliente.
        localStorage.clear();
        const fecha = '2026-09-12';
        const grupos = [{ id: 'g1', cantidad: 500 }];
        const todas = tira(500);

        const rollo1 = proximoRollo(todas, 220);
        anotarImpresas(fecha, contarPorGrupo(rollo1, rollo1.length));

        // MAL: seguir cortando del lote completo devuelve lo mismo otra vez
        const repetido = proximoRollo(todas, 220);
        expect(repetido.length).toBe(220);
        expect(contarPorGrupo(repetido, repetido.length)).toEqual({ g1: 220 });

        // BIEN: se corta de lo que FALTA, y quedan 280 por delante
        const faltan = gruposQueFaltan(grupos, leerImpresas(fecha));
        expect(faltan[0].cantidad).toBe(280);
        expect(faltan[0].yaImpresas).toBe(220);
    });

    it('los divisores gastan papel pero no cuentan como plato', () => {
        localStorage.clear();
        const conDivisor = [
            { divider: true },
            ...tira(3, 'g1'),
            { divider: true },
            ...tira(2, 'g2')
        ];
        // El corte cuenta PAPEL: los 6 primeros incluyen los dos divisores
        expect(cortarPorRollo(conDivisor, 6)[0].length).toBe(6);
        // La cuenta de lo hecho ignora los divisores
        expect(contarPorGrupo(conDivisor, conDivisor.length)).toEqual({ g1: 3, g2: 2 });
    });
});
