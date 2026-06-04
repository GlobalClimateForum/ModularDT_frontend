<script setup lang="ts">
import { EditorView, basicSetup } from 'codemirror'
import { markdown } from '@codemirror/lang-markdown'
import { onMounted, ref, onBeforeUnmount } from 'vue'
import { Marp } from '@marp-team/marp-core'
import Toolbar from 'primevue/toolbar';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import Message from 'primevue/message';
import api from '@/services/api';
import { saveSlide } from '@/services/slide_service';

const editor = ref<HTMLElement | null>(null)
const renderedHtml = ref('')
const renderedCss = ref('')
const initialDoc = '# Title\n Lorem ipsum dolor sit amet, consectetur adipiscing elit.'
const slideCount = ref(0)

const marp = new Marp()
const slideName = ref('')

let view: EditorView;

function renderMarp(md: string) {
    const { html, css } = marp.render(firstSlideOnly(md))
    renderedHtml.value = html
    renderedCss.value = css

    // count slides by splitting on the slide separator
    slideCount.value = (md.match(/^---$/gm)?.length ?? 0) + 1
    if (slideCount.value > 1) {
        console.log(`Rendered ${slideCount.value} slides`)
    }
}

function firstSlideOnly(md: string): string {
    let body = md
    let frontMatter = ''

    // Extract front matter if it exists
    const frontMatterMatch = body.match(/^---\n([\s\S]*?)\n---\n/)
    if (frontMatterMatch) {
        frontMatter = frontMatterMatch[0]
        body = body.slice(frontMatter.length)
    }

    // Get the first slide seperator in the remaining body
    const slideSeparatorIndex = body.match(/^---$/m)?.index ?? body.length
    const firstSlide = body.slice(0, slideSeparatorIndex).trim()
    return frontMatter + firstSlide
}

function storeSlide() {

    // Check if slide name is empty
    if (!slideName.value.trim()) {
        alert("Please enter a slide name.")
        return
    }else{
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

    renderMarp(initialDoc)   // initial render
})

onBeforeUnmount(() => view?.destroy())

</script>


<template>
    <Toolbar class="mb-4">
        <template #start class="toolbar-start">
            <InputText v-model="slideName" placeholder="Slide Name" class="mr-2"></InputText>
            <Message severity="warn" v-if="slideCount > 1">You can only create one slide at a time.</Message>
        </template>
        <template #end>
            <Button label="save" icon="pi pi-save" class="p-button-outlined" @click="storeSlide"></Button>
        </template>
    </Toolbar>
    <div class="slide-creator-container">
        <div class="slide-creator">

            <div ref="editor" class="editor"></div>
            <div class="preview">
                <component :is="'style'">{{ renderedCss }}</component>
                <div class="marp-output" v-html="renderedHtml"></div>
            </div>
        </div>
    </div>
</template>


<style scoped>
.slide-creator-container {
    height: calc(100vh - 70px);   /* subtract the toolbar height */
    width: 100%;
}

.slide-creator {
    display: flex;
    height: 100%;
    gap: 1px;
    background: #e5e7eb;
}

.editor,
.preview {
    flex: 1;
    min-width: 0;
    box-sizing: border-box;
    height: 100%;
}

.preview {
    border-left: 1px solid #ccc;
    /* visual separation */
    background-color: #828382;
    display: flex;
    flex-direction: column;
    justify-content: flex-start;
}

.marp-output :deep(section) {
    display: none;
}

.marp-output :deep(section:first-of-type) {
    display: block;
}
</style>