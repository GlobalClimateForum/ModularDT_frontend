<script setup lang="ts">
// Vue-stuff
import { ref } from 'vue';
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
const draggedSlide = defineModel<Slide | null>('draggedSlide', { default: null });

const filteredSlides = useFilteredSlides(filters, selectedTags, filterLogic)

// Handle drag-and-drop events for slides and monitors
// Handle drag-and-drop events for slides and monitors
function onDragStart(e: DragEvent, slide: Slide) {
    selectedSlide.value = slide;          // CHANGED: was null → no flicker
    draggedSlide.value = slide;
    e.dataTransfer?.setData('slide', JSON.stringify(slide));

    const original = e.currentTarget as HTMLElement;
    e.dataTransfer?.setDragImage(original, original.offsetWidth / 2, original.offsetHeight / 2);

    // Set AFTER setDragImage so the ghost captures full opacity
    requestAnimationFrame(() => original.classList.add('is-dragging'));
}

function onDragEnd(e: DragEvent) {
    draggedSlide.value = null;
    (e.currentTarget as HTMLElement).classList.remove('is-dragging');
}

</script>

<template>
    <DataTable v-if="filteredSlides.length > 0" :value="filteredSlides" dataKey="id" editMode="row" scrollable
        scrollHeight="flex" responsiveLayout="scroll" class="slide-table" v-model:selection="selectedSlide"
        selectionMode="single">

        <Column field="name" header="" class="slide-column">
            <template #editor="slotProps">
                <InputText v-model="slotProps.data.name" />
            </template>
            <template v-if="props.slide_preview" #body="slotProps">

                <div class="slide-caption">
                    <p class="slide-label">{{ slotProps.data.name }}</p>
                    <p class="slide-date">{{ formatDate(slotProps.data.updated_at) }}</p>
                </div>

                <div class="slide-item" :class="{ 'is-selected': selectedSlide?.id === slotProps.data.id }"
                    draggable="true" @dragstart="onDragStart($event, slotProps.data)" @dragend="onDragEnd($event)">
                    <SlideView :preview="true" :slide="slotProps.data" :sections="slotProps.data.sections ?? []"
                        :showFrame="false" :shadow="true" :style="{
                            pointerEvents: 'none',
                            height: '150px',
                            aspectRatio: `${slotProps.data.width} / ${slotProps.data.height}`,
                            overflow: 'hidden',
                        }" />
                </div>


            </template>
            <template v-else #body="slotProps">
                <div draggable="true" @dragstart="onDragStart($event, slotProps.data)" @dragend="onDragEnd($event)">
                    <span style="font-weight: 600;">{{ slotProps.data.name }}</span><br>
                    <span style="font-size: 0.875rem; color: #64748b;">Updated {{ formatDate(slotProps.data.updated_at)
                    }}</span>
                </div>
            </template>
        </Column>

        <template #header>
            <SlideSearch v-model:selectedTags="selectedTags" v-model:filterLogic="filterLogic" v-model:filters="filters"
                :title="$t('moderator.available_slides')" />
        </template>
    </DataTable>
</template>

<style scoped>
.slide-table {
    height: 100%;
    border-bottom: 1px solid var(--p-primary-200);
}

.slide-table :deep(.p-datatable tbody tr) {
    flex: 1;
    min-height: 0;
}

.slide-table :deep(.p-datatable-header) {
    flex-wrap: wrap;
}

.slide-table :deep(.p-datatable-container) {
    border-top: 1px solid black;
}

.slide-column {
    width: fit-content !important;
}

.slide-item {
    display: flex;
    align-items: center;
    justify-content: center;
    flex: none;
    width: fit-content;
    height: fit-content;
    margin: 0 auto;
    outline: 1px solid transparent;
    cursor: grab;
    transition:
        transform 200ms ease,
        box-shadow 200ms ease,
        outline-color 200ms ease,
        opacity 200ms ease;
    box-shadow: 0 0 0 1px var(--p-surface-200, #e2e8f0),
        0 1px 3px rgba(0, 0, 0, 0.08);
}

.slide-item:hover {
    transform: scale(1.02);
    box-shadow: 0 0 0 1px var(--p-surface-200, #e2e8f0),
        0 6px 16px rgba(0, 0, 0, 0.12);
    outline: 1px solid var(--p-primary-300);
}

.slide-item.is-selected {
    outline-color: transparent;
}

.slide-item.is-selected:hover {
    outline-color: var(--p-primary-300);
}

.slide-item.is-dragging {
    opacity: 0.8;
    transform: scale(0.97);
    box-shadow: none;
    outline: 1px dashed var(--p-primary-500);
}

.slide-caption {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: var(--space-small);
    width: 100%;
    margin-bottom: var(--space-small);
    padding: 0 var(--space-medium);
}

.slide-label {
    font-size: var(--fs-medium);
    font-weight: 600;
    color: var(--p-surface-700, #334155);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    margin: 0;
}

:deep(.p-datatable-row-selected) .slide-label {
    color: var(--p-primary-600);
}

.slide-date {
    font-size: var(--fs-small);
    color: var(--p-surface-400, #94a3b8);
    white-space: nowrap;
    margin: 0;
}

:deep(.p-datatable-header) {
    padding: 0.5em 0em;
    display: flex;
    gap: 0.5rem;
}

:deep(.p-datatable-thead) {
    display: none;
}

:deep(.p-datatable-tbody > tr) {
    transition: background-color 150ms ease;
}

:deep(.p-datatable-tbody > tr:not(.p-datatable-row-selected):hover) {
    background: var(--p-surface-50, #f8fafc);
}

:deep(.p-datatable-row-selected) {
    background: var(--p-primary-50) !important;
    color: inherit;
}

@media (prefers-reduced-motion: reduce) {

    .slide-item,
    .slide-item:hover,
    .slide-item.is-dragging {
        transition: none;
        transform: none;
    }
}
</style>