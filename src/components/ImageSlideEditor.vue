<script setup lang="ts">
import { ref, withDefaults, defineProps, computed } from 'vue';
import { Cropper } from 'vue-advanced-cropper';
import FileUpload, { type FileUploadSelectEvent } from 'primevue/fileupload';
import 'vue-advanced-cropper/dist/style.css';
import '@/assets/main.css'
import Button from 'primevue/button'
import type { Slide, SlideSection } from '@/services/slide_service';

const props = withDefaults(defineProps<{
    slide: Slide,
    slideSection?: SlideSection,
    slideSections?: SlideSection[],
}>(), {
    slideSections: () => [],
})

const imageSrc = ref<string | null>(null);
const cropper = ref(null);


const sectionExtent = computed(() => {
    if (props.slideSection) {
        return { width: props.slideSection.width_fraction * props.slide.width, height: props.slide.height };
    } else if (props.slideSections && props.slideSections.length > 0) {
        const totalWidthFraction = props.slideSections.reduce((sum, section) => sum + section.width_fraction, 0);
        return { width: totalWidthFraction * 1600, height: 900 };
    } else {
        return { width: 1600, height: 900 }; // default size
    }
})

const stencilSize = computed(() => {
    const { width, height } = sectionExtent.value;
    const scale = Math.min(640 / width, 400 / height);
    return { width: width * scale, height: height * scale };
});

function onImageSelect(event: FileUploadSelectEvent) {
    const file = event.files[0];
    if (file) imageSrc.value = URL.createObjectURL(file);
}

function exportImage() {
    const { canvas } = cropper.value.getResult();
    // Draw onto a canvas of the exact target size
    const out = document.createElement('canvas');
    out.width = sectionExtent.value.width;
    out.height = sectionExtent.value.height;
    out.getContext('2d').drawImage(canvas, 0, 0, sectionExtent.value.width, sectionExtent.value.height);
    out.toBlob((blob) => {
        // Upload Logic here, e.g., send the blob to your server or use it as needed
    }, 'image/jpeg', 0.9);
}


</script>

<template>

    <div class="editor-container">
        <div class="label-container">
            <label>Image</label>

            <FileUpload mode="basic" chooseLabel="Select Image" accept="image/*" :multiple="false" :maxFileSize="1000000"
                @select="onImageSelect($event)" />
        </div>

        <div class="label-container">
            <label>Crop to Section Extent</label>
            <Cropper v-if="imageSrc" ref="cropper" class="cropper inset-control" :src="imageSrc" :stencil-props="{
                aspectRatio: sectionExtent.width / sectionExtent.height,
                handlers: {}, movable: false, resizable: false
            }" :stencil-size="stencilSize" image-restriction="stencil"
                :key="`${sectionExtent.width}x${sectionExtent.height}`" />
        </div>

        <Button @click="exportImage" label="Use image"></Button>

    </div>
</template>

<style>
.editor-container {
    display: flex;
    flex-direction: column;
    gap: var(--space-medium);
    min-height: 0;
    height: 100%;
}


.cropper {
    height: 400px;
    width: 100%;
    border: 1px solid var(--p-primary-500);
    border-radius: var(--space-medium);
    overflow: hidden;
}

.cropper .vue-advanced-cropper__background,
.cropper .vue-advanced-cropper__foreground {
    background: transparent;
    background-color: transparent;
}

/* .cropper .vue-advanced-cropper__foreground {

    background: rgba(255, 255, 255, 0.15);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    box-shadow:
        0 8px 32px rgba(0, 0, 0, 0.1),
        inset 0 1px 0 rgba(255, 255, 255, 0.5),
        inset 0 -1px 0 rgba(255, 255, 255, 0.1),
        inset 0 0 20px 10px rgba(255, 255, 255, 1);
    overflow: hidden;
} */

.cropper .vue-preview__wrapper {
    border: 2px solid var(--p-primary-500);
    border-radius: var(--br-medium);
    box-shadow: var(--shadow-controls-inset);
}
</style>