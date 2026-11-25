import { ref, type Ref, computed } from 'vue';
import { slides } from '@/globals/slides';
import { scenes } from '@/globals/scenes';
import { FilterMatchMode } from '@primevue/core/api'

export type SearchFilters = {
    global: {
        value: string | null
        matchMode: string
    }
}

function createDefaultFilters(): SearchFilters {
    return {
        global: {
            value: null,
            matchMode: FilterMatchMode.CONTAINS,
        },
    }
}

export const filtersSceneEditor = ref(createDefaultFilters())
export const filtersSceneManager = ref(createDefaultFilters())
export const filtersSceneShowEditor = ref(createDefaultFilters())
export const filtersSlideManager = ref(createDefaultFilters())
export const filtersLiveSlides = ref(createDefaultFilters())
export const filtersParticipantSlideshow = ref(createDefaultFilters())

export const filterLogicSceneEditor = ref<'and' | 'or'>('and');
export const filterLogicSceneManager = ref<'and' | 'or'>('and');
export const filterLogicSceneShowEditor = ref<'and' | 'or'>('and');
export const filterLogicSlideManager = ref<'and' | 'or'>('and');
export const filterLogicLiveSlides = ref<'and' | 'or'>('and');
export const filterLogicParticipantSlideshow = ref<'and' | 'or'>('and');


export function useFilteredSlides(
    filters: Ref<SearchFilters>,
    selectedTags: Ref<string[]>,
    filterLogic: Ref<'and' | 'or'>) {
    return computed(() => {
        const q = filters.value.global.value?.toLowerCase() ?? ''
        return slides.value.filter(s => {
            const textOk = !q || s.name.toLowerCase().includes(q);
            const tagsOk = selectedTags.value.length === 0
                || selectedTags.value.some(t => s.tags.includes(t));
            if (filterLogic.value === 'or') {
                return textOk || tagsOk;
            } else if (filterLogic.value === 'and') {
                return textOk && tagsOk;
            }
        })
    }
    )
}

export function useFilteredScenes(
    filters: Ref<SearchFilters>,
    selectedTags: Ref<string[]>,
    filterLogic: Ref<'and' | 'or'>) {
    return computed(() => {
        const q = filters.value.global.value?.toLowerCase() ?? ''
        return scenes.value.filter(s => {
            const textOk = !q || s.name.toLowerCase().includes(q);
            const tagsOk = selectedTags.value.length === 0
                || selectedTags.value.some(t => s.tags.includes(t));
            if (filterLogic.value === 'or') {
                return textOk || tagsOk;
            } else if (filterLogic.value === 'and') {
                return textOk && tagsOk;
            }
        })
    }
    )
}

