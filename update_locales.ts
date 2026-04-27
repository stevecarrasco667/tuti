import * as fs from 'fs';

function updateLocale(file: string, lobbyTranslations: any, categoryTranslations: any, systemTranslations: any) {
    const raw = fs.readFileSync(file, 'utf-8');
    const data = JSON.parse(raw);
    
    // Merge lobby
    data.lobby = { ...data.lobby, ...lobbyTranslations };
    
    // Merge categories
    data.categories = { ...data.categories, ...categoryTranslations };
    
    // Merge system
    data.system = { ...data.system, ...systemTranslations };

    // Common
    data.common = { ...data.common, closeModal: lobbyTranslations.closeModal || "Close" };
    
    // Chat
    data.chat = { ...data.chat, spoilerBlocked: systemTranslations.spoilerBlocked || "[Blocked]" };

    fs.writeFileSync(file, JSON.stringify(data, null, 4));
}

// Data for ES
const esLobby = {
    settings: {
        title: "Ajustes de la Sala",
        readOnly: "Solo Lectura",
        language: "Idioma de la partida",
        classic: {
            randomCategories: "Categorías Aleatorias",
            randomCategoriesDesc: "Se elegirán al azar al iniciar",
            rounds: "Rondas",
            timeLimit: "Tiempo por ronda",
            sec: "seg",
            votingTime: "Tiempo de votación",
            mutators: "Mutadores",
            suicidalStop: "Basta Suicida",
            suicidalStopDesc: "Si dices basta, tú pierdes los puntos de las vacías",
            anonymousVoting: "Votación Anónima",
            anonymousVotingDesc: "Los votos no muestran quién los emitió"
        },
        impostor: {
            categories: "Categorías en Juego",
            categoriesDesc: "Se seleccionarán al azar de nuestro catálogo secreto",
            rounds: "Rondas de Juego",
            typingTime: "Tiempo de escritura",
            votingTime: "Tiempo de Tribunal"
        }
    },
    players: {
        spectator: "Espectador",
        invite: "Desafía a tus amigos:\nComparte el link para invitar",
        empty: "Vacío",
        maxPlayers: "JUGADORES"
    },
    header: {
        publicRoom: "Sala Pública",
        privateRoom: "Sala Privada",
        copy: "Copiado",
        invite: "Invitar"
    },
    categoriesSelector: {
        title: "Categorías",
        edit: "Editar +",
        randomSelection: "5 categorías aleatorias",
        randomSelectionDesc: "Personaliza con \"Editar\"",
        modalTitle: "Selección de Categorías",
        cancel: "Cancelar",
        save: "Guardar"
    },
    closeModal: "Cerrar modal"
};

const esCategories = JSON.parse(fs.readFileSync('categories_dump.json', 'utf-8'));

const esSystem = {
    roomDead: "👋 La sala ha sido cerrada. ¡Hasta la próxima!",
    spoilerBlocked: "[Mensaje bloqueado por seguridad 🛡️]"
};

// Data for EN
const enLobby = {
    settings: {
        title: "Room Settings",
        readOnly: "Read Only",
        language: "Game Language",
        classic: {
            randomCategories: "Random Categories",
            randomCategoriesDesc: "Picked randomly at start",
            rounds: "Rounds",
            timeLimit: "Round Time",
            sec: "sec",
            votingTime: "Voting Time",
            mutators: "Mutators",
            suicidalStop: "Suicidal Stop",
            suicidalStopDesc: "If you stop, you lose points for blanks",
            anonymousVoting: "Anonymous Voting",
            anonymousVotingDesc: "Votes won't show who cast them"
        },
        impostor: {
            categories: "Categories in Play",
            categoriesDesc: "Selected randomly from our secret catalog",
            rounds: "Game Rounds",
            typingTime: "Typing Time",
            votingTime: "Tribunal Time"
        }
    },
    players: {
        spectator: "Spectator",
        invite: "Challenge your friends:\nShare the link to invite",
        empty: "Empty",
        maxPlayers: "PLAYERS"
    },
    header: {
        publicRoom: "Public Room",
        privateRoom: "Private Room",
        copy: "Copied",
        invite: "Invite"
    },
    categoriesSelector: {
        title: "Categories",
        edit: "Edit +",
        randomSelection: "5 random categories",
        randomSelectionDesc: "Customize with \"Edit\"",
        modalTitle: "Category Selection",
        cancel: "Cancel",
        save: "Save"
    },
    closeModal: "Close modal"
};

const enCategories = {
  "cat-animales": "Animals",
  "cat-lugares": "Places",
  "cat-profesiones": "Professions",
  "cls-1": "Name",
  "cls-10": "Movie",
  "cls-11": "TV Show",
  "cls-12": "Actor/Actress",
  "cls-13": "Villain",
  "cls-14": "Superhero",
  "cls-15": "Fictional Character",
  "cls-16": "Video Game",
  "cls-17": "Youtuber/Streamer",
  "cls-2": "Last Name",
  "cls-20": "Song",
  "cls-21": "Singer/Band",
  "cls-22": "Musical Instrument",
  "cls-23": "Reggaeton Song Title",
  "cls-3": "Country",
  "cls-30": "Brand",
  "cls-31": "Car Brand",
  "cls-32": "Clothing Brand",
  "cls-33": "Tech Brand",
  "cls-34": "Mobile App",
  "cls-35": "Website",
  "cls-4": "City",
  "cls-40": "Food",
  "cls-41": "Cooking Ingredient",
  "cls-42": "Dessert",
  "cls-43": "Drink",
  "cls-5": "Animal",
  "cls-50": "Sport",
  "cls-51": "Athlete/Sportsman",
  "cls-52": "Sports Team",
  "cls-6": "Color",
  "cls-60": "Excuse for being late",
  "cls-61": "Reason for breaking up",
  "cls-62": "First thing you'd do if you win lottery",
  "cls-63": "Rock band name",
  "cls-64": "Insult (soft)",
  "cls-65": "Word that rhymes with \"Love\"",
  "cls-66": "Object in this room",
  "cls-67": "Terrible gift",
  "cls-7": "Fruit/Vegetable",
  "cls-8": "Thing",
  "cls-9": "Profession"
};

const enSystem = {
    roomDead: "👋 The room has been closed. See you next time!",
    spoilerBlocked: "[Message blocked for safety 🛡️]"
};

// Data for PT
const ptLobby = {
    settings: {
        title: "Configurações da Sala",
        readOnly: "Somente Leitura",
        language: "Idioma do Jogo",
        classic: {
            randomCategories: "Categorias Aleatórias",
            randomCategoriesDesc: "Escolhidas ao acaso no início",
            rounds: "Rodadas",
            timeLimit: "Tempo por rodada",
            sec: "seg",
            votingTime: "Tempo de votação",
            mutators: "Mutadores",
            suicidalStop: "Parada Suicida",
            suicidalStopDesc: "Se você parar, perde os pontos das vazias",
            anonymousVoting: "Votação Anônima",
            anonymousVotingDesc: "Votos não mostram quem os emitiu"
        },
        impostor: {
            categories: "Categorias em Jogo",
            categoriesDesc: "Selecionadas aleatoriamente do nosso catálogo secreto",
            rounds: "Rodadas de Jogo",
            typingTime: "Tempo de digitação",
            votingTime: "Tempo de Tribunal"
        }
    },
    players: {
        spectator: "Espectador",
        invite: "Desafie seus amigos:\nCompartilhe o link para convidar",
        empty: "Vazio",
        maxPlayers: "JOGADORES"
    },
    header: {
        publicRoom: "Sala Pública",
        privateRoom: "Sala Privada",
        copy: "Copiado",
        invite: "Convidar"
    },
    categoriesSelector: {
        title: "Categorias",
        edit: "Editar +",
        randomSelection: "5 categorias aleatórias",
        randomSelectionDesc: "Personalize com \"Editar\"",
        modalTitle: "Seleção de Categorias",
        cancel: "Cancelar",
        save: "Salvar"
    },
    closeModal: "Fechar modal"
};

const ptCategories = {
  "cat-animales": "Animais",
  "cat-lugares": "Lugares",
  "cat-profesiones": "Profissões",
  "cls-1": "Nome",
  "cls-10": "Filme",
  "cls-11": "Série de TV",
  "cls-12": "Ator/Atriz",
  "cls-13": "Vilão",
  "cls-14": "Super-herói",
  "cls-15": "Personagem Fictício",
  "cls-16": "Videogame",
  "cls-17": "Youtuber/Streamer",
  "cls-2": "Sobrenome",
  "cls-20": "Música",
  "cls-21": "Cantor/Banda",
  "cls-22": "Instrumento Musical",
  "cls-23": "Título de Música de Reggaeton",
  "cls-3": "País",
  "cls-30": "Marca",
  "cls-31": "Marca de Carro",
  "cls-32": "Marca de Roupa",
  "cls-33": "Marca de Tecnologia",
  "cls-34": "Aplicativo Móvel",
  "cls-35": "Site",
  "cls-4": "Cidade",
  "cls-40": "Comida",
  "cls-41": "Ingrediente de Cozinha",
  "cls-42": "Sobremesa",
  "cls-43": "Bebida",
  "cls-5": "Animal",
  "cls-50": "Esporte",
  "cls-51": "Atleta/Desportista",
  "cls-52": "Equipe Esportiva",
  "cls-6": "Cor",
  "cls-60": "Desculpa para chegar atrasado",
  "cls-61": "Motivo de término",
  "cls-62": "Primeira coisa se ganhasse na loteria",
  "cls-63": "Nome de banda de rock",
  "cls-64": "Insulto (suave)",
  "cls-65": "Palavra que rime com \"Amor\"",
  "cls-66": "Objeto neste quarto",
  "cls-67": "Presente terrível",
  "cls-7": "Fruta/Vegetal",
  "cls-8": "Coisa",
  "cls-9": "Profissão"
};

const ptSystem = {
    roomDead: "👋 A sala foi fechada. Até a próxima!",
    spoilerBlocked: "[Mensagem bloqueada por segurança 🛡️]"
};

updateLocale('src/locales/es.json', esLobby, esCategories, esSystem);
updateLocale('src/locales/en.json', enLobby, enCategories, enSystem);
updateLocale('src/locales/pt.json', ptLobby, ptCategories, ptSystem);

console.log("Locales updated!");
