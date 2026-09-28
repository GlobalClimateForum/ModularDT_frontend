import { type Ref, computed } from 'vue';
import { slides } from '@/globals/slides';

export type SearchFilters = {
    global: {
        value: string | null
        matchMode: string
    }
}

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

