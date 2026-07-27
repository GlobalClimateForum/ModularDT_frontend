import { ref } from 'vue';
import type { Scene } from "@/services/scene_service"
import { getScenes } from "@/services/scene_service";

// globale reactive variable
export const scenes = ref<Scene[]>([]);

export function fetchScenes() {
    getScenes().then(response => {
        scenes.value = response.data.scenes;
        //console.log('fetched scenes:', JSON.parse(JSON.stringify(scenes.value)))
    }).catch(error => {
        console.error("Error fetching scenes:", error);
    });
}