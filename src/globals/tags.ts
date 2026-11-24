// Vue-stuff
import { ref } from 'vue';
// globals and services
import { getAvailableTags } from '@/services/tag_service';
import { slides } from '@/globals/slides'
import { scenes } from '@/globals/scenes'

export const existingTags = ref<string[]>([]);
export const selectedTagsInSceneEditor = ref<string[]>([]);
export const selectedTagsInSceneManager = ref<string[]>([]);
export const selectedTagsInSceneShowEditor = ref<string[]>([]);
export const selectedTagsInSlideManager = ref<string[]>([]);
export const selectedTagsInLiveSlides = ref<string[]>([]);
export const selectedTagsInParticipantSlideshow = ref<string[]>([]);

// Fetch tags from the backend and update the reactive variable
export function fetchTags() {
    return getAvailableTags().then(response => {
        existingTags.value = response.data.tags;
    }).catch(error => {
        console.error("Error fetching tags:", error);
    });
}

// Fetch tags from the backend and update the reactive variable
export async function asyncFetchTags() {
    try {
        const tags = await getAvailableTags();
        existingTags.value = tags.data.tags;
    } catch (error) {
        console.error("Error asynchronous getting tags:", error);
    }
}

export function collectAllExistingTags() {
    return Array.from(new Set(([] as string[]).concat(...slides.value.map(x => x.tags), ...scenes.value.map(x => x.tags))))
}

