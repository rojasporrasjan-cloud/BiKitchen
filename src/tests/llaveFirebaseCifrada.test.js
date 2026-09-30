// @vitest-environment node
/* global Buffer */
import { describe, it, expect, vi } from 'vitest';
import { randomBytes, createCipheriv } from 'node:crypto';

/**
 * La llave de Firebase va cifrada en el código (AES-256-GCM) y se abre con
 * FIREBASE_LLAVE_CLAVE, que vive solo en Netlify. Con otra clave no abre.
 * Esta prueba usa una llave inventada, nunca la de verdad.
 */

vi.mock('firebase-admin/app', () => ({ initializeApp: () => ({}), getApps: () => [], getApp: () => ({}), cert: () => ({}) }));
const { abrirLlave } = await import('../utils/firebaseAdminApp.js');

const cifrar = (texto, clave) => {
    const iv = randomBytes(12);
    const c = createCipheriv('aes-256-gcm', clave, iv);
    const datos = Buffer.concat([c.update(texto, 'utf8'), c.final()]);
    return Buffer.concat([iv, c.getAuthTag(), datos]).toString('base64');
};

describe('la llave cifrada de Firebase', () => {
    const LLAVE = '-----BEGIN PRIVATE KEY-----\nllave-de-prueba\n-----END PRIVATE KEY-----\n';
    const clave = randomBytes(32);

    it('con la clave correcta vuelve la llave exacta, con sus saltos de línea', () => {
        expect(abrirLlave(cifrar(LLAVE, clave), clave.toString('base64'))).toBe(LLAVE);
    });

    it('con otra clave no abre', () => {
        expect(() => abrirLlave(cifrar(LLAVE, clave), randomBytes(32).toString('base64'))).toThrow();
    });

    it('la clave de Netlify es corta: entra en el tope de 4 KB', () => {
        expect(clave.toString('base64').length).toBe(44);
    });
});
