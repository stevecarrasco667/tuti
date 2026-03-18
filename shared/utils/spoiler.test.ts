import { describe, it, expect } from 'vitest';
import { isSpoiler } from '../utils/spoiler';

describe('isSpoiler — Escudo Anti-Spoiler', () => {

    // ── CASOS EXACTOS ─────────────────────────────────────────────────────────
    it('detecta coincidencia exacta', () => {
        expect(isSpoiler('perro', 'perro')).toBe(true);
    });

    it('es insensible a mayúsculas', () => {
        expect(isSpoiler('PERRO', 'perro')).toBe(true);
        expect(isSpoiler('Perro Grande', 'perro')).toBe(true);
    });

    it('ignora tildes y diacríticos', () => {
        expect(isSpoiler('pèrrö', 'perro')).toBe(true);
        expect(isSpoiler('Gáto', 'gato')).toBe(true);
    });

    // ── STEMMING: DIMINUTIVOS Y PLURALES (nuevo requerimiento P12) ────────────
    it('bloquea diminutivos (perrito cuando secreto es perro)', () => {
        expect(isSpoiler('perrito', 'perro')).toBe(true);
    });

    it('bloquea diminutivo con tilde (gatito cuando secreto es gato)', () => {
        expect(isSpoiler('gatito', 'gato')).toBe(true);
    });

    it('bloquea plural (perros cuando secreto es perro)', () => {
        expect(isSpoiler('perros', 'perro')).toBe(true);
    });

    it('bloquea plural femenino (manzanas cuando secreto es manzana)', () => {
        expect(isSpoiler('manzanas', 'manzana')).toBe(true);
    });

    // ── EVASIÓN POR ESPACIADO ─────────────────────────────────────────────────
    it('detecta evasión por espaciado (p e r r o)', () => {
        expect(isSpoiler('p e r r o', 'perro')).toBe(true);
    });

    it('detecta evasión por guiones (p-e-r-r-o)', () => {
        expect(isSpoiler('p-e-r-r-o', 'perro')).toBe(true);
    });

    // ── TOKENS EN FRASES ─────────────────────────────────────────────────────
    it('detecta el secreto como token en una frase', () => {
        expect(isSpoiler('es un perro rabioso', 'perro')).toBe(true);
    });

    it('detecta categoría multi-token (Roca → token en frase)', () => {
        expect(isSpoiler('la categoría es Roca', 'Roca')).toBe(true);
    });

    it('bloquea token exacto de multi-palabra (Boca Juniors → Boca)', () => {
        expect(isSpoiler('Boca Juniors', 'Boca')).toBe(true);
    });

    // ── SIN FALSOS POSITIVOS ──────────────────────────────────────────────────
    it('NO bloquea subcadena interna diferente (desembocadura cuando secreto es boca)', () => {
        expect(isSpoiler('desembocadura', 'boca')).toBe(false);
    });

    it('NO bloquea subcadena larga (perrería cuando secreto es perro)', () => {
        expect(isSpoiler('perrería', 'perro')).toBe(false);
    });

    it('NO bloquea cuando el secreto es muy corto (≤2 chars)', () => {
        expect(isSpoiler('la', 'la')).toBe(false);
    });

    it('retorna false para input vacío', () => {
        expect(isSpoiler('', 'perro')).toBe(false);
    });

    it('retorna false para secreto vacío', () => {
        expect(isSpoiler('perro', '')).toBe(false);
    });

});
