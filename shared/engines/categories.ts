// =============================================
// MASTER CATEGORIES — Shared Data (UI + Engine)
// =============================================

export interface CategoryItem {
    id: string;
    name: string;
    tags: string[];
}

export const MASTER_CATEGORIES: CategoryItem[] = [
    // CLASICOS
    { id: '1', name: 'Nombre', tags: ['CLASICO', 'FACIL'] },
    { id: '2', name: 'Apellido', tags: ['CLASICO'] },
    { id: '3', name: 'País', tags: ['CLASICO', 'GEO'] },
    { id: '4', name: 'Ciudad', tags: ['CLASICO', 'GEO'] },
    { id: '5', name: 'Animal', tags: ['CLASICO', 'NATURALEZA'] },
    { id: '6', name: 'Color', tags: ['CLASICO', 'FACIL'] },
    { id: '7', name: 'Fruta/Verdura', tags: ['CLASICO', 'NATURALEZA'] },
    { id: '8', name: 'Cosa', tags: ['CLASICO', 'FACIL'] },
    { id: '9', name: 'Profesión', tags: ['CLASICO', 'SOCIEDAD'] },

    // ENTERTAINMENT
    { id: '10', name: 'Película', tags: ['CINE', 'FUN'] },
    { id: '11', name: 'Serie de TV', tags: ['CINE', 'FUN'] },
    { id: '12', name: 'Actor/Actriz', tags: ['CINE', 'FAMOSO'] },
    { id: '13', name: 'Villano', tags: ['CINE', 'FUN'] },
    { id: '14', name: 'Superhéroe', tags: ['CINE', 'FUN'] },
    { id: '15', name: 'Personaje Ficticio', tags: ['CINE', 'FUN'] },
    { id: '16', name: 'Videojuego', tags: ['GAMING', 'FUN'] },
    { id: '17', name: 'Youtuber/Streamer', tags: ['INTERNET', 'MODERNO'] },

    // MUSIC
    { id: '20', name: 'Canción', tags: ['MUSICA', 'ARTE'] },
    { id: '21', name: 'Cantante/Banda', tags: ['MUSICA', 'FAMOSO'] },
    { id: '22', name: 'Instrumento Musical', tags: ['MUSICA', 'OBJETO'] },
    { id: '23', name: 'Título de Canción de Reggaeton', tags: ['MUSICA', 'FUN', 'HARD'] },

    // BRANDS & TECH
    { id: '30', name: 'Marca', tags: ['MARCAS', 'CONSUMO'] },
    { id: '31', name: 'Marca de Auto', tags: ['MARCAS', 'VEHICULO'] },
    { id: '32', name: 'Marca de Ropa', tags: ['MARCAS', 'MODA'] },
    { id: '33', name: 'Marca de Tecnología', tags: ['MARCAS', 'TECH'] },
    { id: '34', name: 'App Móvil', tags: ['TECH', 'MODERNO'] },
    { id: '35', name: 'Sitio Web', tags: ['TECH', 'INTERNET'] },

    // FOOD
    { id: '40', name: 'Comida', tags: ['COMIDA', 'FACIL'] },
    { id: '41', name: 'Ingrediente de Cocina', tags: ['COMIDA', 'HOGAR'] },
    { id: '42', name: 'Postre', tags: ['COMIDA', 'DULCE'] },
    { id: '43', name: 'Bebida', tags: ['COMIDA', 'FACIL'] },

    // SPORTS
    { id: '50', name: 'Deporte', tags: ['DEPORTE', 'ACTIVIDAD'] },
    { id: '51', name: 'Atleta/Deportista', tags: ['DEPORTE', 'FAMOSO'] },
    { id: '52', name: 'Equipo Deportivo', tags: ['DEPORTE', 'GRUPO'] },

    // RANDOM & FUN
    { id: '60', name: 'Excusa para llegar tarde', tags: ['FUN', 'CREATIVO'] },
    { id: '61', name: 'Motivo de ruptura', tags: ['FUN', 'SOCIAL'] },
    { id: '62', name: 'Lo primero que harías si ganas la lotería', tags: ['FUN', 'CREATIVO'] },
    { id: '63', name: 'Nombre de banda de rock', tags: ['FUN', 'MUSICA'] },
    { id: '64', name: 'Insulto (suave)', tags: ['FUN', 'SOCIAL'] },
    { id: '65', name: 'Palabra que rime con "Amor"', tags: ['LENGUAJE', 'FACIL'] },
    { id: '66', name: 'Objeto en esta habitación', tags: ['ENTORNO', 'OBSERVACION'] },
    { id: '67', name: 'Regalo terrible', tags: ['FUN', 'SOCIAL'] },
];
