<script setup lang="ts">
import { ref, watch, defineAsyncComponent } from 'vue'
import Toolbar from 'primevue/toolbar'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import Splitter from 'primevue/splitter'
import SplitterPanel from 'primevue/splitterpanel'
import type { Slide } from '@/services/slide_service'
import { saveSlide, getSlideSectionType, SlideSectionTypes } from '@/services/slide_service'
import SlideView from '@/components/SlideView.vue'
import { useToast } from 'primevue/usetoast'
import LayoutEditor from '@/components/LayoutEditor.vue'
import Tabs from 'primevue/tabs'
import TabList from 'primevue/tablist'
import Tab from 'primevue/tab'
import TabPanels from 'primevue/tabpanels'
import TabPanel from 'primevue/tabpanel'
import type { SlideSection } from '@/services/slide_service'
import CodeEditor from '@/components/CodeEditor.vue'
import '@/assets/main.css'
import Select from 'primevue/select';
import { streamVegaSpec } from '@/utils/vega_utils'


// Define the Default Markdown Content, and Default Slide structure for new slides
const DEFAULT_CONTENT = ''
const DEFAULT_SLIDE = { name: '', width: 1920, height: 1080, tags: [] }
const DEFAULT_SECTION = { view_type: 'markdown', content: DEFAULT_CONTENT, content_path: '', width_fraction: 1.0 }
const SECTION_LIMIT = 3

// Define Input Proerties
const props = defineProps<{ slide?: Slide | null }>()

// Define references
const currentSlide = ref<Slide>(props.slide ?? DEFAULT_SLIDE) // Init a new slide if no slide is passed as prop
const currentSectionIndex = ref<number>(0) // Track the index of the currently selected section

const slideSections = ref<SlideSection[]>([]) // Track the sections of the current slide (view_type, content, content_path, width_fraction)
const sectionWidths = ref<number[]>([1.0]) // Track the width fractions of each section (default to 1.0 for a single section = fullscreen)
const showFrame = ref<boolean>(false) // Track whether to show the frame around the slide preview
const layout = ref<string>('fullscreen') // Track the current selected layout for the sections (fullscreen, golden, reversegolden, etc.)
const selectedTypes = ref<Object[]>([]) // Track the selected view types for each section (markdown, map, chart, etc.)
const vegaProgress = ref<number | null>(null) // Track the progress of fetching Vega specs for sections in 'url' or 'interactive' mode

// Mapping for which editor to use for each view type (markdown, map, chart, etc.)
// all except markdown are lazy-loaded to reduce initial bundle size
const editorMapping: Record<string, any> = {
    markdown: CodeEditor,
    map: defineAsyncComponent(() => import('@/components/MapEditor.vue')),
    vega: defineAsyncComponent(() => import('@/components/VegaEditor.vue'))
};

// Import the toast notification composable from PrimeVue for displaying success/error messages
const toast = useToast()

// Save a slide handler
function storeSlide() {

    const sections = slideSections.value.map((section, index) => ({
        view_type: section.view_type,
        content: section.content,
        content_path: section.content_path,
        width_fraction: sectionWidths.value[index],
        parameters: section.parameters ?? {}
    }));

    const slide = {
        id: currentSlide.value.id,
        name: currentSlide.value.name,
        width: currentSlide.value.width,
        height: currentSlide.value.height,
        tags: currentSlide.value.tags,
    };

    saveSlide(slide, sections).then(response => {
        toast.add({ severity: 'success', summary: 'Success', detail: 'Slide saved successfully', life: 3000 })
    }).catch(error => {
        console.error("Error saving slide:", error);
        toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to save slide', life: 3000 })
    });
}

// Small Helper to identify the layout type based on the section widths (fullscreen, golden, reversegolden, custom)
function getLayoutType(widths: number[]): string {
    if (widths.length === 1) return 'fullscreen'
    if (widths.length === 2) return widths[0] > widths[1] ? 'golden' : 'reversegolden'
    return 'custom'
}

// Handler to add a new section to the slide (up to a maximum of 3 sections)
function addSection() {
    // Limit to 3 sections
    if (slideSections.value.length >= SECTION_LIMIT) {
        toast.add({ severity: 'warn', summary: 'Warning', detail: `Maximum of ${SECTION_LIMIT} sections allowed`, life: 3000 })
        return
    }

    slideSections.value.push(DEFAULT_SECTION) // Push a new defaultt section
    selectedTypes.value.push(getSlideSectionType(DEFAULT_SECTION.view_type)) // Push the default view type
    // Make all section widths equal (1 / number of sections)
    sectionWidths.value = slideSections.value.map(() => 1 / slideSections.value.length)
    // Update the layout type based on the new section widths
    layout.value = getLayoutType(sectionWidths.value)
}

// Handler to remove a section from the slide (by index)
function removeSection(index: number) {

    // Ensure at least one section remains
    if (slideSections.value.length <= 1) {
        toast.add({ severity: 'warn', summary: 'Warning', detail: 'At least one section is required', life: 3000 })
        return
    }
    slideSections.value.splice(index, 1) // Remove the section at the specified index
    sectionWidths.value = slideSections.value.map(() => 1 / slideSections.value.length) // Recalculate widths
    layout.value = getLayoutType(sectionWidths.value) // Update layout type

}

// Handler to update the content of a section when the CodeEditor emits a contentUpdated event
function updateSectionContent(index: number, newContent: string) {

    console.log(`Updating content of section ${index} to:`, newContent)

    const updatedSections = [...slideSections.value]
    updatedSections[index] = { ...updatedSections[index], content: newContent }
    slideSections.value = updatedSections

    // Refresh current slide to trigger re-render of SlideView with updated content
    currentSlide.value = { ...currentSlide.value }
}

// Handler to update the entire section (view_type, content, content_path, width_fraction) when the editor emits a sectionUpdated event
function updateSection(index: number, updatedSection: SlideSection) {

    const pathChanged = slideSections.value[index].content_path !== updatedSection.content_path

    // Create a shallow copy of the current sections
    const updatedSections = [...slideSections.value] 
    // Update the section at the specified index with the new data
    updatedSections[index] = { ...updatedSections[index], ...updatedSection }
    // Update the reactive slideSections reference with the modified sections
    slideSections.value = updatedSections

    // Refresh current slide to trigger re-render of SlideView with updated content
    currentSlide.value = { ...currentSlide.value }

    if (pathChanged && (updatedSection.mode === 'url' || updatedSection.mode === 'interactive')) {
        fetchVegaForSection(index)
    }
}

// Helper to fetch Vega specifications
async function fetchVegaForSection(index: number) {
    const section = slideSections.value[index]
    // Guard-clause to ensure we only fetch Vega specs for sections that are of type 'vega'
    // and are in 'url' or 'interactive' mode with a defined content_path.
    if (section.view_type !== 'vega' ||
        (section.mode !== 'url' && section.mode !== 'interactive') || !section.content_path ||
        section.content_path.trim() === ''
    ) {
        return
    }
    // Try to fetch the Vega specification from the server using SSE
    try {
        const spec = await streamVegaSpec(section.content_path, (progress) => {
            vegaProgress.value = progress
        })
        // Write the fetched spec to the section's content and update the section
        const updatedSections = [...slideSections.value]
        updatedSections[index] = { ...updatedSections[index], content: spec }
        slideSections.value = updatedSections
        currentSlide.value = { ...currentSlide.value }
        vegaProgress.value = null
    } catch (error) {
        console.log('Vega spec fetch failed for section', index, 'with error:', error)
        toast.add({ severity: 'error', summary: 'Error', detail: `Failed to fetch Vega spec for section ${index + 1}`, life: 3000 })
    }
}

// Watch for changes in the slide prop and update the currentSlide and slideSections accordingly
watch(() => props.slide, (newSlide) => {

    // Update the currentSlide and slideSections based on the new slide prop
    if (newSlide) {
        currentSlide.value = { ...newSlide }
        slideSections.value = newSlide.sections?.map(section => ({ ...section })) ?? []
        sectionWidths.value = newSlide.sections?.map(section => section.width_fraction ?? 1.0) ?? [1.0]
        layout.value = getLayoutType(sectionWidths.value)
    } else { // If no slide is passed, initialize a new slide with default values
        slideSections.value = [{ view_type: 'markdown', content: DEFAULT_CONTENT, content_path: '', width_fraction: 1.0 }]
        sectionWidths.value = [1.0]
        layout.value = 'fullscreen'
    }

    selectedTypes.value = slideSections.value.map(s => getSlideSectionType(s.view_type))

}, { immediate: true })

watch(selectedTypes, (newTypes) => {
    slideSections.value = slideSections.value.map((section, i) => ({
        ...section,
        view_type: newTypes[i]?.value ?? section.view_type
    }))
}, { deep: true })

</script>

<template>

    <!-- Editor -->
    <Splitter :gutter-size="2" class="dashboard">
        <SplitterPanel :size="50" class="sub-panel">

            <Tabs value="0" style="height: 100%;" scrollable>

                <!-- For every section in the slide, create a tab with an editor -->
                <TabList class="tab-header">
                    <Tab v-for="(section, index) in slideSections" :key="index" :value="String(index)" class="tab"
                    @click="currentSectionIndex = index">
                        <div class="tab-title">
                            <Button class="close-tab-btn" rounded text @click.stop="removeSection(index)">
                                <i class="material-symbols-outlined" style="font-size: 1.25rem;">close</i>
                            </Button>
                            <Select v-model="selectedTypes[index]" :options="SlideSectionTypes" checkmark
                                optionLabel="label" scrollHeight="auto" class="tab-type-select">
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
                        @click="addSection()">
                        <i class="material-symbols-outlined">add</i>
                    </Button>
                </TabList>

                <!-- For every section in the slide, create a tab panel with a CodeMirror editor -->
                <TabPanels class="tab-panel">
                    <TabPanel v-for="(section, index) in slideSections" :key="index" :value="String(index)"
                        style="height: 100%;">

                        <!-- Display the right Editor component based on the selected view type for the section (markdown, map, chart, etc.) -->
                        <component :is="editorMapping[selectedTypes[index]?.value ?? 'markdown']"
                            :slideSection="{ ...section, width_fraction: sectionWidths[index] }"
                            @contentUpdated="updateSectionContent(index, $event)"
                            @sectionUpdated="updateSection(index, $event)"
                            :progress="vegaProgress"
                            :sectionIdx="index">
                        </component>
                    </TabPanel>
                </TabPanels>
            </Tabs>

        </SplitterPanel>

        <!-- Preview & Layout, Save, ... -->
        <SplitterPanel class="sub-panel  preview-panel">
            <div class="preview-panel">

                <!-- Save Toolbar -->
                <Toolbar class="editor-toolbar">
                    <template #start>
                        <div class="editor-toolbar-start">
                            <Button icon="pi pi-save" size="small" rounded @click="storeSlide"
                                :disabled="currentSlide.name === ''" />
                            <InputText v-model="currentSlide.name" placeholder="Enter slide name..." size="small"
                                rounded />
                        </div>
                    </template>
                </Toolbar>

                <!-- Slide Preview -->
                <SlideView class="slide-preview" v-if="currentSlide" :preview="true" :slide="currentSlide"
                    :sections="slideSections.map((s, i) => ({ ...s, width_fraction: sectionWidths[i] }))"
                    :showframe="showFrame"/>

                <!-- Layout Editor -->
                <LayoutEditor :layout="layout" :widths="sectionWidths" :showFrame="showFrame"
                    @sectionWidths="sectionWidths = [...$event]" @showframe="showFrame = $event"
                    :autoSizeButton="slideSections[currentSectionIndex].view_type == 'vega'"
                   />

            </div>
        </SplitterPanel>
    </Splitter>
</template>
<style scoped>
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
    border: 1px solid var(--p-primary-200);
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
    height: 100%;
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

.editor-toolbar {
    margin-bottom: 1rem;
}

.editor-toolbar-start {
    display: flex;
    flex-direction: row;
    align-items: center;
    width: 100%;
    gap: 0.5rem;
}
</style>