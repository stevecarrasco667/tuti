import fs from 'fs';
import path from 'path';

const LOCALES_DIR = path.join(process.cwd(), 'src', 'locales');

const extraKeys = {
    es: {
        app: {
            reconnecting: 'Reconectando al servidor...',
            connecting: 'Conectando a la sala',
            preparingGame: 'Preparando partida...',
            muteSound: 'Silenciar Sonido',
            unmuteSound: 'Activar Sonido'
        },
        system: {
            kicked: 'Has sido expulsado de la sala por el anfitrión.',
            nowHost: '👑 ¡Ahora eres el Anfitrión!',
            invalidCode: 'Código de sala inválido'
        },
        home: {
            available: 'Disponible'
        },
        impostorLastWish: {
            title: 'Último Deseo',
            theImpostor: 'El Impostor',
            wasCaught: 'ha sido atrapado',
            whatWasSecret: '¿Cuál era la',
            secretWord: 'PALABRA SECRETA',
            oneChance: 'Tienes una oportunidad. Si fallas, pierdes.',
            inputPlaceholder: 'Escribe la palabra...',
            waiting: '⏳ Esperando...',
            guess: '🎯 Adivinar',
            guessing: 'El impostor intenta adivinar la palabra...',
            stealVictory: 'Si acierta, robará la victoria.',
            liveTransmission: 'Transmisión en tiempo real'
        }
    },
    en: {
        app: {
            reconnecting: 'Reconnecting to server...',
            connecting: 'Connecting to room',
            preparingGame: 'Preparing match...',
            muteSound: 'Mute Sound',
            unmuteSound: 'Unmute Sound'
        },
        system: {
            kicked: 'You have been kicked by the host.',
            nowHost: '👑 You are now the Host!',
            invalidCode: 'Invalid room code'
        },
        home: {
            available: 'Available'
        },
        impostorLastWish: {
            title: 'Last Wish',
            theImpostor: 'The Impostor',
            wasCaught: 'has been caught',
            whatWasSecret: 'What was the',
            secretWord: 'SECRET WORD',
            oneChance: 'One chance. Fail and you lose.',
            inputPlaceholder: 'Type the word...',
            waiting: '⏳ Waiting...',
            guess: '🎯 Guess',
            guessing: 'The impostor is guessing the word...',
            stealVictory: 'If correct, they steal the victory.',
            liveTransmission: 'Live transmission'
        }
    },
    pt: {
        app: {
            reconnecting: 'Reconectando ao servidor...',
            connecting: 'Conectando à sala',
            preparingGame: 'Preparando partida...',
            muteSound: 'Silenciar',
            unmuteSound: 'Ativar Som'
        },
        system: {
            kicked: 'Você foi expulso pelo anfitrião.',
            nowHost: '👑 Agora você é o Anfitrião!',
            invalidCode: 'Código de sala inválido'
        },
        home: {
            available: 'Disponível'
        },
        impostorLastWish: {
            title: 'Último Desejo',
            theImpostor: 'O Impostor',
            wasCaught: 'foi capturado',
            whatWasSecret: 'Qual era a',
            secretWord: 'PALAVRA SECRETA',
            oneChance: 'Uma chance. Erre e perde.',
            inputPlaceholder: 'Digite a palavra...',
            waiting: '⏳ Aguardando...',
            guess: '🎯 Adivinhar',
            guessing: 'O impostor está tentando adivinhar...',
            stealVictory: 'Se acertar, rouba a vitória.',
            liveTransmission: 'Transmissão em tempo real'
        }
    }
};

const mergeDeep = (target: any, source: any) => {
    for (const key in source) {
        if (source[key] instanceof Object && key in target) {
            Object.assign(source[key], mergeDeep(target[key], source[key]));
        }
    }
    Object.assign(target || {}, source);
    return target;
};

for (const [lang, keys] of Object.entries(extraKeys)) {
    const f = path.join(LOCALES_DIR, `${lang}.json`);
    if (fs.existsSync(f)) {
        const data = JSON.parse(fs.readFileSync(f, 'utf-8'));
        const updated = mergeDeep(data, keys);
        fs.writeFileSync(f, JSON.stringify(updated, null, 4));
        console.log(`Updated ${lang}.json`);
    }
}
