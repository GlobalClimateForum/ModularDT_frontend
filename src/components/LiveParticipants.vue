<script lang="ts" setup>
import { ref, onMounted, onUnmounted } from 'vue'
import Splitter from 'primevue/splitter'
import SplitterPanel from 'primevue/splitterpanel'
import Message from 'primevue/message'
import Button from 'primevue/button';
import { type ParameterChange } from '@/services/parameter_service'
import parameterStore from '@/services/parameter_service'
import { liveParticipantsSlideshow } from '@/globals/live_participant_slideshows';
import { type liveParticipantSlideshow } from '@/globals/live_participant_slideshows';
import { slideshows } from '@/globals/slideshows';
import { participants } from '@/globals/participants';
import SlideView from '@/components/SlideView.vue';
import { stopSlideshow } from "@/services/slideshow_service";
import { deleteLiveParticipantsSlideshow } from '@/globals/live_participant_slideshows';
import { participantParameters } from '@/globals/participant_parameters';


const parameterChanges = ref<ParameterChange[]>([])

onMounted(() => {
    const stop = parameterStore.subscribe((c) => parameterChanges.value.push(c))
    onUnmounted(() => {
        stop()
    })
})

function getParticipantNameAndSeat(lps: liveParticipantSlideshow) {
    const index = participants.value.findIndex(item => item.seat === lps.participant_seat);
    if (index === -1 || !participants.value[index]) return null;
    return participants.value[index].name + ` (Seat ` + participants.value[index].seat + `)`
}

function getParticipantSeat(lps: liveParticipantSlideshow) {
    return lps.participant_seat.toString()
}

function getSlideshowName(lps: liveParticipantSlideshow) {
    const index = slideshows.value.findIndex(item => item.id === lps.slideshow_id);
    if (index === -1 || !slideshows.value[index]) return null;
    return slideshows.value[index].name
}

function getCurrentSlide(lps: liveParticipantSlideshow) {
    const index = slideshows.value.findIndex(item => item.id === lps.slideshow_id);
    if (index === -1 || !slideshows.value[index]) return null;
    return slideshows.value[index].slides[lps.current_slide_index]
}

async function stopSingleParticipantSlideshow(lps: liveParticipantSlideshow) {
    await stopSlideshow(lps.participant_seat);
    deleteLiveParticipantsSlideshow(lps);
}

async function stopAllParticipantSlideshows() {
    for (const participants_slideshow of liveParticipantsSlideshow.value) {
        await stopSlideshow(participants_slideshow.participant_seat);
    }
    liveParticipantsSlideshow.value = []
}
</script>


<template>
    <div class="dashboard">
        <Splitter :gutter-size="2" class="dashboard" layout="vertical">
            <SplitterPanel :size="75" class="sub-panel">
                <div class="panel-content" style="padding: var(--space-large);">
                    <div class="header-row">
                        <h1 class="dashboard_label">{{ $t('participant.live_presentation_state') }}</h1>
                        <Button label="Stop all" @click="stopAllParticipantSlideshows" rounded>
                            <template #icon>
                                <i class="material-symbols-outlined">stop_circle</i>
                            </template>
                        </Button>
                    </div>

                    <div class="scrollable-table">
                        <table class="participant-table">
                            <colgroup>
                                <col class="participant-column">
                                <col class="content-column">
                            </colgroup>
                            <tbody>
                                <tr v-for="participants_slideshow in liveParticipantsSlideshow"
                                    :key="participants_slideshow.participant_seat">
                                    <td class="slide-column">
                                        <div class="slideshow-card">
                                            <div class="slideshow-info">
                                                <p class="slideshow-label">
                                                    {{ getParticipantNameAndSeat(participants_slideshow) }}
                                                </p>
                                                <p class="slideshow-label">
                                                    {{ getSlideshowName(participants_slideshow) }}
                                                </p>
                                                <Button label="Stop" class="tight-btn"
                                                    @click="stopSingleParticipantSlideshow(participants_slideshow)"
                                                    rounded>
                                                    <template #icon>
                                                        <i class="material-symbols-outlined">stop_circle</i>
                                                    </template>
                                                </Button>
                                            </div>

                                            <div class="slideshow-item">
                                                <template v-if="getCurrentSlide(participants_slideshow)">
                                                    <SlideView class="slide-view" :preview="false"
                                                        :slide="getCurrentSlide(participants_slideshow)"
                                                        :sections="getCurrentSlide(participants_slideshow)?.sections ?? []"
                                                        :showFrame="false" :shadow="true"
                                                        style="pointer-events: none;" />
                                                </template>
                                            </div>
                                        </div>
                                    </td>

                                    <td class="second-column">
                                        <div
                                            v-if="getParticipantSeat(participants_slideshow) !== null && participantParameters.has(getParticipantSeat(participants_slideshow))">
                                            <strong>Parameters:</strong>
                                            <ul v-for="[key, value] in participantParameters.get(getParticipantSeat(participants_slideshow)) " class="parameter-change-list" >
                                                <li><strong>Parameter:</strong> {{ key }} - <strong>Value:</strong> {{ value }}</li>
                                            </ul>
                                        </div>

                                        <div v-else>
                                            No Parameters found.
                                        </div>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </SplitterPanel>
            <SplitterPanel :size="25" class="sub-panel">
                <h1 class="dashboard_label">Parameter Changes</h1>
                <div style="width: 100%; height: 100%; padding: var(--space-large);"
                    class="inset-control parameter-change-container">
                    <div v-for="change in parameterChanges">
                        <Message severity="secondary" size="small">
                            <template #default>
                                <div class="parameter-change">
                                    <div class="section-indicator">
                                        {{ change.section }}
                                    </div>
                                    <ul class="parameter-change-list">
                                        <li><strong>Parameter:</strong> {{ change.parameter }}</li>
                                        <li><strong>New Value:</strong> {{ change.value }}</li>
                                    </ul>
                                </div>
                            </template>
                        </Message>
                    </div>
                </div>
            </SplitterPanel>
        </Splitter>
    </div>
</template>


<style scoped>
.parameter-change-container {
    display: flex;
    flex-direction: column;
    gap: var(--space-small);
    overflow-y: auto;
}

.parameter-change {
    display: flex;
    flex-direction: row;
    gap: var(--space-medium);
}

.section-indicator {
    font-weight: bold;
    color: var(--p-primary-500);
    width: 50px;
    font-family: "Fira Code", monospace;
    font-size: var(--fs-large);
    display: flex;
    align-items: center;
    justify-content: center;
}

.parameter-change-list {
    list-style: none;
    padding: 0;
    margin: 0;
}

.scrollable-table {
    /*overflow: auto;*/
    flex: 1 1 auto;
    min-height: 0;
    overflow-y: auto;
    overflow-x: hidden;
}

.panel-content {
    height: 100%;
    min-height: 0;
    padding: var(--space-large);
    display: flex;
    flex-direction: column;
    box-sizing: border-box;
}

.participant-table {
    width: 100%;
    table-layout: fixed;
    border-collapse: collapse;
}

.participant-column {
    width: 25%;
}

.content-column {
    width: 75%;
}

.header-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    flex-shrink: 0;
}

.slide-column {
    width: 25%;
    padding: 0;
    vertical-align: top;
}

.second-column {
    width: 75%;
    padding-left: 35px;
}

.slideshow-card {
    width: 100%;
    display: block;
    box-sizing: border-box;
}


.slideshow-content {
    width: 100%;
    height: 100%;
    gap: 10px;
}

.slideshow-item {
    width: 100%;
    display: block;
}

.slideshow-item>* {
    display: block;
    width: 100%;
}

.slideshow-info {
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;
    flex-shrink: 0;
}

.slideshow-label {
    font-weight: bold;
    font-size: var(--fs-medium);
    color: var(--p-primary-500);
}

.slideshow-parameter {
    font-weight: bold;
    font-size: var(--fs-medium);
    color: var(--p-primary-500);
}

.participant-table {
    width: 100%;
    table-layout: fixed;
    border-collapse: collapse;
}

.slide-view {
    display: block;
    width: 100%;

    /* ÄNDERUNG: Die Slide bestimmt ihre Höhe nun selbst wie ein Bild über das Seitenverhältnis */
    height: auto !important;
    aspect-ratio: 16 / 9;

    /* Verhindert das Herausragen von internen Elementen */
    overflow: hidden;
}

.tight-btn {
    /* Erster Wert = Oben/Unten, Zweiter Wert = Links/Rechts */
    padding: 0.25rem 0.5rem !important;

    /* Optional: Falls das Icon zu nah am Text klebt */
    gap: 0.25rem;
}
</style>