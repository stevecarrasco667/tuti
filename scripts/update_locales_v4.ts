import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const LOCALES_DIR = path.join(__dirname, 'src', 'locales');

// Estructura nueva a fusionar (Fase 4)
const phase4Updates = {
    tutorial: {
        classicTitle: "TUTI CLÁSICO",
        impostorTitle: "MODO IMPOSTOR",
        title: "Tutorial",
        back: "< Atrás",
        ready: "¡Listo!",
        next: "Siguiente >",
        classicSteps: [
            "Se elige una letra al azar. Deberás escribir una palabra que empiece con esa letra para cada categoría.",
            "El primero en completar su lista toca 'Tuti' y el contador baja a 10 segundos para el resto.",
            "¡Votación! El grupo decide si las respuestas raras o cuestionables de los demás son válidas."
        ],
        impostorSteps: [
            "Todos reciben la misma categoría secreta para escribir algo relacionado... menos el Impostor.",
            "Si eres Impostor: Lee o observa lo que escriben los demás y disimula. Si eres Tripulante: Escribe una pista sin dejarla tan fácil.",
            "Tribunal Final. Debaten y votan por quién creen que es el impostor. ¡Ojo con las mentiras!"
        ]
    },
    titles: {
        king: { name: "El Rey", desc: "Máxima puntuación de la partida." },
        loser: { name: "Última Salida", desc: "La puntuación más baja de la sala." },
        impostor: { name: "Impostor", desc: "El maestro del engaño." },
        detective: { name: "Detective", desc: "Acertó su voto al Impostor." },
        accomplice: { name: "Cómplice", desc: "Votó junto al impostor." },
        suspect: { name: "Sospechoso", desc: "Inocente pero acumuló votos." },
        poet: { name: "El Poeta", desc: "Respuestas más largas de la sala." },
        original: { name: "Único", desc: "Nadie duplicó sus respuestas." },
        fast: { name: "El Rápido", desc: "El primero en presionar Tuti." }
    },
    system: {
        roomExpired: "La sala anterior ha caducado. ¡Hemos preparado una nueva con los mismos ajustes para ti! 🎮",
        roomPurged: "Esta sala fue eliminada por inactividad prolongada.",
        connectionFailed: "No se pudo conectar a la sala. Verifica tu conexión a internet.",
        invalidCode: "Código de sala inválido",
        kicked: "Has sido expulsado de la sala por el anfitrión.",
        nowHost: "👑 ¡Ahora eres el Anfitrión!"
    },
    impostorReveal: {
        category: "Categoría",
        areImpostors: "Son los Impostores",
        areImpostor: "Eres el Impostor",
        areCrewmate: "Eres un Tripulante",
        missionSurvive: "Tu misión es sobrevivir y engañar.",
        missionFind: "Encuentra al mentiroso.",
        bluff: "No conoces la palabra. ¡Blufea!",
        allies: "Aliados: {count}",
        secretWordIs: "La palabra secreta es:"
    },
    impostorLastWish: {
        whatWasSecret: "¿Cuál era la PALABRA SECRETA?",
        oneChance: "Tienes una oportunidad. Si fallas, pierdes.",
        stealVictory: "Si acierta, robará la victoria."
    }
};

const EN_OVERRIDES = {
    tutorial: {
        classicTitle: "CLASSIC TUTI",
        impostorTitle: "IMPOSTOR MODE",
        title: "Tutorial",
        back: "< Back",
        ready: "Ready!",
        next: "Next >",
        classicSteps: [
            "A random letter is chosen. Write a word starting with that letter for each category.",
            "The first to finish taps 'Tuti' and the countdown drops to 10 seconds.",
            "Voting! The group decides if questionable answers are valid."
        ],
        impostorSteps: [
            "Everyone gets a secret category to write about... except the Impostor.",
            "If Impostor: Read others and bluff. If Crewmate: Give a clue but not too obvious.",
            "Final Tribunal. Debate and vote for the impostor. Watch out for lies!"
        ]
    },
    titles: {
        king: { name: "The King", desc: "Highest score in the match." },
        loser: { name: "Last Place", desc: "Lowest score in the room." },
        impostor: { name: "Impostor", desc: "Master of deception." },
        detective: { name: "Detective", desc: "Successfully voted out the Impostor." },
        accomplice: { name: "Accomplice", desc: "Voted alongside the Impostor." },
        suspect: { name: "Suspect", desc: "Innocent but got votes." },
        poet: { name: "The Poet", desc: "Longest answers in the room." },
        original: { name: "Unique", desc: "No duplicated answers." },
        fast: { name: "The Flash", desc: "First to tap Tuti." }
    },
    system: {
        roomExpired: "The previous room expired. We prepared a new one with the same settings for you! 🎮",
        roomPurged: "This room was removed due to prolonged inactivity.",
        connectionFailed: "Failed to connect. Check your internet connection.",
        invalidCode: "Invalid room code",
        kicked: "You have been kicked by the host.",
        nowHost: "👑 You are now the Host!"
    },
    impostorReveal: {
        category: "Category",
        areImpostors: "You are Impostors",
        areImpostor: "You are the Impostor",
        areCrewmate: "You are a Crewmate",
        missionSurvive: "Your mission is to survive and deceive.",
        missionFind: "Find the liar.",
        bluff: "You don't know the word. Bluff!",
        allies: "Allies: {count}",
        secretWordIs: "The secret word is:"
    },
    impostorLastWish: {
        whatWasSecret: "What was the SECRET WORD?",
        oneChance: "You have one chance. Fail, and you lose.",
        stealVictory: "If correct, you steal the victory."
    }
};

const PT_OVERRIDES = {
    tutorial: {
        classicTitle: "TUTI CLÁSSICO",
        impostorTitle: "MODO IMPOSTOR",
        title: "Tutorial",
        back: "< Voltar",
        ready: "Pronto!",
        next: "Próximo >",
        classicSteps: [
            "Uma letra é escolhida. Escreva uma palavra que comece com ela para cada categoria.",
            "O primeiro a terminar clica em 'Tuti' e o tempo cai para 10 segundos.",
            "Votação! O grupo decide se respostas duvidosas são válidas."
        ],
        impostorSteps: [
            "Todos recebem uma categoria secreta para escrever... menos o Impostor.",
            "Se Impostor: Leia os outros e disfarce. Se Tripulante: Dê uma pista não tão óbvia.",
            "Tribunal Final. Debatam e votem no impostor. Cuidado com as mentiras!"
        ]
    },
    titles: {
        king: { name: "O Rei", desc: "Maior pontuação da partida." },
        loser: { name: "Último Lugar", desc: "Menor pontuação da sala." },
        impostor: { name: "Impostor", desc: "Mestre do engano." },
        detective: { name: "Detetive", desc: "Acertou o voto no Impostor." },
        accomplice: { name: "Cúmplice", desc: "Votou junto com o Impostor." },
        suspect: { name: "Suspeito", desc: "Inocente mas levou votos." },
        poet: { name: "O Poeta", desc: "Respostas mais longas." },
        original: { name: "Único", desc: "Sem respostas repetidas." },
        fast: { name: "O Rápido", desc: "Primeiro a clicar no Tuti." }
    },
    system: {
        roomExpired: "A sala expirou. Criamos uma nova com as mesmas configurações para você! 🎮",
        roomPurged: "Esta sala foi removida por inatividade.",
        connectionFailed: "Falha na conexão. Verifique sua internet.",
        invalidCode: "Código de sala inválido",
        kicked: "Você foi expulso pelo anfitrião.",
        nowHost: "👑 Agora você é o Anfitrião!"
    },
    impostorReveal: {
        category: "Categoria",
        areImpostors: "Vocês são Impostores",
        areImpostor: "Você é o Impostor",
        areCrewmate: "Você é um Tripulante",
        missionSurvive: "Sua missão é sobreviver e enganar.",
        missionFind: "Encontre o mentiroso.",
        bluff: "Você não sabe a palavra. Disfarce!",
        allies: "Aliados: {count}",
        secretWordIs: "A palavra secreta é:"
    },
    impostorLastWish: {
        whatWasSecret: "Qual era a PALAVRA SECRETA?",
        oneChance: "Você tem uma chance. Se errar, perde.",
        stealVictory: "Se acertar, rouba a vitória."
    }
};

function isObject(item: any): boolean {
    return item && typeof item === 'object' && !Array.isArray(item);
}

function mergeDeep(target: any, source: any) {
    if (isObject(target) && isObject(source)) {
        for (const key in source) {
            if (isObject(source[key])) {
                if (!target[key]) Object.assign(target, { [key]: {} });
                mergeDeep(target[key], source[key]);
            } else {
                Object.assign(target, { [key]: source[key] });
            }
        }
    }
    return target;
}

const langs = [
    { code: 'es', override: phase4Updates },
    { code: 'en', override: EN_OVERRIDES },
    { code: 'pt', override: PT_OVERRIDES }
];

for (const lang of langs) {
    const filePath = path.join(LOCALES_DIR, `${lang.code}.json`);
    let fileData = {};
    if (fs.existsSync(filePath)) {
        fileData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    }
    mergeDeep(fileData, lang.override);
    
    // In case `system` node existed in Phase 3, it merges the new keys inside.
    fs.writeFileSync(filePath, JSON.stringify(fileData, null, 4));
    console.log(`[Phase4] Updated ${lang.code}.json`);
}
