<script setup lang="ts">
import { EditorView, basicSetup } from 'codemirror'
import { markdown } from '@codemirror/lang-markdown'
import { onMounted, ref, onBeforeUnmount } from 'vue'
import Toolbar from 'primevue/toolbar';
import Button from 'primevue/button';
import Select from 'primevue/select';
import Splitter from 'primevue/splitter';
import SplitterPanel from 'primevue/splitterpanel';
import Toast from 'primevue/toast';
import type { Slide } from '@/services/slide_service';
import SlideView from '@/components/SlideView.vue';
import { EditorState } from '@codemirror/state'

import '@/assets/main.css'

const editor = ref<HTMLElement | null>(null)
const slide = ref<Slide | null>(null)

let view: EditorView;

function firstSlideOnly(md: string): string {
    let body = md
    let frontMatter = ''

    const frontMatterMatch = body.match(/^---\n([\s\S]*?)\n---\n/)
    if (frontMatterMatch) {
        frontMatter = frontMatterMatch[0]
        body = body.slice(frontMatter.length)
    }

    const slideSeparatorIndex = body.match(/^---$/m)?.index ?? body.length
    const firstSlide = body.slice(0, slideSeparatorIndex).trim()
    return frontMatter + firstSlide
}

onMounted(() => {
    if (!editor.value) return

    view = new EditorView({
        parent: editor.value,
        state: EditorState.create({
            doc: '',
            extensions: [basicSetup, markdown()],
        }),
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
                <div ref="editor" class="editor-host" :v-model="slide?.content"></div>
            </div>
        </SplitterPanel>

        <SplitterPanel class="sub-panel editor-panel">
            <SlideView :slide="slide ? slide : null" />
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