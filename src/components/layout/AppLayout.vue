<script setup lang="ts">
import { useNavigation } from '../../composables/useNavigation';
import { useAuth } from '../../composables/useAuth';
import { useToast } from '../../composables/useToast';
import { useI18n } from 'vue-i18n';
import GlobalLanguageSelector from '../ui/GlobalLanguageSelector.vue';
import { useSound } from '../../composables/useSound';

const { currentTab, isMenuVisible, setTab } = useNavigation();
const { user, isAuthenticated, signInWithGoogle } = useAuth();
const { addToast } = useToast();
const { t } = useI18n();
const { isMuted, toggleMute } = useSound();

const handleMockAction = (actionName: string) => {
    addToast(`${t('common.success') || 'Éxito'}: ${actionName}`, 'success');
};
</script>

<template>
    <div class="w-full h-full flex flex-col md:flex-row relative bg-gradient-to-br from-[#0b0518] via-[#0d0722] to-[#0a0316] overflow-hidden">
        
        <!-- SIDEBAR DE PC / BOTTOM BAR DE MÓVIL -->
        <Transition name="nav-slide">
            <nav 
                v-if="isMenuVisible"
                class="fixed z-40 bg-zinc-950/95 backdrop-blur-md border-white/10 transition-all duration-300
                       bottom-0 left-0 w-full pb-[env(safe-area-inset-bottom)] border-t h-[calc(64px+env(safe-area-inset-bottom))] flex flex-row items-center justify-around px-2
                       md:left-0 md:top-0 md:h-screen md:w-20 lg:w-64 md:border-r md:border-t-0 md:flex-col md:justify-start md:items-stretch md:py-6 md:px-4 md:pb-6"
                aria-label="Navegación del Juego"
            >
                <!-- Logo del juego para Desktop -->
                <div class="hidden md:flex flex-col items-center lg:items-start lg:px-4 mb-10 select-none">
                    <h1 class="font-display text-2xl lg:text-3xl text-transparent bg-clip-text bg-gradient-to-r from-game-yellow to-game-red tracking-wider uppercase font-black">
                        TUTI
                    </h1>
                    <span class="text-[9px] text-white/30 tracking-[0.3em] font-bold uppercase hidden lg:inline">Arena Cósmica</span>
                </div>

                <!-- Botones de Navegación -->
                <div class="flex flex-row md:flex-col gap-2 md:gap-3 w-full md:flex-1 justify-around md:justify-start">
                    
                    <!-- BOTÓN: INICIO (JUGAR) -->
                    <button 
                        @click="setTab('home')"
                        class="flex flex-col md:flex-row items-center gap-1 md:gap-4 px-3 py-1.5 md:py-3.5 md:px-4 rounded-xl font-bold uppercase tracking-wider text-[9px] md:text-xs transition-all duration-300 w-20 md:w-full select-none"
                        :class="currentTab === 'home' 
                            ? 'text-white bg-action-primary/20 border border-action-primary/30 shadow-[0_0_15px_rgba(236,72,153,0.15)]' 
                            : 'text-white/50 hover:text-white hover:bg-white/5 border border-transparent'"
                    >
                        <span class="text-xl md:text-2xl filter drop-shadow-[0_0_5px_rgba(255,255,255,0.2)]">🎮</span>
                        <span class="md:inline" :class="currentTab === 'home' ? 'font-black' : 'font-bold'">Inicio</span>
                    </button>

                    <!-- BOTÓN: TIENDA -->
                    <button 
                        @click="setTab('store')"
                        class="flex flex-col md:flex-row items-center gap-1 md:gap-4 px-3 py-1.5 md:py-3.5 md:px-4 rounded-xl font-bold uppercase tracking-wider text-[9px] md:text-xs transition-all duration-300 w-20 md:w-full select-none"
                        :class="currentTab === 'store' 
                            ? 'text-white bg-game-yellow/20 border border-game-yellow/30 shadow-[0_0_15px_rgba(251,191,36,0.15)]' 
                            : 'text-white/50 hover:text-white hover:bg-white/5 border border-transparent'"
                    >
                        <span class="text-xl md:text-2xl filter drop-shadow-[0_0_5px_rgba(251,191,36,0.2)]">🛒</span>
                        <span class="md:inline" :class="currentTab === 'store' ? 'font-black' : 'font-bold'">Tienda</span>
                    </button>

                    <!-- BOTÓN: LOGROS -->
                    <button 
                        @click="setTab('history')"
                        class="flex flex-col md:flex-row items-center gap-1 md:gap-4 px-3 py-1.5 md:py-3.5 md:px-4 rounded-xl font-bold uppercase tracking-wider text-[9px] md:text-xs transition-all duration-300 w-20 md:w-full select-none"
                        :class="currentTab === 'history' 
                            ? 'text-white bg-action-info/20 border border-action-info/30 shadow-[0_0_15px_rgba(14,165,233,0.15)]' 
                            : 'text-white/50 hover:text-white hover:bg-white/5 border border-transparent'"
                    >
                        <span class="text-xl md:text-2xl filter drop-shadow-[0_0_5px_rgba(14,165,233,0.2)]">🏆</span>
                        <span class="md:inline" :class="currentTab === 'history' ? 'font-black' : 'font-bold'">Logros</span>
                    </button>

                    <!-- BOTÓN: PERFIL -->
                    <button 
                        @click="setTab('profile')"
                        class="flex flex-col md:flex-row items-center gap-1 md:gap-4 px-3 py-1.5 md:py-3.5 md:px-4 rounded-xl font-bold uppercase tracking-wider text-[9px] md:text-xs transition-all duration-300 w-20 md:w-full select-none"
                        :class="currentTab === 'profile' 
                            ? 'text-white bg-action-success/20 border border-action-success/30 shadow-[0_0_15px_rgba(16,185,129,0.15)]' 
                            : 'text-white/50 hover:text-white hover:bg-white/5 border border-transparent'"
                    >
                        <span class="text-xl md:text-2xl filter drop-shadow-[0_0_5px_rgba(16,185,129,0.2)]">👤</span>
                        <span class="md:inline" :class="currentTab === 'profile' ? 'font-black' : 'font-bold'">Perfil</span>
                    </button>

                </div>

                <!-- Controles de Ajustes e Identidad (Solo Desktop) -->
                <div class="hidden md:flex flex-col gap-3 mt-auto w-full">
                    <!-- Ajustes: Mute e Idioma -->
                    <div class="flex items-center justify-between lg:justify-start lg:gap-4 p-2 bg-white/5 rounded-2xl border border-white/5">
                        <!-- Botón de Mute -->
                        <button
                            @click="toggleMute"
                            class="w-10 h-10 flex items-center justify-center rounded-xl bg-white/5 border border-white/10 text-white transition-all hover:bg-white/10 active:scale-95"
                            :title="isMuted ? t('app.unmuteSound') : t('app.muteSound')"
                            :aria-label="isMuted ? t('app.unmuteSound') : t('app.muteSound')"
                        >
                            <svg v-if="!isMuted" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-5 h-5 opacity-85">
                                <path d="M9.348 14.651l-2.853-2.852H4V8.201h2.495l2.853-2.852v9.302zM15.536 10a5.002 5.002 0 00-2.316-4.195v8.39A5.002 5.002 0 0015.536 10z" />
                                <path d="M12.22 3.102v13.796A7.003 7.003 0 0018.5 10a7.003 7.003 0 00-6.28-6.898z" />
                            </svg>
                            <svg v-else xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-5 h-5 opacity-50 text-red-400">
                                <path fill-rule="evenodd" d="M9.383 3.076a.75.75 0 011.066.079l.067.086 5.86 8.371a.75.75 0 01-1.127.949l-.067-.086-1.503-2.148H12v3.633a.75.75 0 01-1.077.677l-4.14-2.192H4a2 2 0 01-2-2V9.5a2 2 0 011.66-1.972l.34-.028h1.841l4.14-2.192a.75.75 0 011.402.399l.001 5.863L9.304 3.14a.75.75 0 01.079-1.064zM16.53 4.47a.75.75 0 011.06 0l1.94 1.94 1.94-1.94a.75.75 0 111.06 1.06L20.59 7.47l1.94 1.94a.75.75 0 11-1.06 1.06l-1.94-1.94-1.94 1.94a.75.75 0 01-1.06-1.06l1.94-1.94-1.94-1.94a.75.75 0 010-1.06z" clip-rule="evenodd" />
                            </svg>
                        </button>
                        <!-- Selector de Idioma inline -->
                        <GlobalLanguageSelector inline />
                    </div>

                    <!-- Tarjeta de Cuenta -->
                    <div class="flex items-center gap-3 p-3 bg-white/5 rounded-2xl border border-white/5">
                        <img v-if="isAuthenticated && user?.user_metadata.avatar_url" :src="user.user_metadata.avatar_url" class="w-8 h-8 rounded-lg border border-white/10 shadow-sm flex-none" alt="Avatar">
                        <div v-else class="w-8 h-8 rounded-lg bg-panel-base border border-white/10 flex items-center justify-center text-sm shadow-inner flex-none">👤</div>
                        <div class="min-w-0 flex-1 lg:block hidden">
                            <p class="text-[8px] font-bold text-action-primary uppercase tracking-widest leading-none mb-1">Verificado</p>
                            <h4 class="text-white font-black text-xs truncate leading-none">{{ isAuthenticated ? (user?.user_metadata.full_name || user?.email) : 'Invitado' }}</h4>
                        </div>
                    </div>
                </div>
            </nav>
        </Transition>

        <!-- ÁREA CENTRAL DE CONTENIDO DINÁMICO -->
        <main class="flex-1 w-full relative flex flex-col min-h-0 overflow-y-auto transition-all duration-300"
              :class="{ 'pb-[calc(64px+env(safe-area-inset-bottom))] md:pb-0 md:pl-20 lg:pl-64': isMenuVisible }">
            
            <div v-if="currentTab === 'home'" class="w-full h-full flex flex-col min-h-0">
                <slot />
            </div>

            <!-- PLACEHOLDER: TIENDA CÓSMICA -->
            <div v-else-if="currentTab === 'store'" class="w-full max-w-[960px] mx-auto p-6 flex flex-col gap-6 animate-fade-in pb-12">
                <div class="text-center py-6">
                    <h2 class="text-5xl font-display text-transparent bg-clip-text bg-gradient-to-r from-game-yellow via-amber-400 to-amber-500 uppercase tracking-widest font-black filter drop-shadow-[0_0_15px_rgba(251,191,36,0.3)]">
                        🛒 TIENDA CÓSMICA
                    </h2>
                    <p class="text-ink-muted text-xs font-bold uppercase tracking-widest mt-2">Personaliza tu aspecto y apoya el juego</p>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <!-- Tarjeta VIP Ad-Free -->
                    <div class="rounded-3xl p-px overflow-hidden bg-gradient-to-br from-yellow-400 via-amber-500 to-yellow-600 shadow-2xl relative group">
                        <div class="absolute -inset-1 bg-gradient-to-br from-yellow-400 to-amber-600 opacity-20 blur-xl group-hover:opacity-40 transition-opacity"></div>
                        <div class="bg-zinc-950/95 backdrop-blur-sm rounded-[23px] p-6 flex flex-col h-full relative z-10">
                            <div class="flex justify-between items-start mb-4">
                                <span class="text-3xl filter drop-shadow-md">👑</span>
                                <span class="px-3 py-1 bg-yellow-400/10 border border-yellow-400/30 text-yellow-400 text-[10px] font-black uppercase rounded-lg tracking-wider">Premium VIP</span>
                            </div>
                            <h3 class="text-2xl font-black text-white uppercase tracking-wider mb-2">Pase VIP Sin Anuncios</h3>
                            <p class="text-ink-soft text-xs mb-6 leading-relaxed">Remueve permanentemente todos los anuncios de la versión web y móvil. Disfruta de una interfaz limpia y transiciones instantáneas.</p>
                            <button @click="handleMockAction('Compra VIP Ad-Free')" class="mt-auto w-full bg-gradient-to-r from-yellow-400 to-amber-500 text-zinc-950 hover:scale-[1.02] active:scale-[0.98] transition-transform py-3 rounded-2xl font-black uppercase text-xs tracking-wider shadow-lg shadow-yellow-500/20">
                                Desbloquear permanentemente
                            </button>
                        </div>
                    </div>

                    <!-- Sandbox de Monedas -->
                    <div class="rounded-3xl p-px overflow-hidden bg-white/10 shadow-xl">
                        <div class="bg-zinc-950/95 backdrop-blur-sm rounded-[23px] p-6 flex flex-col h-full">
                            <div class="flex justify-between items-start mb-4">
                                <span class="text-3xl filter drop-shadow-md">🪙</span>
                                <span class="px-3 py-1 bg-action-info/10 border border-action-info/30 text-action-info text-[10px] font-black uppercase rounded-lg tracking-wider">Monedas</span>
                            </div>
                            <h3 class="text-2xl font-black text-white uppercase tracking-wider mb-2">Simulador de Monedas</h3>
                            <p class="text-ink-soft text-xs mb-6 leading-relaxed">Las monedas de juego se acumulan ganando partidas. Utiliza este botón para simular la obtención de monedas gratis para probar la tienda.</p>
                            <button @click="handleMockAction('+100 Monedas virtuales')" class="mt-auto w-full bg-white/5 border border-white/10 hover:bg-white/10 text-white py-3 rounded-2xl font-black uppercase text-xs tracking-wider transition-all">
                                🪙 +100 Monedas de Prueba
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Catálogo de Cosméticos -->
                <div class="mt-4">
                    <h3 class="text-xs font-black text-ink-main uppercase tracking-widest mb-4 flex items-center gap-2">
                        🌌 Marcos de Avatar Disponibles
                    </h3>
                    <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        <div v-for="item in [
                            { id: 'neon', name: 'Neón Cyber', price: 150, emoji: '⚡' },
                            { id: 'gold', name: 'Aura Dorada', price: 250, emoji: '✨' },
                            { id: 'fire', name: 'Fuego Cósmico', price: 350, emoji: '🔥' },
                            { id: 'rainbow', name: 'Arcoíris Flujo', price: 500, emoji: '🌈' }
                        ]" :key="item.id" 
                             class="bg-white/5 border border-white/5 hover:border-white/10 rounded-2xl p-4 flex flex-col items-center gap-3 text-center transition-all group">
                            <div class="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-3xl group-hover:scale-110 transition-transform shadow-inner">
                                {{ item.emoji }}
                            </div>
                            <div>
                                <h4 class="text-white font-black text-xs uppercase tracking-wide truncate">{{ item.name }}</h4>
                                <span class="text-[10px] font-bold text-game-yellow">🪙 {{ item.price }}</span>
                            </div>
                            <button @click="handleMockAction(`Comprar marco ${item.name}`)" class="w-full bg-white/5 hover:bg-white/10 text-white/80 hover:text-white py-2 rounded-xl text-[9px] font-black uppercase tracking-wider transition-colors border border-white/5">
                                Adquirir
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <!-- PLACEHOLDER: PERFIL DEL JUGADOR -->
            <div v-else-if="currentTab === 'profile'" class="w-full max-w-[960px] mx-auto p-6 flex flex-col gap-6 animate-fade-in pb-12">
                <div class="text-center py-6">
                    <h2 class="text-5xl font-display text-transparent bg-clip-text bg-gradient-to-r from-action-success via-emerald-400 to-emerald-500 uppercase tracking-widest font-black filter drop-shadow-[0_0_15px_rgba(16,185,129,0.3)]">
                        👤 MI PERFIL
                    </h2>
                    <p class="text-ink-muted text-xs font-bold uppercase tracking-widest mt-2">Tu identidad y estadísticas en TutiGames</p>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                    
                    <!-- Tarjeta de Identidad -->
                    <div class="md:col-span-1 bg-white/5 border border-white/10 rounded-3xl p-6 flex flex-col items-center text-center relative overflow-hidden">
                        <div class="absolute -top-12 -right-12 w-28 h-28 bg-action-success/5 rounded-full blur-3xl pointer-events-none"></div>
                        
                        <div class="w-24 h-24 rounded-3xl bg-white/5 border-2 border-action-success flex items-center justify-center text-5xl mb-4 shadow-inner">
                            🦁
                        </div>

                        <h3 class="text-xl font-black text-white leading-none mb-1 truncate max-w-full">
                            {{ isAuthenticated ? (user?.user_metadata.full_name || 'Jugador Verificado') : 'Invitado' }}
                        </h3>
                        <p class="text-[10px] font-bold text-action-success uppercase tracking-widest mb-6">Nivel 12 · Iniciado</p>

                        <div v-if="!isAuthenticated" class="w-full space-y-3">
                            <p class="text-[10px] text-ink-muted font-bold uppercase leading-relaxed">Inicia sesión con Google para guardar tus monedas e historial permanentemente.</p>
                            <button @click="signInWithGoogle" class="w-full bg-white text-zinc-950 py-2.5 rounded-xl font-bold uppercase text-xs tracking-wider flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98] transition-transform">
                                <svg class="w-4 h-4" viewBox="0 0 24 24"><path fill="currentColor" d="M21.35,11.1H12.18V13.83H18.69C18.36,17.64 15.19,19.27 12.19,19.27C8.36,19.27 5,16.25 5,12C5,7.9 8.2,4.73 12.2,4.73C15.29,4.73 17.1,6.7 17.1,6.7L19,4.72C19,4.72 16.56,2 12.1,2C6.42,2 2.03,6.8 2.03,12C2.03,17.05 6.16,22 12.25,22C17.6,22 21.5,18.33 21.5,12.91C21.5,11.76 21.35,11.1 21.35,11.1V11.1Z" /></svg>
                                Vincular Cuenta
                            </button>
                        </div>
                        <div v-else class="w-full">
                            <div class="px-4 py-2.5 bg-action-success/10 border border-action-success/20 rounded-xl text-action-success text-[10px] font-bold uppercase tracking-wider inline-block">
                                🔒 Datos Guardados en Cloud
                            </div>
                        </div>
                    </div>

                    <!-- Estadísticas -->
                    <div class="md:col-span-2 bg-white/5 border border-white/10 rounded-3xl p-6 flex flex-col justify-between">
                        <h3 class="text-xs font-black text-ink-main uppercase tracking-widest mb-4">🏆 Estadísticas de Juego</h3>
                        
                        <div class="grid grid-cols-2 gap-4">
                            <div class="bg-white/5 p-4 rounded-2xl border border-white/5">
                                <p class="text-ink-muted text-[10px] font-bold uppercase tracking-wider mb-1">Partidas Jugadas</p>
                                <span class="text-3xl font-display font-black text-white">42</span>
                            </div>
                            <div class="bg-white/5 p-4 rounded-2xl border border-white/5">
                                <p class="text-ink-muted text-[10px] font-bold uppercase tracking-wider mb-1">Victorias Totales</p>
                                <span class="text-3xl font-display font-black text-action-success">18</span>
                            </div>
                            <div class="bg-white/5 p-4 rounded-2xl border border-white/5">
                                <p class="text-ink-muted text-[10px] font-bold uppercase tracking-wider mb-1">Win Rate</p>
                                <span class="text-3xl font-display font-black text-action-info">43%</span>
                            </div>
                            <div class="bg-white/5 p-4 rounded-2xl border border-white/5">
                                <p class="text-ink-muted text-[10px] font-bold uppercase tracking-wider mb-1">Récord de Puntuación</p>
                                <span class="text-3xl font-display font-black text-game-yellow">140</span>
                            </div>
                        </div>

                        <div class="mt-6 pt-4 border-t border-white/10 flex justify-between items-center">
                            <span class="text-[10px] font-black uppercase text-ink-muted tracking-wider">Historial de Clasificaciones</span>
                            <button @click="setTab('history')" class="text-action-success hover:underline font-bold text-xs uppercase tracking-wider">Ver historial</button>
                        </div>
                    </div>
                </div>
            </div>

            <!-- PLACEHOLDER: LOGROS Y LOGS -->
            <div v-else-if="currentTab === 'history'" class="w-full max-w-[960px] mx-auto p-6 flex flex-col gap-6 animate-fade-in pb-12">
                <div class="text-center py-6">
                    <h2 class="text-5xl font-display text-transparent bg-clip-text bg-gradient-to-r from-action-info via-cyan-400 to-sky-500 uppercase tracking-widest font-black filter drop-shadow-[0_0_15px_rgba(14,165,233,0.3)]">
                        🏆 LOGROS & RETOS
                    </h2>
                    <p class="text-ink-muted text-xs font-bold uppercase tracking-widest mt-2">Completa desafíos para ganar bonus de monedas</p>
                </div>

                <div class="flex flex-col gap-4">
                    <!-- Logro 1 -->
                    <div class="bg-white/5 border border-white/10 rounded-2xl p-5 flex items-center justify-between gap-4 group">
                        <div class="flex items-center gap-4 min-w-0">
                            <div class="w-12 h-12 rounded-xl bg-action-success/10 border border-action-success/20 flex items-center justify-center text-2xl group-hover:scale-105 transition-transform">✍️</div>
                            <div class="min-w-0">
                                <h3 class="text-white font-black text-sm uppercase tracking-wide truncate">Tuti-Máster</h3>
                                <p class="text-ink-soft text-xs truncate">Escribe 5 palabras perfectas aprobadas por los rivales</p>
                            </div>
                        </div>
                        <span class="text-xs font-bold text-action-success bg-action-success/10 border border-action-success/20 px-3 py-1.5 rounded-xl flex-none uppercase">Completo</span>
                    </div>

                    <!-- Logro 2 -->
                    <div class="bg-white/5 border border-white/10 rounded-2xl p-5 flex items-center justify-between gap-4 group">
                        <div class="flex items-center gap-4 min-w-0">
                            <div class="w-12 h-12 rounded-xl bg-action-info/10 border border-action-info/20 flex items-center justify-center text-2xl group-hover:scale-105 transition-transform">🕵️</div>
                            <div class="min-w-0">
                                <h3 class="text-white font-black text-sm uppercase tracking-wide truncate">Cazador de Mentiras</h3>
                                <p class="text-ink-soft text-xs truncate">Descubre al Impostor en la fase de votación de forma correcta</p>
                            </div>
                        </div>
                        <span class="text-xs font-bold text-action-info bg-action-info/10 border border-action-info/20 px-3 py-1.5 rounded-xl flex-none uppercase">Progreso: 2/5</span>
                    </div>

                    <!-- Logro 3 -->
                    <div class="bg-white/5 border border-white/10 rounded-2xl p-5 flex items-center justify-between gap-4 group opacity-50">
                        <div class="flex items-center gap-4 min-w-0">
                            <div class="w-12 h-12 rounded-xl bg-zinc-800 border border-white/5 flex items-center justify-center text-2xl group-hover:scale-105 transition-transform">👑</div>
                            <div class="min-w-0">
                                <h3 class="text-white font-black text-sm uppercase tracking-wide truncate">Monarca Supremo</h3>
                                <p class="text-ink-soft text-xs truncate">Gana 10 partidas en salas públicas competitivas</p>
                            </div>
                        </div>
                        <span class="text-xs font-bold text-zinc-400 bg-zinc-800 border border-white/5 px-3 py-1.5 rounded-xl flex-none uppercase">Bloqueado</span>
                    </div>
                </div>
            </div>

        </main>
    </div>
</template>

<style scoped>
/* Transiciones de pestañas */
.animate-fade-in {
    animation: fadeIn 0.25s ease-out forwards;
}

@keyframes fadeIn {
    from { opacity: 0; transform: translateY(8px); }
    to { opacity: 1; transform: translateY(0); }
}

/* Desplazamiento del menú adaptativo */
.nav-slide-enter-active, .nav-slide-leave-active {
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}
@media (max-width: 767px) {
    .nav-slide-enter-from, .nav-slide-leave-to {
        transform: translateY(100%);
    }
}
@media (min-width: 768px) {
    .nav-slide-enter-from, .nav-slide-leave-to {
        transform: translateX(-100%);
    }
}
</style>
