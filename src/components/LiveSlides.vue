<script setup lang="ts">
// Vue-stuff
import { ref } from 'vue';
import Splitter from 'primevue/splitter'
import SplitterPanel from 'primevue/splitterpanel'
import Toolbar from 'primevue/toolbar'
import Button from 'primevue/button'
import { useI18n } from 'vue-i18n';
import Message from 'primevue/message';
// globals and services
import type { Slide } from '@/services/slide_service'
import { settings } from '@/globals/settings'
import { dialogService } from '@/services/dialog_service';
import { useLiveSlidesOnMonitors, useLiveSlidesActive, useWhatYouSeeOnMonitors } from '@/globals/live_presentation';
import { updateMonitorStatesFromGriddedSlides, updateOneMonitor } from '@/services/monitor_service'
import { startLiveSlides, stopLiveSlides } from "@/services/live_slides_service";
import '@/assets/main.css'
// components
import SlideView from '@/components/SlideView.vue';
import SlideGallery from '@/components/SlideGallery.vue';

const liveSlidesActive = useLiveSlidesActive()
const { t } = useI18n();
const selectedSlide = ref<Slide | null>(null);

let liveSlidesOnMonitors = useLiveSlidesOnMonitors();
let whatYouSeeOnMonitors = useWhatYouSeeOnMonitors()

const handleDragStart = (item) => {    
    // Track if needed, but actual drag setup happens in child
};

function onDrop(event: DragEvent, index: number) {
    const slideData = event.dataTransfer?.getData('slide');
    if (!slideData) return;

    startLiveSlides()
    const slide: Slide = JSON.parse(slideData);
    liveSlidesOnMonitors.value[index] = slide;
    updateOneMonitor(slide, index + 1)
}

const onSendSlideToMultipleMonitors = async (slide: Slide) => {
    const options = Array.from({ length: settings.value.number_of_screens }, (_, i) => i).map(m => ({ id: m, label: `${t('monitor.name')} ${m + 1}` }))
    const selected = await dialogService.openOptionDialog(options, `${t('select_monitors')}`);

    if (selected) {
        startLiveSlides()
        for (const monitor of selected) {
            liveSlidesOnMonitors.value[monitor.id] = slide;
            updateOneMonitor(slide, monitor.id + 1)
        }
    }
}
</script>

<template>
    <div class="live-slides-container">
        <div class="dashboard-header">
            <Button icon="pi pi-trash" outlined :label="$t('moderator.clear')"
                @click="liveSlidesOnMonitors.fill(null); updateMonitorStatesFromGriddedSlides(whatYouSeeOnMonitors); stopLiveSlides()" />
            <Message info size="small" style="margin-left: auto">
                <span style="display: flex; align-items: center; gap: 0.25rem;">
                    <i class="material-symbols-outlined">desktop_windows</i>
                    {{ settings.number_of_screens }}
                </span>
            </Message>
        </div>
        <Splitter :gutter-size="2" class="dashboard">
            <!-- Available Slides -->
            <SplitterPanel :size="25" class="sub-panel">
                <SlideGallery style="flex: 1; min-height: 0;"  v-model:selectedSlide="selectedSlide" @slide-drag-start="handleDragStart" />
            </SplitterPanel>
            <!-- Current view -->
            <SplitterPanel :size="75" :minSize="15" class="sub-panel">
                <div style="display: flex; align-items: center; justify-content: space-between;">
                    <h2 class="dashboard_label">{{ $t('moderator.live_monitors') }}</h2>
                    <Button size="small" :disabled="selectedSlide == null"
                        :label="$t('moderator.send_to_multiple_monitors')"
                        @click="onSendSlideToMultipleMonitors(selectedSlide)">

                        <template #icon>
                            <i class="material-symbols-outlined">queue_play_next</i>
                        </template>
                    </Button>
                </div>

                <div class="monitor_container">
                    <!-- For each slide in the scene, render a monitor item -->
                    <div v-for="(slot, index) in whatYouSeeOnMonitors" :key="index" class="monitor-item inset-control"
                        @dragover.prevent @drop="onDrop($event, index)">

                        <!-- Monitor Info: Name, Index, and Clear Button -->
                        <div class="monitor-info">
                            <div class="monitor-label-container">
                                <h3 class="monitor-label">
                                    <i class="material-symbols-outlined">desktop_windows</i>
                                    {{ index + 1 }}
                                </h3>
                                <h3 class="assigned-slide-label" v-if="slot">{{ slot.name }}</h3>
                            </div>

                            <Button size="small" text round
                                @click="liveSlidesOnMonitors.splice(index, 1, null); updateOneMonitor(whatYouSeeOnMonitors[index], index + 1); if (!liveSlidesActive) { stopLiveSlides() }">
                                <template #icon>
                                    <i class="material-symbols-outlined">close</i>
                                </template>
                            </Button>
                        </div>

                        <!-- If Slide assigned to Monitor show SlideView component, else show monitor symbol -->
                        <div v-if="slot" style="width: 100%; height:90%; pointer-events: none">
                            <SlideView :preview="false" :slide="slot" :sections="slot.sections ? slot.sections : []"
                                :showFrame="false">
                            </SlideView>
                        </div>
                        <div v-else class="monitor-symbol">
                            <i class="pi pi-desktop"></i>
                        </div>

                    </div>
                </div>
            </SplitterPanel>
        </Splitter>
    </div>
</template>

<style scoped>
.dashboard {
    flex: 1;
    min-height: 0;
}

.sub-panel {
    display: flex;
    flex-direction: column;
    min-height: 0;
    overflow: hidden;
}

.scene-toolbar {
    margin-bottom: 0.5rem;
    padding: 0.5rem;
    flex-shrink: 0;
}

.live-slides-container {
    height: 100%;
    display: flex;
    flex-direction: column;
}

.monitor_container {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 1rem;
    padding: 1rem;
    flex: 1;
    min-height: 0;
    align-content: start;
    overflow: hidden;
}

.monitor-item {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    width: 100%;
    height: 200px;
    position: relative;
    overflow: hidden;
}

.monitor-label-container {
    display: flex;
    flex-direction: row;
    gap: 1.0rem;
    align-items: center;
}

.monitor-label {
    font-size: var(--fs-small);
    color: var(--p-primary-50);
    margin-bottom: 0;
    padding: 0;
    text-transform: uppercase;
}

.assigned-slide-label {
    font-weight: normal;
    font-size: var(--fs-small);
    color: var(--p-primary-50);
    margin-bottom: 0;
    padding: 0;
}

.monitor-symbol {
    color: var(--p-primary-300);
    margin: 0px;
    padding: 0px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
}

.search-input {
    flex: 1;
    width: 100%;
    padding: 0.5rem;
    border-radius: var(--br-medium);
    border: 1px solid var(--surface-border, #e2e8f0);
    background-color: var(--p-primary-50, #f8fafc);
}
</style>