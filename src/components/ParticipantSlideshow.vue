<script setup lang="ts">
// Vue-stuff
import { onMounted, ref, nextTick } from 'vue';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import InputText from 'primevue/inputtext';
import { useToast } from 'primevue/usetoast';
import SplitterPanel from 'primevue/splitterpanel';
import Splitter from 'primevue/splitter';
import Button from 'primevue/button';
import { FilterMatchMode } from '@primevue/core/api'
import draggable from 'vuedraggable';
import { useConfirm } from "primevue/useconfirm";
import { useI18n } from 'vue-i18n';
// globals and services
import type { Slide } from "@/services/slide_service"
import { formatDate } from '@/utils/date_utils';
import { saveSlideshow, type Slideshow } from '@/services/slideshow_service'
import { slideshows, fetchSlideshows } from '@/globals/slideshows';
import { updateSlideshow, deleteSlideshow, startSlideshow } from "@/services/slideshow_service";
import '@/assets/main.css'
import { slides, fetchSlides } from '@/globals/slides';
import { dialogService } from '@/services/dialog_service';
import { participants } from '@/globals/participants';
import { updateLiveParticipantsSlideshow } from '@/globals/live_participant_slideshows';
// components
import SlideView from '@/components/SlideView.vue';
import type { Presentation } from '@/services/presentation_service';


interface SelectedSlide {
    id: string;
    uniqueId: string;
    name: string;
    description: string;
}

const { t } = useI18n();
const confirm = useConfirm();

const selectedSlide = ref<Slide | null>(null);
const editingRows = ref<Presentation[]>([]);

const selectedSlideshow = ref<Slideshow | null>(null);
const slideshowName = ref<string>("");

const toast = useToast();
const filters = ref({
    global: { value: null, matchMode: FilterMatchMode.CONTAINS }
})

const selectedOrder = ref<SelectedSlide[]>([]);

const colLeftSize = ref(35);
const colRightSize = ref(65);

const emit = defineEmits<{
    'liveparticipants': [];
}>();

onMounted(() => {
    fetchSlides();
    fetchSlideshows();
});

function onRowClick(event: any) {
    const slideshow = event.data;

    if (slideshow) {
        selectedSlideshow.value = slideshow;

        if (slideshow.slides) {
            selectedOrder.value = slideshow.slides.map((slide: any) => ({
                id: String(slide.id ?? ''),
                name: slide.name,
                description: slide.description,
                uniqueId: typeof crypto.randomUUID === 'function'
                    ? crypto.randomUUID()
                    : `${slide.id}-init-${Math.random().toString(36).substring(2, 11)}`
            }));
        } else {
            selectedOrder.value = [];
        }
    }
}

function onRowEditSaveSlideshow(event: any) {
    const { id, name, slides } = event.newData;

    if (name === event.data.name) {
        toast.add({ severity: 'warn', summary: 'Warning', detail: 'New and old filenames are identical', life: 3000 });
        return;
    }

    updateSlideshow(id, { name, slides })
        .then((response) => {
            toast.add({ severity: 'success', summary: 'Success', detail: 'Slideshow updated successfully', life: 3000 });
            slideshows.value[event.index] = response.data.slideshow;
            fetchSlideshows();
        })
        .catch((error) => {
            toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to update slideshow', life: 3000 });
            console.error(error)
        });
}

function onDeleteSlideshow(slideshow: Slideshow) {
    if (slideshow.id) {
        deleteSlideshow(slideshow.id).then(() => {
            toast.add({ severity: 'success', summary: 'Success', detail: 'Slideshow deleted successfully', life: 3000 });
            slideshows.value = slideshows.value.filter(s => s.id !== slideshow.id);
            if (selectedSlideshow.value?.id === slideshow.id) {
                selectedSlideshow.value = null;
            }
            fetchSlideshows();
        }).catch(error => {
            toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to delete slideshow', life: 3000 });
            console.error("Error deleting slideshow:", error);
        })
    }
    else {
        toast.add({ severity: 'error', summary: 'Error', detail: 'Slideshow ID is missing', life: 3000 });
        console.error("Error deleting slideshow: no valid slideshow.id");
    }
}

function onConfirmDeleteSlideshow(slideshow: Slideshow) {
    confirm.require({
        header: t('moderator.confirmation'),
        message: t('moderator.confirmation-message-head') + t('moderator.participants_slideshow') + " (" + slideshow.name + ")" + t('moderator.confirmation-message-tail'),
        acceptLabel: `${t('moderator.confirmation-ok')}`,
        rejectLabel: t('moderator.confirmation-cancel'),
        accept: async () => {
            await onDeleteSlideshow(slideshow);
        }, reject: () => {
            // nothing to do    
        },
    });
}

function onDuplicateSlideshow(slideshow: Slideshow) {
    if (slideshow.id) {

        const new_slideshow = {
            name: `${slideshow.name} (${t('moderator.copy')})`,
            description: slideshow.description,
            slides: slideshow.slides
        };

        saveSlideshow(new_slideshow).then(() => {
            toast.add({ severity: 'success', summary: 'Success', detail: 'Slideshow saved successfully', life: 3000 })
            fetchSlideshows();
        }).catch(error => {
            console.error("Error saving slideshow:", error);
            toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to save slideshow', life: 3000 })
            fetchSlideshows();
        });
    } else {
        toast.add({ severity: 'error', summary: 'Error', detail: 'Slideshow ID is missing', life: 3000 });
        console.error("Error duplicating slideshow: no valid slideshow.id");
    }
}

// Handle saving the slideshow to the backend
function onAddSlideshow() {
    const slideshow_ = {
        name: slideshowName.value || `${t('moderator.slideshow.new_slideshow')} ${slideshows.value.length + 1}`,
        description: "",
        scenes: []
    };

    saveSlideshow(slideshow_).then(_response => {
        toast.add({ severity: 'success', summary: 'Success', detail: 'Slideshow created successfully', life: 3000 })
        fetchSlideshows();
    }).catch(error => {
        console.error("Error saving slideshow:", error);
        toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to create slideshow', life: 3000 })
    });
}

const onPlaySlideshow = async (slideshow: Slideshow) => {
    const slideshowId = slideshow.id;
    if (slideshowId === undefined) {
        console.error("Error starting slideshow: no valid slideshow id");
        return;
    }

    const options = participants.value.filter(p => p.interactions).map(({ name, seat }) => ({ id: seat, label: name + (seat ? ` (${t('participant.seat')} ${seat})` : '') }));
    const selected = await dialogService.openOptionDialog(options, `${t('select_participants')}`);

    if (selected) {
        for (const participant of selected) {
            console.log(`Starting slideshow for participant seat: ${participant.id}`);
            await startSlideshow(slideshow, participant.id);
            updateLiveParticipantsSlideshow({
                participant_seat: participant.id,
                slideshow_id: slideshow.id,
                current_slide_index: 0
            })
        }
        emit('liveparticipants')
    }

}

const onDragStart = (event: DragEvent, item: Slide) => {
    if (event.dataTransfer) {
        event.dataTransfer.effectAllowed = 'copy';
        event.dataTransfer.setData('application/json', JSON.stringify(item));
    }
};

const handleNativeDrop = async (event: DragEvent) => {
    if (!event.dataTransfer) return;

    const dataString = event.dataTransfer.getData('application/json');
    if (!dataString) return;

    try {
        const rawScene = JSON.parse(dataString);

        const deepClonedScene = structuredClone(rawScene);

        const newElement: SelectedSlide = {
            ...deepClonedScene,
            uniqueId: crypto.randomUUID() // Garantiert eindeutige ID im Browser
        };

        await nextTick();
        selectedOrder.value.push(newElement);

    } catch (error) {
        console.error('Drop error:', error);
    }
};

const isSaving = ref(false);

const saveOrderToApi = async () => {
    if (selectedOrder.value.length === 0) return;

    const slideshowId = selectedSlideshow.value?.id;
    if (slideshowId === undefined) {
        toast.add({ severity: 'error', summary: 'Error', detail: 'No slideshow selected', life: 3000 });
        return;
    }

    isSaving.value = true;
    try {
        // 1. Payload für das Backend vorbereiten
        const slideshowPayload = selectedOrder.value.map((item, index) => ({
            slide_id: Number(item.id),
            position: index + 1
        }));

        const currentName = selectedSlideshow.value?.name ?? '';
        await updateSlideshow(slideshowId, {
            name: currentName,
            slides: slideshowPayload
        });

        fetchSlideshows();
        toast.add({ severity: 'success', summary: 'Success', detail: 'Slide order updated successfully', life: 3000 });

    } catch (error) {
        toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to update slide order', life: 3000 })
        console.error("Error updating slide order:", error);
    } finally {
        isSaving.value = false;
    }
};

const removeItem = (index: number) => {
    selectedOrder.value.splice(index, 1);
};
</script>


<template>
    <div style="display: flex; flex-direction: column; height: 100vh;"> <!-- Obere Reihe -->
        <div style="height: 300px; flex: 1; display: flex; width: 100%;">
            <Splitter layout="horizontal" style="width: 100%; height: 100%">
                <SplitterPanel class="sub-panel" :size="colLeftSize">
                    <h2 class="dashboard_label">{{ $t('moderator.nav.slides') }}</h2>
                    <DataTable :value="slides" dataKey="id" editMode="row" scrollable scrollHeight="flex"
                        responsiveLayout="scroll" class="my-table" v-model:selection="selectedSlide"
                        selectionMode="single" :globalFilterFields="['name', 'tags']" v-model:filters="filters">

                        <Column field="name" header="">
                            <template #editor="slotProps">
                                <InputText v-model="slotProps.data.name" />
                            </template>
                            <template #body="slotProps">
                                <div draggable="true" @dragstart="onDragStart($event, slotProps.data)">
                                    <span style="font-weight: 600;">{{ slotProps.data.name }}</span><br>
                                    <span style="font-size: 0.875rem; color: #64748b;">Updated
                                        {{ formatDate(slotProps.data.updated_at) }}</span>
                                </div>
                            </template>
                        </Column>

                        <template #header>
                            <InputText class="input-field" v-model="filters.global.value"
                                :placeholder="$t('moderator.search')" type="text" />
                            <Button class="button-reset-search" @click="filters.global.value = null" rounded
                                :disabled="!filters.global.value">
                                <i class="pi pi-times"></i>
                            </Button>
                        </template>

                    </DataTable>
                </SplitterPanel>
                <SplitterPanel class="sub-panel" :size="colRightSize">
                    <SlideView v-if="selectedSlide" :preview="true" :slide="selectedSlide" :showframe="false"
                        :sections="selectedSlide.sections ? selectedSlide.sections : []" class="slide-preview" />
                </SplitterPanel>
            </Splitter>
        </div>
        <!-- horizontal line -->
        <div style="height: 10px; background: #e5e5e5;"></div>
        <!-- Lower panel row -->
        <div style="height: 300px; flex: 1; display: flex; width: 100%;">
            <Splitter layout="horizontal" style="width: 100%; height: 100%">
                <SplitterPanel class="sub-panel" :size="colLeftSize">
                    <h2 class="dashboard_label">{{ $t('moderator.nav.participants_slideshow') }}</h2>
                    <DataTable :value="slideshows" dataKey="id" editMode="row" scrollable scrollHeight="flex"
                        @row-edit-save="onRowEditSaveSlideshow" @row-click="onRowClick" responsiveLayout="scroll"
                        class="my-table" v-model:editingRows="editingRows" v-model:selection="selectedSlideshow"
                        selectionMode="single">

                        <Column field="name" header="">
                            <template #editor="slotProps">
                                <InputText v-model="slotProps.data.name" />
                            </template>
                            <template #body="slotProps">
                                <span style="font-weight: 600;">{{ slotProps.data.name }}</span><br>
                                <span style="font-size: 0.875rem; color: #64748b;">Updated
                                    {{ formatDate(slotProps.data.updated_at) }}</span>
                            </template>
                        </Column>

                        <Column style="width: 12rem" bodyClass="flex justify-content-end white-space-nowrap"
                            editorClass="flex justify-content-end white-space-nowrap">
                            <template #body="slotProps">
                                <Button size="small" rounded text icon="pi pi-clone"
                                    @click="onDuplicateSlideshow(slotProps.data)" />
                                <Button size="small" rounded text icon="pi pi-pencil"
                                    @click="(e) => slotProps.editorInitCallback(e)" />
                                <Button size="small" rounded text icon="pi pi-trash"
                                    @click="onConfirmDeleteSlideshow(slotProps.data)" />
                                <Button size="small" rounded text icon="pi pi-play-circle"
                                    @click="onPlaySlideshow(slotProps.data)" />
                            </template>
                            <template #editor="slotProps">
                                <Button size="small" rounded text icon="pi pi-check"
                                    @click="(e) => slotProps.editorSaveCallback(e)" />
                                <Button size="small" rounded text icon="pi pi-times"
                                    @click="(e) => slotProps.editorCancelCallback(e)" />
                            </template>
                        </Column>

                        <template #header>
                            <InputText class="input-field" v-model="slideshowName"
                                :placeholder="$t('moderator.presentation.new_slideshow')" type="text" />
                            <Button :label="$t('moderator.presentation.create')" icon="pi pi-save"
                                @click="onAddSlideshow" />
                        </template>
                    </DataTable>
                </SplitterPanel>
                <SplitterPanel :size="colRightSize">
                    <div v-if="selectedSlideshow" style="overflow: auto; height: 100%;">
                        <div class="target-panel" @dragover.prevent @drop="handleNativeDrop">
                            <div class="header-container">
                                <h3>{{ t('moderator.order') }}</h3>
                                <Button class="button-add-presentation" :label="$t('moderator.save_order')"
                                    icon="pi pi-save" @click="saveOrderToApi" />
                            </div>

                            <draggable v-model="selectedOrder" group="elements" item-key="uniqueId" class="drop-zone"
                                ghost-class="ghost-item" handle=".drag-handle-target" tag="div">
                                <template #item="{ element, index }">
                                    <div class="ordered-item" :key="element.uniqueId">
                                        <div class="item-meta">
                                            <span class="badge-index">#{{ index + 1 }}</span>
                                            <span class="item-name">{{ element.name }}</span>
                                        </div>
                                        <div class="item-actions">

                                            <i class="pi pi-sort-alt drag-handle-target"></i>
                                            <Button icon="pi pi-trash" severity="danger" text rounded size="small"
                                                @click="removeItem(index)" />
                                        </div>
                                    </div>
                                </template>

                                <template #footer>
                                    <div v-if="selectedOrder.length === 0" class="empty-placeholder">
                                        <i class="pi pi-plus-circle" style="font-size: 2rem;"></i>
                                        <p>{{ t('moderator.order_instruction') }}</p>
                                    </div>
                                </template>
                            </draggable>
                        </div>
                    </div>
                    <div v-else>
                    </div>
                </SplitterPanel>
            </Splitter>
        </div>
    </div>


</template>

<style scoped>
.my-table {
    flex: 1;
    min-height: 0;
}

.input-field {
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

.source-panel,
.target-panel {
    flex: 1;
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    padding: 1.5rem;
    min-height: 400px;
}

/* Rechter Bereich: Die Drop-Zone */
.drop-zone {
    min-height: 300px;
    border: 2px dashed #cbd5e1;
    border-radius: 6px;
    padding: 1rem;
    background: #ffffff;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}

.header-container {
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;
    margin-bottom: 1rem;
}

.header-container h3 {
    margin: 0;
}

/* Einzelnes gezogenes Element */
.ordered-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.75rem 1rem;
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
    cursor: grab;
}

.ordered-item:active {
    cursor: grabbing;
}

.item-meta {
    display: flex;
    align-items: center;
    gap: 0.75rem;
}

.badge-index {
    background: #cbd5e1;
    color: #334155;
    padding: 0.2rem 0.5rem;
    border-radius: 4px;
    font-size: 0.75rem;
    font-weight: bold;
}

.item-name {
    font-weight: 600;
}

.item-actions {
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.drag-handle-target {
    color: #94a3b8;
    cursor: grab;
}

/* CSS für das Element während des Ziehens */
.ghost-item {
    opacity: 0.4;
    background: #e2e8f0;
    border: 2px dashed #94a3b8;
}

/* Einfacher Trigger-Bereich für die linke Tabellenseite */
.draggable-table-row-trigger {
    padding: 0.5rem;
    background: #ffffff;
    border: 1px solid #e2e8f0;
    margin-bottom: 0.25rem;
    border-radius: 4px;
    cursor: grab;
}

.empty-placeholder {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    color: #94a3b8;
    height: 200px;
    text-align: center;
}
</style>