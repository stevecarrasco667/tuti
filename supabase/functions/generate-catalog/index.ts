import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

serve(async (req) => {
  // Manejo de CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      }
    });
  }

  try {
    // 1. Obtener variables de entorno oficiales de Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Instanciar cliente con privilegios de service_role (requerido para escribir en Storage de forma automatizada)
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    // 2. Consultar artículos activos en la base de datos
    const { data: items, error: fetchErr } = await supabase
      .from('store_items')
      .select('id, type, price, metadata')
      .eq('is_active', true);

    if (fetchErr) {
      throw new Error(`Error al leer la base de datos de catalogo: ${fetchErr.message}`);
    }

    // 3. Estructurar el payload del catálogo
    const catalog = {
      updatedAt: new Date().toISOString(),
      items: items || []
    };

    const catalogString = JSON.stringify(catalog, null, 2);
    const catalogBlob = new Blob([catalogString], { type: 'application/json' });

    // 4. Subir/Sobrescribir el archivo en el bucket 'store' con el path 'store_catalog.json'
    // El bucket debe crearse previamente como public.
    const { error: uploadErr } = await supabase.storage
      .from('store')
      .upload('store_catalog.json', catalogBlob, {
        contentType: 'application/json',
        upsert: true
      });

    if (uploadErr) {
      throw new Error(`Error al subir catalogo a Storage: ${uploadErr.message}`);
    }

    console.log('[generate-catalog] Catalogo store_catalog.json regenerado exitosamente.');

    return new Response(
      JSON.stringify({ success: true, message: 'Catalogo generado y subido con éxito.' }),
      { 
        status: 200, 
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        } 
      }
    );
  } catch (error: any) {
    console.error('[generate-catalog] Error critico:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { 
        status: 500, 
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        } 
      }
    );
  }
});
