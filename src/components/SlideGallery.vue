<script setup lang="ts">
// Vue-stuff
import { ref, computed } from 'vue';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import InputText from 'primevue/inputtext';
import { useI18n } from 'vue-i18n';
import { FilterMatchMode } from '@primevue/core/api'
// globals and services
import type { Slide } from '@/services/slide_service'
import { formatDate } from '@/utils/date_utils';
import { type SearchFilters, useFilteredSlides } from '@/globals/filters';
import '@/assets/main.css'
// components
import SlideView from '@/components/SlideView.vue';
import SlideSearch from '@/components/GenericSearch.vue';

// Define Input Proerties
const props = defineProps({
    slide_preview: {
        type: Boolean,
        default: true
    }
})

const filters = ref<SearchFilters>({
    global: {
        value: null,
        matchMode: FilterMatchMode.CONTAINS,
    },
})
const selectedTags = ref<string[]>([]);
const filterLogic = ref<'and' | 'or'>('and');

const { t } = useI18n();
const selectedSlide = defineModel<Slide | null>('selectedSlide', { default: null });
const emit = defineEmits(['slide-drag-start']);

const filteredSlides = useFilteredSlides(filters, selectedTags, filterLogic)

// Handle drag-and-drop events for slides and monitors
function onDragStart(e: DragEvent, slide: Slide) {
    e.dataTransfer?.setData('slide', JSON.stringify(slide));

    const original = e.currentTarget as HTMLElement;
    e.dataTransfer?.setDragImage(original, original.offsetWidth / 2, original.offsetHeight / 2);

    // Set AFTER setDragImage so the ghost captures full opacity
    requestAnimationFrame(() => original.classList.add('is-dragging'));
}

function onDragEnd(e: DragEvent) {
    (e.currentTarget as HTMLElement).classList.remove('is-dragging');
}
</script>

<template>
    <DataTable :value="filteredSlides" dataKey="id" editMode="row" scrollable scrollHeight="flex"
        responsiveLayout="scroll" class="slide-table" v-model:selection="selectedSlide" selectionMode="single">

        <Column field="name" header="">
            <template #editor="slotProps">
                <InputText v-model="slotProps.data.name" />
            </template>
            <template v-if="props.slide_preview" #body="slotProps">
                <div class="slide-info">
                    <p class="slide-label">{{ slotProps.data.name }}</p>
                    <p class="slide-date">{{ formatDate(slotProps.data.updated_at) }}</p>
                </div>
                <div class="slide-item" draggable="true" @dragstart="onDragStart($event, slotProps.data)"
                    @dragend="onDragEnd($event)">
                    <SlideView :preview="false" :slide="slotProps.data" :sections="slotProps.data.sections ?? []"
                        :showFrame="false" style="pointer-events: none; width: 100%; height: 150px; overflow: hidden;"
                        :shadow="true" />
                </div>
            </template>
            <template v-else #body="slotProps">
                <div draggable="true" @dragstart="onDragStart($event, slotProps.data)">
                    <span style="font-weight: 600;">{{ slotProps.data.name }}</span><br>
                    <span style="font-size: 0.875rem; color: #64748b;">Updated {{ formatDate(slotProps.data.updated_at) }}</span>
                </div>
            </template>
        </Column>

        <template #header>
            <SlideSearch v-model:selectedTags="selectedTags" v-model:filterLogic="filterLogic"
                v-model:filters="filters" :title="$t('moderator.available_slides')"/>
        </template>
    </DataTable>
</template>

<style scoped>

.slide-table {
    height: 100%;
}

.slide-table :deep(.p-datatable tbody tr) {
    flex: 1;
    min-height: 0;
}

.slide-table :deep(.p-datatable-header) {
    flex-wrap: wrap;
}

.slide-card {
    width: 100%;
    height: 200px;
    display: flex;
    flex-direction: column;
    flex-shrink: 0;
}

.slide-item {
    flex: 1;
    /* fill remaining height after slide-info */
    min-height: 0;
    /* allow shrinking */
    width: 100%;

    cursor: grab;
    transition: opacity 0.2s, outline 0.2s;
    width: 100%;

    width: 100%;
    height: 100%;
    display: flex;
    justify-content: center;
    align-items: center;
}

.slide-info {
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;
}

.slide-label {
    font-weight: bold;
    font-size: var(--fs-medium);
    color: var(--p-primary-500);
}

.slide-date {
    font-size: var(--fs-small);
    color: var(--p-primary-500);
}

.slide-item.is-dragging {
    opacity: 0.5;
    cursor: grabbing;
    outline: 2px dashed var(--p-primary-400);
    border-radius: var(--br-medium);
}

.assigned-slide-label {
    font-weight: normal;
    font-size: var(--fs-small);
    color: var(--p-primary-50);
    margin-bottom: 0;
    padding: 0;
}

.search-input {
    flex: 1;
    width: 100%;
    padding: 0.5rem;
    border-radius: var(--br-medium);
    border: 1px solid var(--surface-border, #e2e8f0);
    background-color: var(--p-primary-50, #f8fafc);
}

:deep(.p-datatable-header) {
    padding: 0.5em 0em;
    display: flex;
    gap: 0.5rem;
}

:deep(.p-datatable-thead) {
    display: none;
}

:deep(.p-datatable-row-selected) {
    background: var(--p-primary-50);
    color: var(--p-primary-900);
    box-shadow: inset 3px 0 0 var(--p-primary-400);
    font-weight: 500;
}
</style>