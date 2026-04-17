<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { generateRoomId, generateRandomName } from '../utils/random';
import { useGame } from '../composables/useGame';
import { useLobby } from '../composables/useLobby';
import { useAuth } from '../composables/useAuth';
import { useToast } from '../composables/useToast';
import { AVATARS } from '../constants/avatars';
import TCard from './ui/TCard.vue';
import TButton from './ui/TButton.vue';
import TInput from './ui/TInput.vue';

const { joinGame, myUserName, myUserAvatar } = useGame();
const { publicRooms, connect, refreshRooms } = useLobby();
const { user, isAuthenticated, isLoading, signInWithGoogle, signOut } = useAuth();
const { addToast } = useToast();

const showJoinInput = ref(false);
const joinCode = ref('');
const isPublicRoom = ref(false);
const isRefreshing = ref(false);
const isEditingProfile = ref(false);

// [Sprint H4 — FE-4] AVATARS imported from src/constants/avatars.ts (was duplicated here and useGameState.ts)

// ─── FASE 3: FIX DE REACTIVIDAD ───────────────────────────────────────────────
// Computed bidireccional sobre el ref original de useGame.
// Si el backend hidrata la sesión, myUserName.value cambia y la UI reacciona.
// Se elimina el ref local aislado y su watch unidireccional.
const playerName = computed({
    get: () => myUserName.value,
    set: (val: string) => { myUserName.value = val; },
});

const selectedAvatar = myUserAvatar;
// ──────────────────────────────────────────────────────────────────────────────

// [Phoenix Lobby] Connect + Zero Friction Identity
onMounted(() => {
    connect();

    // Auto-assign identity if empty
    if (!myUserName.value.trim()) {
        myUserName.value = generateRandomName();
    }
    if (!myUserAvatar.value || myUserAvatar.value === '🦁') {
        selectedAvatar.value = AVATARS[Math.floor(Math.random() * AVATARS.length)];
    }
});

// Reactividad a cambios de autenticación
watch(user, (newUser) => {
    if (newUser) {
        // Autocompletar con los datos de Google si el usuario acaba de iniciar sesión
        myUserName.value = newUser.user_metadata.full_name || newUser.user_metadata.name || myUserName.value;
        // La foto de perfil de Google podríamos usarla, pero por ahora en Tuti se usa emojies, a menos que en el futuro rendericemos imgs de perfil
    }
}, { immediate: true });

// --- Action Handlers ---

const handleCreateRoom = (asPublic = false) => {
    isPublicRoom.value = asPublic;
    const roomId = generateRoomId();
    joinGame(playerName.value, roomId, selectedAvatar.value, asPublic || undefined);
    // Navegación manejada por useGameSync cuando el servidor confirma la sala
};

const handleJoinRoom = () => {
    if (!joinCode.value.trim() || joinCode.value.length !== 4) {
        addToast('Código de sala inválido', 'error');
        return;
    }
    joinGame(playerName.value, joinCode.value.toUpperCase(), selectedAvatar.value);
    // Navegación manejada por useGameSync cuando el servidor confirma la sala
};

const handleJoinPublicRoom = (roomId: string) => {
    joinGame(playerName.value, roomId, selectedAvatar.value);
    // Navegación manejada por useGameSync cuando el servidor confirma la sala
};

const getStatusLabel = (status: string) => {
    const map: Record<string, string> = {
        'LOBBY': '⏳ Esperando',
        'PLAYING': '🎮 Jugando',
        'REVIEW': '📋 Revisión',
        'RESULTS': '📊 Resultados',
        'GAME_OVER': '🏁 Finalizado',
        'ROLE_REVEAL': '🕵️ Impostor',
        'TYPING': '🕵️ Impostor',
        'VOTING': '🕵️ Impostor'
    };
    return map[status] || status;
};

const handleRefresh = () => {
    isRefreshing.value = true;
    refreshRooms();
    setTimeout(() => isRefreshing.value = false, 500);
};
</script>

<template>
    <div class="w-full flex flex-col items-center justify-start sm:justify-center p-4 min-h-full overflow-y-auto">
        
        <!-- FASE 2: PANEL DE AUTENTICACIÓN (EL METAJUEGO) -->
        <div class="w-full max-w-5xl mx-auto mb-6">
            <div v-if="isLoading" class="flex justify-center h-10 items-center">
                <span class="animate-pulse text-ink-muted text-xs font-bold tracking-widest uppercase">Cargando Identidad...</span>
            </div>
            
            <div v-else-if="!isAuthenticated" class="bg-panel-card/40 border-2 border-white/20 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl backdrop-blur-sm">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-xl bg-panel-base border-2 border-action-primary flex items-center justify-center text-xl shadow-inner bg-gradient-to-br from-action-primary/20 to-panel-input/20">
                        ⭐
                    </div>
                    <div class="text-left hidden sm:block">
                        <h4 class="text-white font-black text-sm tracking-tight drop-shadow-md">Únete al Metajuego</h4>
                        <p class="text-ink-muted text-[10px] font-bold uppercase tracking-wider">Inicia sesión para reclamar tu nombre y beneficios</p>
                    </div>
                </div>
                <!-- Call To Action -->
                <button @click="signInWithGoogle" class="w-full sm:w-auto bg-white hover:bg-white/90 text-panel-base px-4 py-2.5 rounded-xl font-bold uppercase tracking-wide text-xs shadow-glow-primary active:scale-95 transition-all flex items-center justify-center gap-2 border-[3px] border-white">
                    <svg class="w-4 h-4" viewBox="0 0 24 24"><path fill="currentColor" d="M21.35,11.1H12.18V13.83H18.69C18.36,17.64 15.19,19.27 12.19,19.27C8.36,19.27 5,16.25 5,12C5,7.9 8.2,4.73 12.2,4.73C15.29,4.73 17.1,6.7 17.1,6.7L19,4.72C19,4.72 16.56,2 12.1,2C6.42,2 2.03,6.8 2.03,12C2.03,17.05 6.16,22 12.25,22C17.6,22 21.5,18.33 21.5,12.91C21.5,11.76 21.35,11.1 21.35,11.1V11.1Z" /></svg>
                    Iniciar con Google
                </button>
            </div>

            <div v-else class="bg-panel-card border-2 border-white/10 rounded-2xl p-3 flex items-center justify-between gap-4 shadow-lg">
                <div class="flex items-center gap-3">
                    <!-- Google Avatar -->
                    <img v-if="user?.user_metadata.avatar_url" :src="user.user_metadata.avatar_url" class="w-10 h-10 rounded-xl border-2 border-action-primary shadow-sm" alt="Avatar">
                    <div v-else class="w-10 h-10 rounded-xl bg-panel-base border-2 border-action-primary flex items-center justify-center text-lg shadow-inner">
                        👤
                    </div>
                    <div class="text-left">
                        <p class="text-ink-soft text-[9px] font-black uppercase tracking-widest text-action-primary flex items-center gap-1">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-3 h-3 text-action-primary"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clip-rule="evenodd" /></svg>
                            Verificado
                        </p>
                        <h4 class="text-white font-black text-sm tracking-tight truncate max-w-[150px] sm:max-w-none">{{ user?.user_metadata.full_name || user?.email }}</h4>
                    </div>
                </div>
                <button @click="signOut" class="text-ink-muted hover:text-red-400 bg-white/5 hover:bg-red-400/10 px-3 py-2 rounded-lg font-bold text-xs transition-colors">
                    Cerrar sesión
                </button>
            </div>
        </div>

        <div class="max-w-5xl mx-auto w-full grid grid-cols-1 lg:grid-cols-7 gap-6 lg:gap-8 min-h-0">

            <!-- ═══════════════════════════════════════════════ -->
            <!-- COLUMN LEFT: "LA CONSOLA" (Main Action Hub)    -->
            <!-- ═══════════════════════════════════════════════ -->
            <div class="lg:col-span-4 flex flex-col gap-5 justify-center">

                <!-- HERO: Logo + Quick Play -->
                <TCard padding="lg" class="shadow-2xl border-[3px] border-white/10 relative overflow-hidden">
                    <!-- Decoración fondo -->
                    <div class="absolute -top-24 -right-24 w-64 h-64 bg-action-blue/10 rounded-full blur-3xl pointer-events-none"></div>

                    <!-- Logo -->
                    <div class="relative z-10">
                        <h1 class="text-5xl sm:text-6xl font-black text-center mb-1 tracking-tighter">
                            <span class="text-white drop-shadow-lg">
                                TUTI GAMES
                            </span>
                        </h1>

                        <p class="text-center text-ink-soft text-sm mb-8 font-bold">
                            <span v-if="publicRooms.length > 0" class="text-action-primary px-3 py-1 bg-action-primary/10 rounded-full border border-action-primary/20 shadow-sm animate-pulse">🟢 {{ publicRooms.length }} sala{{ publicRooms.length !== 1 ? 's' : '' }} activa{{ publicRooms.length !== 1 ? 's' : '' }}</span>
                            <span v-else class="text-ink-muted">El juego de palabras más rápido</span>
                        </p>
                    </div>

                <!-- PRIMARY ACTION BUTTONS -->
                <div class="flex flex-col sm:grid sm:grid-cols-2 gap-3">
                    <TButton variant="primary" size="lg" @click="handleCreateRoom(true)">
                        <span class="text-xl">🌐</span> Sala Pública
                    </TButton>
                    <TButton variant="secondary" size="lg" @click="handleCreateRoom(false)">
                        <span class="text-xl">🔒</span> Sala Privada
                    </TButton>
                </div>

                <!-- Tertiary: Join by Code -->
                <TButton variant="secondary" size="md" class="w-full mt-4" @click="showJoinInput = !showJoinInput">
                    <span class="text-base">🔑</span> Tengo un Código de Sala
                </TButton>

                <!-- JOIN CODE INPUT (Collapsible) -->
                <div v-if="showJoinInput" class="mt-4 space-y-3 animate-in fade-in zoom-in-95 duration-200">
                    <div>
                        <label class="block text-xs font-bold text-ink-soft mb-2 text-left uppercase tracking-widest">Código de Sala</label>
                        <TInput
                            v-model="joinCode"
                            variant="code"
                            placeholder="ABCD"
                            :maxlength="4"
                            @keyup.enter="handleJoinRoom"
                            aria-label="Código de sala"
                        />
                    </div>
                    <div class="flex gap-3">
                        <TButton variant="ghost" size="md" class="flex-1" @click="showJoinInput = false">Cancelar</TButton>
                        <TButton variant="primary" size="md" class="flex-1" @click="handleJoinRoom">Unirse</TButton>
                    </div>
                </div>
            </TCard>

            <!-- IDENTITY CARD (moved here, below action buttons) -->
            <TCard padding="md">
                <div class="flex items-center justify-between mb-4">
                    <h3 class="text-xs font-black text-ink-main uppercase tracking-widest flex items-center gap-1">
                        Tu Identidad
                        <span v-if="!isAuthenticated" title="Inicia sesión para editar tu nombre" class="cursor-help w-4 h-4 rounded-full bg-panel-input flex items-center justify-center text-[10px] font-bold ml-1 border border-white/5">?</span>
                    </h3>
                    <button v-if="isAuthenticated" @click="isEditingProfile = !isEditingProfile" class="text-[10px] font-bold text-white bg-white/5 hover:bg-white/10 px-2 py-1 rounded border border-white/10 transition-colors uppercase">
                        {{ isEditingProfile ? 'Guardar' : 'Editar' }}
                    </button>
                    <button v-else @click="signInWithGoogle" class="text-[10px] font-bold text-action-blue opacity-80 hover:opacity-100 uppercase underline">
                        Personalizar
                    </button>
                </div>

                <div class="flex items-center gap-4">
                    <!-- Avatar Button/Display -->
                    <div class="relative group flex-none">
                        <div class="w-16 h-16 sm:w-20 sm:h-20 bg-panel-input border-[3px] border-white/10 rounded-2xl flex items-center justify-center text-4xl shadow-sm transition-transform group-hover:scale-105 overflow-hidden">
                            {{ selectedAvatar }}
                        </div>
                    </div>

                    <!-- Name Display/Input -->
                    <div class="flex-1 min-w-0">
                        <p class="text-ink-soft text-[10px] font-bold tracking-wider uppercase mb-1">Nombre Público</p>
                        
                        <!-- Si no está logueado, Nombre es Inmutable -->
                        <div v-if="!isAuthenticated" class="group flex items-center justify-between bg-panel-base/50 p-3 rounded-xl border-2 border-transparent">
                            <span class="text-2xl sm:text-3xl font-black text-ink-muted truncate tracking-tight">{{ playerName }}</span>
                            <span class="text-[10px] text-action-error font-bold uppercase ml-2 opacity-80 select-none hidden sm:inline-block">Requiere Login</span>
                        </div>

                        <!-- Si está logueado y editando -->
                        <TInput
                            v-else-if="isEditingProfile"
                            v-model="playerName"
                            placeholder="Tu nombre..."
                            :maxlength="20"
                            input-class="rounded-lg py-2 text-lg"
                            aria-label="Tu nombre público"
                        />
                        <!-- Si está logueado y NO edita -->
                        <div v-else class="flex flex-col">
                            <p class="text-2xl sm:text-3xl font-black text-ink-main truncate tracking-tight">{{ playerName }}</p>
                        </div>
                    </div>
                </div>

                <!-- Avatar Grid Selection -->
                <div v-show="isEditingProfile" class="mt-4 pt-4 border-t border-white/10 grid grid-cols-6 gap-2 animate-in fade-in slide-in-from-top-2">
                    <button v-for="avatar in AVATARS" :key="avatar"
                        @click="selectedAvatar = avatar"
                        class="aspect-square flex items-center justify-center text-2xl rounded-xl transition-all border-2"
                        :class="selectedAvatar === avatar ? 'bg-panel-card border-action-primary scale-110 shadow-sm' : 'bg-panel-input border-transparent hover:border-white/10 opacity-60 hover:opacity-100'"
                        :aria-label="`Seleccionar avatar ${avatar}`"
                    >
                        {{ avatar }}
                    </button>
                </div>
            </TCard>
        </div>

            <!-- ═══════════════════════════════════════════════ -->
            <!-- COLUMN RIGHT: Solo Salas Públicas (aprovecha todo el alto) -->
            <!-- ═══════════════════════════════════════════════ -->
            <div class="lg:col-span-3 flex flex-col min-h-0">

            <!-- ACTIVE ROOMS RADAR -->
            <TCard padding="none" class="flex flex-col overflow-hidden flex-1 min-h-[200px] max-h-[min(600px,70vh)]">
                <div class="p-4 border-b border-white/10 bg-panel-card/90 flex items-center justify-between sticky top-0 z-10">
                    <h3 class="text-xs font-black text-ink-main uppercase tracking-widest flex items-center gap-2">
                         Salas Publicas
                    </h3>
                    <button 
                        @click="handleRefresh" 
                        class="text-action-blue hover:text-blue-700 transition-colors p-1"
                        :class="{ 'animate-spin': isRefreshing }"
                    >
                        ↻
                    </button>
                </div>

                <div class="flex-1 overflow-y-auto p-3 space-y-2 relative min-h-[150px]">
                    
                    <div v-if="publicRooms.length === 0 && !isRefreshing" class="absolute inset-0 flex flex-col items-center justify-center text-center p-6">
                        <span class="text-4xl mb-3 opacity-20">👻</span>
                        <p class="text-ink-soft font-bold text-sm">No hay salas públicas ahora.</p>
                        <p class="text-ink-muted text-[10px] font-bold mt-1">¡Crea una y sé el anfitrión!</p>
                    </div>

                    <!-- Room Item -->
                    <button
                        v-for="room in publicRooms" :key="room.id"
                        @click="handleJoinPublicRoom(room.id)"
                        class="w-full bg-panel-card hover:bg-panel-input p-3 rounded-2xl border-2 border-white/10 hover:border-action-primary transition-all text-left flex items-center justify-between group shadow-sm"
                    >
                        <div class="flex items-center gap-3">
                            <div class="w-10 h-10 rounded-xl bg-panel-base border-2 border-white/10 flex items-center justify-center text-lg shadow-inner group-hover:scale-110 transition-transform">
                                👑
                            </div>
                            <div>
                                <h4 class="text-ink-main font-black text-sm tracking-tight">{{ room.hostName }}</h4>
                                <div class="flex items-center gap-2 mt-0.5">
                                    <span class="text-[9px] font-bold text-ink-muted uppercase flex items-center gap-1">
                                        <span class="w-1.5 h-1.5 rounded-full" :class="room.status === 'LOBBY' ? 'bg-emerald-400' : 'bg-amber-400'"></span>
                                        {{ getStatusLabel(room.status) }}
                                    </span>
                                </div>
                            </div>
                        </div>
                        
                        <div class="flex items-center gap-2">
                            <span class="text-xs font-black bg-panel-input px-2 py-1 rounded-lg text-ink-muted border border-white/10">
                                {{ room.currentPlayers }}/{{ room.maxPlayers }}
                            </span>
                            <span class="text-action-primary opacity-0 group-hover:opacity-100 transition-opacity transform group-hover:translate-x-1">→</span>
                        </div>
                    </button>
                    <!-- /Room Item -->

                </div>
            </TCard>

            </div>
        </div>
    </div>
</template>
