F
<script setup lang="ts">
import { ref, watch, onMounted, defineAsyncComponent } from 'vue'
import Toolbar from 'primevue/toolbar'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import Splitter from 'primevue/splitter'
import SplitterPanel from 'primevue/splitterpanel'
import type { Slide } from '@/services/slide_service'
import { saveSlide, updateSlide, getSlideSectionType, SlideSectionTypes } from '@/services/slide_service'
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
import { basemaps } from '@/utils/map_utils'
import { slides, fetchSlides } from '@/globals/slides';
import { scenes } from '@/globals/scenes'
import { useI18n } from 'vue-i18n';
import { useConfirm } from "primevue/useconfirm";

const { t } = useI18n();
const confirm = useConfirm();

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
const autosizeVega = ref<boolean>(false) // Track whether to auto-size the Vega chart in the preview
const bgColor = ref<string>('#ffffff') // Track the selected background color for the slide preview
const basemap = ref<keyof typeof basemaps>('openfreemap_bright') // Track the selected basemap for map sections
const targetSlide = ref<Slide | null>(null) // Track the target slide for interactive panel sections

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

onMounted(() => {
    //fetchSlides();
});

// 
function confirmedUpdateSlide() {
    const sections = slideSections.value.map((section, index) => ({
        ...section,
        width_fraction: sectionWidths.value[index],
        parameters: section.parameters ?? {},
        mode: section.mode ?? 'static',
        url_pattern: section.url_pattern ?? '',
        properties: section.properties ?? {},
    }));

    const slide = {
        id: currentSlide.value.id,
        name: currentSlide.value.name,
        width: currentSlide.value.width,
        height: currentSlide.value.height,
        tags: currentSlide.value.tags,
    };

    return updateSlide(currentSlide.value.id, slide, sections).then(response => {
        fetchSlides();
        toast.add({ severity: 'success', summary: 'Success', detail: 'Slide saved successfully', life: 3000 })
    }).catch(error => {
        console.error('Error saving slide:', error)
        toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to save slide', life: 3000 })
    })
}

function confirmUpdateSlide() {
    confirm.require({
        header: t('moderator.confirmation'), 
        message: t('moderator.update-slide-confirmation-message-head') + " " + currentSlide.value.name + " " + t('moderator.update-slide-confirmation-message-tail'), 
        acceptLabel: `${t('moderator.confirmation-ok')}`,
        rejectLabel: t('moderator.confirmation-cancel'), 
        accept: async () => {    
            await confirmedUpdateSlide();
        }, reject: () => {      
            // nothing to do    
        },
    });
}

// Save a slide handler
function storeSlide() {
    const sections = slideSections.value.map((section, index) => ({
        ...section,
        width_fraction: sectionWidths.value[index],
        parameters: section.parameters ?? {},
        mode: section.mode ?? 'static',
        url_pattern: section.url_pattern ?? '',
        properties: section.properties ?? {},
    }));

    const slide = {
        id: currentSlide.value.id,
        name: currentSlide.value.name,
        width: currentSlide.value.width,
        height: currentSlide.value.height,
        tags: currentSlide.value.tags,
    };

    return saveSlide(slide, sections).then(response => {
        const saved = response.data.slide

        if (!saved || !saved.sections) {
            console.error('Response has no nested slide/sections:', response.data)
            toast.add({ severity: 'error', summary: 'Error', detail: 'Server did not return sections', life: 3000 })
            return
        }

        currentSlide.value = { ...saved }
        slideSections.value = saved.sections.map(s => ({ ...s }))
        sectionWidths.value = saved.sections.map(s => s.width_fraction ?? 1.0)
        selectedTypes.value = slideSections.value.map(s => getSlideSectionType(s.view_type))

        fetchSlides() 
        toast.add({ severity: 'success', summary: 'Success', detail: 'Slide saved', life: 3000 })
    })
}

function updateOrStoreSlide() {
    if (!currentSlide.value.name?.trim()) {
        toast.add({ severity: 'warn', summary: 'Warning', detail: 'Slide name cannot be empty', life: 3000 })
        return
    }

    if (slides.value.some(item => item.name === currentSlide.value.name)) {
        confirmUpdateSlide()
    } else {
        storeSlide()
    }
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

    // console.log(`Updating content of section ${index} to:`, newContent)

    const updatedSections = [...slideSections.value]
    updatedSections[index] = { ...updatedSections[index], content: newContent }
    slideSections.value = updatedSections

    // Refresh current slide to trigger re-render of SlideView with updated content
    currentSlide.value = { ...currentSlide.value }
}

// Handler to update the entire section (view_type, content, content_path, width_fraction) when the editor emits a sectionUpdated event
function updateSection(index: number, updatedSection: SlideSection) {
    console.log('PARENT received:', JSON.stringify(updatedSection.parameters))

    const pathChanged = slideSections.value[index].content_path !== updatedSection.content_path
    const updatedSections = [...slideSections.value]
    updatedSections[index] = { ...updatedSections[index], ...updatedSection }
    slideSections.value = updatedSections
    currentSlide.value = { ...currentSlide.value }

    console.log('PARENT stored:', JSON.stringify(slideSections.value[index].parameters))

    if (pathChanged && (updatedSection.mode === 'url' || updatedSection.mode === 'interactive')) {
        fetchVegaForSection(index)
    }
}
function sectionWithWidth(index: number) {
    const s = slideSections.value[index]
    return s.width_fraction === sectionWidths.value[index]
        ? s
        : { ...s, width_fraction: sectionWidths.value[index] }
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

// Watch for changes in the autosizeVega ref and update the section's render properties
watch(autosizeVega, (on) => {
    const i = currentSectionIndex.value
    const section = slideSections.value[i]
    if (section.view_type !== 'vega') return

    const updatedSections = [...slideSections.value]
    updatedSections[i] = {
        ...section,
        properties: { ...section.properties, autosize: on },
    }
    slideSections.value = updatedSections
    currentSlide.value = { ...currentSlide.value }
})

// Watch for changes in the background color and update the slide's background color accordingly
watch(bgColor, (newColor) => {
    const i = currentSectionIndex.value
    const section = slideSections.value[i]
    const updatedSections = [...slideSections.value]
    updatedSections[i] = {
        ...section,
        properties: { ...section.properties, bg: newColor },
    }
    slideSections.value = updatedSections
    currentSlide.value = { ...currentSlide.value }
})

watch(currentSectionIndex, (i) => {
    autosizeVega.value = !!slideSections.value[i]?.properties?.autosize
})

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
                            :slideSection="sectionWithWidth(index)"
                            @contentUpdated="updateSectionContent(index, $event)"
                            @sectionUpdated="updateSection(index, $event)" @basemapUpdated="basemap = $event"
                            @targetSlideUpdated="targetSlide = $event" :basemap="basemap" :progress="vegaProgress"
                            :sectionIdx="index" :autosize="autosizeVega" :slide="currentSlide">
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
                            <Button icon="pi pi-save" size="small" rounded @click="updateOrStoreSlide"
                                :disabled="currentSlide.name === ''" />
                            <InputText v-model="currentSlide.name" :placeholder="$t('moderator.enter_slide_name')" size="small"
                                rounded />
                        </div>
                    </template>
                </Toolbar>

                <!-- Slide Preview -->
                <SlideView class="slide-preview" v-if="currentSlide" :preview="false" :slide="currentSlide"
                    :sections="slideSections.map((s, i) => ({ ...s, width_fraction: sectionWidths[i] }))"
                    :showframe="showFrame" :basemap="basemap" :targetSlide="targetSlide" />

                <!-- Layout Editor -->
                <LayoutEditor :layout="layout" :widths="sectionWidths" :showFrame="showFrame"
                    @sectionWidths="sectionWidths = [...$event]" @showframe="showFrame = $event"
                    :autoSizeButton="slideSections[currentSectionIndex].view_type == 'vega'"
                    @autosize="autosizeVega = $event" @bgcolor="bgColor = $event" />

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