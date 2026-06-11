<script setup lang="ts">
import type { Slide } from '@/services/slide_service';
import { renderSlide } from '@/services/slide_service';
import { ref, watch } from 'vue';

const props = defineProps<{ slide: Slide | null }>();
const previewSlide = ref('')


watch(
    () => props.slide,
    (newSlide) => {
        if (newSlide) showSlide(newSlide)
        else previewSlide.value = ''
    },
    { immediate: true }
)

function showSlide(slide: Slide) {
    renderSlide(slide.markdown).then((response) => {
        const { html, css } = response.data
        previewSlide.value = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>${css}</style></head><body>${html}</body></html>`
    }).catch((error) => {
        console.error("Error rendering slide:", error)
    })
}

</script>


<template>

    <div class="slide-preview">
        <iframe class="slide-iframe" :srcdoc="props.slide ? previewSlide : ''" sandbox="allow-same-origin"
            title="Slide preview"></iframe>
    </div>

</template>

<style scoped>

.slide-preview {
    width: 100%;
    aspect-ratio: 16 / 9;
    border-radius: var(--br-medium);
    background-color: var(--p-primary-50);
    box-shadow: inset 0 0 10px 5px var(--p-primary-100);
    padding: 1rem; 
    box-sizing: border-box;
    border: 1px solid var(--p-primary-200); 
}

.slide-iframe {
  width: 100%;
  height: 100%;
  border: none;
  border-radius: var(--br-medium);
  display: block;
box-shadow: 0 0 10px 5px var(--p-primary-200);
}
</style>


<!-- <SplitterPanel class="slide-preview">
            <div class="preview-label">Preview</div>
           
            <div style="display: flex; flex-direction: row; justify-content: flex-end; gap: 1rem; margin-top: 1rem;">
                <Button label="open in Editor" icon="pi pi-file-edit" severity="primary"
                    style=" width: 200px" />
                <Button label="Delete" icon="pi pi-trash" severity="danger" style=" width: 200px" />
            </div>
        </SplitterPanel> -->