<script setup lang="ts">
import { EditorView, basicSetup } from 'codemirror'
import { markdown } from '@codemirror/lang-markdown'
import { EditorState } from '@codemirror/state'
import { onMounted, onBeforeUnmount, ref, watch } from 'vue'
import Toolbar from 'primevue/toolbar'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import Select from 'primevue/select'
import Splitter from 'primevue/splitter'
import SplitterPanel from 'primevue/splitterpanel'
import type { Slide } from '@/services/slide_service'
import { saveSlide } from '@/services/slide_service'
import SlideView from '@/components/SlideView.vue'
import { useToast } from 'primevue/usetoast';

import '@/assets/main.css'

const props = defineProps<{ slide?: Slide | null }>()
const toast = useToast();

const DEFAULT_CONTENT = `---
marp: true
---

# Untitled

Start writing your slide...
`

function makeSlide(content: string): Slide {
    return {
        id: 0,
        name: '',
        content,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        tags: []
    }
}

function storeSlide() {
    const slideToSave: Slide = {
        name: currentSlide.value.name,
        content: currentSlide.value.content,
        tags: currentSlide.value.tags
    }

    saveSlide(slideToSave).then(response => {
        toast.add({ severity: 'success', summary: 'Success', detail: 'Slide saved successfully', life: 3000 });

    }).catch(error => {
        console.error("Error saving slide:", error);
        toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to save slide', life: 3000 });
    })
}

const editor = ref<HTMLElement | null>(null)
const currentSlide = ref<Slide>(props.slide ?? makeSlide(DEFAULT_CONTENT))
let view: EditorView | null = null

onMounted(() => {
    if (!editor.value) return
    view = new EditorView({
        parent: editor.value,
        state: EditorState.create({
            doc: currentSlide.value.content,
            extensions: [
                basicSetup,
                markdown(),
                EditorView.updateListener.of((update) => {
                    if (update.docChanged) {
                        currentSlide.value = {
                            ...currentSlide.value,
                            content: update.state.doc.toString(),
                        }
                    }
                }),
            ],
        }),
    })
})

onBeforeUnmount(() => {
    view?.destroy()
    view = null
})

watch(() => props.slide, (newSlide) => {
    if (!newSlide || !view) return
    currentSlide.value = newSlide
    view.dispatch({
        changes: { from: 0, to: view.state.doc.length, insert: newSlide.content },
    })
})
</script>


<template>
    <Splitter :gutter-size="2" class="dashboard">
        <SplitterPanel :size="50" class="sub-panel">

            <Toolbar class="editor-toolbar">
                <template #start>
                    <div class="editor-toolbar-start">
                        <Button icon="pi pi-save" size="small" rounded @click="storeSlide"
                            :disabled="currentSlide.name == ''" />
                        <InputText v-model="currentSlide.name" placeholder="Enter slide name..." size="small" rounded />
                    </div>
                </template>
            </Toolbar>

            <div class="editor-container">
                <div ref="editor" class="editor-host"></div>
            </div>
        </SplitterPanel>

        <SplitterPanel class="sub-panel editor-panel">
            <SlideView :slide="currentSlide" />
        </SplitterPanel>
    </Splitter>
</template>


<style scoped>
.editor-panel {
    height: 100%;
    display: flex;
    flex-direction: column;

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

.editor-container {
    height: 100%;
    display: flex;
    flex-direction: column;
    box-shadow: var(--shadow-light);
}

.editor-host {
    flex: 1;
    min-height: 0;
}

.editor-host :deep(.cm-editor) {
    height: 100%;
    border: 1px solid var(--p-primary-200);
    border-radius: var(--br-medium);
    overflow: hidden;
    box-shadow: inset 0 0 5px 2.5px var(--p-primary-50);
}

.editor-host :deep(.cm-gutters) {
    background-color: var(--p-primary-100);
    border: none;
    box-shadow: -5px 0 10px 5px var(--p-primary-50);
}

.editor-host :deep(.cm-lineNumbers .cm-activeLineGutter) {
    border-left: 3px solid var(--p-primary-400);
}

.editor-host :deep(.cm-gutters) {
    border-right: none;
}


.editor-host :deep(.cm-activeLine) {
    background-color: var(--p-primary-200);
}

.editor-host :deep(.cm-line) {
    font-size: 1rem;
}

.editor-host :deep(.cm-lineNumbers) {
    font-size: 1rem;
}

.editor-host :deep(.cm-activeLineGutter, .cm-activeLine) {
    background-color: var(--p-primary-200);
}

.editor-host :deep(.cm-content) {
    height: 100%;
}

.editor-host :deep(.cm-content) {
    font-family: "Fira Code", monospace;
    font-variant-ligatures: contextual;
}
</style>