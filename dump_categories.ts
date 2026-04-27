import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
dotenv.config();

const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const key = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
    console.error("Missing Supabase credentials in .env");
    process.exit(1);
}

const supabase = createClient(url, key);

async function run() {
    const { data, error } = await supabase.from('categories').select('id, name').order('id');
    if (error) {
        console.error(error);
        return;
    }
    const categories: Record<string, string> = {};
    for (const cat of data || []) {
        categories[String(cat.id)] = String(cat.name);
    }
    fs.writeFileSync('categories_dump.json', JSON.stringify(categories, null, 2));
    console.log("Dumped", data.length, "categories");
}
run();
