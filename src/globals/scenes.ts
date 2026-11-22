import { ref } from 'vue';
import type { Scene } from "@/services/scene_service"
import { getScenes, getScene } from "@/services/scene_service";

// globale reactive variables
export const scenes = ref<Scene[]>([]);
export const selectedSceneInSceneManager = ref<Scene | null>(null);
export const selectedSceneInSceneShowEditor = ref<Scene | null>(null);

// fetch all scenes
export function fetchScenes() {
    getScenes().then(response => {
        scenes.value = response.data.scenes
    }).catch(error => {
        console.error("Error fetching scenes:", error);
    });
}

// fetch scene by id
export async function updateSceneByID(id: number) {
    try {
        const response = await getScene(id)
        const sceneData = response.data;
        let sceneIndexFound = scenes.value.findIndex(scene => scene.id === id);

        if (sceneIndexFound >= 0) {
            // update existing scene
            scenes.value[sceneIndexFound] = sceneData
        } else {
            // Add new scene
            scenes.value.push(sceneData);
        }
    }
    catch (error) {
        console.error("Error fetching scene ", id, ":", error);
    }
}

// no fetching
export function updateSceneByScene(updatedScene: Scene) {
    const index = scenes.value.findIndex(scene => scene.id === updatedScene.id);
    if (index !== -1) {
        scenes.value[index] = updatedScene;
    } else {
        scenes.value.push(updatedScene);
    }
}