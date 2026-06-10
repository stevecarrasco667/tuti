-- 0. Crear tabla profiles si no existe (con RLS y trigger automático)
CREATE TABLE IF NOT EXISTS public.profiles (
    id uuid REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    name text,
    avatar text,
    email text,
    created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Allow public read profiles'
    ) THEN
        CREATE POLICY "Allow public read profiles" ON public.profiles FOR SELECT USING (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Allow update own profile'
    ) THEN
        CREATE POLICY "Allow update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
    END IF;
END
$$;

-- Función para insertar perfil al registrarse
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, name, avatar, email)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', 'Jugador'),
    COALESCE(new.raw_user_meta_data->>'avatar_url', '👤'),
    new.email
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Trigger para auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 1. Modificar tabla profiles para añadir columnas de economía y marcos
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS coins integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS coins_earned_today integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS frame_id text DEFAULT null,
ADD COLUMN IF NOT EXISTS ad_free_vip boolean DEFAULT false;

-- 2. Crear tabla user_unlocks para compras de cosméticos
CREATE TABLE IF NOT EXISTS user_unlocks (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
    item_id text NOT NULL,
    unlocked_at timestamp with time zone DEFAULT now(),
    UNIQUE(user_id, item_id)
);

-- Habilitar RLS en user_unlocks
ALTER TABLE user_unlocks ENABLE ROW LEVEL SECURITY;

-- Políticas para user_unlocks
CREATE POLICY "Allow read own unlocks" ON user_unlocks
    FOR SELECT USING (auth.uid() = user_id);

-- 3. Crear tabla match_history para guardar partidas en la nube
CREATE TABLE IF NOT EXISTS match_history (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
    mode text NOT NULL,
    my_score integer NOT NULL,
    my_rank integer NOT NULL,
    total_players integer NOT NULL,
    won boolean NOT NULL,
    date timestamp with time zone DEFAULT now()
);

-- Habilitar RLS en match_history
ALTER TABLE match_history ENABLE ROW LEVEL SECURITY;

-- Políticas para match_history
CREATE POLICY "Allow read own history" ON match_history
    FOR SELECT USING (auth.uid() = user_id);

-- 4. Crear tabla coin_transactions para auditoría de transacciones de monedas
CREATE TABLE IF NOT EXISTS coin_transactions (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
    amount integer NOT NULL,
    reason text NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);

-- Habilitar RLS en coin_transactions
ALTER TABLE coin_transactions ENABLE ROW LEVEL SECURITY;

-- Políticas para coin_transactions
CREATE POLICY "Allow read own transactions" ON coin_transactions
    FOR SELECT USING (auth.uid() = user_id);

-- 5. Crear función claim_match_rewards para procesar de servidor a servidor
CREATE OR REPLACE FUNCTION claim_match_rewards(rewards_payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER -- Se ejecuta con privilegios del creador para saltarse RLS desde PartyKit
AS $$
DECLARE
    reward_item jsonb;
    p_user_id uuid;
    p_coins int;
    p_mode text;
    p_score int;
    p_rank int;
    p_total_players int;
    p_won boolean;
    actual_added int;
    current_earned_today int;
    remaining_cap int;
    result_array jsonb := '[]'::jsonb;
    user_exists boolean;
BEGIN
    -- El payload debe ser una lista de objetos:
    -- [{"userId": "uuid", "coins": 50, "mode": "CLASSIC", "score": 100, "rank": 1, "totalPlayers": 4, "won": true}]
    FOR reward_item IN SELECT * FROM jsonb_array_elements(rewards_payload)
    LOOP
        p_user_id := (reward_item->>'userId')::uuid;
        p_coins := (reward_item->>'coins')::int;
        p_mode := reward_item->>'mode';
        p_score := (reward_item->>'score')::int;
        p_rank := (reward_item->>'rank')::int;
        p_total_players := (reward_item->>'totalPlayers')::int;
        p_won := (reward_item->>'won')::boolean;

        -- Verificar si el perfil existe
        SELECT EXISTS(SELECT 1 FROM profiles WHERE id = p_user_id) INTO user_exists;
        
        IF user_exists THEN
            -- Leer su tope diario acumulado hoy
            SELECT coins_earned_today INTO current_earned_today FROM profiles WHERE id = p_user_id;
            
            -- Calcular espacio disponible hasta el tope de 300
            remaining_cap := 300 - current_earned_today;
            
            IF remaining_cap <= 0 THEN
                actual_added := 0;
            ELSE
                actual_added := LEAST(p_coins, remaining_cap);
            END IF;

            -- Si realmente se agregan monedas, actualizar perfil y registrar transacción
            IF actual_added > 0 THEN
                UPDATE profiles 
                SET coins = coins + actual_added,
                    coins_earned_today = coins_earned_today + actual_added
                WHERE id = p_user_id;

                INSERT INTO coin_transactions (user_id, amount, reason)
                VALUES (p_user_id, actual_added, 'match_reward');
            END IF;

            -- Insertar registro en historial de partidas (independiente del tope de monedas)
            INSERT INTO match_history (user_id, mode, my_score, my_rank, total_players, won)
            VALUES (p_user_id, p_mode, p_score, p_rank, p_total_players, p_won);

            -- Añadir resultado de este usuario al json de retorno
            result_array := result_array || jsonb_build_object(
                'userId', p_user_id,
                'coinsEarned', actual_added,
                'totalCoins', (SELECT coins FROM profiles WHERE id = p_user_id)
            );
        END IF;
    END LOOP;

    RETURN result_array;
END;
$$;

-- 6. Crear función purchase_store_item para compra de cosméticos
CREATE OR REPLACE FUNCTION purchase_store_item(p_user_id uuid, p_item_id text, p_price int)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    user_coins int;
    already_owned boolean;
BEGIN
    -- Comprobar si ya posee el cosmético
    SELECT EXISTS(SELECT 1 FROM user_unlocks WHERE user_id = p_user_id AND item_id = p_item_id) INTO already_owned;
    
    IF already_owned THEN
        RETURN jsonb_build_object('success', false, 'error', 'item_already_owned');
    END IF;

    -- Leer saldo de monedas
    SELECT coins INTO user_coins FROM profiles WHERE id = p_user_id;
    
    IF user_coins < p_price THEN
        RETURN jsonb_build_object('success', false, 'error', 'insufficient_funds');
    END IF;

    -- Deducir monedas y registrar desbloqueo
    UPDATE profiles 
    SET coins = coins - p_price
    WHERE id = p_user_id;

    INSERT INTO user_unlocks (user_id, item_id)
    VALUES (p_user_id, p_item_id);

    INSERT INTO coin_transactions (user_id, amount, reason)
    VALUES (p_user_id, -p_price, 'purchase_' || p_item_id);

    RETURN jsonb_build_object(
        'success', true, 
        'unlockedItem', p_item_id, 
        'remainingCoins', (SELECT coins FROM profiles WHERE id = p_user_id)
    );
END;
$$;

-- 7. Crear función sync_guest_data_on_signup para fusionar datos
CREATE OR REPLACE FUNCTION sync_guest_data_on_signup(
    p_user_id uuid,
    guest_coins int,
    guest_unlocks text[],
    guest_history jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    unlock_item text;
    history_item jsonb;
    p_mode text;
    p_score int;
    p_rank int;
    p_total_players int;
    p_won boolean;
    p_date timestamp with time zone;
    added_coins int := 0;
BEGIN
    -- 1. Sumar monedas del invitado
    IF guest_coins > 0 THEN
        -- Aplicamos las monedas directamente al perfil
        UPDATE profiles
        SET coins = coins + guest_coins
        WHERE id = p_user_id;
        
        INSERT INTO coin_transactions (user_id, amount, reason)
        VALUES (p_user_id, guest_coins, 'guest_coins_merge');
        
        added_coins := guest_coins;
    END IF;

    -- 2. Migrar marcos desbloqueados
    IF guest_unlocks IS NOT NULL THEN
        FOREACH unlock_item IN ARRAY guest_unlocks
        LOOP
            INSERT INTO user_unlocks (user_id, item_id)
            VALUES (p_user_id, unlock_item)
            ON CONFLICT (user_id, item_id) DO NOTHING;
        END LOOP;
    END IF;

    -- 3. Migrar historial de partidas
    IF guest_history IS NOT NULL THEN
        FOR history_item IN SELECT * FROM jsonb_array_elements(guest_history)
        LOOP
            p_mode := history_item->>'mode';
            p_score := (history_item->>'myScore')::int;
            p_rank := (history_item->>'myRank')::int;
            p_total_players := (history_item->>'totalPlayers')::int;
            p_won := (history_item->>'won')::boolean;
            p_date := (history_item->>'date')::timestamp with time zone;

            INSERT INTO match_history (user_id, mode, my_score, my_rank, total_players, won, date)
            VALUES (p_user_id, p_mode, p_score, p_rank, p_total_players, p_won, COALESCE(p_date, now()));
        END LOOP;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'mergedCoins', added_coins,
        'totalCoins', (SELECT coins FROM profiles WHERE id = p_user_id)
    );
END;
$$;
