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

    // ── REGRESIÓN: palabras que terminan en vocal distinta de la raíz ────────
    it('[REGR] bloquea "cine" exacto cuando el secreto es "cine"', () => {
        expect(isSpoiler('cine', 'cine')).toBe(true);
    });

    it('[REGR] bloquea "cin" (raíz stem) cuando el secreto es "cine"', () => {
        expect(isSpoiler('cin', 'cine')).toBe(true);
    });

    it('[REGR] bloquea "ingeniero" exacto cuando el secreto es "ingeniero"', () => {
        expect(isSpoiler('ingeniero', 'ingeniero')).toBe(true);
    });

    it('[REGR] bloquea "ingenier" (raíz stem) cuando el secreto es "ingeniero"', () => {
        expect(isSpoiler('ingenier', 'ingeniero')).toBe(true);
    });

    it('[REGR] NO bloquea palabra inocente cuando el secreto es "cine"', () => {
        expect(isSpoiler('medicina', 'cine')).toBe(false);
    });

    // ── FIX #2: Guardia de raíz corta ────────────────────────────────────────
    it('[Fix#2] NO genera falso positivo con token corto ("ONU" → stem "on" < 3 chars)', () => {
        // "ONU" after stem becomes "on"; root.length < 3 → skipped, no blocking
        expect(isSpoiler('están en contacto', 'ONU')).toBe(false);
    });

    // ── FIX #6: Tokens numéricos ─────────────────────────────────────────────
    it('[Fix#6] bloquea número de 2 dígitos significativo (secreto "Apollo 13" → bloquea "13")', () => {
        expect(isSpoiler('recuerdo el 13', 'Apollo 13')).toBe(true);
    });

    it('[Fix#6] bloquea el nombre del secreto de dos palabras completamente (Apollo 13)', () => {
        expect(isSpoiler('apollo', 'Apollo 13')).toBe(true);
    });

    // ── Nombre propio compuesto ───────────────────────────────────────────────
    it('bloquea primer token de nombre propio compuesto ("Cristiano" en "Cristiano Ronaldo")', () => {
        expect(isSpoiler('es cristiano', 'Cristiano Ronaldo')).toBe(true);
    });

    it('bloquea segundo token de nombre propio compuesto ("Ronaldo" en "Cristiano Ronaldo")', () => {
        expect(isSpoiler('ronaldo mete', 'Cristiano Ronaldo')).toBe(true);
    });

    it('bloquea nombre compuesto completo ("Cristiano Ronaldo")', () => {
        expect(isSpoiler('cristiano ronaldo', 'Cristiano Ronaldo')).toBe(true);
    });

    // ── FIX #7: \W{0,2} no rompe detección de evasión básica ────────────────
    it('[Fix#7] detecta evasión por espaciado simple con \\W{0,2}', () => {
        expect(isSpoiler('p e r r o', 'perro')).toBe(true);
    });

    it('[Fix#7] detecta evasión por guiones con \\W{0,2}', () => {
        expect(isSpoiler('p-e-r-r-o', 'perro')).toBe(true);
    });

});
