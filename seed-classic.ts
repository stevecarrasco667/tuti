/**
 * seed-classic.ts
 * Seeds Supabase with TutiFruti Classic categories and validation vocabulary.
 * Run: npx tsx seed-classic.ts
 */
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL!;
// Service role key is required to bypass RLS on inserts
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVicmF3d2d0YnBndXd5eWlvaWZiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjkxMTY1MCwiZXhwIjoyMDg4NDg3NjUwfQ.11dDImiGl8oaILOGxomQMEOo2N_1qkpYSXuVoI7tEDo';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Categories with their validation vocabulary.
// Categories marked with NO_WORDS have no objective vocabulary (human voting applies).
const CLASSIC_DATA: Array<{
    id: string;
    name: string;
    words: string[];
}> = [
        { id: 'cls-1', name: 'Nombre', words: ['Adriana', 'Alejandro', 'Alfredo', 'Alicia', 'Andrés', 'Aurora', 'Beatriz', 'Benjamín', 'Bruno', 'Carlos', 'Carmen', 'Claudia', 'Daniel', 'Diego', 'Elena', 'Emilio', 'Esteban', 'Fabián', 'Fernando', 'Francisco', 'Gabriel', 'Gustavo', 'Inés', 'Isabel', 'Javier', 'Jorge', 'José', 'Juan', 'Juliana', 'Laura', 'Leonardo', 'Lucía', 'Luis', 'Manuel', 'Marcos', 'María', 'Martín', 'Mateo', 'Mónica', 'Nicolás', 'Oscar', 'Pablo', 'Patricia', 'Pedro', 'Rafael', 'Ramón', 'Ricardo', 'Rosa', 'Rubén', 'Santiago', 'Sebastián', 'Sofía', 'Teresa', 'Tomás', 'Valentina', 'Valeria', 'Víctor', 'Ximena'] },
        { id: 'cls-2', name: 'Apellido', words: ['Álvarez', 'Blanco', 'Cabrera', 'Castillo', 'Castro', 'Contreras', 'Cruz', 'Díaz', 'Dominguez', 'Espinoza', 'Fernández', 'Flores', 'García', 'Gómez', 'González', 'Guerrero', 'Gutiérrez', 'Hernández', 'Jiménez', 'López', 'Luna', 'Martínez', 'Medina', 'Molina', 'Morales', 'Moreno', 'Navarro', 'Núñez', 'Ortega', 'Ortiz', 'Peña', 'Pérez', 'Ramírez', 'Reyes', 'Ríos', 'Rivera', 'Rodríguez', 'Romero', 'Rosas', 'Ruiz', 'Salazar', 'Salgado', 'Sánchez', 'Santos', 'Silva', 'Soto', 'Torres', 'Vargas', 'Vega', 'Vásquez'] },
        { id: 'cls-3', name: 'País', words: ['Afganistán', 'Alemania', 'Angola', 'Arabia Saudita', 'Argentina', 'Australia', 'Austria', 'Bangladesh', 'Bélgica', 'Bolivia', 'Brasil', 'Camerún', 'Canadá', 'Chile', 'China', 'Colombia', 'Congo', 'Corea del Norte', 'Corea del Sur', 'Cuba', 'Dinamarca', 'Ecuador', 'Egipto', 'España', 'Estados Unidos', 'Etiopía', 'Filipinas', 'Finlandia', 'Francia', 'Ghana', 'Grecia', 'Guatemala', 'Holanda', 'Honduras', 'Hungría', 'India', 'Indonesia', 'Irak', 'Irán', 'Israel', 'Italia', 'Jamaica', 'Japón', 'Jordania', 'Kenia', 'México', 'Nigeria', 'Noruega', 'Nueva Zelanda', 'Pakistan', 'Panamá', 'Paraguay', 'Perú', 'Polonia', 'Portugal', 'Reino Unido', 'República Dominicana', 'Rusia', 'Senegal', 'Sudáfrica', 'Suecia', 'Suiza', 'Tailandia', 'Turquía', 'Ucrania', 'Uruguay', 'Venezuela', 'Vietnam'] },
        { id: 'cls-4', name: 'Ciudad', words: ['Ámsterdam', 'Atenas', 'Bangkok', 'Barcelona', 'Berlín', 'Bogotá', 'Buenos Aires', 'Cairo', 'Caracas', 'Chicago', 'Delhi', 'Dubái', 'Hong Kong', 'Istanbul', 'Johannesburgo', 'Lagos', 'Lima', 'Lisboa', 'Londres', 'Los Ángeles', 'Madrid', 'Manila', 'Melbourne', 'México', 'Miami', 'Milán', 'Moscú', 'Mumbai', 'Munich', 'Nairobi', 'Nueva York', 'Oslo', 'París', 'Pekín', 'Praga', 'Roma', 'Santiago', 'São Paulo', 'Seúl', 'Shanghái', 'Sidney', 'Singapur', 'Tokio', 'Toronto', 'Vancouver', 'Varsovia', 'Viena', 'Washington'] },
        { id: 'cls-5', name: 'Animal', words: ['Águila', 'Ballena', 'Buitre', 'Caballo', 'Camaleón', 'Camello', 'Canguro', 'Cebra', 'Chimpancé', 'Cocodrilo', 'Cóndor', 'Conejo', 'Cuervo', 'Delfín', 'Elefante', 'Flamenco', 'Gato', 'Gorila', 'Hipopótamo', 'Iguana', 'Jirafa', 'Koala', 'León', 'Leopardo', 'Llama', 'Lobo', 'Loro', 'Mariposa', 'Mono', 'Murciélago', 'Nutria', 'Orca', 'Oso', 'Oso hormiguero', 'Oso polar', 'Panda', 'Pantera', 'Pavo real', 'Pelícano', 'Perro', 'Pingüino', 'Puma', 'Rinoceronte', 'Serpiente', 'Tigre', 'Tiburón', 'Tortuga', 'Tucán', 'Venado', 'Zorro'] },
        { id: 'cls-6', name: 'Color', words: ['Aguamarina', 'Amarillo', 'Añil', 'Azul', 'Azul marino', 'Beige', 'Blanco', 'Carmesí', 'Celeste', 'Cian', 'Coral', 'Dorado', 'Esmeralda', 'Fucsia', 'Gris', 'Lavanda', 'Lila', 'Magenta', 'Marrón', 'Menta', 'Morado', 'Mostaza', 'Naranja', 'Negro', 'Ocre', 'Oliva', 'Plateado', 'Purpura', 'Rojo', 'Rosa', 'Rosado', 'Salmón', 'Teal', 'Turquesa', 'Verde', 'Verde limón', 'Verde oliva', 'Violeta'] },
        { id: 'cls-7', name: 'Fruta/Verdura', words: ['Acelga', 'Aguacate', 'Ajo', 'Alcachofa', 'Apio', 'Arándano', 'Banana', 'Berenjena', 'Brócoli', 'Calabacín', 'Cebolla', 'Cereza', 'Chirimoya', 'Ciruela', 'Coco', 'Coliflor', 'Durazno', 'Frambuesa', 'Fresa', 'Granada', 'Guayaba', 'Kiwi', 'Lechuga', 'Limón', 'Lulo', 'Mandarina', 'Mango', 'Manzana', 'Maracuyá', 'Maracuyá', 'Melón', 'Mora', 'Naranja', 'Papaya', 'Pera', 'Piña', 'Pimiento', 'Plátano', 'Remolacha', 'Sandía', 'Tomate', 'Uva', 'Zanahoria'] },
        { id: 'cls-8', name: 'Cosa', words: ['Alfombra', 'Almohada', 'Aspiradora', 'Auriculares', 'Bicicleta', 'Bolígrafo', 'Botella', 'Calculadora', 'Cámara', 'Candado', 'Cartera', 'Cepillo', 'Cortina', 'Cuaderno', 'Cuchillo', 'Espejo', 'Foco', 'Gorra', 'Impresora', 'Jarrón', 'Lampara', 'Lápiz', 'Llave', 'Maletín', 'Mochila', 'Paraguas', 'Pasta de dientes', 'Peine', 'Pinza', 'Reloj', 'Silla', 'Taladro', 'Taza', 'Televisor', 'Tenedor', 'Tijeras', 'Toalla', 'Ventilador'] },
        { id: 'cls-9', name: 'Profesión', words: ['Abogado', 'Arquitecto', 'Bombero', 'Carpintero', 'Chef', 'Científico', 'Cirujano', 'Contador', 'Dentista', 'Detective', 'Director', 'Diseñador', 'Economista', 'Electricista', 'Enfermero', 'Escritor', 'Farmacéutico', 'Filósofo', 'Físico', 'Fotógrafo', 'Futbolista', 'Geógrafo', 'Ingeniero', 'Juez', 'Matemático', 'Médico', 'Mesero', 'Militar', 'Músico', 'Paleontólogo', 'Periodista', 'Piloto', 'Pintor', 'Plomero', 'Policía', 'Político', 'Programador', 'Psicólogo', 'Químico', 'Sastre', 'Sociólogo', 'Taxista', 'Veterinario'] },
        { id: 'cls-10', name: 'Película', words: ['Alien', 'Amélie', 'Avengers', 'Avatar', 'Batman', 'Braveheart', 'Casablanca', 'El Padrino', 'El Rey León', 'El Señor de los Anillos', 'Forrest Gump', 'Gladiador', 'Gravity', 'Harry Potter', 'Indiana Jones', 'Interstellar', 'Joker', 'Jurassic Park', 'Jungla de Cristal', 'La La Land', 'La Sirenita', 'Las Tortugas Ninja', 'Los Increíbles', 'Luces de la Ciudad', 'Matrix', 'Misión Imposible', 'Moana', 'Pulp Fiction', 'Rocky', 'Shrek', 'Star Wars', 'Terminator', 'Titanic', 'Top Gun', 'Toy Story', 'Up', 'Volver al Futuro', 'Wall-E'] },
        { id: 'cls-11', name: 'Serie de TV', words: ['13 Reasons Why', '24', 'Anatomía de Grey', 'Arrested Development', 'Breaking Bad', 'Chernobyl', 'Dark', 'Euphoria', 'Game of Thrones', 'House of Cards', 'How I Met Your Mother', 'JoJo\'s Bizarre Adventure', 'La Casa de Papel', 'Lost', 'Lupin', 'Mandalorian', 'Money Heist', 'Narcos', 'Ozark', 'Peaky Blinders', 'Prison Break', 'Protestar', 'Seinfeld', 'Sherlock', 'Squid Game', 'Stranger Things', 'The Boys', 'The Crown', 'The Witcher', 'True Detective', 'Umbrella Academy', 'Westworld', 'Yellowstone', 'You'] },
        { id: 'cls-12', name: 'Actor/Actriz', words: ['Angelina Jolie', 'Anthony Hopkins', 'Ben Affleck', 'Brad Pitt', 'Cate Blanchett', 'Christian Bale', 'Denzel Washington', 'Dwayne Johnson', 'Emma Watson', 'Harvey Keitel', 'Hugh Jackman', 'Jack Nicholson', 'Jennifer Lopez', 'Johnny Depp', 'Julia Roberts', 'Keanu Reeves', 'Leonardo DiCaprio', 'Meryl Streep', 'Natalie Portman', 'Nicolas Cage', 'Nicole Kidman', 'Orlando Bloom', 'Ryan Gosling', 'Scarlett Johansson', 'Tom Cruise', 'Tom Hanks', 'Will Smith'] },
        { id: 'cls-13', name: 'Villano', words: ['Arlequín', 'Brainiac', 'Carnage', 'Darth Maul', 'Darth Vader', 'Drácula', 'Dr. Doom', 'El Joker', 'Galactus', 'Hannibal Lecter', 'Hans Landa', 'IT', 'Loki', 'Magneto', 'Maleficent', 'Megatron', 'Pennywise', 'Ra\'s al Ghul', 'Red Skull', 'Sauron', 'Thanos', 'Ursula', 'Venom', 'Voldemort', 'Zemo'] },
        { id: 'cls-14', name: 'Superhéroe', words: ['Aquaman', 'Batman', 'Black Panther', 'Black Widow', 'Captain America', 'Capitana Marvel', 'Ciclope', 'Crystal', 'Daredevil', 'Deadpool', 'Doctor Strange', 'Flash', 'Green Lantern', 'Hulk', 'Iron Man', 'La Visión', 'Luna', 'Mujer Maravilla', 'Nightcrawler', 'Pantera Negra', 'Rayo', 'Rogue', 'Shazam', 'Spider-Man', 'Storm', 'Superman', 'Thor', 'Wolverine', 'X-Men'] },
        { id: 'cls-15', name: 'Personaje Ficticio', words: ['Alicia en el País de las Maravillas', 'Atticus Finch', 'Bilbo Bolsón', 'Darth Vader', 'Don Quijote', 'Dracula', 'Elizabeth Bennet', 'Frodo Bolsón', 'Gandalf', 'Harry Potter', 'Hermione Granger', 'Holden Caulfield', 'Jay Gatsby', 'Katniss Everdeen', 'Legolas', 'Luke Skywalker', 'Lyra Belacqua', 'Sherlock Holmes', 'Tyrion Lannister', 'Watson'] },
        { id: 'cls-16', name: 'Videojuego', words: ['Among Us', 'Animal Crossing', 'Assassin\'s Creed', 'Call of Duty', 'Counter Strike', 'Dark Souls', 'Doom', 'FIFA', 'Final Fantasy', 'Fortnite', 'Genshin Impact', 'GTA', 'Halo', 'League of Legends', 'Minecraft', 'Overwatch', 'Pac-Man', 'Pokémon', 'Resident Evil', 'Roblox', 'Super Mario', 'The Legend of Zelda', 'The Last of Us', 'The Sims', 'Tomb Raider', 'Uncharted', 'Valorant', 'World of Warcraft'] },
        { id: 'cls-17', name: 'Youtuber/Streamer', words: ['Auronplay', 'Dream', 'ibai', 'JuegaGerman', 'Luisito Comunica', 'Markiplier', 'MrBeast', 'PewDiePie', 'Rubius', 'Spreen', 'xQc', 'Ibai Llanos', 'Mikecrack', 'Vegetta777', 'Willyrex'] },
        { id: 'cls-20', name: 'Canción', words: ['Bohemian Rhapsody', 'Blinding Lights', 'Chantaje', 'Despacito', 'Gangnam Style', 'Hey Jude', 'Hotel California', 'Imagine', 'Levitating', 'Let It Be', 'Like a Rolling Stone', 'Macarena', 'Mr. Brightside', 'My Way', 'Numb', 'Purple Rain', 'Shake it Off', 'Shape of You', 'Smells Like Teen Spirit', 'Someone Like You', 'Stairway to Heaven', 'Sweet Child O\'Mine', 'Thriller', 'Yesterday'] },
        { id: 'cls-21', name: 'Cantante/Banda', words: ['Adele', 'Bad Bunny', 'Beyoncé', 'Billie Eilish', 'Britney Spears', 'Coldplay', 'David Bowie', 'Drake', 'Ed Sheeran', 'Eminem', 'Green Day', 'Iron Maiden', 'J Balvin', 'Justin Bieber', 'Kanye West', 'Lady Gaga', 'Linkin Park', 'Lizzo', 'Maluma', 'Maroon 5', 'Metallica', 'Michael Jackson', 'Nirvana', 'Ozzy Osbourne', 'Pink Floyd', 'Queen', 'Rihanna', 'Shakira', 'Taylor Swift', 'The Beatles', 'The Rolling Stones', 'U2'] },
        { id: 'cls-22', name: 'Instrumento Musical', words: ['Arpa', 'Bajo', 'Batería', 'Cello', 'Clarinete', 'Contrabajo', 'Fagot', 'Flauta', 'Guitarra', 'Guitarra eléctrica', 'Harmónica', 'Laúd', 'Mandolina', 'Marimba', 'Oboe', 'Órgano', 'Piano', 'Saxofón', 'Sitar', 'Tambor', 'Trombón', 'Trompeta', 'Tuba', 'Ukulele', 'Violín', 'Viola', 'Xilófono'] },
        { id: 'cls-23', name: 'Título de Canción de Reggaeton', words: ['Ay Vamos', 'Bebé', 'Boom Boom', 'Con Calma', 'Chantaje', 'Despacito', 'Dura', 'El Farsante', 'El Perdón', 'Hello', 'La Fouine', 'La Gozadera', 'La Pregunta', 'Lejos De Aquí', 'Mambú', 'Me Gusta', 'Mi Gente', 'Ñ de Ñoño', 'Nuestro Amor Eterno', 'Perras de Mi Mente', 'Qué Calor', 'Shaky Shaky', 'Solo', 'Taki Taki', 'Tu Nota', 'Unlimited'] },
        { id: 'cls-30', name: 'Marca', words: ['Adidas', 'Amazon', 'Apple', 'BMW', 'Coca-Cola', 'Disney', 'Google', 'Gucci', 'Harvard', 'IBM', 'IKEA', 'Intel', 'Johnson & Johnson', 'Lamborghini', 'Louis Vuitton', 'McDonald\'s', 'Mercedes-Benz', 'Microsoft', 'Netflix', 'Nike', 'Pepsi', 'Porsche', 'Red Bull', 'Samsung', 'Sony', 'Spotify', 'Starbucks', 'Tesla', 'Toyota', 'Versace', 'Volkswagen', 'Walmart', 'YouTube'] },
        { id: 'cls-31', name: 'Marca de Auto', words: ['Alfa Romeo', 'Aston Martin', 'Audi', 'BMW', 'Chevrolet', 'Ferrari', 'Ford', 'Honda', 'Hyundai', 'Jaguar', 'Jeep', 'Kia', 'Lamborghini', 'Land Rover', 'Maserati', 'Mazda', 'Mercedes-Benz', 'Mitsubishi', 'Nissan', 'Peugeot', 'Porsche', 'Renault', 'Rolls-Royce', 'Seat', 'Subaru', 'Suzuki', 'Tesla', 'Toyota', 'Volkswagen', 'Volvo'] },
        { id: 'cls-32', name: 'Marca de Ropa', words: ['Adidas', 'Balenciaga', 'Bershka', 'Calvin Klein', 'Chanel', 'Diesel', 'Dolce & Gabbana', 'Fendi', 'Gap', 'Givenchy', 'Gucci', 'H&M', 'Hugo Boss', 'Lacoste', 'Louis Vuitton', 'Levi\'s', 'Mango', 'Massimo Dutti', 'Nike', 'Polo Ralph Lauren', 'Pull&Bear', 'Puma', 'Ray-Ban', 'Tommy Hilfiger', 'Under Armour', 'Versace', 'Victoria\'s Secret', 'Zara'] },
        { id: 'cls-33', name: 'Marca de Tecnología', words: ['Adobe', 'Amazon', 'Apple', 'Asus', 'Cisco', 'Dell', 'Google', 'HP', 'Huawei', 'IBM', 'Intel', 'LG', 'Lenovo', 'Meta', 'Microsoft', 'Motorola', 'Nikon', 'Nokia', 'Nvidia', 'OnePlus', 'Oracle', 'Panasonic', 'Qualcomm', 'Razer', 'Samsung', 'Siemens', 'Sony', 'Toshiba', 'Xiaomi', 'Yahoo'] },
        { id: 'cls-34', name: 'App Móvil', words: ['AliExpress', 'BeReal', 'Candy Crush', 'ChatGPT', 'Duolingo', 'Facetime', 'FaceApp', 'Google Maps', 'Instagram', 'LinkedIn', 'Mercado Libre', 'Netflix', 'Pinterest', 'Reddit', 'Shazam', 'Snapchat', 'Spotify', 'TikTok', 'Tinder', 'Twitch', 'Uber', 'WhatsApp', 'YouTube', 'Zoom'] },
        { id: 'cls-35', name: 'Sitio Web', words: ['Amazon', 'Bing', 'ChatGPT', 'eBay', 'Facebook', 'Google', 'Instagram', 'LinkedIn', 'Netflix', 'Pinterest', 'Reddit', 'Spotify', 'Twitch', 'Twitter', 'WhatsApp Web', 'Wikipedia', 'Yahoo', 'YouTube', 'Zoom'] },
        { id: 'cls-40', name: 'Comida', words: ['Arroz', 'Asado', 'Burrito', 'Ceviche', 'Empanada', 'Enchilada', 'Falafel', 'Fish & Chips', 'Guacamole', 'Hamburguesa', 'Hummus', 'Lasaña', 'Macarrones', 'Mole', 'Paella', 'Pho', 'Pizza', 'Pozole', 'Ramen', 'Sushi', 'Tacos', 'Tamales', 'Tortilla', 'Wok'] },
        { id: 'cls-41', name: 'Ingrediente de Cocina', words: ['Aceite de oliva', 'Ajo', 'Arroz', 'Azúcar', 'Canela', 'Cebolla', 'Chile', 'Cúrcuma', 'Harina', 'Jengibre', 'Leche', 'Limón', 'Mantequilla', 'Mostaza', 'Orégano', 'Paprika', 'Perejil', 'Pimienta negra', 'Sal', 'Salsa de soya', 'Tomillo', 'Vinagre'] },
        { id: 'cls-42', name: 'Postre', words: ['Arroz con leche', 'Brownies', 'Cheesecake', 'Churros', 'Crepes', 'Donuts', 'Empanada dulce', 'Flan', 'Fresas con crema', 'Galletitas', 'Gelatina', 'Helado', 'Macarons', 'Mochi', 'Mousse', 'Panqueques', 'Profiteroles', 'Tarta', 'Tiramisu', 'Tres leches', 'Waffles'] },
        { id: 'cls-43', name: 'Bebida', words: ['Agua', 'Batido', 'Café', 'Cerveza', 'Champagne', 'Chicha', 'Chocolate caliente', 'Cóctel', 'Cola', 'Jugo de naranja', 'Kombucha', 'Leche', 'Limonada', 'Margarita', 'Mate', 'Refresco', 'Ron', 'Sangría', 'Smoothie', 'Té', 'Tequila', 'Vino', 'Vodka', 'Whisky'] },
        { id: 'cls-50', name: 'Deporte', words: ['Atletismo', 'Baloncesto', 'Béisbol', 'Boxeo', 'Ciclismo', 'Esgrima', 'Esquí', 'Fútbol', 'Fútbol Americano', 'Golf', 'Gimnasia', 'Halterofilia', 'Hockey', 'Judo', 'Karate', 'Lucha libre', 'Natación', 'Patinaje', 'Polo', 'Rugby', 'Taekwondo', 'Tenis', 'Tenis de mesa', 'Tiro con arco', 'Triatlón', 'Voleibol'] },
        { id: 'cls-51', name: 'Atleta/Deportista', words: ['Bolt', 'Cristiano Ronaldo', 'Federer', 'Gareth Bale', 'Ibrahimovic', 'Kaka', 'Lebron James', 'Leonel Messi', 'Michael Jordan', 'Michael Phelps', 'Muhammad Ali', 'Neymar', 'Pogba', 'Rafael Nadal', 'Ronaldinho', 'Schwarzenegger', 'Serena Williams', 'Tiger Woods', 'Usain Bolt', 'Zidane'] },
        { id: 'cls-52', name: 'Equipo Deportivo', words: ['AC Milan', 'Arsenal', 'Athletico Madrid', 'Barcelona', 'Bayern Munich', 'Borussia Dortmund', 'Chelsea', 'Chicago Bulls', 'Inter Miami', 'Inter Milan', 'Juventus', 'LA Lakers', 'Manchester City', 'Manchester United', 'Miami Heat', 'Nacional', 'New York Yankees', 'PSG', 'Real Madrid', 'River Plate'] },
        // Creative/open categories — no validation vocabulary (human voting)
        { id: 'cls-60', name: 'Excusa para llegar tarde', words: [] },
        { id: 'cls-61', name: 'Motivo de ruptura', words: [] },
        { id: 'cls-62', name: 'Lo primero que harías si ganas la lotería', words: [] },
        { id: 'cls-63', name: 'Nombre de banda de rock', words: [] },
        { id: 'cls-64', name: 'Insulto (suave)', words: [] },
        { id: 'cls-65', name: 'Palabra que rime con "Amor"', words: [] },
        { id: 'cls-66', name: 'Objeto en esta habitación', words: [] },
        { id: 'cls-67', name: 'Regalo terrible', words: [] },
    ];

async function seedClassicData() {
    console.log('🚀 Iniciando seed de categorías Classic (TutiFruti)...\n');

    let totalWords = 0;

    for (const cat of CLASSIC_DATA) {
        // 1. Upsert category
        const { error: catError } = await supabase.from('categories').upsert({
            id: cat.id,
            name: cat.name,
            game_mode: 'classic'
        }, { onConflict: 'id' });

        if (catError) {
            console.error(`❌ Error al subir categoría "${cat.name}":`, catError.message);
            continue;
        }

        // 2. Insert words (skip empty creative categories)
        if (cat.words.length > 0) {
            // Delete old words for this category to avoid duplicates
            await supabase.from('words').delete().eq('category_id', cat.id);

            const wordsToInsert = cat.words.map(w => ({
                category_id: cat.id,
                word: w,
                difficulty: 1
            }));

            const { error: wordsError } = await supabase.from('words').insert(wordsToInsert);

            if (wordsError) {
                console.error(`   ❌ Error al subir palabras de "${cat.name}":`, wordsError.message);
            } else {
                totalWords += cat.words.length;
                console.log(`   ✅ "${cat.name}" → ${cat.words.length} palabras`);
            }
        } else {
            console.log(`   📝 "${cat.name}" → categoría creativa (validación humana)`);
        }
    }

    console.log(`\n🎉 ¡Seed Classic completado! ${CLASSIC_DATA.length} categorías, ${totalWords} palabras de validación.`);
}

seedClassicData();
