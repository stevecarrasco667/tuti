import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SUPABASE_URL = 'https://ebrawwgtbpguwyyioifb.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVicmF3d2d0YnBndXd5eWlvaWZiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjkxMTY1MCwiZXhwIjoyMDg4NDg3NjUwfQ.11dDImiGl8oaILOGxomQMEOo2N_1qkpYSXuVoI7tEDo'; // IMPORTANTE: Usa la clave secreta "service_role"

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function seedImpostorData() {
    console.log('🚀 Iniciando migración de datos de Impostor...');
    
    // 1. Ruta a tus JSON de Impostor
    const impostorDir = path.resolve(__dirname, './shared/dictionaries/impostor/data');
    
    if (!fs.existsSync(impostorDir)) {
        console.error('❌ No se encontró la carpeta:', impostorDir);
        return;
    }

    const files = fs.readdirSync(impostorDir).filter(f => f.endsWith('.json'));

    for (const file of files) {
        const rawData = fs.readFileSync(path.join(impostorDir, file), 'utf-8');
        const categoryData = JSON.parse(rawData);

        // 2. Insertar Categoría en Supabase
        console.log(`📌 Subiendo categoría: ${categoryData.name} (Impostor)`);
        const { error: catError } = await supabase.from('categories').upsert({
            id: categoryData.categoryId,
            name: categoryData.name,
            game_mode: 'impostor'
        });

        if (catError) {
            console.error('Error al subir categoría:', catError);
            continue;
        }

        // 3. Preparar e Insertar Palabras
        const wordsToInsert = categoryData.words.map((w: any) => ({
            category_id: categoryData.categoryId,
            word: w.word,
            difficulty: w.difficulty || 1
        }));

        const { error: wordsError } = await supabase.from('words').insert(wordsToInsert);
        
        if (wordsError) {
            console.error(`❌ Error al subir palabras de ${categoryData.name}:`, wordsError.message);
        } else {
            console.log(`✅ ${wordsToInsert.length} palabras subidas correctamente.`);
        }
    }
    
    console.log('🎉 ¡Migración de Impostor completada!');
}

seedImpostorData();