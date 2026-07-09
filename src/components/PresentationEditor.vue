<script setup lang="ts">
import { ref, watch } from 'vue';
import draggable from 'vuedraggable';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Button from 'primevue/button';

import { getScenes } from "@/services/scene_service";
import type { Scene } from "@/services/scene_service";

import { useI18n } from 'vue-i18n';
const { t } = useI18n();

interface OrderedScenes extends Scene {
  uniqueId: string; // Wichtig für SQLite/Django, falls ein Element mehrfach vorkommt
  position: number;
}

const scenes = ref<Scene[]>([]);

function fetchScenes() {
    getScenes().then(response => {
        scenes.value = response.data.scenes;
        //console.info('fetched scenes:', JSON.parse(JSON.stringify(scenes.value)))
    }).catch(error => {
        console.error("Error fetching scenes:", error);
    });
}

// Die Ziel-Reihenfolge, die per Drag&Drop gebaut wird
const selectedOrder = ref<OrderedScenes[]>([]);

// Hilfsfunktion: Erstellt beim Rüberziehen eine eindeutige Kopie (Klonen)
// Verhindert ID-Kollisionen, falls dieselbe Szene 2x in der Präsentation landet
const cloneItem = (item: Scene): OrderedScenes => {
  return {
    ...item,
    uniqueId: `${item.id}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    position: selectedOrder.value.length + 1
  };
};

const removeItem = (index: number) => {
  selectedOrder.value.splice(index, 1);
};

// Automatische Aktualisierung des "position"-Feldes bei jeder Änderung der Reihenfolge
watch(selectedOrder, (newOrder) => {
  newOrder.forEach((item, index) => {
    item.position = index + 1;
  });
}, { deep: true });
</script>

<template>
  <div class="builder-container">
    
    <!-- LINKSEITE: Die Haupt-Datenbanktabelle (Quelle) -->
    <div class="source-panel">
      <h3>{{ t('moderator.available_scenes') }}</h3>
      
      <!-- Wir nutzen eine DataTable für das gewohnte PrimeVue-Design -->
      <DataTable :value="scenes" dataKey="id" responsiveLayout="scroll" class="p-datatable-sm">
        <Column field="name" header="Name"></Column>
        <Column field="description" header="Beschreibung"></Column>
        <Column style="width: 4rem" header="Action">
          <template #body="slotProps">
            <!-- Ein kleiner visueller Indikator oder Button zum Klonen per Drag -->
            <div class="drag-handle-source" :data-item="JSON.stringify(slotProps.data)">
              <i class="pi pi-bars"></i>
            </div>
          </template>
        </Column>
      </DataTable>

      <!-- Unsichtbare, aber aktive Draggable-Zone über der Tabelle, 
           die es erlaubt, Einträge aus der Tabelle herauszuziehen -->
      <draggable 
        :list="scenes" 
        :group="{ name: 'elements', pull: 'clone', put: false }" 
        :clone="cloneItem"
        item-key="id"
        class="hidden-draggable-overlay"
      >
        <template #item="{ element }">
          <div class="draggable-table-row-trigger">
            <i class="pi pi-bars"></i> {{ element.name }}
          </div>
        </template>
      </draggable>
    </div>

    <!-- RECHTSEITE: Die Ziel-Reihenfolge (Sortierbar) -->
    <div class="target-panel">
      <h3>{{ t('moderator.order') }}</h3>
      
      <!-- Diese Liste akzeptiert Elemente aus der linken Gruppe 
           und erlaubt internes Umsortieren -->
      <draggable 
        v-model="selectedOrder" 
        group="elements" 
        item-key="uniqueId"
        class="drop-zone"
        ghost-class="ghost-item"
      >
        <template #item="{ element, index }">
          <div class="ordered-item">
            <div class="item-meta">
              <span class="badge-index">#{{ index + 1 }}</span>
              <span class="item-name">{{ element.name }}</span>
            </div>
            <div class="item-actions">
              <i class="pi pi-sort-alt drag-handle-target"></i>
              <Button 
                icon="pi pi-trash" 
                severity="danger" 
                text 
                rounded 
                size="small" 
                @click="removeItem(index)" 
              />
            </div>
          </div>
        </template>
        
        <!-- Platzhalter, wenn noch keine Elemente hinzugefügt wurden -->
        <template #footer>
          <div v-if="selectedOrder.length === 0" class="empty-placeholder">
            <i class="pi pi-plus-circle" style="font-size: 2rem;"></i>
            <p>{{t('moderator.order_instruction')}}</p>
          </div>
        </template>
      </draggable>
    </div>

  </div>
</template>

<style scoped>
.builder-container {
  display: flex;
  gap: 2rem;
  width: 100%;
  align-items: flex-start;
}

.source-panel, .target-panel {
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

/* Einzelnes gezogenes Element */
.ordered-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1rem;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.05);
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

