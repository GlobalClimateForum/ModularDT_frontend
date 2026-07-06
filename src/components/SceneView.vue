<script lang="ts" setup>
import type { Scene } from '@/services/scene_service';
//import { defineAsyncComponent } from 'vue'
import SlideView from '@/components/SlideView.vue';
import { ref, watch, computed, onMounted, onBeforeUnmount } from 'vue';
import { settings } from '@/utils/settings'

const props = withDefaults(defineProps<{
    scene: Scene | null,
    preview: boolean,
    showframe?: boolean,
    shadow?: boolean
}>(), {
    scene: null,
    showframe: false,
    shadow: true
});

const gridedSlides = computed(() => {
  const grid = Array(settings.value.number_of_screens).fill(null)
  
  props.scene?.slides.forEach(slide => {
    if (slide && slide.position && slide.position <= settings.value.number_of_screens) {
      grid[slide.position - 1] = slide
    }
  })
  
  return grid
})

// Berechnet das optimale Grid-Layout dynamisch, damit alle Monitore reinpassen
const gridStyle = computed(() => {
    //console.log("Got :", props.scene);
    const count = settings.value.number_of_screens;
    if (count <= 0) return {};

    let cols = 1;
    let rows = 1;

    // Bestimmt das optimale Raster je nach Monitor-Anzahl
    if (count <= 1) { cols = 1; rows = 1; }
    else if (count <= 2) { cols = 2; rows = 1; }
    else if (count <= 4) { cols = 2; rows = 2; }
    else if (count <= 6) { cols = 3; rows = 2; }
    else if (count <= 9) { cols = 3; rows = 3; }
    else { cols = 4; rows = Math.ceil(count / 4); }

    return {
        gridTemplateColumns: `repeat(${cols}, 1fr)`,
        gridTemplateRows: `repeat(${rows}, 1fr)`
    };
});
</script>

<template>
    <div class="monitor_container" :style="gridStyle">
        <div v-for="(slot, index) in gridedSlides" :key="index" class="monitor-item" @dragover.prevent>
            
            <!-- Wrapper for 16:9  -->
            <div class="monitor-content">

                <!-- Monitor Info: Name, Index -->

                <div class="monitor-info">
                    <div class="monitor-label-container">
                        <h3 class="monitor-label">
                            <i class="material-symbols-outlined">desktop_windows</i>
                            {{ index + 1 }}
                        </h3>
                        <h3 class="assigned-slide-label" v-if="slot">{{ slot.name }}</h3>
                    </div>
                    <Button icon="pi pi-times" small rounded @click="props.scene?.slides.splice(index, 1)" />
                </div>

                <!-- If Slide assigned to Monitor show SlideView component, else show monitor symbol -->
                <div v-if="slot" class="slide-wrapper">
                    <SlideView :preview="false" :slide="slot" :sections="slot.sections ? slot.sections : []"
                        :showFrame="false" /> 
                </div>
                <div v-else class="monitor-symbol">
                    <i class="pi pi-desktop"></i>
                </div> 
            </div>

        </div>
    </div>
</template>

<style scoped>
/* --- Layout & Container --- */
.dashboard {
    height: 100%;
}

.sub-panel {
    display: flex !important;
    flex-direction: column;
    height: 100%;
}

.scene-toolbar {
    margin-bottom: 0.5rem;
    padding: 0.5rem;
    flex-shrink: 0;
}

/* --- Haupt-Monitor-Grid --- */
.monitor_container {
    display: grid;
    /* Teilt die verfügbare Höhe des Containers gleichmäßig auf die Zeilen auf */
    grid-auto-rows: 1fr;
    align-content: center;
    justify-content: center;
    gap: 1.5rem;
    padding: 1.5rem;

    /* Zwingt den Container, sich an das übergeordnete sub-panel anzupassen */
    width: 100%;
    flex: 1;
    min-height: 0;
    box-sizing: border-box;
    overflow: hidden;
}

/* --- Single Monitor --- */
.monitor-item {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
}

.monitor-content {
    /* 16:9 */
    aspect-ratio: 16 / 9;
    width: 100%;
    max-height: 100%;

    display: flex;
    flex-direction: column;
    position: relative;
    box-sizing: border-box;
    background-color: var(--p-primary-50);
    border-radius: var(--br-medium);
    overflow: hidden;

    /* NEU: Ein feiner Rahmen NUR um den echten 16:9 Monitor-Kasten herum */
    border: 1px solid var(--p-primary-200);
    /* Falls du den "eingedrückten" Inset-Effekt magst, kannst du ihn hierhin legen: */
    box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.05);
}

/* --- Monitor-Inhalt (Slide oder Symbol) --- */
.slide-wrapper {
    width: 100%;
    /* Füllt den Raum über der Info-Leiste aus */
    height: calc(100% - 32px);
    position: relative; 
}

.monitor-symbol {
    width: 100%;
    height: calc(100% - 32px);
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--p-primary-300);
}

/* --- Monitor Fußzeile / Info-Leiste --- */
.monitor-info {
    position: absolute;
    bottom: 0;
    left: 0;
    z-index: 10;
    width: 100%;
    height: 32px;
    background-color: var(--p-primary-500);
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0 0.5rem;
    box-sizing: border-box;
}

.monitor-label-container {
    display: flex;
    flex-direction: row;
    gap: 1.0rem;
}

.monitor-label {
    font-size: var(--fs-small);
    color: var(--p-primary-50);
    margin-bottom: 0;
    padding: 0;
    text-transform: uppercase;
    display: flex;
    align-items: center;
    gap: 0.25rem;
}

.assigned-slide-label {
    font-weight: normal;
    font-size: var(--fs-small);
    color: var(--p-primary-50);
    margin-bottom: 0;
    padding: 0;
}
</style>
