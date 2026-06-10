import { ref, watch } from 'vue';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';

export interface StoreItem {
    id: string;
    name: string;
    description: string;
    price: number;
    className: string; // CSS class for visual frame animation
    type: string; // FRAME | EMOJI | EXPANSION
    metadata?: any;
}

export const STORE_ITEMS = ref<StoreItem[]>([
    {
        id: 'frame_neon',
        name: 'Marco Neón',
        description: 'Borde brillante neón cian y rosa',
        price: 100,
        className: 'frame-neon',
        type: 'FRAME'
    },
    {
        id: 'frame_gold',
        name: 'Marco Dorado',
        description: 'Elegancia premium de oro resplandeciente',
        price: 200,
        className: 'frame-gold',
        type: 'FRAME'
    },
    {
        id: 'frame_fire',
        name: 'Marco de Fuego',
        description: 'Llamas ardientes de pasión competitiva',
        price: 300,
        className: 'frame-fire',
        type: 'FRAME'
    },
    {
        id: 'frame_rainbow',
        name: 'Marco Arcoíris',
        description: 'Espectro dinámico multicolor',
        price: 500,
        className: 'frame-rainbow',
        type: 'FRAME'
    }
]);

const coins = ref<number>(0);
const unlockedFrames = ref<string[]>([]);
const equippedFrame = ref<string | null>(null);
const isLoading = ref<boolean>(false);

const fetchCatalog = async () => {
    try {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        if (!supabaseUrl) return;
        const res = await fetch(`${supabaseUrl}/storage/v1/object/public/store/store_catalog.json?t=${Date.now()}`);
        if (!res.ok) throw new Error('Catalog file not found');
        const data: any = await res.json();
        if (data && Array.isArray(data.items)) {
            STORE_ITEMS.value = data.items.map((item: any) => ({
                id: item.id,
                name: item.metadata?.name_key || item.id,
                description: item.metadata?.description_key || '',
                price: item.price,
                className: item.metadata?.className || '',
                type: item.type,
                metadata: item.metadata || {}
            }));
        }
    } catch (err) {
        console.warn('[useProfile] Could not fetch remote store catalog, using fallback:', err);
    }
};

export function useProfile() {
    const { isAuthenticated, user } = useAuth();

    const fetchProfile = async () => {
        await fetchCatalog();

        if (!isAuthenticated.value || !user.value) {
            // Load local guest profile
            coins.value = parseInt(localStorage.getItem('tuti-guest-coins') || '0', 10);
            try {
                const u = localStorage.getItem('tuti-guest-unlocks');
                unlockedFrames.value = u ? JSON.parse(u) : [];
            } catch {
                unlockedFrames.value = [];
            }
            equippedFrame.value = localStorage.getItem('tuti-equipped-frame') || null;
            return;
        }

        isLoading.value = true;
        try {
            // 1. Fetch profile coins and equipped frame
            const { data: profile, error: profileErr } = await supabase
                .from('profiles')
                .select('coins, frame_id')
                .eq('id', user.value.id)
                .single();

            if (profileErr) {
                // If profiles doesn't exist or error, fallback to defaults
                console.warn('[useProfile] Could not fetch profile table:', profileErr);
            } else if (profile) {
                coins.value = profile.coins ?? 0;
                equippedFrame.value = profile.frame_id || null;
            }

            // 2. Fetch unlocked items (inventory)
            const { data: unlocks, error: unlocksErr } = await supabase
                .from('user_inventory')
                .select('item_id')
                .eq('user_id', user.value.id);

            if (unlocksErr) {
                console.warn('[useProfile] Could not fetch unlocks:', unlocksErr);
            } else {
                unlockedFrames.value = unlocks ? unlocks.map((u: any) => u.item_id) : [];
            }
        } catch (err) {
            console.error('[useProfile] Error fetching cloud profile:', err);
        } finally {
            isLoading.value = false;
        }
    };

    const purchaseFrame = async (itemId: string, price: number): Promise<{ success: boolean; error?: string }> => {
        if (unlockedFrames.value.includes(itemId)) {
            return { success: false, error: 'item_already_owned' };
        }

        if (!isAuthenticated.value || !user.value) {
            // Local guest purchase
            const localCoins = parseInt(localStorage.getItem('tuti-guest-coins') || '0', 10);
            if (localCoins < price) {
                return { success: false, error: 'insufficient_funds' };
            }

            // Deduct coins and update unlocks
            const nextCoins = localCoins - price;
            const nextUnlocks = [...unlockedFrames.value, itemId];

            localStorage.setItem('tuti-guest-coins', String(nextCoins));
            localStorage.setItem('tuti-guest-unlocks', JSON.stringify(nextUnlocks));

            coins.value = nextCoins;
            unlockedFrames.value = nextUnlocks;
            return { success: true };
        }

        // Authenticated database purchase
        try {
            isLoading.value = true;
            const { data, error } = await supabase.rpc('purchase_store_item', {
                p_user_id: user.value.id,
                p_item_id: itemId,
                p_price: price
            });

            if (error) {
                return { success: false, error: error.message };
            }

            if (data && data.success) {
                coins.value = data.remainingCoins ?? coins.value;
                unlockedFrames.value.push(itemId);
                return { success: true };
            } else {
                return { success: false, error: data?.error || 'unknown_error' };
            }
        } catch (err) {
            console.error('[useProfile] Store purchase failed:', err);
            return { success: false, error: 'network_error' };
        } finally {
            isLoading.value = false;
        }
    };

    const equipFrame = async (itemId: string | null): Promise<boolean> => {
        if (itemId && !unlockedFrames.value.includes(itemId)) {
            console.warn('[useProfile] Cannot equip locked frame.');
            return false;
        }

        if (!isAuthenticated.value || !user.value) {
            // Local guest equip
            if (itemId === null) {
                localStorage.removeItem('tuti-equipped-frame');
            } else {
                localStorage.setItem('tuti-equipped-frame', itemId);
            }
            equippedFrame.value = itemId;
            return true;
        }

        // Authenticated database update
        try {
            isLoading.value = true;
            const { error } = await supabase
                .from('profiles')
                .update({ frame_id: itemId })
                .eq('id', user.value.id);

            if (error) throw error;
            equippedFrame.value = itemId;
            return true;
        } catch (err) {
            console.error('[useProfile] Equip frame update failed:', err);
            return false;
        } finally {
            isLoading.value = false;
        }
    };

    const addTestCoins = async (amount: number = 100) => {
        if (!isAuthenticated.value || !user.value) {
            const current = parseInt(localStorage.getItem('tuti-guest-coins') || '0', 10);
            const next = current + amount;
            localStorage.setItem('tuti-guest-coins', String(next));
            coins.value = next;
            return;
        }

        try {
            isLoading.value = true;
            const next = coins.value + amount;
            const { error } = await supabase
                .from('profiles')
                .update({ coins: next })
                .eq('id', user.value.id);
            if (!error) {
                coins.value = next;
            }
        } catch (err) {
            console.error('[useProfile] Failed to add test coins:', err);
        } finally {
            isLoading.value = false;
        }
    };

    // Watch auth status to fetch profile immediately
    watch(isAuthenticated, () => {
        fetchProfile();
    }, { immediate: true });

    return {
        coins,
        unlockedFrames,
        equippedFrame,
        isLoading,
        fetchProfile,
        purchaseFrame,
        equipFrame,
        addTestCoins
    };
}
