<script setup lang="ts">
import { EditorView, basicSetup } from 'codemirror'
import { markdown } from '@codemirror/lang-markdown'
import { onMounted, ref, onBeforeUnmount } from 'vue'
import { Marp } from '@marp-team/marp-core'
import Toolbar from 'primevue/toolbar';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import Message from 'primevue/message';
import SplitterPanel from 'primevue/splitterpanel';
import { saveSlide } from '@/services/slide_service';
import '@/assets/main.css'

const editor = ref<HTMLElement | null>(null)
const renderedHtml = ref('')
const renderedCss = ref('')
const previewSrcdoc = ref('')
const initialDoc = '# Title\n Lorem ipsum dolor sit amet, consectetur adipiscing elit.'
const slideCount = ref(0)

const marp = new Marp()
const slideName = ref('')

let view: EditorView;

function renderMarp(md: string) {
    const { html, css } = marp.render(firstSlideOnly(md))
    renderedHtml.value = html
    renderedCss.value = css

    // Combine Marp's HTML + its theme CSS into one self-contained document.
    // The extra CSS makes the single slide fill the iframe width while
    // keeping its aspect ratio, so it looks like a real Marp slide.
    previewSrcdoc.value = `<!DOCTYPE html>
                                <html>
                                <head>
                                <meta charset="utf-8">
                                <style>
                                ${css}
                                html, body { margin: 0; padding: 0; }
                                /* Let Marp's <svg>/<section> keep its own dimensions and just
                                    scale to fit the iframe width. Don't override height. */
                                body > svg[data-marpit-svg] {
                                    width: 100% !important;
                                    height: auto !important;
                                    display: block;
                                }
                                </style>
                                </head>
                                <body>${html}</body>
                            </html>`

    slideCount.value = (md.match(/^---$/gm)?.length ?? 0) + 1
    if (slideCount.value > 1) {
        console.log(`Rendered ${slideCount.value} slides`)
    }
}

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

function storeSlide() {
    if (!slideName.value.trim()) {
        alert("Please enter a slide name.")
        return
    } else {
        const slideData = {
            name: slideName.value,
            content: firstSlideOnly(view.state.doc.toString())
        }
        saveSlide(slideData).then(response => {
        }).catch(error => {
            console.error("Error saving slide:", error)
        })
    }
}

onMounted(() => {
    view = new EditorView({
        doc: initialDoc,
        extensions: [
            basicSetup,
            markdown(),
            EditorView.updateListener.of((update) => {
                if (update.docChanged) {
                    renderMarp(update.state.doc.toString())
                }
            }),
        ],
        parent: editor.value!,
    })

    renderMarp(initialDoc)
})

onBeforeUnmount(() => view?.destroy())
</script>


<template>
    <div class="slide-creator-container">
        <div class="slide-creator">
            <SplitterPanel class="editor">
                <Toolbar class="editor-toolbar">
                    <template #start>
                        <div class="toolbar-start">
                            <InputText v-model="slideName" placeholder="name" class="slide-name-input" />
                        </div>
                    </template>
                    <template #end>
                        <div class="toolbar-buttons">
                            <Button label="Save" :disabled="!slideName.trim()" icon="pi pi-save" @click="storeSlide" />
                            <Button label="Add embed" icon="pi pi-desktop" severity="secondary" outlined />
                        </div>
                    </template>
                </Toolbar>
                <div class="status_bar">
                    <Message v-if="slideCount > 1" severity="warn" size="small" variant="simple" class="slide-warning">
                        Only one slide can be created at a time.
                    </Message>
                </div>
                <div ref="editor" class="editor-view"></div>
            </SplitterPanel>

            <SplitterPanel class="preview">
                <div class="preview-label">Preview</div>
                <iframe class="marp-output" :srcdoc="previewSrcdoc" sandbox="allow-same-origin"
                    title="Slide preview"></iframe>
            </SplitterPanel>
        </div>
    </div>
</template>


<style scoped>
.slide-creator-container {
    height: calc(80vh - 60px);
    padding: 0.5rem;
    box-sizing: border-box;
}

.slide-creator {
    display: flex;
    flex-direction: row;
    height: 100%;
    gap: 1rem;
    width: 100%;
}

.editor,
.preview {
    flex: 1;
    box-sizing: border-box;
    height: 100%;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    border: 1px solid var(--surface-border, #e2e8f0);
    border-radius: 12px;
    background-color: var(--surface-card, #fff);
}

/* ---- Toolbar ---- */
.editor-toolbar {
    border: 0;
    border-radius: 12px 12px 0 0;
    padding: 0.75rem 1rem;
    border-bottom: 1px solid var(--surface-border, #e2e8f0);
    flex-shrink: 0;
    gap: 1rem;
    flex-wrap: wrap;
}

.status_bar {
    padding: 0.5rem 1rem;
    height: 1rem;
}

.toolbar-start {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    flex-wrap: wrap;
}

.slide-name-input {
    min-width: 14rem;
}

.slide-warning {
    margin: 0;
}

.toolbar-buttons {
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

/* ---- Editor pane ---- */
.editor-view {
    flex: 1;
    overflow-y: auto;
    background-color: var(--surface, #f8fafc);
}

.editor-view :deep(.cm-editor) {
    height: 100%;
}

/* ---- Preview pane ---- */
.preview {
    padding: 1rem;
    gap: 0.75rem;
}

.preview-label {
    font-size: 0.75rem;
    font-weight: 600;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--text-color-secondary, #64748b);
    flex-shrink: 0;
}

.marp-output {
    flex: 1;
    width: 100%;
    min-height: 0;
    border-radius: 12px;
    background: transparent;
    border: 1px solid var(--surface-border, #e2e8f0);
    background-color: var(--surface, #f8fafc);
    margin-top: 0.5rem;
}

/* ---- Responsive ---- */
@media (max-width: 768px) {
    .slide-creator {
        flex-direction: column;
    }
}
</style>