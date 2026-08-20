<script lang="ts" setup>
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'
import { EditorView, basicSetup } from 'codemirror'
import { markdown } from '@codemirror/lang-markdown'
import { EditorState } from '@codemirror/state'
import type { Extension } from '@codemirror/state'
import type { SlideSection } from '@/services/slide_service'
import { json } from "@codemirror/lang-json"
import { html } from "@codemirror/lang-html"
import { vue } from "@codemirror/lang-vue"
import * as prettier from 'prettier/standalone'
import parserBabel from 'prettier/plugins/babel'
import parserEstree from 'prettier/plugins/estree'
import Button from 'primevue/button'
import Toolbar from 'primevue/toolbar'
import Message from 'primevue/message'
import DynamicDialog from 'primevue/dynamicdialog';
import { formatDate } from '@/utils/date_utils'

const emit = defineEmits<{ contentUpdated: [content: string] }>();

const props = defineProps<{ slideSection: SlideSection, language?: string }>()

const editorHost = ref<HTMLDivElement | undefined>(undefined)
let editorView: EditorView | null = null;

// Connected File
const fileHandle = ref<FileSystemFileHandle | null>(null)
const fileName = ref<string>('')
let lastModified = 0
let pollTimer: ReturnType<typeof setInterval> | null = null
let writing = false
let writeTimer: ReturnType<typeof setTimeout> | null = null


onMounted(() => {
    if (!editorHost.value) return
    editorView = initEditor()
})

const languageExtensions: Record<string, Extension> = {
    markdown: markdown(),
    json: json(),
    html: html(),
    vue: vue()
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

// Helper to set content of the editor 
function setEditorContent(content: string) {
    if (editorView && content !== editorView.state.doc.toString()) {
        editorView.dispatch({
            changes: { from: 0, to: editorView.state.doc.length, insert: content }
        })
    }
}

// Helper to write to file with debounce
function writeDebounced(content: string) {
    if (writeTimer) clearTimeout(writeTimer)
    writeTimer = setTimeout(() => writeFile(content), 300)
}

// Function to listen (poll) for changes in the connected file
function startPolling() {
    stopPolling(); // Clear any existing polling
    pollTimer = setInterval(async () => {
        if (!fileHandle.value || writing) return; // Guard clause: no file handle or currently writing

        const file = await fileHandle.value.getFile(); // Get the file object

        if (file.lastModified > lastModified) { // Check if the file has been modified since last check
            lastModified = file.lastModified;  // Update the last modified time
            const content = await file.text(); // Read the new content of the file
            setEditorContent(content); // Update the editor content with the new file content
            emit('contentUpdated', content); // Emit the contentUpdated event with the new content
        }
    }, 1000); // Poll every second
}

// Helper to stop polling for changes in the connected file
function stopPolling() {
    if (pollTimer) { clearInterval(pollTimer); pollTimer = null }
}

// Helper to disconnect from File
function disconnectFile() {
    stopPolling();
    fileHandle.value = null;
    fileName.value = '';
    lastModified = 0;
}

// Helper to write to file
async function writeFile(content: string) {
    if (!fileHandle.value) return; // Guard clause: no file handle available
    writing = true; // Set writing to true
    try {
        const writable = await fileHandle.value.createWritable(); // Create a writable stream
        await writable.write(content); // Write the content to the file
        await writable.close(); // Close the writable stream
        lastModified = (await fileHandle.value.getFile()).lastModified; // Get the last modified time of the file
    } finally {
        writing = false; // Await the write operation to finish before setting writing to false
    }
}

// Helper to connect to File 
async function connectFile() {

    if (fileHandle.value) {
        // If already connected, disconnect
        disconnectFile();
        return;
    }

    // Otherwise, try to connect to a file using the File System Access API
    try {
        const [handle] = await window.showOpenFilePicker();

        // Store the file handle and name
        fileHandle.value = handle;
        fileName.value = handle.name;

        // Read the file content and set it in the editor
        const file = await handle.getFile();
        lastModified = file.lastModified;
        const content = await file.text();
        setEditorContent(content);
        emit('contentUpdated', content);

        // Start polling for changes
        startPolling();
    } catch (err) {
        if ((err as DOMException).name === 'AbortError') return;
        throw err;
    }
}

// Listener for CodeMirror editor updates
function editorUpdateListener(): Extension {
    return EditorView.updateListener.of((update) => {
        if (update.docChanged) {
            const newContent = update.state.doc.toString()
            emit('contentUpdated', newContent)
            if (fileHandle.value) writeDebounced(newContent);
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
    stopPolling();
    editorView?.destroy();
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

        <DynamicDialog>
            
        </DynamicDialog>

        <div ref="editorHost" class="editor-host"></div>
        <Toolbar class="editor-toolbar">
            <template #end>
                <div style="display: flex; gap: var(--space-medium); align-items: center;">
                    <Message severity="info" v-if="fileHandle">
                        <template #icon>
                            <i class="material-symbols-outlined">computer_arrow_up</i>
                        </template>
                        <template #default>
                            <div
                                style="font-family: 'Fira Code', monospace; font-size: var(--fs-small); font-weight: bold; ">
                                {{ fileName || 'No file connected' }} <br>
                                <span style="font-family: 'Roboto', sans-serif; font-size: var(--fs-small); font-weight: normal;
                                color: var(--p-primary-400);">
                                    {{ formatDate(lastModified) }}
                                </span>
                            </div>
                        </template>
                    </Message>

                    <Button rounded :label="fileHandle ? 'Disconnect' : 'Connect File'" @click="connectFile"
                        style="width: 150px;">
                        <template #icon>
                            <i :style="{
                                color: fileHandle ? 'var(--p-danger-500)' : 'var(--p-success-500)'
                            }" class="material-symbols-outlined">{{ fileHandle ? 'link_off' : 'link' }}</i>
                        </template>
                    </Button>

                    <Button  rounded v-if="props.language === 'json'">
                        <template #icon>
                            <i class="material-symbols-outlined" @click="formatJsonWithPrettier()">data_object</i>
                        </template>
                    </Button>

                    <Button  rounded >
                        <template #icon>
                            <i class="material-symbols-outlined">fullscreen</i>
                        </template>
                    </Button>

                </div>
            </template>
        </Toolbar>
    </div>
</template>

<style scoped>
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
    border-radius: var(--br-medium) var(--br-medium) 0 0;
    outline: none;
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

.editor-toolbar {
    background-color: var(--p-primary-50);
    margin-top: 0;
    border-radius: 0 0 var(--br-medium) var(--br-medium);
    border-top: 1px solid var(--p-primary-500);
    border-bottom: 1px solid var(--p-primary-200);
    border-left: 1px solid var(--p-primary-200);
    border-right: 1px solid var(--p-primary-200);
}
</style>