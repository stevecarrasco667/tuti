// ==========================================================
// Fallback Dictionary — Local Backup Vocabulary
// ==========================================================
// Provides robust, human-like answers for classic categories
// when Supabase or GlobalWordCache returns no results.

const normalizeCategory = (name: string): string => {
    return name
        .trim()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/\//g, " "); // e.g. "fruta/verdura" -> "fruta verdura"
};

const FALLBACK_ES: Record<string, Record<string, string[]>> = {
    nombre: {
        a: ["Alejandro", "Ana", "Alberto", "Alvaro", "Andrés", "Alicia", "Adriana", "Agustín"],
        b: ["Beatriz", "Bruno", "Belén", "Bernardo", "Blanca", "Bastián", "Bárbara"],
        c: ["Carlos", "Camila", "Cristian", "Carmen", "Clara", "Catalina", "César"],
        d: ["Daniel", "Daniela", "Diego", "Diana", "David", "Damián", "Dora"],
        e: ["Eduardo", "Elena", "Enrique", "Eva", "Esteban", "Emilio", "Elisa"],
        f: ["Fernando", "Fernanda", "Felipe", "Fabiola", "Francisco", "Federico", "Fabián"],
        g: ["Gabriel", "Gabriela", "Gonzalo", "Gloria", "Guillermo", "Gustavo", "Giselle"],
        h: ["Hugo", "Héctor", "Helena", "Hernán", "Humberto", "Horacio"],
        i: ["Iván", "Isabel", "Ignacio", "Irene", "Inés", "Ismael", "Ingrid"],
        j: ["Juan", "Javier", "José", "Julia", "Jorge", "Juana", "Jaime", "Joaquín"],
        k: ["Kevin", "Karen", "Karina", "Ken", "Kiko", "Katia"],
        l: ["Luis", "Laura", "Lucas", "Lucía", "Leonardo", "Lorenzo", "Letcia"],
        m: ["Manuel", "María", "Martín", "Marta", "Mateo", "Mónica", "Miguel", "Marcos"],
        n: ["Nicolás", "Natalia", "Néstor", "Noelia", "Nuria", "Noé", "Nora"],
        o: ["Óscar", "Olga", "Orlando", "Olivia", "Omar", "Otilio"],
        p: ["Pedro", "Patricia", "Pablo", "Paula", "Pilar", "Patricio", "Penélope"],
        q: ["Quique", "Quintín", "Quirino", "Quetzal"],
        r: ["Roberto", "Rosa", "Ramón", "Raquel", "Ricardo", "Ramiro", "Rebeca"],
        s: ["Sebastián", "Sofía", "Santiago", "Sara", "Silvia", "Samuel", "Sandra"],
        t: ["Tomás", "Teresa", "Thiago", "Tatiana", "Tobías", "Tito", "Tania"],
        u: ["Ulises", "Úrsula", "Uriel", "Urbano"],
        v: ["Víctor", "Victoria", "Valentín", "Valeria", "Vicente", "Verónica"],
        w: ["Walter", "Wendy", "William", "Wilson", "Wenceslao"],
        x: ["Xavier", "Ximena", "Xiomara", "Xander"],
        y: ["Yolanda", "Yago", "Yuri", "Yasmín", "Yéssica"],
        z: ["Zacarías", "Zoe", "Zulema", "Zaida", "Zoraida"]
    },
    apellido: {
        a: ["Aguilar", "Alvarez", "Acosta", "Arce", "Aguirre", "Araya", "Arias"],
        b: ["Bermúdez", "Blanco", "Barrios", "Benítez", "Bravo", "Bustamante"],
        c: ["Castro", "Cortés", "Cáceres", "Carrasco", "Cruz", "Chávez", "Caballero"],
        d: ["Díaz", "Delgado", "Duarte", "Domínguez", "Durán", "Dávila"],
        e: ["Espinosa", "Escobar", "Estrada", "Echeverría", "Elizondo"],
        f: ["Fernández", "Flores", "Fuentes", "Ferreira", "Falcon", "Figueroa"],
        g: ["Gómez", "González", "Gutiérrez", "García", "Guzmán", "Guerrero"],
        h: ["Hernández", "Herrera", "Hidalgo", "Huerta", "Hurtado"],
        i: ["Iglesias", "Ibarra", "Infante", "Ibañez", "Izquierdo"],
        j: ["Jiménez", "Juárez", "Jara", "Jaramillo", "Jaime"],
        k: ["Kohan", "Kaiser", "Klein", "Krieger", "Kaufman"],
        l: ["López", "Lara", "León", "Luna", "Lozano", "Lacerda", "Linares"],
        m: ["Martínez", "Muñoz", "Morales", "Mendoza", "Medina", "Miranda", "Molina"],
        n: ["Núñez", "Navarro", "Nieto", "Naranjo", "Noguera", "Nova"],
        o: ["Ortega", "Ortiz", "Ochoa", "Olivares", "Orozco", "Orellana"],
        p: ["Pérez", "Peña", "Pinto", "Pacheco", "Palacios", "Paredes", "Prado"],
        q: ["Quiroga", "Quevedo", "Quintana", "Quintero", "Quiroz"],
        r: ["Rodríguez", "Ruiz", "Ramos", "Ramírez", "Rojas", "Rivera", "Reyes"],
        s: ["Sánchez", "Silva", "Suárez", "Salazar", "Soto", "Serrano", "Solano"],
        t: ["Torres", "Tapia", "Tejeda", "Toledo", "Triviño", "Trujillo"],
        u: ["Uribe", "Urbina", "Ureña", "Ugarte", "Valenzuela"],
        v: ["Valenzuela", "Vargas", "Vásquez", "Vega", "Velasco", "Vera", "Vidal"],
        w: ["Weber", "Wagner", "White", "Williams", "Walker"],
        x: ["Ximenes", "Xavier"],
        y: ["Yáñez", "Yépez", "Ybarra", "Yong"],
        z: ["Zamora", "Zapata", "Zúñiga", "Zarate", "Zevallos", "Zelaya"]
    },
    pais: {
        a: ["Argentina", "Alemania", "Australia", "Austria", "Angola", "Argelia", "Andorra"],
        b: ["Brasil", "Bolivia", "Bélgica", "Bulgaria", "Bahamas", "Baréin", "Bangladés"],
        c: ["Chile", "Colombia", "Canadá", "China", "Cuba", "Costa Rica", "Croacia"],
        d: ["Dinamarca", "Dominica", "Yibuti"],
        e: ["España", "Ecuador", "Egipto", "Estados Unidos", "Etiopía", "Estonia"],
        f: ["Francia", "Filipinas", "Finlandia", "Fiyi", "Gabón"],
        g: ["Grecia", "Guatemala", "Guinea", "Gabón", "Gambia", "Georgia"],
        h: ["Honduras", "Haití", "Hungría", "Holanda", "Hawái"],
        i: ["Italia", "India", "Irlanda", "Irak", "Irán", "Islandia", "Indonesia"],
        j: ["Japón", "Jamaica", "Jordania"],
        k: ["Kenia", "Kazajistán", "Kirguistán", "Kuwait"],
        l: ["Líbano", "Libia", "Letonia", "Lituania", "Luxemburgo", "Lesoto"],
        m: ["México", "Marruecos", "Mónaco", "Madagascar", "Malta", "Malasia", "Mongolia"],
        n: ["Nicaragua", "Noruega", "Nigeria", "Nueva Zelanda", "Nepal", "Níger"],
        o: ["Omán"],
        p: ["Perú", "Panamá", "Portugal", "Polonia", "Paraguay", "Pakistán", "Palestina"],
        q: ["Catar"],
        r: ["Rusia", "Reino Unido", "Rumanía", "Ruanda"],
        s: ["Suecia", "Suiza", "Senegal", "Singapur", "Siria", "Sudáfrica", "Somalia"],
        t: ["Turquía", "Tailandia", "Túnez", "Tanzania", "Togo", "Tonga"],
        u: ["Uruguay", "Ucrania", "Uganda", "Uzbekistán"],
        v: ["Venezuela", "Vietnam", "Vaticano", "Vanuatu"],
        w: ["Gales"],
        y: ["Yemen"],
        z: ["Zambia", "Zimbabue"]
    },
    ciudad: {
        a: ["Asunción", "Atenas", "Ámsterdam", "Alicante", "Arequipa", "Antofagasta"],
        b: ["Barcelona", "Bogotá", "Buenos Aires", "Berlín", "Boston", "Bruselas"],
        c: ["Caracas", "Chicago", "Cali", "Córdoba", "Cartagena", "Copenhague"],
        d: ["Dallas", "Dublín", "Doha", "Detroit", "Dakar", "Damasco"],
        e: ["Edimburgo", "El Paso", "Envigado", "Eindhoven"],
        f: ["Florencia", "Fráncfort", "Filadelfia", "Fukuoka"],
        g: ["Ginebra", "Guadalajara", "Granada", "Génova", "Guayaquil"],
        h: ["La Habana", "Houston", "Hamburgo", "Helsinki", "Hong Kong"],
        i: ["Ibagué", "Indianápolis", "Estambul", "Iquique", "Iquitos"],
        j: ["Jerusalén", "Johannesburgo", "Jerez", "Juárez"],
        k: ["Kiev", "Kingston", "Kioto", "Kuala Lumpur"],
        l: ["Lima", "Londres", "Lisboa", "Los Ángeles", "Lyon", "La Paz"],
        m: ["Madrid", "Medellín", "Miami", "Montevideo", "Moscú", "México DF", "Manila"],
        n: ["Nueva York", "Nápoles", "Niza", "Nagoya", "Nairobi"],
        o: ["Oslo", "Ottawa", "Orlando", "Oviedo", "Oporto"],
        p: ["París", "Pekín", "Praga", "Portland", "Puno", "Panamá"],
        q: ["Quito", "Quebec", "Quetzaltenango"],
        r: ["Roma", "Río de Janeiro", "Rosario", "Róterdam", "Riad"],
        s: ["Santiago", "Sevilla", "Sídney", "Seúl", "San Francisco", "São Paulo"],
        t: ["Tokio", "Toronto", "Turín", "Tegucigalpa", "Tijuana"],
        u: ["Utrecht", "Ushuaia", "Ulaanbaatar"],
        v: ["Valencia", "Venecia", "Viena", "Vancouver", "Vigo", "Valparaíso"],
        w: ["Washington", "Varsovia", "Wellington"],
        x: ["Xalapa", "Xi'an", "Xiamen"],
        y: ["Yokohama", "Yaundé", "Yakarta"],
        z: ["Zúrich", "Zaragoza", "Zagreb", "Zanzíbar"]
    },
    animal: {
        a: ["Águila", "Abeja", "Araña", "Ardilla", "Avestruz", "Alpaca", "Antílope"],
        b: ["Ballena", "Búho", "Burro", "Búfalo", "Buey", "Babuino", "Becerro"],
        c: ["Caballo", "Cebra", "Cerdo", "Cocodrilo", "Conejo", "Camello", "Canguro"],
        d: ["Delfín", "Dromedario", "Dinosaurio", "Dingo", "Donkey"],
        e: ["Elefante", "Erizo", "Escorpión", "Esponja", "Emú", "Escarabajo"],
        f: ["Flamenco", "Foca", "Faisán", "Flamingo", "Flia"],
        g: ["Gato", "Gallina", "Gorila", "Gaviota", "Guepardo", "Ganso", "Gusano"],
        h: ["Hiena", "Hipopótamo", "Hormiga", "Halcón", "Hámster"],
        i: ["Iguana", "Impala", "Insecto", "Íbice"],
        j: ["Jirafa", "Jabalí", "Jaguar", "Jicote"],
        k: ["Koala", "Kiwi", "Kudú", "Krill"],
        l: ["León", "Lobo", "Loro", "Luciérnaga", "Liebre", "Leopardo", "Lama"],
        m: ["Mono", "Mosca", "Mosquito", "Medusa", "Murciélago", "Marmota", "Mula"],
        n: ["Nutria", "Ñandú", "Narval", "Novillo"],
        o: ["Oso", "Oveja", "Ornitorrinco", "Ostra", "Orca", "Oryx"],
        p: ["Perro", "Pájaro", "Pato", "Pingüino", "Pulpo", "Pantera", "Puma", "Pavo"],
        q: ["Quetzal", "Quirquincho", "Quokka"],
        r: ["Ratón", "Rata", "Rana", "Rinoceronte", "Reno", "Ruiseñor"],
        s: ["Sapo", "Serpiente", "Salmón", "Salamandra", "Sardina"],
        t: ["Tigre", "Tiburón", "Tortuga", "Toro", "Tucán", "Topo", "Tapir"],
        u: ["Urraca", "Unicornio", "Uapití"],
        v: ["Vaca", "Víbora", "Vicuña", "Venado", "Vicuña", "Vencejo"],
        w: ["Wombat", "Wapití", "Walabi"],
        x: ["Xoloitzcuintle"],
        y: ["Yegua", "Yacaré", "Yak", "Yeso"],
        z: ["Zorro", "Zorrillo", "Zebra", "Zángano"]
    },
    color: {
        a: ["Azul", "Amarillo", "Arena", "Añil", "Almendra", "Aqua", "Amatista"],
        b: ["Blanco", "Beige", "Burdeos", "Bronce", "Bermellón"],
        c: ["Celeste", "Crema", "Carmín", "Coral", "Café", "Ceniza", "Cereza"],
        d: ["Dorado", "Durazno", "Damasco"],
        e: ["Esmeralda", "Escarlata", "Ébano"],
        f: ["Fucsia", "Frambuesa", "Fuego"],
        g: ["Gris", "Granate", "Gualda", "Girasol"],
        h: ["Hueso", "Humo", "Heliotropo"],
        i: ["Índigo", "Jaspeado"],
        j: ["Jazmín", "Jade"],
        k: ["Caqui", "Kiwi"],
        l: ["Lila", "Limón", "Lavanda", "Ladrillo"],
        m: ["Morado", "Marrón", "Magenta", "Mostaza", "Malva", "Menta"],
        n: ["Negro", "Naranja", "Nácar", "Nieve"],
        o: ["Oro", "Ocre", "Oliva", "Opalo"],
        p: ["Plata", "Púrpura", "Pardo", "Platino", "Perla", "Pistacho"],
        q: ["Crema"],
        r: ["Rojo", "Rosa", "Rosado", "Rubí", "Rosa pálido"],
        s: ["Salmón", "Siena", "Sepia", "Silvestre"],
        t: ["Turquesa", "Terracota", "Trigo", "Turmalina"],
        u: ["Uva"],
        v: ["Verde", "Violeta", "Vainilla", "Vermellón"],
        w: ["Wengué"],
        x: ["Xanadú"],
        y: ["Yeso", "Yema"],
        z: ["Zafiro", "Zinc"]
    },
    "fruta verdura": {
        a: ["Aguacate", "Arándano", "Apio", "Ajo", "Almendra", "Ananá", "Albaricoque"],
        b: ["Banana", "Berenjena", "Brócoli", "Batata", "Betabel", "Bellota"],
        c: ["Cereza", "Coco", "Cebolla", "Calabaza", "Ciruela", "Coliflor", "Castaña"],
        d: ["Durazno", "Dátil", "Damasco", "Durión"],
        e: ["Espárrago", "Espinaca", "Endivia", "Ejote", "Echalote"],
        f: ["Fresa", "Frambuesa", "Frutilla", "Fruta de la pasión", "Flor de calabaza"],
        g: ["Granada", "Garbanzo", "Guisante", "Guayaba", "Girasol"],
        h: ["Higo", "Haba", "Hongo", "Hinojo"],
        i: ["Kiwi", "Ilama"],
        j: ["Jengibre", "Jícama", "Jitomate", "Jazmín"],
        k: ["Kiwi", "Kaki", "Kale"],
        l: ["Limón", "Lechuga", "Lima", "Lichi", "Lenteja"],
        m: ["Manzana", "Mandarina", "Melocotón", "Melón", "Mango", "Membrillo", "Mora"],
        n: ["Naranja", "Nectarina", "Nabo", "Nuez", "Níspero"],
        o: ["Orégano", "Oliva", "Okra"],
        p: ["Pera", "Plátano", "Piña", "Patata", "Pimiento", "Pepino", "Papaya", "Pomelo"],
        q: ["Quinoa", "Quimbombó"],
        r: ["Rábano", "Remolacha", "Rúcula", "Ruibarbo"],
        s: ["Sandía", "Seta", "Salvia", "Soya"],
        t: ["Tomate", "Toronja", "Tamarindo", "Trigo", "Tuna", "Tupinambo"],
        u: ["Uva", "Uchuva"],
        v: ["Vainilla", "Verdolaga", "Vainita"],
        w: ["Wasabi", "Watermelon"],
        x: ["Xoconostle"],
        y: ["Yuca", "Yerba mate", "Yam"],
        z: ["Zanahoria", "Zapallo", "Zarzamora", "Zucchini"]
    },
    cosa: {
        a: ["Anillo", "Alfombra", "Abanico", "Almohada", "Auto", "Anteojos", "Arpa", "Aguja"],
        b: ["Bolígrafo", "Botella", "Bolsa", "Balón", "Banco", "Bote", "Balanza", "Bandeja"],
        c: ["Cuchara", "Cama", "Cuaderno", "Camisa", "Caja", "Cable", "Copa", "Cuadro"],
        d: ["Dado", "Disco", "Dije", "Dardo", "Delantal", "Documento", "Dinero"],
        e: ["Espejo", "Escoba", "Escritorio", "Estuche", "Enchufe", "Espada", "Escultura"],
        f: ["Florero", "Fósforo", "Flecha", "Falda", "Frasco", "Flauta", "Fusible"],
        g: ["Globo", "Goma", "Gorra", "Gancho", "Guitarra", "Grifo", "Gafas", "Gema"],
        h: ["Hilo", "Hoja", "Horno", "Herramienta", "Hacha", "Hielo", "Hamaca"],
        i: ["Imán", "Impresora", "Inodoro", "Interruptor", "Incienso"],
        j: ["Jabón", "Jarra", "Juguete", "Joya", "Jeringa", "Jaula", "Jarrón"],
        k: ["Kilo", "Kiosco", "Ketchup", "Kimono", "Kayak"],
        l: ["Lápiz", "Libro", "Llave", "Lámpara", "Lente", "Lazo", "Lona", "Llavero"],
        m: ["Mesa", "Mochila", "Martillo", "Moneda", "Manta", "Micrófono", "Mapa", "Maleta"],
        n: ["Navaja", "Nube", "Nido", "Notebook", "Nave"],
        o: ["Olla", "Objeto", "Órgano", "Oro", "Opalina", "Ordenador"],
        p: ["Papel", "Plato", "Peine", "Puerta", "Pelota", "Pincel", "Pijama", "Paraguas"],
        q: ["Quitasol", "Quesera", "Químico", "Quena"],
        r: ["Reloj", "Radio", "Regla", "Rueda", "Revista", "Riel", "Red", "Rastrillo"],
        s: ["Silla", "Sombrero", "Sábana", "Saco", "Sobre", "Sofá", "Sello", "Sartén"],
        t: ["Taza", "Tijeras", "Teléfono", "Tenedor", "Toalla", "Teclado", "Tornillo", "Tiza"],
        u: ["Urna", "Uña", "Utensilio", "Ukelele"],
        v: ["Vaso", "Vela", "Ventana", "Vestido", "Ventilador", "Violín", "Viga"],
        w: ["Walkman", "Waterpolo", "Whiskey", "Waffle"],
        x: ["Xilófono", "Xerografía"],
        y: ["Yoyo", "Yeso", "Yate", "Yunque"],
        z: ["Zapato", "Zueco", "Zafiro", "Zócalo", "Zanco"]
    },
    profesion: {
        a: ["Abogado", "Arquitecto", "Astrónomo", "Actor", "Administrador", "Arqueólogo", "Agrónomo"],
        b: ["Bombero", "Biólogo", "Bibliotecario", "Barbero", "Barman", "Bailarín"],
        c: ["Cantante", "Científico", "Carpintero", "Contador", "Chef", "Cirujano", "Cajero"],
        d: ["Doctor", "Diseñador", "Dentista", "Docente", "Diplomático", "Director"],
        e: ["Enfermero", "Economista", "Escritor", "Electricista", "Escultor", "Entrenador"],
        f: ["Fotógrafo", "Farmacéutico", "Filósofo", "Físico", "Fisioterapeuta", "Florista"],
        g: ["Gerente", "Geólogo", "Gobernante", "Guía turístico", "Guardia", "Ginecólogo"],
        h: ["Historiador", "Hostelero", "Horticultor", "Higienista"],
        i: ["Ingeniero", "Investigador", "Inspector", "Informático", "Ilustrador"],
        j: ["Juez", "Jardinero", "Jefe", "Joyerista", "Periodista"],
        k: ["Kinesiólogo", "Karateca"],
        l: ["Locutor", "Librero", "Limpiador", "Licenciado", "Linguista"],
        m: ["Médico", "Músico", "Mecánico", "Maestro", "Modelo", "Militar", "Minero"],
        n: ["Nutricionista", "Novelista", "Notario", "Nanotecnólogo"],
        o: ["Odontólogo", "Oftalmólogo", "Operador", "Organizador", "Orfebre"],
        p: ["Profesor", "Piloto", "Policía", "Pintor", "Periodista", "Psicólogo", "Programador"],
        q: ["Químico", "Quiropráctico", "Quichelense"],
        r: ["Redactor", "Recepcionista", "Reportero", "Radiólogo", "Relojero"],
        s: ["Secretario", "Sociólogo", "Soldador", "Sastre", "Supervisor", "Soplador"],
        t: ["Taxista", "Técnico", "Traductor", "Terapeuta", "Trabajador social", "Torero"],
        u: ["Urólogo", "Urbanista", "Ujier"],
        v: ["Veterinario", "Vendedor", "Vigilante", "Violinista", "Viticultor"],
        w: ["Webmaster", "Waterpolista"],
        x: ["Xilógrafo"],
        y: ["Youtuber", "Yogui"],
        z: ["Zapatero", "Zoólogo", "Zinguero"]
    },
    deporte: {
        a: ["Atletismo", "Ajedrez", "Automovilismo", "Arco", "Aeróbic", "Alpinismo"],
        b: ["Baloncesto", "Boxeo", "Béisbol", "Bádminton", "Billar", "Bobsled"],
        c: ["Ciclismo", "Cricket", "Canotaje", "Crossfit", "Curling", "Clavados"],
        d: ["Danza", "Dominó", "Dardos", "Decatlón"],
        e: ["Esgrima", "Equitación", "Escalada", "Esquí"],
        f: ["Fútbol", "Fórmula 1", "Frontón", "Fitness"],
        g: ["Golf", "Gimnasia", "Grappling"],
        h: ["Hockey", "Halterofilia", "Handball", "Hípica"],
        j: ["Judo", "Jai alai"],
        k: ["Karate", "Kickboxing", "Kayak"],
        l: ["Lucha", "Lacrosse", "Levantamiento de pesas"],
        m: ["Motociclismo", "Maratón", "MMA"],
        n: ["Natación", "Nado sincronizado"],
        p: ["Polo", "Paddle", "Patinaje", "Pentatlón", "Parkour", "Pesca"],
        r: ["Rugby", "Remo", "Rafting", "Rally"],
        s: ["Surf", "Softbol", "Snowboard", "Squash", "Skateboarding"],
        t: ["Tenis", "Taekwondo", "Tiro con arco", "Triatlón", "Trampolín"],
        v: ["Voleibol", "Vela", "Velocidad"],
        w: ["Waterpolo", "Windsurf", "Wrestling"],
        y: ["Yoga"],
        z: ["Zumba"]
    },
    marca: {
        a: ["Adidas", "Apple", "Amazon", "Audi", "Asus", "Armani"],
        b: ["BMW", "Burger King", "Bose", "Balenciaga", "Barbie"],
        c: ["Coca-Cola", "Chanel", "Canon", "Calvin Klein", "Chevrolet", "Colgate"],
        d: ["Disney", "Dell", "Dior", "Dolce", "Dove", "Durex"],
        e: ["Epson", "Estée Lauder", "Ericsson"],
        f: ["Ferrari", "Ford", "Fendi", "Fiat", "Facebook"],
        g: ["Google", "Gucci", "Gap", "Gillette", "Gatorade"],
        h: ["Honda", "Huawei", "Hermes", "H&M", "Hershey"],
        i: ["Intel", "Ikea", "Instagram"],
        j: ["Jeep", "Johnson", "Jaguar"],
        k: ["Kellogg", "KFC", "Kodak", "Kia"],
        l: ["Lego", "Louis Vuitton", "Lenovo", "Lacoste", "Lamborghini"],
        m: ["McDonald's", "Mercedes", "Microsoft", "Motorola", "Mazda"],
        n: ["Nike", "Nintendo", "Netflix", "Nestlé", "Nissan"],
        o: ["Oracle", "Oreo", "Opel"],
        p: ["Pepsi", "Puma", "Porsche", "Prada", "Philips", "PayPal"],
        r: ["Rolex", "Reebok", "Ray-Ban", "Renault"],
        s: ["Samsung", "Sony", "Starbucks", "Spotify", "Subway", "Suzuki"],
        t: ["Toyota", "Tesla", "Twitter", "Toshiba", "TikTok"],
        u: ["Uber", "Under Armour", "Unilever"],
        v: ["Versace", "Visa", "Volkswagen", "Vans"],
        w: ["WhatsApp", "Walmart", "Wrangler"],
        x: ["Xbox", "Xerox", "Xiaomi"],
        y: ["Yahoo", "YouTube", "Yamaha"],
        z: ["Zara", "Zoom", "Zenith"]
    },
    pelicula: {
        a: ["Avatar", "Avengers", "Aladino", "Alien", "Amadeus", "Annie"],
        b: ["Batman", "Bambi", "Blade Runner", "Braveheart", "Big Fish"],
        c: ["Coco", "Cars", "Cenicienta", "Casablanca", "Coraline", "Crash"],
        d: ["Dune", "Dumbo", "Django", "Dragonball"],
        e: ["E.T.", "Encanto", "El Padrino", "El Rey León", "Elf"],
        f: ["Frozen", "Forrest Gump", "Furia de Titanes", "Fantasía"],
        g: ["Gladiador", "Grease", "Gravity", "Ghost", "Godzilla"],
        h: ["Harry Potter", "Hércules", "Hulk", "Hook"],
        i: ["Inception", "Indiana Jones", "Iron Man", "Intocable", "It"],
        j: ["Joker", "Jumanji", "Jaws", "Jurassic Park"],
        k: ["Kill Bill", "Kung Fu Panda", "King Kong"],
        l: ["La La Land", "Logan", "Lucy", "Luca"],
        m: ["Matrix", "Mulan", "Moana", "Madagascar", "Memento"],
        n: ["Narnia", "Nemo", "Notebook", "Noah"],
        o: ["Oppenheimer", "Oliver"],
        p: ["Pinocho", "Piratas del Caribe", "Psicosis", "Pocahontas"],
        r: ["Rocky", "Ratatouille", "Rambo", "Rapunzel", "Robocop"],
        s: ["Shrek", "Spider-Man", "Star Wars", "Soul", "Superman"],
        t: ["Titanic", "Tarzán", "Toy Story", "Thor", "Top Gun", "Trolls"],
        u: ["Up", "Underworld"],
        v: ["Venom", "Vaiana", "Valiente"],
        w: ["Wall-E", "Wonder Woman", "Willy Wonka"],
        x: ["X-Men"],
        y: ["Yesterday"],
        z: ["Zootopia", "Zombieland"]
    },
    comida: {
        a: ["Arroz", "Asado", "Arepa", "Albóndiga", "Alfajor", "Atún"],
        b: ["Burrito", "Brownie", "Bocadillo", "Brocheta", "Bizcocho"],
        c: ["Ceviche", "Churro", "Crêpe", "Curry", "Costilla", "Croissant", "Canelón"],
        d: ["Donut", "Dumpling", "Dulce de leche"],
        e: ["Empanada", "Ensalada", "Enchilada", "Estofado", "Espagueti"],
        f: ["Flan", "Filete", "Focaccia", "Falafel", "Fondue"],
        g: ["Guacamole", "Galleta", "Granola", "Goulash", "Gofre"],
        h: ["Hamburguesa", "Hot dog", "Hummus", "Helado", "Huevo"],
        j: ["Jamón", "Jugo"],
        k: ["Kebab", "Kimchi"],
        l: ["Lasaña", "Lomo", "Lentejas", "Limonada"],
        m: ["Milanesa", "Mole", "Muffin", "Mousse", "Mermelada"],
        n: ["Nachos", "Nuggets", "Nougat", "Ñoquis"],
        o: ["Omelette", "Ostras"],
        p: ["Pizza", "Paella", "Pasta", "Pan", "Pancake", "Poke", "Pudín"],
        q: ["Quesadilla", "Queso", "Quinoa", "Quiche"],
        r: ["Risotto", "Ravioli", "Ramen"],
        s: ["Sushi", "Sopa", "Sándwich", "Salsa", "Steak", "Soufflé"],
        t: ["Taco", "Tortilla", "Tiramisu", "Tostada", "Tempura"],
        u: ["Udon"],
        v: ["Vinagreta", "Vichyssoise"],
        w: ["Waffle", "Wok", "Wrap"],
        y: ["Yogur"],
        z: ["Zabaglione", "Zuppa"]
    }
};

export function getFallbackWords(lang: string, categoryName: string, letter: string): string[] {
    const isEn = lang.toLowerCase() === "en";
    const normCategory = normalizeCategory(categoryName);
    const char = letter.toLowerCase().trim();

    // Mapping common English names of classic categories back to the same lists
    let key = normCategory;
    if (isEn) {
        if (normCategory === "name") key = "nombre";
        else if (normCategory === "last name" || normCategory === "surname") key = "apellido";
        else if (normCategory === "country") key = "pais";
        else if (normCategory === "city") key = "ciudad";
        else if (normCategory === "animal") key = "animal";
        else if (normCategory === "color") key = "color";
        else if (normCategory === "fruit vegetable" || normCategory === "fruit" || normCategory === "vegetable") key = "fruta verdura";
        else if (normCategory === "thing" || normCategory === "object") key = "cosa";
        else if (normCategory === "profession" || normCategory === "job") key = "profesion";
        else if (normCategory === "sport") key = "deporte";
        else if (normCategory === "brand") key = "marca";
        else if (normCategory === "movie" || normCategory === "film") key = "pelicula";
        else if (normCategory === "food" || normCategory === "dish") key = "comida";
    } else {
        // Spanish normalization mapping aliases
        if (normCategory.includes("nombre")) key = "nombre";
        else if (normCategory.includes("apellido")) key = "apellido";
        else if (normCategory.includes("pais")) key = "pais";
        else if (normCategory.includes("ciudad")) key = "ciudad";
        else if (normCategory.includes("animal")) key = "animal";
        else if (normCategory.includes("color")) key = "color";
        else if (normCategory.includes("fruta") || normCategory.includes("verdura")) key = "fruta verdura";
        else if (normCategory.includes("cosa") || normCategory.includes("objeto")) key = "cosa";
        else if (normCategory.includes("profesion") || normCategory.includes("trabajo") || normCategory.includes("empleo")) key = "profesion";
        else if (normCategory.includes("deporte") || normCategory.includes("sport")) key = "deporte";
        else if (normCategory.includes("marca") || normCategory.includes("brand")) key = "marca";
        else if (normCategory.includes("pelicula") || normCategory.includes("cine") || normCategory.includes("film")) key = "pelicula";
        else if (normCategory.includes("comida") || normCategory.includes("plato") || normCategory.includes("alimento")) key = "comida";
    }

    const dict = FALLBACK_ES[key];
    if (dict && dict[char]) {
        return dict[char];
    }

    return [];
}
