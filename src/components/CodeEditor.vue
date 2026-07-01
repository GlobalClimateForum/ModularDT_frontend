<script lang="ts" setup>
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'
import { EditorView, basicSetup } from 'codemirror'
import { markdown } from '@codemirror/lang-markdown'
import { EditorState } from '@codemirror/state'
import type { Extension } from '@codemirror/state'
import type { SlideSection } from '@/services/slide_service'

const emit = defineEmits<{ contentUpdated: [content: string] }>();

const props = defineProps<{ slideSection: SlideSection }>()

const editorHost = ref<HTMLDivElement | undefined>(undefined)
let editorView: EditorView | null = null

onMounted(() => {
    if (!editorHost.value) return
    editorView = initEditor()
})

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
                markdown(),
                editorUpdateListener(),
            ],
        }),
    });
}

onBeforeUnmount(() => {
    editorView?.destroy()
})

</script>

<template>
    <div class="editor-container">
        <div ref="editorHost" class="editor-host"></div>
    </div>
</template>
<style scoped>
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