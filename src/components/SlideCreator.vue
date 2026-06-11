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
import SlideView from '@/components/SlideView.vue'

import '@/assets/main.css'

const props = defineProps<{ slide?: Slide | null }>()

const DEFAULT_CONTENT = `---
marp: true
---

# Untitled

Start writing your slide...
`

function makeSlide(content: string): Slide {
    return {
        id: 0,
        name: 'untitled',
        content,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        tags: []
    }
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
                <template #start class="editor-toolbar-start">
                    <Button icon="pi pi-save" size="small" rounded />
                    <InputText placeholder="Filename" size="small" rounded />
                </template>
                <template #end>
                    <Select :options="['Theme 1', 'Theme 2']" placeholder="Theme" size="small" rounded />
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
    gap: 1rem;
}

.editor-container {
    height: 100%;
    display: flex;
    flex-direction: column;
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