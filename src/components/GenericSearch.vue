<script setup lang="ts">
// Vue-stuff
import { ref, computed, onMounted } from 'vue';
import InputText from 'primevue/inputtext';
import SelectButton from 'primevue/selectbutton';
import OverlayBadge from 'primevue/overlaybadge';
import Button from 'primevue/button';
import { FilterMatchMode } from '@primevue/core/api'
import MultiSelect from 'primevue/multiselect';
import { useI18n } from 'vue-i18n';
// globals and services
import { getAvailableTags } from '@/services/slide_service';
import { type SearchFilters } from '@/globals/filters';
import '@/assets/main.css'

const props = defineProps({
    title: String
})

const selectedTags = defineModel<string[]>('selectedTags', { default: () => [] });
const filterLogic = defineModel<'and' | 'or'>('filterLogic', { default: 'and' });

const filters = defineModel<SearchFilters>('filters', {
    default: () => ({
        global: {
            value: null,
            matchMode: FilterMatchMode.CONTAINS,
        },
    }),
})

const existingTags = ref<string[]>([]);
const doFilter = ref(false);
const activeFilterCount = computed(() =>
    (filters.value.global.value ? 1 : 0) + selectedTags.value.length
);

async function fetchTags() {
    await getAvailableTags().then(tags => {
        existingTags.value = tags.data.tags;
    });
}

onMounted(() => {
    fetchTags()
});

defineExpose({
    fetchTags
})
</script>

<template>
    <div style="display: flex; flex-direction: column; width: 100%; gap: var(--space-small);">
        <div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
            <h2 class="dashboard_label">{{ title }}</h2>
            <OverlayBadge :value="activeFilterCount ? String(activeFilterCount) : undefined" severity="warn">
                <Button @click="doFilter = !doFilter" label="Filter"
                    :badge="activeFilterCount ? String(activeFilterCount) : undefined">
                    <template #icon>
                        <i class="pi" :class="doFilter ? 'pi-filter-slash' : 'pi-filter'"></i>
                    </template>
                </Button>
            </OverlayBadge>
        </div>

        <transition name="rolldown">
            <div class="search-row" v-if="doFilter">
                <InputText v-model="filters.global.value" :placeholder="$t('moderator.search')" :showClear="true"
                    class="filter-field" />
                <SelectButton :options="['and', 'or']" v-model="filterLogic">
                    <template #option="{ option }">
                        <span v-if="option == 'and'">AND</span>
                        <span v-else>OR</span>
                    </template>
                </SelectButton>
                <MultiSelect v-model="selectedTags" :options="existingTags" placeholder="Tags" display="chip"
                    :showClear="true" class="filter-field" />
            </div>
        </transition>
    </div>
</template>

<style scoped>
.search-row {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: var(--space-small);
}

.search-row>.filter-field {
    flex: 1 1 200px;
    min-width: 0;
}

.search-row :deep(.p-inputtext),
.search-row :deep(.p-multiselect),
.search-row :deep(.p-select) {
    width: 100% !important;
}

:deep(.p-multiselect-label) {
    flex-wrap: nowrap;
    overflow-x: auto;
    max-width: 100%;
}

:deep(.p-multiselect-label)::-webkit-scrollbar {
    display: none;
}

:deep(.p-multiselect-label) {
    scrollbar-width: none;
    -webkit-mask-image: linear-gradient(to right, black 85%, transparent 100%);
    mask-image: linear-gradient(to right, black 85%, transparent 100%);
}
</style>
