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
import Popover from 'primevue/popover'
import Draggable from 'vuedraggable'
import Listbox from 'primevue/listbox'

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
const showSectionID = ref<boolean>(false) // Track whether to show the section ID overlay on the slide preview
const layout = ref<string>('fullscreen') // Track the current selected layout for the sections (fullscreen, golden, reversegolden, etc.)
const sectionBgColor = computed(() => slideSections.value[currentSectionIndex.value]?.properties?.bg ?? '#ffffff') // Track the background color of the current section
const sectionBgColorEditable = computed(() => SECTION_BG_COLOR_EDITING[slideSections.value[currentSectionIndex.value]?.view_type ?? 'markdown'] ?? false) // Track whether background editing is allowed for current section
const selectedTypes = ref<SlideSectionType[]>([]) // Track the selected view types for each section (markdown, map, chart, etc.)
const vegaProgress = ref<number | null>(null) // Track the progress of fetching Vega specs for sections in 'url' or 'interactive' mode
const autosizeVega = ref<boolean>(false) // Track whether to auto-size the Vega chart in the preview
const basemap = ref<keyof typeof basemaps>('openfreemap_bright') // Track the selected basemap for map sections
const targetSlide = ref<Slide | null>(null) // Track the target slide for interactive panel sections
const { savingSlide, persist } = useSlide() // Use the useSlide composable to handle saving slides and sections to the server
const sectionPopover = ref<InstanceType<typeof Popover> | null>(null) // Reference to the Popover component for section type selection

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

    // Adjust the currentSectionIndex if the removed section was before the currently selected section
    if (index < currentSectionIndex.value) currentSectionIndex.value--

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

// Handler to show the popover for changing the view type of a section when the user clicks the dropdown button in the section selector
function onSectionTypePopover(e: Event) {
    sectionPopover.value?.toggle(e)
}

// Handler to change the view type of a section when the user selects a new type from the popover dropdown
function onPopoverTypeChange(option: SlideSectionType | null) {
    if (!option) return // Guard clause to ensure the option is not null

    const index = currentSectionIndex.value
    selectedTypes.value[index] = option
    onChangeViewType(index, option)
    // Update the unique key of the section to force re-rendering of the CodeEditor when the view type changes
    slideSections.value[index]._key = crypto.randomUUID()
    sectionPopover.value?.hide()
}

// Handler to reorder sections when the user drags and drops a section to a new position in the editor.
// It updates the selectedTypes and sectionWidths arrays accordingly, and ensures that the currentSectionIndex is updated to maintain the correct selection after reordering.
function onSectionReorder(event: { moved?: { oldIndex: number, newIndex: number } }) {

    if (!event.moved) return
    const { oldIndex, newIndex } = event.moved
    if (oldIndex === newIndex) return

    selectedTypes.value.splice(newIndex, 0, selectedTypes.value.splice(oldIndex, 1)[0])
    sectionWidths.value.splice(newIndex, 0, sectionWidths.value.splice(oldIndex, 1)[0])
    layout.value = identifyLayoutType(sectionWidths.value) // golden ↔ reversegolden can flip

    // Keep the selection
    if (currentSectionIndex.value === oldIndex) {
        // If the current section index is the same as the old index, update it to the new index
        currentSectionIndex.value = newIndex
    } else if (
        // If the current section index is between the old and new indices, adjust it accordingly to maintain the correct selection after reordering
        oldIndex < currentSectionIndex.value &&
        newIndex >= currentSectionIndex.value
    ) {
        currentSectionIndex.value--
    } else if (
        // If the current section index is between the new and old indices, adjust it accordingly to maintain the correct selection after reordering
        oldIndex > currentSectionIndex.value &&
        newIndex <= currentSectionIndex.value
    ) {
        currentSectionIndex.value++
    }
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
                    <Button outlined v-if="props.slide" size="small" @click="nameEditing = true" label="Rename">
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
                <div class="section-editor inset-control">

                    <Draggable v-model="slideSections" item-key="_key" tag="div" class="section-selector"
                        handle=".drag-handle" :animation="220" ghost-class="section-ghost" chosen-class="section-chosen"
                        @change="onSectionReorder">

                        <template #item="{ element: section, index }">
                            <div class="section-btn" :class="{ active: currentSectionIndex === index }"
                                @click="currentSectionIndex = index">
                                <i class="material-symbols-outlined drag-handle">
                                    drag_indicator
                                </i>

                                <div
                                    style="display: flex; flex-direction: row; align-items: center; gap: var(--space-small);">
                                    <i class="material-symbols-outlined">
                                        {{ selectedTypes[index]?.icon }}
                                    </i>

                                    <span class="section-label" v-if="currentSectionIndex !== index">
                                        {{ selectedTypes[index]?.label }}
                                    </span>

                                    <div class="section-type-change" v-else @click.stop="onSectionTypePopover($event)">
                                        <span
                                            :class="{ 'section-label': true, 'active': currentSectionIndex === index }">
                                            {{ selectedTypes[index]?.label }}
                                        </span>
                                        <i class="material-symbols-outlined">arrow_drop_down</i>

                                    </div>

                                </div>

                                <Button :class="{ 'section-action': true, 'active': currentSectionIndex === index }"
                                    size="small" rounded text @click.stop="removeSectionAt(index)">
                                    <i class="material-symbols-outlined">close</i>
                                </Button>
                            </div>
                        </template>

                    </Draggable>

                    <Popover ref="sectionPopover">
                        <Listbox :modelValue="selectedTypes[currentSectionIndex]" :options="SlideSectionTypes"
                            optionLabel="label" class="section-type-listbox" @update:modelValue="onPopoverTypeChange">
                            <template #option="{ option }">
                                <div class="listbox-option">

                                    <i class="material-symbols-outlined  listbox-option-icon">
                                        {{ option.icon }}
                                    </i>

                                    <div class="listbox-option-meta">
                                        <div class="listbox-option-name">

                                            <span>{{ option.label }}</span>
                                        </div>

                                        <div class="listbox-option-description">
                                            {{ option.description }}
                                        </div>
                                    </div>
                                </div>
                            </template>
                        </Listbox>
                    </Popover>

                    <Button size="small" outlined class="add-section-btn"
                        :disabled="slideSections.length >= SECTION_LIMIT"
                        @click="addSectionAt(currentSectionIndex + 1)">
                        <template #icon>
                            <i class="material-symbols-outlined">add</i>
                        </template>
                    </Button>

                </div>

                <div class="editor-container">
                    <Transition name="editor-fade" mode="out-in">
                        <KeepAlive :max=12>
                            <component :is="editorMapping[selectedTypes[currentSectionIndex]?.value ?? 'markdown']"
                                :key="`${slideSections[currentSectionIndex]._key}-${selectedTypes[currentSectionIndex]?.value ?? 'markdown'}`"
                                :slideSection="serializeSectionAt(currentSectionIndex)"
                                :slideSections="slideSections.map((s, i) => ({ ...s, width_fraction: sectionWidths[i] }))"
                                @contentUpdated="updateSectionContentAt(currentSectionIndex, $event)"
                                @sectionUpdated="updateSectionAt(currentSectionIndex, $event)"
                                @basemapUpdated="basemap = $event" @targetSlideUpdated="targetSlide = $event"
                                :basemap="basemap" :progress="vegaProgress" :sectionIdx="currentSectionIndex"
                                :autosize="autosizeVega" :slide="currentSlide">
                            </component>
                        </KeepAlive>
                    </Transition>
                </div>

            </SplitterPanel>

            <!-- Preview & Layout, Save, ... -->
            <SplitterPanel id="slide-settings" class="sub-panel">

                <div class="preview-panel">

                    <h1 class="dashboard_label">Preview</h1>

                    <!-- Slide Preview -->
                    <SlideView class="slide-preview" v-if="currentSlide" :preview="true" :slide="currentSlide"
                        :sections="slideSections.map((s, i) => ({ ...s, width_fraction: sectionWidths[i] }))"
                        :showframe="showFrame" :showSectionID="showSectionID" :basemap="basemap" :targetSlide="targetSlide" />

                </div>

                <div>
                    <h1 class="dashboard_label">Slide Settings</h1>
                    <!-- Layout Editor -->
                    <LayoutEditor :layout="layout" :widths="sectionWidths" :showFrame="showFrame"
                        :showSectionID="showSectionID" @sectionWidths="sectionWidths = [...$event]" @showframe="showFrame = $event"
                        :autoSizeButton="slideSections[currentSectionIndex].view_type == 'vega'"
                        @autosize="onToggleAutoSize($event)"
                        @showsectionid="showSectionID = $event"
                        @bgcolor="updateSectionBgColorAt(currentSectionIndex, $event)" :backgroundColor="sectionBgColor"
                        :slide="currentSlide" :bgPicker="sectionBgColorEditable" />
                </div>
            </SplitterPanel>
        </Splitter>
    </div>
</template>

<style scoped>
.section-editor {
    display: flex;
    flex-direction: row;
    gap: var(--space-small);
    align-items: center;
    justify-content: flex-start;
    width: 100%;

    border: 1px solid var(--p-primary-200);
    border-radius: var(--br-medium);

}

.section-selector {
    display: flex;
    align-items: flex-end;
    gap: var(--space-small);

    padding: var(--space-small);
    overflow-x: auto;
}



.drag-handle {
    cursor: grab;
    opacity: 0.55;
}

.drag-handle:active {
    cursor: grabbing;
}

.section-btn:hover .drag-handle {
    opacity: 1;
}


:deep(.section-ghost) {
    min-width: 7.5rem;
    background: var(--p-primary-200);
    border: 1px solid var(--p-primary-200);
    opacity: 0.8;
}

.section-ghost>* {
    visibility: hidden;
}

/* The item currently held by the pointer */
.section-chosen {
    box-shadow: var(--shadow-dark);
}

.section-type-listbox {
    margin: 0;
    padding: 0px;
    border: none;
    box-shadow: none;
}

.listbox-option {
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: flex-start;
    padding: 0px;
    gap: var(--space-small);
}

.listbox-option-meta {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    justify-content: flex-start;
}

.listbox-option-icon {
    font-size: 2rem;
    font-variation-settings: 'opsz' 24;
    /* 20–48, roughly the px size */
    color: var(--p-primary-500);
}

.listbox-option-name {
    display: flex;
    align-items: center;
    gap: var(--space-small);
    font-weight: 600;
    color: var(--p-primary-500);
}

.listbox-option-description {
    color: var(--text)
}

.slide-creator-container {
    display: flex;
    flex-direction: column;
    height: 100%;
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
    font-size: var(--fs-medium);
    font-weight: 700;
}

.section-action {
    color: var(--p-primary-500);
    border-radius: var(--br-small);
    margin: 0px;
    padding: 0px;
}

.section-action:hover {
    background: transparent;
    border: 1px solid white;
}

.section-action.active {
    background: var(--p-primary-500);
    color: white;
}

.section-type-change {
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: calc(var(--space-small) / 2);
    border-bottom: 2px solid white;
    cursor: pointer;
}

.add-section-btn {
    width: 2.5rem;
    height: 2.5rem
}

.section-btn {
    display: inline-flex;
    align-items: center;
    gap: var(--space-small);


    padding: var(--space-small);

    border: 1px solid var(--p-primary-200);
    border-radius: var(--br-small);
    color: var(--p-primary-500);

    cursor: default;

    transition:
        background-color 180ms ease,
        border-color 180ms ease,
        box-shadow 180ms ease;
}

.section-btn.active {
    background: var(--p-primary-500);
    border-color: var(--p-primary-600);
    color: white;
}

.editor-container {
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    flex: 1;
    min-height: 0;
    overflow: hidden;
    padding: 0;

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