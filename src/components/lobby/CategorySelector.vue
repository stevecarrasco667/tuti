<script setup lang="ts">
import { ref, computed } from 'vue';
import { MASTER_CATEGORIES } from '../../../shared/engines/categories';
import type { CategoryRef } from '../../../shared/types';
import TButton from '../ui/TButton.vue';

const props = defineProps<{
    categories: CategoryRef[];
    amIHost: boolean;
}>();

const emit = defineEmits<{
    (e: 'update-categories', categories: CategoryRef[]): void;
    (e: 'remove-category', name: string): void;
}>();

// ── Modal State (local — no afecta al padre hasta confirmar) ──────────────────
const showModal = ref(false);
const searchQuery = ref('');
const activeFilterTag = ref<string | null>(null);
const tempSelectedCategories = ref<CategoryRef[]>([]);

const availableTags = computed(() => {
    const tags = new Set<string>();
    MASTER_CATEGORIES.forEach(c => c.tags.forEach(t => tags.add(t)));
    return Array.from(tags).sort();
});

const filteredCategories = computed(() => {
    const query = searchQuery.value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    return MASTER_CATEGORIES.filter(cat => {
        if (activeFilterTag.value && !cat.tags.includes(activeFilterTag.value)) return false;
        const normalized = cat.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        return normalized.includes(query);
    });
});

function openModal() {
    tempSelectedCategories.value = [...props.categories];
    searchQuery.value = '';
    activeFilterTag.value = null;
    showModal.value = true;
}

function toggleCategory(cat: CategoryRef) {
    const idx = tempSelectedCategories.value.findIndex(s => s.id === cat.id);
    if (idx === -1) {
        tempSelectedCategories.value.push(cat);
    } else {
        tempSelectedCategories.value.splice(idx, 1);
    }
}

function saveAndClose() {
    emit('update-categories', [...tempSelectedCategories.value]);
    showModal.value = false;
}
</script>

<template>
    <!-- Category Panel (inline chip list) -->
    <div class="bg-panel-base border-[3px] border-white/50 rounded-3xl shadow-game-panel flex-1 flex flex-col overflow-hidden min-h-[120px] lg:min-h-0">
        <div class="p-4 border-b-2 border-white/50 bg-panel-card/50 flex items-center justify-between flex-none">
            <p class="text-ink-main text-[9px] font-black uppercase tracking-[0.2em]">
                Categorías <span class="text-ink-soft">({{ props.categories.length }})</span>
            </p>
            <TButton v-if="props.amIHost" variant="teal" size="sm" @click="openModal">Editar +</TButton>
        </div>
        <div class="flex-1 overflow-y-auto p-4 min-h-0">
            <div v-if="props.categories.length > 0" class="flex flex-wrap gap-2 content-start">
                <TransitionGroup name="list">
                    <div v-for="cat in props.categories" :key="cat.id"
                         class="group flex items-center pl-3 pr-2 py-1.5 bg-panel-card hover:bg-panel-input rounded-full text-[11px] font-bold text-ink-main border-2 border-white/10 transition-all shadow-sm">
                        <span>{{ cat.name }}</span>
                        <button v-if="props.amIHost" @click.stop="emit('remove-category', cat.name)"
                            class="ml-1.5 w-5 h-5 flex items-center justify-center rounded-full bg-panel-input border border-panel-card text-ink-muted hover:text-white hover:bg-action-error transition-colors text-[10px] font-bold">
                            &times;
                        </button>
                    </div>
                </TransitionGroup>
            </div>
            <div v-else class="h-full flex flex-col items-center justify-center text-center py-6">
                <span class="text-4xl mb-3 opacity-30">🎲</span>
                <p class="text-ink-soft font-bold text-sm">5 categorías aleatorias</p>
                <p class="text-ink-muted text-[10px] font-bold mt-1">Personaliza con "Editar"</p>
            </div>
        </div>
    </div>

    <!-- Category Editor Modal (Teleport to body for z-index isolation) -->
    <Teleport to="body">
        <div v-if="showModal"
             class="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6 bg-ink-main/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div class="bg-panel-base border-[3px] border-white/50 rounded-3xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden">
                <!-- Modal Header -->
                <div class="p-4 border-b-2 border-white/50 flex items-center justify-between bg-panel-card/80 flex-none">
                    <h3 class="text-lg font-black text-ink-main uppercase tracking-widest">Selección de Categorías</h3>
                    <div class="text-xs font-bold text-ink-main bg-panel-input px-3 py-1 rounded-full border-2 border-white/10 shadow-sm">
                        {{ tempSelectedCategories.length }} elegidas
                    </div>
                </div>

                <!-- Search + Tag Filters -->
                <div class="p-4 bg-panel-card/30 space-y-3 flex-none border-b-2 border-white/30">
                    <div class="relative">
                        <span class="absolute left-4 top-1/2 -translate-y-1/2 text-xl">🔍</span>
                        <input v-model="searchQuery" type="text" placeholder="Buscar categoría..."
                               class="w-full bg-panel-input border-2 border-white/10 pl-[3.25rem] pr-4 py-3 text-ink-main placeholder-ink-muted focus:border-action-primary outline-none transition-colors font-bold text-sm rounded-xl shadow-inner">
                    </div>
                    <div class="flex gap-2 overflow-x-auto pb-1 scrollbar-none pt-1">
                        <button @click="activeFilterTag = null"
                            :class="['px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wide transition-all border-2 whitespace-nowrap',
                                !activeFilterTag ? 'bg-action-blue border-action-blue text-white shadow-sm' : 'border-white/10 bg-panel-input text-ink-soft hover:text-ink-main hover:bg-panel-card']">
                            Todo
                        </button>
                        <button v-for="tag in availableTags" :key="tag"
                            @click="activeFilterTag = activeFilterTag === tag ? null : tag"
                            :class="['px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wide transition-all border-2 whitespace-nowrap',
                                activeFilterTag === tag ? 'bg-tuti-teal border-teal-400 text-ink-main shadow-sm' : 'border-white/10 bg-panel-input text-ink-soft hover:text-ink-main hover:bg-panel-card']">
                            {{ tag }}
                        </button>
                    </div>
                </div>

                <!-- Category Grid -->
                <div class="flex-1 overflow-y-auto p-4 content-start bg-panel-input min-h-0 shadow-inner">
                    <div class="grid grid-cols-2 md:grid-cols-3 gap-3">
                        <button v-for="cat in filteredCategories" :key="cat.name"
                            @click="toggleCategory({ id: cat.id, name: cat.name })"
                            class="text-left px-4 py-4 rounded-2xl text-xs font-bold border-[3px] transition-all duration-200 flex items-center justify-between active:scale-95 shadow-sm"
                            :class="tempSelectedCategories.some(s => s.id === cat.id)
                                ? 'bg-action-blue border-blue-400 text-white'
                                : 'bg-panel-card border-white/10 text-ink-main hover:bg-panel-input hover:border-action-primary'"
                        >
                            {{ cat.name }}
                            <span v-if="tempSelectedCategories.some(s => s.id === cat.id)" class="text-lg font-black leading-none">✓</span>
                        </button>
                    </div>
                    <div v-if="filteredCategories.length === 0" class="text-center py-16 text-ink-muted font-black uppercase tracking-widest text-sm flex flex-col items-center gap-3">
                        <span class="text-5xl">👻</span>
                        Sin resultados
                    </div>
                </div>

                <!-- Modal Footer -->
                <div class="p-4 border-t-2 border-white/50 bg-panel-base flex gap-3 flex-none">
                    <TButton variant="secondary" size="md" class="flex-1 py-4" @click="showModal = false">Cancelar</TButton>
                    <TButton variant="primary" size="md" class="flex-1 py-4" @click="saveAndClose">Guardar</TButton>
                </div>
            </div>
        </div>
    </Teleport>
</template>
