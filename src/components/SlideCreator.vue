<script setup lang="ts">
// Vue-stuff
import { ref, watch, defineAsyncComponent, nextTick, onMounted, onBeforeUnmount, computed } from 'vue'
import Button from 'primevue/button'
import ButtonGroup from 'primevue/buttongroup'
import InputText from 'primevue/inputtext'
import FloatLabel from 'primevue/floatlabel'
import Splitter from 'primevue/splitter'
import SplitterPanel from 'primevue/splitterpanel'
import Message from 'primevue/message'
import { useToast } from 'primevue/usetoast'
import Tabs from 'primevue/tabs'
import TabList from 'primevue/tablist'
import Tab from 'primevue/tab'
import TabPanels from 'primevue/tabpanels'
import TabPanel from 'primevue/tabpanel'
import Select from 'primevue/select';
// globals and services
import type { Slide, SlideSection } from '@/services/slide_service'
import { SlideSectionTypes, validateFilename, renameSlide, type SlideSectionType } from '@/services/slide_service'
import { getSlideSectionType } from '@/services/slide_service'
import { createDefaultSlide, createDefaultSection, updateSlideStore } from '@/globals/slides'
import { saveDraft, hasDraft, loadDraft, clearDraft } from '@/services/draft_service'
import { streamVegaSpec } from '@/utils/vega_utils'
import { basemaps } from '@/utils/map_utils'
import { updateSlideOnMonitors } from '@/services/monitor_service'
import { updateSlideViews } from '@/services/live_presentation_service';
import { useSlide } from '@/globals/slides'
import { identifyLayoutType } from '@/globals/slide_layout'

import '@/assets/main.css'
// components
import LayoutEditor from '@/components/LayoutEditor.vue'
import CodeEditor from '@/components/CodeEditor.vue'
import SlideView from '@/components/SlideView.vue'

import { formatDate } from '@/utils/date_utils'

type EditorSection = SlideSection & { _key: string } // Add a unique key to each section to guard section content

const edited = ref<boolean>(false)
const validFilename = ref<boolean>(false)
const nameEditing = ref<boolean>(false) // Track whether the user is currently editing the slide name
const nameEditTimer = ref<number | undefined>(undefined) // Timer for debouncing filename validation
const draftExists = ref<boolean>(false) // Track whether a draft exists for the current slide
let ready = false

// Define the Default Markdown Content, and Default Slide structure for new slides
const SECTION_LIMIT = 3
const SECTION_BG_COLOR_EDITING: Record<string, boolean> = {
    markdown: true,
    map: false,
    vega: true,
    ipanel: true,
    custom: false,
}
// Define Input Proerties
const props = defineProps<{ slide?: Slide | null }>()

// Define references
const currentSlide = ref<Slide>(props.slide ?? createDefaultSlide()) // Init a new slide if no slide is passed as prop
const currentSectionIndex = ref<number>(0) // Track the index of the currently selected section

const slideSections = ref<EditorSection[]>([]) // Track the sections of the current slide (view_type, content, content_path, width_fraction)
const sectionWidths = ref<number[]>([1.0]) // Track the width fractions of each section (default to 1.0 for a single section = fullscreen)
const showFrame = ref<boolean>(false) // Track whether to show the frame around the slide preview
const layout = ref<string>('fullscreen') // Track the current selected layout for the sections (fullscreen, golden, reversegolden, etc.)
const sectionBgColor = computed(() => slideSections.value[currentSectionIndex.value]?.properties?.bg ?? '#ffffff') // Track the background color of the current section
const sectionBgColorEditable = computed(() => SECTION_BG_COLOR_EDITING[slideSections.value[currentSectionIndex.value]?.view_type ?? 'markdown'] ?? false) // Track whether background editing is allowed for current section
const selectedTypes = ref<SlideSectionType[]>([]) // Track the selected view types for each section (markdown, map, chart, etc.)
const vegaProgress = ref<number | null>(null) // Track the progress of fetching Vega specs for sections in 'url' or 'interactive' mode
const autosizeVega = ref<boolean>(false) // Track whether to auto-size the Vega chart in the preview
const basemap = ref<keyof typeof basemaps>('openfreemap_bright') // Track the selected basemap for map sections
const targetSlide = ref<Slide | null>(null) // Track the target slide for interactive panel sections
const { savingSlide, persist } = useSlide() // Use the useSlide composable to handle saving slides and sections to the server

const withKey = (s: SlideSection): EditorSection => ({ ...s, _key: crypto.randomUUID() })

// Mapping for which editor to use for each view type (markdown, map, chart, etc.)
// all except markdown are lazy-loaded to reduce initial bundle size
const editorMapping: Record<string, any> = {
    markdown: CodeEditor,
    map: defineAsyncComponent(() => import('@/components/MapEditor.vue')),
    vega: defineAsyncComponent(() => import('@/components/VegaEditor.vue')),
    ipanel: defineAsyncComponent(() => import('@/components/InteractivePanelEditor.vue')),
    custom: defineAsyncComponent(() => import('@/components/CustomSlideEditor.vue')),
};

// Import the toast notification composable from PrimeVue for displaying success/error messages
const toast = useToast()

// --------------------- Slide Helpers ---------------------

// Helper function to load a slide into the editor (or create a new one), initializing the currentSlide, slideSections, sectionWidths, layout, and selectedTypes
function loadSlide(slide?: Slide | null) {

    const source = slide ?? createDefaultSlide();
    currentSlide.value = { ...source };

    // Add a unique key to each section to guard section content
    slideSections.value = (slide?.sections ?? [createDefaultSection()]).map(withKey)
    // Set the section widths based on the slide sections
    sectionWidths.value = slideSections.value.map(s => s.width_fraction ?? 1.0)

    // Determine the layout type based on the section widths
    layout.value = identifyLayoutType(sectionWidths.value)

    // Set the selected  types for each section based on the slide sections
    selectedTypes.value = slideSections.value.map(
        section => getSlideSectionType(section.view_type))

    currentSectionIndex.value = 0
}

// Helper function to apply a saved slide to the currentSlide and slideSections
function applySavedSlide(slide: Slide) {
    ready = false
    loadSlide(slide)
    edited.value = false
    nextTick(() => {
        ready = true
    })
}

// Function to handle renaming the current slide, updating the slide store, and showing success/error toasts
function onRenameSlide() {
    nameEditing.value = false
    const slideID = currentSlide.value.id
    const slideName = currentSlide.value.name?.trim()

    // Guard to ensure that the slide name has changed and that the slide is a saved slide (has an ID)
    const nameChanged = slideName !== props.slide?.name
    const isSavedSlide = !!slideID
    if (!nameChanged || !isSavedSlide) return

    renameSlide(slideID, slideName).then(() => {
        // If the server call is successful, update the slidestore locally
        updateSlideStore({ ...currentSlide.value, name: slideName });
        toast.add({ severity: 'success', summary: 'Success', detail: 'Slide renamed successfully', life: 3000 })
    }).catch((error) => {
        // If the server call fails, log the error and show an error toast
        toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to rename slide', life: 3000 })
    });
}

// Function to cancel renaming the current slide, resetting the nameEditing state and restoring the original slide name
function cancelRename() {
    nameEditing.value = false
    currentSlide.value.name = props.slide?.name ?? ''
}

// Serializes the current slide into a format suitable for saving to the server
function serializeCurrentSlide(): Omit<Slide, 'sections'> {
    return {
        id: currentSlide.value.id,
        name: currentSlide.value.name,
        width: currentSlide.value.width,
        height: currentSlide.value.height,
        tags: currentSlide.value.tags,
    }
}

// --------------------- Sections  ---------------------

// Serializes a section at a specific index into a format suitable for saving to the server
function serializeSectionAt(index: number): Omit<SlideSection, '_key'> | undefined {
    const section = slideSections.value[index]

    if (!section) { return undefined } // Guard clause to ensure the section exists

    const { _key, ...serializedSection } = {
        ...createDefaultSection(),
        ...section,
        width_fraction: sectionWidths.value[index] ?? 1,
        parameters: section.parameters ?? {},
        mode: section.mode ?? 'static',
        url_pattern: section.url_pattern ?? '',
        properties: section.properties ?? {},
    }

    return serializedSection
}

// Serializes the sections of the current slide into a format suitable for saving to the server
function serializeCurrentSections(): Omit<SlideSection, '_key'>[] {
    return slideSections.value
        .map((_, index) => serializeSectionAt(index)).filter((section): section is Omit<SlideSection, '_key'> => section !== undefined)
}

// Helper function to update a section at a specific index with new changes
function updateSectionAt(index: number, changes: Partial<SlideSection>, refetch = true): EditorSection | undefined {

    const oldSection = slideSections.value[index] // Save the old section for partial update and to ensure it exists
    if (!oldSection) { return undefined } // Guard clause to ensure the section exists

    const updatedSection = { ...oldSection, ...changes } // Create a new section object by merging the current section with the changes

    slideSections.value[index] = updatedSection // Update the section at the specified index with the updated section
    currentSlide.value = { ...currentSlide.value } // Trigger re-render of SlideView with updated section

    // To ensure refetching of interactive content only when the content_path or view_type has changed, we check for changes in these properties
    const pathChanged = oldSection.content_path !== updatedSection.content_path
    const viewTypeChanged = oldSection.view_type !== updatedSection.view_type

    const shouldRefetch = refetch && (pathChanged || viewTypeChanged)

    if (shouldRefetch) {
        // Fetch the Vega specification for the updated section if the content_path has changed
        switch (updatedSection.view_type) {
            case 'vega':
                void fetchVegaSectionAt(index) // Dont await this
                break

            // Add more cases here for other interactive view types that require fetching content when the content_path changes
        }
    }

    return updatedSection
}

// Helper to update the content of a section when the CodeEditor emits a contentUpdated event
function updateSectionContentAt(index: number, newContent: string) {
    updateSectionAt(index, { content: newContent })
}

// Helper to normalize the widths of all sections to be equal, after adding or removing a section
// Changes layout to fullscreen, golden, reversegolden, or custom based on the new widths
function normalizeSectionWidths() {
    const nSections = slideSections.value.length // number of sections after adding the new section
    const wSection = 1 / nSections // width fraction for each section after adding the new section
    sectionWidths.value = [...Array(nSections).fill(wSection)] // Set all section widths to the new normalized width
    layout.value = identifyLayoutType(sectionWidths.value)
}

// Handler to add a new section to the slide (up to a maximum of 3 sections)
function addSectionAt(index: number) {

    // Guard wether section limit is already reached
    if (slideSections.value.length >= SECTION_LIMIT) {
        toast.add({ severity: 'warn', summary: 'Warning', detail: `Maximum of ${SECTION_LIMIT} sections allowed`, life: 3000 })
        return
    }

    // Create a new section with a unique key and add it to the slideSections array
    const newSection = withKey(createDefaultSection()) // Instantiate a new default section with a unique key
    const newSectionType = getSlideSectionType(newSection.view_type) // Get the default view type for the new section
    slideSections.value.splice(index, 0, newSection)
    selectedTypes.value.splice(index, 0, newSectionType)

    normalizeSectionWidths() // Normalize the widths of all sections to be equal after adding the new section
}

// Helper to remove a section at a specific index, ensuring that at least one section remains
function removeSectionAt(index: number) {

    // Guard clause to ensure that at least one section remains after removal
    if (slideSections.value.length <= 1) {
        toast.add({ severity: 'warn', summary: 'Warning', detail: 'At least one section is required', life: 3000 })
        return
    }

    // Remove the section at the specified index from slideSections and selectedTypes
    slideSections.value.splice(index, 1)
    selectedTypes.value.splice(index, 1)

    normalizeSectionWidths(); // Normalize the widths of the remaining sections after removal

    // Keep the active tab index within bounds after removing a section
    if (currentSectionIndex.value >= slideSections.value.length) {
        currentSectionIndex.value = slideSections.value.length - 1
    }
}

// Helper to reset a section at a specific index while preserving its width fraction
function resetSectionAt(index: number) {
    updateSectionAt(index, { ...createDefaultSection(), width_fraction: slideSections.value[index].width_fraction })
}

// Helper to update the background color of a section when the LayoutEditor emits a bgcolor event
function updateSectionBgColorAt(index: number, color: string) {
    updateSectionAt(index, { properties: { ...slideSections.value[index].properties, bg: color } })
    edited.value = true // Mark the slide as edited since the background color has changed
}

// Helper to refetch a Vega Section if required
async function fetchVegaSectionAt(index: number) {

    const section = slideSections.value[index]
    if (!section) { return } // Guard clause to ensure the section exists

    // Guard to ensure we only fetch Vega specs for sections that are of type 'vega' and are in 'url' or 'interactive' mode with a defined content_path.
    const isVega = section.view_type === 'vega'
    const isFetchable = section.mode === 'interactive' || section.mode === 'url'
    const isValidPath = section.content_path && section.content_path.trim() !== ''
    if (!isVega || !isFetchable || !isValidPath) return

    // Try to fetch the Vega specification from the server using SSE
    try {
        const spec = await streamVegaSpec(section.content_path, (progress) => {
            vegaProgress.value = progress
        })
        // Update the section with the fetched Vega specification and reset the progress indicator
        // Do not refetch again to avoid infinite loops!
        updateSectionAt(index, { content: spec }, false)
    } catch {
        toast.add({ severity: 'error', summary: 'Error', detail: `Failed to fetch Vega Specification for section ${index + 1}`, life: 3000 })
    } finally {
        vegaProgress.value = null // Reset the progress indicator after fetching is complete or if an error occurred
    }
}

function onToggleAutoSize(autosize: boolean) {
    autosizeVega.value = autosize
    const properties = slideSections.value[currentSectionIndex.value].properties
    updateSectionAt(currentSectionIndex.value, { properties: { ...properties, autosize } })
}

// --------------------- Slide Persistence ---------------------

// Handles saves (new slide) and updates (existing slides) of the current slide in the editor
async function persistCurrentSlide() {
    try {
        const savedSlide = await persist(serializeCurrentSlide(), serializeCurrentSections())

        if (!savedSlide) {
            return
        }

        applySavedSlide(savedSlide)
        updateSlideOnMonitors(savedSlide)
        updateSlideViews(savedSlide)
        edited.value = false
    } catch (error) {
        toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to save slide', life: 3000 })
    }
}

// --------------------- Editor ---------------------

function clearEditor() {
    currentSlide.value = { ...createDefaultSlide(), tags: [] }   // fresh copy, not the shared object
    slideSections.value = [withKey(createDefaultSection())] // fresh copy, not the shared object
    selectedTypes.value = [getSlideSectionType(createDefaultSection().view_type)] // fresh copy, not the shared object
    sectionWidths.value = [1.0] // Reset to a single section with full width
    layout.value = 'fullscreen' // Reset layout to fullscreen
    currentSectionIndex.value = 0 // Reset to the first section
}

function loadDraftToEditor(slideID?: number | undefined | null) {
    const draft = loadDraft(slideID); // Load the slide draft from local storage using the slide ID
    if (!draft) return; // If no draft exists, exit the function
    ready = false; // Set ready to false to indicate that the editor is not ready for interaction while loading the draft
    loadSlide(draft); // Load the draft into the editor, initializing currentSlide, slideSections, sectionWidths, layout, and selectedTypes
    clearDraft(slideID); // Clear the draft from local storage after loading it into the editor
    draftExists.value = false; // Update the draftExists ref to indicate that no draft exists
    nextTick(() => { ready = true; edited.value = true }); // After the next DOM update, set ready to true and mark the slide as edited
}

// Handler to update the view_type of a section and reset content to default when the user selects a new type from the dropdown
function onChangeViewType(index: number, option: SlideSectionType) {
    const oldSection = slideSections.value[index]
    if (!oldSection) { return } // Guard clause to ensure the section exists
    updateSectionAt(index, { ...createDefaultSection(), width_fraction: oldSection.width_fraction, view_type: option.value })
}


// --------------------- Watchers ---------------------

// Watch for injected slide properties and load the new slide into the editor,
// resetting the edited state and ensuring the editor is ready for interaction
watch(() => props.slide, async (slide) => {
    ready = false
    loadSlide(slide)
    edited.value = false
    await nextTick()
    ready = true
},
    { immediate: true },
)

// To validate a new slide name, we watch for changes in the currentSlide.name and debounce the validation
// request to the server to avoid excessive requests. If the name is empty or unchanged, we mark it as invalid.
watch(() => currentSlide.value.name, (name) => {
    clearTimeout(nameEditTimer.value)
    const trimmed = name?.trim()
    if (!trimmed || trimmed === props.slide?.name) { validFilename.value = false; return }
    nameEditTimer.value = setTimeout(async () => {
        const res = await validateFilename(trimmed)
        validFilename.value = res.data.exists
    }, 300)
})

// Watch for changes in general to keep track of whether the slide has been edited, and set the edited state accordingly
watch(
    [currentSlide, slideSections, sectionWidths, layout, selectedTypes, autosizeVega, basemap, targetSlide],
    () => { if (ready) edited.value = true },
    { deep: true }
)

// --------------------- Lifecycle Hooks ---------------------

onMounted(() => {
    // On mount, check whether a draft exists for the current slide and update the draftExists ref accordingly
    draftExists.value = hasDraft(currentSlide.value.id)
});

onBeforeUnmount(() => {
    // If there are unsaved changes when the component is about to unmount, 
    // we save serialize the current slide and sections and save a draft to local storage for later retrieval
    if (edited.value) {
        const draftSlide = serializeCurrentSlide()
        const draftSections = serializeCurrentSections()
        saveDraft(draftSlide, draftSections)
    }
})

</script>

<template>
    <div class="slide-creator-container">

        <div class="dashboard-header">

            <FloatLabel variant="on">
                <InputText id="filename_input" v-model="currentSlide.name" :disabled="!!currentSlide.id && !nameEditing"
                    :placeholder="$t('moderator.enter_slide_name')" :invalid="validFilename" />
                <label v-if="validFilename" for="filename_input">Filename already exists</label>
            </FloatLabel>

            <Transition name="fade" mode="out-in">
                <div v-if="!nameEditing">
                    <Button outlined v-if="props.slide" size="small" class="renaname-btn" @click="nameEditing = true"
                        label="Rename">
                        <template #icon><i class="material-symbols-outlined">edit</i></template>
                    </Button>
                </div>

                <div v-else key="edit">
                    <ButtonGroup>
                        <Button text @click="onRenameSlide" :disabled="!currentSlide.name?.trim() || validFilename">
                            <template #icon><i class="material-symbols-outlined">check</i></template>
                        </Button>
                        <Button text @click="cancelRename">
                            <template #icon><i class="material-symbols-outlined">close</i></template>
                        </Button>
                    </ButtonGroup>
                </div>
            </Transition>

            <Button outlined :label="$t('moderator.clear')" @click="clearEditor()" size="small">
                <template #icon>
                    <i class="material-symbols-outlined">delete</i>
                </template>
            </Button>

            <Button :disabled="!currentSlide.name?.trim() || nameEditing || validFilename" size="small"
                :label="savingSlide ? 'Saving…' : 'Save'" @click="persistCurrentSlide()">
                <template #icon>
                    <i class="material-symbols-outlined">save</i>
                </template>
            </Button>

            <Button @click="loadDraftToEditor()" label="Load Draft" size="small" v-if="draftExists">
                <template #icon>
                    <i class="material-symbols-outlined">edit_note</i>
                </template>
            </Button>

            <Message size="small" :closable="false" :severity="edited ? 'warn' : 'info'">
                <template #icon>
                    <i class="material-symbols-outlined">info</i>
                </template>
                <template #default>
                    <template v-if="edited">
                        Unsaved Changes.
                        <span style="font-weight: normal">Last saved {{ formatDate(currentSlide.updated_at) }}</span>
                    </template>
                    <template v-else>
                        No unsaved changes.
                        <span style="font-weight: normal">Last saved {{ formatDate(currentSlide.updated_at) }}</span>
                    </template>
                </template>
            </Message>

        </div>
        <!-- Editor -->
        <Splitter :gutter-size="2" class="dashboard">

            <SplitterPanel :size="50" class="sub-panel">

                <h1 class="dashboard_label">Slide Editor</h1>

                <Tabs :value="String(currentSectionIndex)" @update:value="currentSectionIndex = Number($event)"
                    style="flex: 1; min-height: 0;" scrollable>

                    <!-- For every section in the slide, create a tab with an editor -->
                    <TabList class="tab-header">
                        <Tab v-for="(section, index) in slideSections" :key="section._key" :value="String(index)"
                            class="tab" @click="currentSectionIndex = index">
                            <div class="tab-title">
                                <Button class="close-tab-btn" rounded text @click.stop="removeSectionAt(index)">
                                    <i class="material-symbols-outlined" style="font-size: 1.25rem;">close</i>
                                </Button>
                                <Select v-model="selectedTypes[index]" :options="SlideSectionTypes" checkmark
                                    optionLabel="label" scrollHeight="auto" class="tab-type-select"
                                    @change="onChangeViewType(index, $event.value);">
                                    <template #value="slotProps">
                                        <div class="tab-type-selected" v-if="slotProps.value">
                                            <i class="material-symbols-outlined">{{ slotProps.value.icon }}</i>
                                            <span>{{ slotProps.value.label }}</span>
                                        </div>
                                    </template>
                                    <template #option="slotProps">
                                        <div>
                                            <div class="tab-type-option"
                                                style="display: flex; flex-direction: row; gap: 0.5rem; align-items: center; border-radius: var(--br-medium); cursor: pointer;">
                                                <i class="material-symbols-outlined">{{ slotProps.option.icon }}</i>
                                                <div>
                                                    <p style="margin: 0; font-size: var(--fs-medium)"> {{
                                                        slotProps.option.label
                                                    }}</p>
                                                    <p style="margin: 0; font-size: var(--fs-small)">{{
                                                        slotProps.option.description }}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </template>
                                </Select>
                            </div>
                        </Tab>
                        <Button text rounded v-if="slideSections.length < SECTION_LIMIT" class="add-tab-btn"
                            @click="addSectionAt(currentSectionIndex + 1)">
                            <i class="material-symbols-outlined">add</i>
                        </Button>
                    </TabList>

                    <!-- For every section in the slide, create a tab panel with a CodeMirror editor -->
                    <TabPanels class="tab-panel">
                        <TabPanel v-for="(section, index) in slideSections" :key="section._key" :value="String(index)"
                            style="height: 100%;">

                            <!-- Display the right Editor component based on the selected view type for the section (markdown, map, chart, etc.) -->

                            <Transition name="editor-fade" mode="out-in">
                                <component :is="editorMapping[selectedTypes[index]?.value ?? 'markdown']"
                                    :key="`${section._key}-${selectedTypes[index]?.value ?? 'markdown'}`"
                                    :slideSection="serializeSectionAt(index)"
                                    :slideSections="slideSections.map((s, i) => ({ ...s, width_fraction: sectionWidths[i] }))"
                                    @contentUpdated="updateSectionContentAt(index, $event)"
                                    @sectionUpdated="updateSectionAt(index, $event)" @basemapUpdated="basemap = $event"
                                    @targetSlideUpdated="targetSlide = $event" :basemap="basemap"
                                    :progress="vegaProgress" :sectionIdx="index" :autosize="autosizeVega"
                                    :slide="currentSlide">
                                </component>
                            </Transition>

                        </TabPanel>
                    </TabPanels>
                </Tabs>

            </SplitterPanel>

            <!-- Preview & Layout, Save, ... -->
            <SplitterPanel id="slide-settings" class="sub-panel">

                <div class="preview-panel">

                    <h1 class="dashboard_label">Preview</h1>

                    <!-- Slide Preview -->
                    <SlideView class="slide-preview" v-if="currentSlide" :preview="true" :slide="currentSlide"
                        :sections="slideSections.map((s, i) => ({ ...s, width_fraction: sectionWidths[i] }))"
                        :showframe="showFrame" :basemap="basemap" :targetSlide="targetSlide" />

                </div>

                <div>
                    <h1 class="dashboard_label">Slide Settings</h1>
                    <!-- Layout Editor -->
                    <LayoutEditor :layout="layout" :widths="sectionWidths" :showFrame="showFrame"
                        @sectionWidths="sectionWidths = [...$event]" @showframe="showFrame = $event"
                        :autoSizeButton="slideSections[currentSectionIndex].view_type == 'vega'"
                        @autosize="onToggleAutoSize($event)"
                        @bgcolor="updateSectionBgColorAt(currentSectionIndex, $event)" :backgroundColor="sectionBgColor"
                        :slide="currentSlide" :bgPicker="sectionBgColorEditable" />
                </div>
            </SplitterPanel>
        </Splitter>
    </div>
</template>

<style scoped>
.slide-creator-container {
    display: flex;
    flex-direction: column;
    height: 100%;
}

.dashboard-header .p-inputtext {
    width: 30%;
}

.dashboard-header .p-message {
    margin-left: auto;
}

.dashboard-header .p-inputtext.p-invalid:enabled:focus {
    border-color: var(--p-inputtext-invalid-border-color);
}

.dashboard-header .p-floatlabel {
    width: 30%;
}

.dashboard-header .p-inputtext {
    width: 100%;
}

.dashboard-header .p-floatlabel label {
    color: var(--p-floatlabel-invalid-color) !important;
}

.p-toolbar {
    margin: 0;
}

.preview-panel {
    display: flex !important;
    /* PrimeVue may override this */
    flex-direction: column;
    height: 100%;
    overflow: hidden;
    gap: 1rem;
}

.slide-preview {
    flex: 1;
    min-height: 0;
    width: 100%;
}

#slide-settings {
    display: flex;
    flex-direction: column;
    height: 100%;
    min-height: 0;
    overflow: hidden;
    gap: var(--space-small);
}

.section-label {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: var(--fs-medium);
    font-weight: 700;
}

:deep(.p-tab) {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0rem 0.5rem;
    border: none;
    border-radius: var(--br-medium) var(--br-medium) 0 0;
    height: 2.5rem;
    background-color: transparent;
    color: var(--p-primary-700);
    transition: background-color 0.15s ease, color 0.15s ease;
}


:deep(.p-tab:not([data-p-active="true"]):hover) {
    background-color: var(--p-primary-100);
    cursor: pointer;
}

:deep(.p-tab[data-p-active="true"]) {
    background-color: var(--p-primary-500);
    border-bottom: none;
    color: var(--p-primary-50);
}

:deep(.p-tab[data-p-active="true"] .close-tab-btn) {
    color: white;
}

:deep(.p-tab:not([data-p-active="true"]) .close-tab-btn) {
    color: var(--p-primary-500);
}

/* Type select: purple fill only on active tab, transparent on inactive */
:deep(.p-tab[data-p-active="true"] .tab-type-select) {
    background-color: var(--p-primary-500);
    border: none;
}

:deep(.p-tab:not([data-p-active="true"]) .tab-type-select) {
    background-color: transparent;
    border: none;
}

:deep(.p-tab[data-p-active="true"] .tab-type-selected) {
    color: white;
}

:deep(.p-tab:not([data-p-active="true"]) .tab-type-selected) {
    color: var(--p-primary-500);
}

.add-tab-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0rem 0.1rem;
    border-radius: var(--br-medium) var(--br-medium) 0 0;
    height: 2.5rem;
    cursor: pointer;
}

.tab-type-option {
    padding: 0.25rem 0.5rem;
}

.tab-type-select:deep(.p-select-dropdown) {
    color: var(--p-primary-200);
}

.tab-type-selected {
    display: flex;
    align-items: center;
    gap: 0.25rem;
}

.tab-header {
    border-bottom: 2px solid var(--p-primary-500);
    height: 2.5rem;
}

.tab-title {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    margin: 0;
}

.tab-panel {
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    flex: 1;
    min-height: 0;
    overflow: hidden;
    padding: 0;
    padding-top: 0.5rem;
}

.close-tab-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0rem 0rem;
    width: 1.5rem;
    height: 1.5rem;
    border-radius: 0.75rem;
    cursor: pointer;
    margin: 0;
}

.editor-fade-enter-active,
.editor-fade-leave-active {
  transition:
    opacity 180ms ease,
    transform 180ms ease;
}

.editor-fade-enter-from {
  opacity: 0;
  transform: translateY(8px);
}

.editor-fade-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}
</style>