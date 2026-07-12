<script setup lang="ts">
import { ref, watch, onMounted, nextTick } from 'vue';
import draggable from 'vuedraggable';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Button from 'primevue/button';
import axios from 'axios'; // Oder Ihr eigener API-Service

import { updatePresentation } from "@/services/presentation_service";
import type { Scene } from "@/services/scene_service";
import type { Presentation } from "@/services/presentation_service"

import { useI18n } from 'vue-i18n';
const { t } = useI18n();

const props = defineProps<{
    presentation: Presentation,
    scenes: Scene[]
}>();


// Die Ziel-Reihenfolge, die per Drag&Drop gebaut wird
//const selectedOrder = ref<OrderedScenes[]>([]);

const onDragStart = (event: DragEvent, item: Scene) => {
    if (event.dataTransfer) {
        event.dataTransfer.effectAllowed = 'copy'; // Zeigt dem Cursor an, dass kopiert wird
        event.dataTransfer.setData('application/json', JSON.stringify(item));
    }
};


// Typen-Definition für Ihre Ziel-Elemente
interface SelectedScene {
    id: string;       // Originale Szenen-ID
    uniqueId: string; // Eindeutige ID für vuedraggable (z.B. Zeitstempel oder UUID)
    name: string;
    description: string;
}

const selectedOrder = ref<SelectedScene[]>([]);

onMounted(() => {
    if (props.presentation.scenes) {
        selectedOrder.value = props.presentation.scenes.map(scene => ({
            // Ensure id is a string to satisfy SelectedScene type
            id: String(scene.id ?? ''),
            name: scene.name,
            description: scene.description,
            // Wichtig: Auch beim initialen Laden eindeutige IDs generieren!
            uniqueId: `${scene.id}-init-${Math.random().toString(36).substr(2, 9)}`
        }));
    }
});

const handleNativeDrop = async (event: DragEvent) => {
    if (!event.dataTransfer) return;

    const dataString = event.dataTransfer.getData('application/json');
    if (!dataString) return;

    try {
        const rawScene = JSON.parse(dataString);

        // 1. Ein echtes Deep-Clone des Objekts erstellen.
        // structuredClone löst alle reaktiven Referenzen und verschachtelten
        // Arrays (slides, sections) sauber auf und kopiert sie frisch.
        const deepClonedScene = structuredClone(rawScene);

        // 2. Das entkoppelte Objekt mit der einzigartigen ID für vuedraggable versehen
        const newElement: SelectedScene = {
            ...deepClonedScene,
            uniqueId: crypto.randomUUID() // Garantiert eindeutige ID im Browser
        };

        // 3. Vue Zeit geben, das native Drag-Event zu beenden
        await nextTick();

        // 4. Erst jetzt der Liste hinzufügen
        selectedOrder.value.push(newElement);

    } catch (error) {
        console.error('Fehler beim Verarbeiten des gedroppten Elements:', error);
    }
};

const isSaving = ref(false);

const saveOrderToApi = async () => {
    if (selectedOrder.value.length === 0) return;

    isSaving.value = true;
    try {
        // 1. Payload für das Backend vorbereiten
        const scenePayload = selectedOrder.value.map((item, index) => ({
            scene_id: item.id,
            position: index + 1
        }));

        // 2. Ihren Service aufrufen. 
        // Wir übergeben Partial<Presentation>, indem wir das 'scenes'-Feld befüllen.
        const response = await updatePresentation(props.presentation.id, {
            scenes: scenePayload as any // 'as any' fängt eventuelle TypeScript-Typkonflikte im Service ab
        });

        console.log("Reihenfolge erfolgreich via Service gespeichert!");

    } catch (error) {
        console.error("Fehler beim Speichern über den Service:", error);
    } finally {
        isSaving.value = false;
    }
};

// Ihre bestehende removeItem Funktion
const removeItem = (index: number) => {
    selectedOrder.value.splice(index, 1);
};
</script>

<template>
    <div class="builder-container">

        <!-- LINKSEITE: Die Haupt-Datenbanktabelle (Quelle) -->
        <div class="source-panel">
            <h3>{{ t('moderator.available_scenes') }}</h3>

            <DataTable :value="props.scenes" dataKey="id" responsiveLayout="scroll" class="p-datatable-sm">
                <Column field="name" header="Name"></Column>
                <Column field="description" header="Beschreibung"></Column>
                <Column style="width: 4rem" header="Action">
                    <template #body="slotProps">
                        <!-- Einziges sichtbares Handle mit nativem Drag-Event -->
                        <div class="drag-handle-source" draggable="true"
                            @dragstart="onDragStart($event, slotProps.data)">
                            <i class="pi pi-bars"></i>
                        </div>
                    </template>
                </Column>
            </DataTable>
        </div>

        <!-- RECHTSEITE: Die Ziel-Reihenfolge (Sortierbar) -->
        <div class="target-panel" @dragover.prevent @drop="handleNativeDrop">
            <div class="header-container">
                <h3>{{ t('moderator.order') }}</h3>
                <!-- <Button :label="$t('moderator.save_order')" icon="pi pi-save" 
                severity="success"
                    size="small" :loading="isSaving" :disabled="selectedOrder.length === 0" 
                    class="control-item nav-button"  @click="saveOrderToApi" /> -->
            <Button class="button-add-presentation" :label="$t('moderator.save_order')" icon="pi pi-save"
                    @click="saveOrderToApi" />
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
</template>

<style scoped>
/* Verhindert, dass Kindelemente das native Drop-Event stören */
.drop-zone * {
    pointer-events: none;
}

/* Erlaubt Interaktionen wieder für Buttons und Handles, wenn nicht gedraggt wird */
.drop-zone .item-actions Button,
.drop-zone .drag-handle-target {
    pointer-events: auto;
}

/* Sorgt dafür, dass die Drop-Zone groß genug ist, auch wenn sie leer ist */
.drop-zone {
    min-height: 200px;
    height: 100%;
}

.builder-container {
    display: flex;
    gap: 2rem;
    width: 100%;
    align-items: flex-start;
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

.control-item {
  flex: 1 1 0%;
  max-width: 160px;
  /* Alle 3 werden maximal so breit */
  min-width: max-content;
  /* Richtet sich nach dem breitesten Inhalt (z.B. langer Buttontext) */
  white-space: nowrap;
}

/* Spezifisch für die Navigations-Buttons */
.nav-button {
  justify-content: center;
  /* Zentriert Text und Icon im Button */
}
</style>
