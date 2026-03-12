import { ref } from 'vue';
import { supabase } from '../lib/supabase';
import type { User } from '@supabase/supabase-js';

// Global reactive state
const user = ref<User | null>(null);
const isLoading = ref(true);
const isAuthenticated = ref(false);

// Initialize state and setup listener ONCE
supabase.auth.getSession().then(({ data: { session }, error }) => {
    if (error) {
        console.error('Error al obtener la sesión inicial:', error);
    } else {
        user.value = session?.user || null;
        isAuthenticated.value = !!session?.user;
    }
    isLoading.value = false;
});

supabase.auth.onAuthStateChange((event, session) => {
    user.value = session?.user || null;
    isAuthenticated.value = !!session?.user;
    isLoading.value = false;
    
    if (event === 'SIGNED_IN') {
        console.log('User signed in:', session?.user.email);
    } else if (event === 'SIGNED_OUT') {
        console.log('User signed out.');
    }
});

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
