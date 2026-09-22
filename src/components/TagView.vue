<script setup lang="ts" generic="T extends { id?: number; tags: string[] }">
import { useToast } from 'primevue/usetoast';
import Chip from 'primevue/chip';
import Inplace from 'primevue/inplace';
import AutoComplete from 'primevue/autocomplete';
import { ref, onMounted } from 'vue';
import { getAvailableTags } from '@/services/slide_service';
import Button from 'primevue/button';

// Definiere die Props unter Verwendung des generischen Typs T
const props = defineProps<{
    item: T | null;
    onAddTagApi: (id: number, tag: string) => Promise<any>;
    onRemoveTagApi: (id: number, tag: string) => Promise<any>;
}>();

const emit = defineEmits<{
    tagRemoved: [tag: string],
    tagAdded: [tag: string]
}>();

const toast = useToast();
const newTag = ref('');
const existingTags = ref<string[]>(props.item?.tags || []);
const suggestions = ref<string[]>([]);

function onRemoveTag(tag: string) {
    if (props.item && props.item.id) {
        props.onRemoveTagApi(props.item.id, tag)
            .then(() => {
                emit('tagRemoved', tag);
            })
            .catch(error => {
                toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to remove tag' });
                console.error("Error removing tag:", error);
            });
    }
}

function onAddTag() {

    const tagVal = newTag.value.trim();

    if (props.item?.tags?.includes(tagVal)){
        toast.add({ severity: 'warn', summary: 'Warning', detail: 'Tag already added', life: 2000 });
        return;
    }

    if (props.item && props.item.id && tagVal !== '') {
        props.onAddTagApi(props.item.id, tagVal)
            .then(() => {
                emit('tagAdded', tagVal);
                newTag.value = '';
            })
            .catch(error => {
                toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to add tag' });
                console.error("Error adding tag:", error);
            });
    }
}

function search(event: { query: string }) {
    const q = event.query.trim().toLowerCase();
    const already = new Set(props.item?.tags ?? []);
    suggestions.value = existingTags.value
        .filter(t => !already.has(t))
        .filter(t => t.toLowerCase().includes(q));
    console.log(suggestions.value.length, event.query)
    console.log(JSON.stringify(suggestions.value))
}

onMounted(() => {
    // Fetch available tags from the backend
    getAvailableTags()
        .then(response => {
            existingTags.value = response.data.tags;
        })
        .catch(error => {
            toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to fetch available tags' });
            console.error("Error fetching available tags:", error);
        });
});
</script>

<template>
    <div class="tag-container">
        <!--  Add new tag button and input field using Inplace component -->
        <Inplace>
            <template #display>
                <div class="add-tag-trigger">
                    <i class="material-symbols-outlined">add</i>
                </div>
            </template>

            <template #content="{ closeCallback }">

                <AutoComplete v-model="newTag" placeholder="add a tag..." inputClass="w-full md:w-56"
                    emptySearchMessage="All matching tags already added" scrollHeight="14rem" :suggestions="suggestions"
                    @complete="search" :min-length="0" @keyup.enter="onAddTag(); closeCallback()"
                    @keydown.escape="closeCallback(); newTag = ''" />

              

            </template>
        </Inplace>

        <!-- Current Tags as Chips -->
        <Chip class="tag-chip" removable v-for="tag in props.item?.tags" :key="tag" @remove="onRemoveTag(tag)">
            <template #default>
                {{ tag }}
            </template>
        </Chip>
    </div>
</template>

<style scoped>
.add-tag-trigger {
    display: flex;
    align-items: center;
    justify-content: center;

    color: var(--p-primary-500);
    font-size: var(--fs-small);
}

.tag-container {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-small);
    align-items: center;
    justify-content: flex-start;
    padding: var(--space-small);

    margin-top: var(--space-small);
    border: 1px solid var(--p-primary-500);
    border-radius: var(--br-small);
}

.tag-chip {
    margin: 0;
    font-size: var(--fs-small);
    color: var(--p-primary-800);
    background-color: var(--p-primary-200);
    border-radius: var(--br-large);
    padding: var(--space-small) var(--space-medium);
}

.tag-chip:hover {
    background-color: var(--p-primary-500);
    color: var(--p-primary-50);
    border-color: var(--p-primary-500);
    transition: background-color 0.3s, color 0.3s, border-color 0.3s;
    cursor: pointer;
}
</style>