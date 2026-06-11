// =============================================
// MASTER CATEGORIES — Shared Data (UI + Engine)
// =============================================

export interface CategoryItem {
    id: string;
    name: string;
    tags: string[];
    /** Pack al que pertenece la categoría. undefined = Base (gratis). */
    packId?: 'pack_futbol' | 'pack_musica' | 'pack_fun' | 'pack_gamer' | 'pack_cine';
}

// ─────────────────────────────────────────────────────────────────────────────
// DISTRIBUCIÓN:
//   🆓 Base (18 cats) — sin packId
//   ⚽ pack_futbol  (3 cats) — ids: 50, 51, 52
//   🎵 pack_musica  (3 cats) — ids: 22, 23, 63
//   🎉 pack_fun     (5 cats) — ids: 60, 61, 62, 64, 65
//   🎮 pack_gamer   (5 cats) — ids: 16, 17, 33, 34, 35
//   🍿 pack_cine    (8 cats) — ids: 10, 11, 12, 13, 14, 15, 41, 42
// ─────────────────────────────────────────────────────────────────────────────

export const MASTER_CATEGORIES: CategoryItem[] = [
    // ── BASE (GRATIS) ─────────────────────────────────────────────────────────
    { id: '1',  name: 'Nombre',         tags: ['CLASICO', 'FACIL'] },
    { id: '2',  name: 'Apellido',       tags: ['CLASICO'] },
    { id: '3',  name: 'País',           tags: ['CLASICO', 'GEO'] },
    { id: '4',  name: 'Ciudad',         tags: ['CLASICO', 'GEO'] },
    { id: '5',  name: 'Animal',         tags: ['CLASICO', 'NATURALEZA'] },
    { id: '6',  name: 'Color',          tags: ['CLASICO', 'FACIL'] },
    { id: '7',  name: 'Fruta/Verdura',  tags: ['CLASICO', 'NATURALEZA'] },
    { id: '8',  name: 'Cosa',           tags: ['CLASICO', 'FACIL'] },
    { id: '9',  name: 'Profesión',      tags: ['CLASICO', 'SOCIEDAD'] },
    { id: '30', name: 'Marca',          tags: ['MARCAS', 'CONSUMO'] },
    { id: '31', name: 'Marca de Auto',  tags: ['MARCAS', 'VEHICULO'] },
    { id: '32', name: 'Marca de Ropa',  tags: ['MARCAS', 'MODA'] },
    { id: '40', name: 'Comida',         tags: ['COMIDA', 'FACIL'] },
    { id: '43', name: 'Bebida',         tags: ['COMIDA', 'FACIL'] },
    { id: '66', name: 'Objeto en esta habitación', tags: ['ENTORNO', 'OBSERVACION'] },
    { id: '67', name: 'Regalo terrible',           tags: ['FUN', 'SOCIAL'] },

    // ── PACK FÚTBOL ⚽ (150 🪙) ───────────────────────────────────────────────
    { id: '50', name: 'Deporte',            tags: ['DEPORTE', 'ACTIVIDAD'], packId: 'pack_futbol' },
    { id: '51', name: 'Atleta/Deportista',  tags: ['DEPORTE', 'FAMOSO'],   packId: 'pack_futbol' },
    { id: '52', name: 'Equipo Deportivo',   tags: ['DEPORTE', 'GRUPO'],    packId: 'pack_futbol' },

    // ── PACK MÚSICA 🎵 (150 🪙) ───────────────────────────────────────────────
    { id: '20', name: 'Canción',                         tags: ['MUSICA', 'ARTE'],        packId: 'pack_musica' },
    { id: '21', name: 'Cantante/Banda',                  tags: ['MUSICA', 'FAMOSO'],      packId: 'pack_musica' },
    { id: '22', name: 'Instrumento Musical',             tags: ['MUSICA', 'OBJETO'],      packId: 'pack_musica' },
    { id: '23', name: 'Título de Canción de Reggaeton',  tags: ['MUSICA', 'FUN', 'HARD'], packId: 'pack_musica' },
    { id: '63', name: 'Nombre de banda de rock',         tags: ['FUN', 'MUSICA'],         packId: 'pack_musica' },

    // ── PACK FUN 🎉 (150 🪙) ─────────────────────────────────────────────────
    { id: '60', name: 'Excusa para llegar tarde',                  tags: ['FUN', 'CREATIVO'], packId: 'pack_fun' },
    { id: '61', name: 'Motivo de ruptura',                         tags: ['FUN', 'SOCIAL'],   packId: 'pack_fun' },
    { id: '62', name: 'Lo primero que harías si ganas la lotería', tags: ['FUN', 'CREATIVO'], packId: 'pack_fun' },
    { id: '64', name: 'Insulto (suave)',                           tags: ['FUN', 'SOCIAL'],   packId: 'pack_fun' },
    { id: '65', name: 'Palabra que rime con "Amor"',               tags: ['LENGUAJE', 'FACIL'], packId: 'pack_fun' },

    // ── PACK GAMER 🎮 (250 🪙) ───────────────────────────────────────────────
    { id: '16', name: 'Videojuego',          tags: ['GAMING', 'FUN'],       packId: 'pack_gamer' },
    { id: '17', name: 'Youtuber/Streamer',   tags: ['INTERNET', 'MODERNO'], packId: 'pack_gamer' },
    { id: '33', name: 'Marca de Tecnología', tags: ['MARCAS', 'TECH'],      packId: 'pack_gamer' },
    { id: '34', name: 'App Móvil',           tags: ['TECH', 'MODERNO'],     packId: 'pack_gamer' },
    { id: '35', name: 'Sitio Web',           tags: ['TECH', 'INTERNET'],    packId: 'pack_gamer' },

    // ── PACK CINE/TV 🍿 (300 🪙) ─────────────────────────────────────────────
    { id: '10', name: 'Película',            tags: ['CINE', 'FUN'],    packId: 'pack_cine' },
    { id: '11', name: 'Serie de TV',         tags: ['CINE', 'FUN'],    packId: 'pack_cine' },
    { id: '12', name: 'Actor/Actriz',        tags: ['CINE', 'FAMOSO'], packId: 'pack_cine' },
    { id: '13', name: 'Villano',             tags: ['CINE', 'FUN'],    packId: 'pack_cine' },
    { id: '14', name: 'Superhéroe',          tags: ['CINE', 'FUN'],    packId: 'pack_cine' },
    { id: '15', name: 'Personaje Ficticio',  tags: ['CINE', 'FUN'],    packId: 'pack_cine' },
    { id: '41', name: 'Ingrediente de Cocina', tags: ['COMIDA', 'HOGAR'], packId: 'pack_cine' },
    { id: '42', name: 'Postre',              tags: ['COMIDA', 'DULCE'], packId: 'pack_cine' },
];
