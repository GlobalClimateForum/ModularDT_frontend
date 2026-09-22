<script lang="ts" setup>
import CodeEditorCore from './CodeEditorCore.vue'
import { useDialog } from 'primevue/usedialog'
import type { Slide, SlideSection } from '@/services/slide_service'

const props = defineProps<{ slide?: Slide, slideSection?: SlideSection, slideSections?: SlideSection[], language?: string }>()
const emit = defineEmits<{ contentUpdated: [content: string] }>()
const dialog = useDialog()

function openFullscreen() {
    dialog.open(CodeEditorCore, {
        props: {
            header: 'Slide Section Editor',
            style: { width: '95vw', height: '95vh' },
            maximizable: true,
            modal: true,
            pt: { title: { class: 'dashboard_label' } },
        },
data: { slide: props.slide, slideSection: props.slideSection, slideSections: props.slideSections, language: props.language },        emits: { onContentUpdated: (c: string) => emit('contentUpdated', c) },
    })
}
</script>

<template>
    <CodeEditorCore :slide="slide" :slideSection="slideSection" :slideSections="slideSections" :language="language" @content-updated="emit('contentUpdated', $event)"
        @request-fullscreen="openFullscreen" />
</template>