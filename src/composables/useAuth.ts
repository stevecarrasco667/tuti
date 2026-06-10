import { ref } from 'vue';
import { supabase } from '../lib/supabase';
import type { User } from '@supabase/supabase-js';

// Global reactive state
const user = ref<User | null>(null);
const isLoading = ref(true);
const isAuthenticated = ref(false);

// Reference to the active auth listener subscription to prevent memory leaks and duplicates on HMR
let authSubscription: { unsubscribe: () => void } | null = null;

// Initialize state and setup listener ONCE
if (!authSubscription) {
    supabase.auth.getSession().then(({ data: { session }, error }) => {
        if (error) {
            console.error('Error al obtener la sesión inicial:', error);
        } else {
            user.value = session?.user || null;
            isAuthenticated.value = !!session?.user;
        }
        isLoading.value = false;
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        user.value = session?.user || null;
        isAuthenticated.value = !!session?.user;
        isLoading.value = false;
        
        if (event === 'SIGNED_IN' && session?.user) {
            console.log('User signed in:', session.user.email);
            // Run Cloud Sync (fusion of guest data to cloud)
            const guestCoins = parseInt(localStorage.getItem('tuti-guest-coins') || '0', 10);
            let guestUnlocks: string[] = [];
            try {
                const u = localStorage.getItem('tuti-guest-unlocks');
                if (u) guestUnlocks = JSON.parse(u);
            } catch {}
            let guestHistory: any[] = [];
            try {
                const h = localStorage.getItem('tuti_player_history_v1');
                if (h) guestHistory = JSON.parse(h);
            } catch {}

            if (guestCoins > 0 || guestUnlocks.length > 0 || guestHistory.length > 0) {
                console.log('[Cloud Sync] Merging guest coins, unlocks and history to database...');
                supabase.rpc('sync_guest_data_on_signup', {
                    p_user_id: session.user.id,
                    guest_coins: guestCoins,
                    guest_unlocks: guestUnlocks,
                    guest_history: guestHistory
                }).then(({ data, error }) => {
                    if (error) {
                        console.error('[Cloud Sync] Error merging guest data:', error);
                    } else {
                        console.log('[Cloud Sync] Guest data merged successfully:', data);
                        // Clear guest localStorage keys after successful cloud merge
                        localStorage.removeItem('tuti-guest-coins');
                        localStorage.removeItem('tuti-guest-unlocks');
                        localStorage.removeItem('tuti-equipped-frame'); // reset local equipped frame
                        localStorage.removeItem('tuti_player_history_v1');
                    }
                });
            }
        } else if (event === 'SIGNED_OUT') {
            console.log('User signed out.');
        }
    });

    authSubscription = subscription;
}

export function useAuth() {
    // Iniciar sesión con Google OAuth
    const signInWithGoogle = async () => {
        try {
            const { error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: window.location.origin
                }
            });
            if (error) throw error;
        } catch (error) {
            console.error('Error al iniciar sesión con Google:', error);
        }
    };

    // Cerrar sesión
    const signOut = async () => {
        try {
            const { error } = await supabase.auth.signOut();
            if (error) throw error;
        } catch (error) {
            console.error('Error al cerrar sesión:', error);
        }
    };

    return {
        user,
        isLoading,
        isAuthenticated,
        signInWithGoogle,
        signOut
    };
}
