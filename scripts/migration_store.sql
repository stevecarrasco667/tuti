-- ==========================================================
-- Migration: TutiStore - Catálogo, Inventario y Emojis Premium
-- ==========================================================

-- 1. Tabla de artículos de la tienda (Fuente de Verdad de compras)
CREATE TABLE IF NOT EXISTS public.store_items (
    id text PRIMARY KEY,
    type text NOT NULL CHECK (type IN ('EXPANSION', 'EMOJI', 'FRAME')),
    price integer NOT NULL CHECK (price >= 0),
    is_active boolean DEFAULT true,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now()
);

-- Habilitar RLS en store_items
ALTER TABLE public.store_items ENABLE ROW LEVEL SECURITY;

-- Política de lectura pública de artículos activos
DROP POLICY IF EXISTS "Allow public read active items" ON public.store_items;
CREATE POLICY "Allow public read active items" ON public.store_items
    FOR SELECT USING (is_active = true);

-- 2. Tabla de inventario / posesiones de los usuarios
CREATE TABLE IF NOT EXISTS public.user_inventory (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    item_id text REFERENCES public.store_items(id) ON DELETE RESTRICT NOT NULL,
    unlocked_at timestamp with time zone DEFAULT now(),
    equipped_at timestamp with time zone DEFAULT null,
    UNIQUE(user_id, item_id)
);

-- Habilitar RLS en user_inventory
ALTER TABLE public.user_inventory ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS
DROP POLICY IF EXISTS "Allow read own inventory" ON public.user_inventory;
CREATE POLICY "Allow read own inventory" ON public.user_inventory
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Allow update own inventory configuration" ON public.user_inventory;
CREATE POLICY "Allow update own inventory configuration" ON public.user_inventory
    FOR UPDATE USING (auth.uid() = user_id);

-- 3. Modificar categorías para admitir asociación a paquetes de expansiones
ALTER TABLE public.categories 
ADD COLUMN IF NOT EXISTS pack_id text REFERENCES public.store_items(id) ON DELETE SET NULL DEFAULT null;

-- 4. Extender RPC purchase_store_item para registrar compras en user_inventory
CREATE OR REPLACE FUNCTION purchase_store_item(p_user_id uuid, p_item_id text, p_price int)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    user_coins int;
    already_owned boolean;
    item_exists boolean;
    db_price int;
BEGIN
    -- Asegurar que el perfil existe
    PERFORM public.ensure_profile_exists(p_user_id);

    -- Verificar que el artículo existe en la base de datos y obtener su precio oficial
    SELECT EXISTS(SELECT 1 FROM public.store_items WHERE id = p_item_id AND is_active = true) INTO item_exists;
    IF NOT item_exists THEN
        RETURN jsonb_build_object('success', false, 'error', 'item_not_found');
    END IF;

    SELECT price INTO db_price FROM public.store_items WHERE id = p_item_id;
    IF db_price <> p_price THEN
        RETURN jsonb_build_object('success', false, 'error', 'price_mismatch');
    END IF;

    -- Comprobar si ya posee el cosmético/pack en el inventario
    SELECT EXISTS(SELECT 1 FROM public.user_inventory WHERE user_id = p_user_id AND item_id = p_item_id) INTO already_owned;
    IF already_owned THEN
        RETURN jsonb_build_object('success', false, 'error', 'item_already_owned');
    END IF;

    -- Leer saldo de monedas
    SELECT coins INTO user_coins FROM public.profiles WHERE id = p_user_id;
    IF user_coins < db_price THEN
        RETURN jsonb_build_object('success', false, 'error', 'insufficient_funds');
    END IF;

    -- Deducir monedas y registrar desbloqueo en el inventario de usuario
    UPDATE public.profiles 
    SET coins = coins - db_price
    WHERE id = p_user_id;

    INSERT INTO public.user_inventory (user_id, item_id)
    VALUES (p_user_id, p_item_id);

    INSERT INTO public.coin_transactions (user_id, amount, reason)
    VALUES (p_user_id, -db_price, 'purchase_' || p_item_id);

    RETURN jsonb_build_object(
        'success', true, 
        'unlockedItem', p_item_id, 
        'remainingCoins', (SELECT coins FROM public.profiles WHERE id = p_user_id)
    );
END;
$$;

-- 5. Función de sesión completa de perfil e inventario
CREATE OR REPLACE FUNCTION get_user_session_payload(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    res jsonb;
BEGIN
    -- Asegurar que el perfil existe
    PERFORM public.ensure_profile_exists(p_user_id);

    SELECT jsonb_build_object(
        'profile', (SELECT jsonb_build_object(
            'id', id,
            'coins', coins,
            'frame_id', frame_id,
            'vip', ad_free_vip
        ) FROM public.profiles WHERE id = p_user_id),
        'unlocked_items', COALESCE((
            SELECT jsonb_agg(item_id) 
            FROM public.user_inventory 
            WHERE user_id = p_user_id
        ), '[]'::jsonb)
    ) INTO res;
    
    RETURN res;
END;
$$;

-- 6. Trigger / Webhook para notificar a la Edge Function de actualización
-- Nota: En producción, se recomienda activar un Database Webhook desde la consola de Supabase.
-- Como automatización en SQL, creamos el disparador que realiza el HTTP POST asíncrono vía pg_net si está disponible.
CREATE OR REPLACE FUNCTION public.notify_catalog_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Intenta disparar la petición HTTP POST a la Edge Function
    -- NOTA: Supabase expone la extensión pg_net bajo el esquema 'net'
    BEGIN
        PERFORM net.http_post(
            url := 'http://localhost:54321/functions/v1/generate-catalog', -- URL de desarrollo local
            headers := '{"Content-Type": "application/json"}'::jsonb,
            body := '{}'::jsonb
        );
    EXCEPTION WHEN OTHERS THEN
        -- Si pg_net no está activo o es producción externa, ignora el fallo.
        -- En producción se configura a través del panel de Webhooks de Supabase.
        NULL;
    END;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_store_item_change ON public.store_items;
CREATE TRIGGER on_store_item_change
    AFTER INSERT OR UPDATE OR DELETE ON public.store_items
    FOR EACH STATEMENT EXECUTE FUNCTION public.notify_catalog_change();

-- 7. Insertar catálogo completo de artículos de la TutiStore
-- Marcos de Avatar (5), Expansiones de Categorías (3), Packs de Emojis (4)
INSERT INTO public.store_items (id, type, price, metadata) VALUES
    -- ── Marcos de Avatar ──────────────────────────────────────────────
    ('frame_neon',    'FRAME', 100, '{"name_key": "store.frame_neon",    "className": "frame-neon"}'),
    ('frame_gold',    'FRAME', 200, '{"name_key": "store.frame_gold",    "className": "frame-gold"}'),
    ('frame_fire',    'FRAME', 300, '{"name_key": "store.frame_fire",    "className": "frame-fire"}'),
    ('frame_rainbow', 'FRAME', 500, '{"name_key": "store.frame_rainbow", "className": "frame-rainbow"}'),
    ('frame_cosmic',  'FRAME', 400, '{"name_key": "store.frame_cosmic",  "className": "frame-cosmic"}'),

    -- ── Expansiones de Categorías ──────────────────────────────────────
    ('pack_futbol', 'EXPANSION', 250, '{"name_key": "store.pack_futbol", "description_key": "store.pack_futbol_desc", "categories": ["Deporte", "Atleta/Deportista", "Equipo Deportivo"]}'),
    ('pack_gamer',  'EXPANSION', 300, '{"name_key": "store.pack_gamer",  "description_key": "store.pack_gamer_desc", "categories": ["Videojuego", "Youtuber/Streamer", "Marca de Tecnología"]}'),
    ('pack_cine',   'EXPANSION', 250, '{"name_key": "store.pack_cine",   "description_key": "store.pack_cine_desc", "categories": ["Película", "Serie de TV", "Actor/Actriz", "Villano", "Superhéroe", "Personaje Ficticio"]}'),

    -- ── Packs de Emojis (reacciones en fase de votaciones) ────────────
    ('pack_emojis_gamer', 'EMOJI', 120,
        '{"name_key": "store.pack_emojis_gamer", "description_key": "store.pack_emojis_gamer_desc",
          "emojis": ["🎮", "👾", "🕹️", "⚔️", "👑", "🎯"]}'),
    ('pack_emojis_spicy', 'EMOJI', 100,
        '{"name_key": "store.pack_emojis_spicy", "description_key": "store.pack_emojis_spicy_desc",
          "emojis": ["🔥", "🌶️", "💩", "🤡", "👻", "🤮"]}'),
    ('pack_emojis_memes', 'EMOJI', 150,
        '{"name_key": "store.pack_emojis_memes", "description_key": "store.pack_emojis_memes_desc",
          "emojis": ["🤔", "🤫", "🥱", "🧠", "🤠", "👽"]}'),
    ('pack_emojis_otaku', 'EMOJI', 130,
        '{"name_key": "store.pack_emojis_otaku", "description_key": "store.pack_emojis_otaku_desc",
          "emojis": ["🍥", "👺", "🦊", "⛩️", "🌸", "🎋"]}')
ON CONFLICT (id) DO UPDATE SET 
    price    = EXCLUDED.price,
    metadata = EXCLUDED.metadata;

-- 8. Vincular categorías clásicas a sus paquetes correspondientes
UPDATE public.categories SET pack_id = 'pack_futbol' WHERE id IN ('cls-50', 'cls-51', 'cls-52');
UPDATE public.categories SET pack_id = 'pack_gamer' WHERE id IN ('cls-16', 'cls-17', 'cls-33');
UPDATE public.categories SET pack_id = 'pack_cine' WHERE id IN ('cls-10', 'cls-11', 'cls-12', 'cls-13', 'cls-14', 'cls-15');
