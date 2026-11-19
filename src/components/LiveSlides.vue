<script setup lang="ts">
// Vue-stuff
import { ref, onMounted } from 'vue';
import Splitter from 'primevue/splitter'
import SplitterPanel from 'primevue/splitterpanel'
import Button from 'primevue/button'
import { useI18n } from 'vue-i18n';
// globals and services
import type { Slide } from '@/services/slide_service'
import { settings } from '@/globals/settings'
import { dialogService } from '@/services/dialog_service';
import { useWhatYouSeeOnMonitors, liveSlidesActive, useSceneOnMonitors, liveSlidesOnMonitors } from '@/globals/live_presentation';
import { updateMonitorStatesFromGriddedSlides, changeSlideOnOneMonitor } from '@/services/monitor_service'
import { sendModeratorMessage } from '@/services/moderator_service'
import { startLiveSlides, stopLiveSlides } from "@/services/live_slides_service";
import { backgroundSlideMonitor } from "@/globals/background"
import '@/assets/main.css'
// components
import SlideView from '@/components/SlideView.vue';
import SlideGallery from '@/components/SlideGallery.vue';

const { t } = useI18n();

const selectedSlide = ref<Slide | null>(null);

const whatYouSeeOnMonitors = useWhatYouSeeOnMonitors()
const sceneOnMonitors = useSceneOnMonitors()

const handleDragStart = (item) => {
    // Track if needed, but actual drag setup happens in child
};

onMounted(async () => {})

function startLiveSlidesIfNeccessary() {
    if (!liveSlidesActive) {
        startLiveSlides()
    }
}

function putLiveSlideOnMonitor(index: number, slide: Slide) {
    liveSlidesOnMonitors.value[index] = slide;
    changeSlideOnOneMonitor(slide, index + 1)
}

function updateLiveSlides(index: number, slide: Slide) {
    sendModeratorMessage({
        event_type: "update",
        command: "update_liveslides",
        slide: slide.id,
        monitorid: index
    })
    putLiveSlideOnMonitor(index, slide)
}

function onDrop(event: DragEvent, index: number) {
    const slideData = event.dataTransfer?.getData('slide');
    if (!slideData) return;

    startLiveSlidesIfNeccessary()
    const slide: Slide = JSON.parse(slideData);
    updateLiveSlides(index, slide)
}

async function onSendSlideToMultipleMonitors(slide: Slide | null) {
    if (!slide) return;

    const options = Array.from({ length: settings.value.number_of_screens }, (_, i) => i).map(m => ({ id: m, label: `${t('monitor.name')} ${m + 1}` }))
    const selected = await dialogService.openOptionDialog(options, `${t('select_monitors')}`);

    if (selected) {
        startLiveSlidesIfNeccessary()
        for (const monitor of selected) {
            updateLiveSlides(monitor.id, slide)
        }
    }
}

function removeLiveSlide(index: number) {
    liveSlidesOnMonitors.value[index] = null
    sendModeratorMessage({
        event_type: "remove",
        command: "remove_liveslide",
        slide_index: index
    })
    changeSlideOnOneMonitor(whatYouSeeOnMonitors.value[index], index + 1);
    if (!liveSlidesActive) {
        stopLiveSlides()
    }
}

function removeAllLiveSlides() {
    liveSlidesOnMonitors.value.fill(null);
    updateMonitorStatesFromGriddedSlides(whatYouSeeOnMonitors);
    sendModeratorMessage({
        event_type: "remove",
        command: "remove_liveslide",
        slide_index: "all"
    })
    stopLiveSlides()
}
</script>

<template>
    <div class="live-slides-container">
        <Splitter :gutter-size="2" class="dashboard">
            <!-- Available Slides -->
            <SplitterPanel :size="25" class="sub-panel">
                <SlideGallery style="flex: 1; min-height: 0;" v-model:selectedSlide="selectedSlide"
                    @slide-drag-start="handleDragStart" />
            </SplitterPanel>
            <!-- Current view -->
            <SplitterPanel :size="75" :minSize="15" class="sub-panel">
                <div class="header-row">
                    <h2 class="dashboard_label">{{ $t('moderator.live_monitors') }}</h2>
                    <div class="header-row-actions">
                        <Button icon="pi pi-trash" outlined :label="$t('moderator.clear')"
                            @click="removeAllLiveSlides" />
                        <Button size="small" :disabled="selectedSlide == null"
                            :label="$t('moderator.send_to_multiple_monitors')"
                            @click="onSendSlideToMultipleMonitors(selectedSlide)">

                            <template #icon>
                                <i class="material-symbols-outlined">queue_play_next</i>
                            </template>
                        </Button>
                    </div>
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

                            <Button size="small" text round @click="removeLiveSlide(index)">
                                <template #icon>
                                    <i class="material-symbols-outlined">close</i>
                                </template>
                            </Button>
                        </div>

                        <!-- If Slide assigned to Monitor show SlideView component, else show monitor symbol -->
                        <div v-if="slot" style="width: 100%; height:90%; pointer-events: none; position: relative;">
                            <!-- Background slide layer (from global settings), if configured -->
                            <div v-if="backgroundSlideMonitor" class="background-slide">
                                <SlideView :preview="true" :slide="backgroundSlideMonitor"
                                    :sections="backgroundSlideMonitor.sections ?? []" :showFrame="false">
                                </SlideView>
                            </div>
                            <SlideView class="monitor-preview-content" :preview="true" :slide="slot"
                                :sections="slot.sections ? slot.sections : []" :showFrame="false">
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

.monitor-preview-content {
    position: relative;
    z-index: 1;
}

.background-slide {
    position: absolute;
    inset: 0;
    z-index: 0;
    pointer-events: none;
}
</style>