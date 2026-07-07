<script lang="ts" setup>
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'
import { EditorView, basicSetup } from 'codemirror'
import { markdown } from '@codemirror/lang-markdown'
import { EditorState } from '@codemirror/state'
import type { Extension } from '@codemirror/state'
import type { SlideSection } from '@/services/slide_service'
import { json } from "@codemirror/lang-json"
import * as prettier from 'prettier/standalone'
import parserBabel from 'prettier/plugins/babel'
import parserEstree from 'prettier/plugins/estree'
import Button from 'primevue/button'

const emit = defineEmits<{ contentUpdated: [content: string] }>();

const props = defineProps<{ slideSection: SlideSection, language?: string }>()

const editorHost = ref<HTMLDivElement | undefined>(undefined)
let editorView: EditorView | null = null

onMounted(() => {
    if (!editorHost.value) return
    editorView = initEditor()
})

const languageExtensions: Record<string, Extension> = {
    markdown: markdown(),
    json: json(),
}

async function formatJsonWithPrettier() {
    const text = editorView?.state.doc.toString()
    if (!text) return

    const formatted = await prettier.format(text, {
        parser: 'json',
        plugins: [parserBabel, parserEstree]
    })

    editorView?.dispatch({
        changes: { from: 0, to: editorView.state.doc.length, insert: formatted }
    })
}

// Listener for CodeMirror editor updates
function editorUpdateListener(): Extension {
    return EditorView.updateListener.of((update) => {
        if (update.docChanged) {
            const newContent = update.state.doc.toString()
            emit('contentUpdated', newContent)
        }
    })
}

// Initialize the CodeMirror editor
function initEditor() {
    return new EditorView({
        parent: editorHost.value,
        state: EditorState.create({
            doc: props.slideSection?.content ?? '',
            extensions: [
                basicSetup,
                props.language ? languageExtensions[props.language] : markdown(),
                editorUpdateListener(),
            ],
        }),
    });
}

onBeforeUnmount(() => {
    editorView?.destroy()
})

watch(() => props.slideSection.content, (newContent) => {
    if (editorView && newContent !== editorView.state.doc.toString()) {
        editorView.dispatch({
            changes: { from: 0, to: editorView.state.doc.length, insert: newContent }
        })
    }
})

</script>

<template>
    <div class="editor-container">
        <Button small rounded class="format-btn" v-if="props.language === 'json'">
            <template #icon>
                <i class="material-symbols-outlined" @click="formatJsonWithPrettier()">data_object</i>
            </template>
        </Button>
        <div ref="editorHost" class="editor-host"></div>
    </div>
</template>
<style scoped>

.format-btn {
    align-self: flex-end;
    position: absolute;
    z-index: 10;
    bottom: 2rem;
    right: 2rem;
}

.editor-container {
    height: 100%;
    display: flex;
    flex-direction: column;
    position: relative;
    padding: 0;

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
    font-family: "Fira Code", monospace;
    font-variant-ligatures: contextual;
}

</style>