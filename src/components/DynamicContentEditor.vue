<script lang="ts" setup>
import type { SlideSection } from '@/services/slide_service';
import InputText from 'primevue/inputtext';
import Button from 'primevue/button';


const props = defineProps<{
    slideSection: SlideSection
}>()

const emit = defineEmits<{
    (e: 'sectionUpdated', updatedSection: SlideSection): void;
}>();

function updateSectionContent() {
    emit('sectionUpdated', { ...props.slideSection, content: props.slideSection.content })
}

</script>


<template>
    <div class="editor-container">
        <label>URL</label>
        <InputText id="title-input" v-model="props.slideSection.content" @change="updateSectionContent()" />
        <Button label="Fetch">
            <template #icon>
                <i class="material-symbols-outlined">download</i>
            </template>
        </Button>
    </div>
</template>

<style scoped>
.editor-container {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}
</style>