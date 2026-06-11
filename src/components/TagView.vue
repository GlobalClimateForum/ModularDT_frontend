<script setup lang="ts">
import Tag from 'primevue/tag';
import type { Slide } from '@/services/slide_service';
import { removeTagFromSlide, addTagToSlide } from '@/services/slide_service';
import Button from 'primevue/button';
import { useToast } from 'primevue/usetoast';
import TagView from '@/components/TagView.vue';
import Inplace from 'primevue/inplace';
import InputText from 'primevue/inputtext';
import { ref } from 'vue';
import ScrollPanel from 'primevue/scrollpanel';


const props = defineProps<{ slide: Slide | null }>();
const emit = defineEmits<{ tagRemoved: [tag: string], tagAdded: [tag: string] }>();
const toast = useToast();
const newTag = ref('');

function onRemoveTag(tag: string) {

    if (props.slide && props.slide.id) {
        removeTagFromSlide(props.slide.id, tag).then(() => {
            emit('tagRemoved', tag);
        }).catch(error => {
            toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to remove tag from slide' });
            console.error("Error removing tag from slide:", error);
        });
    }
}

function onAddTag() {
    if (props.slide && props.slide.id && newTag.value.trim() !== '') {
        const tagVal_ = newTag.value.trim();
        if (newTag) {
            addTagToSlide(props.slide.id, tagVal_).then(() => {
                emit('tagAdded', tagVal_);
                newTag.value = '';
            }).catch(error => {
                toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to add tag to slide' });
                console.error("Error adding tag to slide:", error);
            });
        }
    }
}

</script>

<template>
    <div class="tag-view-container">
        <Inplace>
            <template #display>
                <Button class="tag-add-button" text><i class="material-symbols-outlined"
                        @click="onAddTag()">add</i></Button>
            </template>
            <template #content="{closeCallback}">
                <InputText v-model="newTag" placeholder="Enter new tag" @keyup.enter="onAddTag(); closeCallback()" 
                @keydown.escape ="closeCallback(); newTag = ''" class="tag-input" />
            </template>
        </Inplace>
        <div v-for="tag in props.slide?.tags" :key="tag">
            <Tag :value="tag" class="tag-item">
                <div class="tag-content">
                    <Button rounded small text class="tag-close-button" @click="onRemoveTag(tag)" :disabled="!props.slide?.id">
                        <i class="material-symbols-outlined">close_small</i>
                    </Button>
                    <p>{{ tag }}</p>
                </div>
            </Tag>
        </div>
    </div>
</template>

<style scoped>
.tag-view-container {
    display: flex;
    flex-direction: row;
    justify-content: flex-start;
    align-items: center;
    overflow-y: auto;
    margin-bottom: 1rem;
    gap: 0.5rem;

    gap: 1rem;
    margin-top: 1rem;
    padding: 0.5rem;
    min-height: 2rem;
    border-radius: var(--br-medium);
    padding: 1rem;
    box-sizing: border-box;
    border: 1px solid var(--p-primary-200);
}

.tag-item {
    background-color: var(--p-primary-100);
    color: var(--p-primary-900);
    box-shadow: var(--shadow-light);
    height: 2rem;
    border-radius: 1rem;
    display: inline-flex;
    align-items: center;
    height: 2rem;
    padding: 0.1rem 0.75rem 0.1rem 0.5rem;
}

.tag-content {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    line-height: 1;
}

.tag-content p {
    margin: 0;
    padding: 0;
    line-height: 1;
    vertical-align: middle;
    position: relative;
    top: -1px;
    font-weight: 700;
}

.tag-close-button {
    width: 1.25rem;
    height: 1.25rem;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 0;

    background-color: var(--p-primary-400);
    color: var(--p-primary-50);
}

.tag-add-button {
    background: none;
    color: var(--p-primary-400);
    padding: 0;
    width: 1rem;
    height: 1rem;
    display: inline-flex;
    border-radius: 0.75rem;
}

.tag-content .material-symbols-outlined {
    font-size: 1.25rem;
    line-height: 1;
}

.tag-input {
    width: 200px;
    height: 2rem;
    border-radius: 1rem;
    border: none;
    background-color: var(--p-primary-100);
    margin: 0;
    font-size: 0.875rem;
    color: var(--p-primary-900);
    font-weight: 500;
    box-shadow: var(--shadow-light);
}
</style>