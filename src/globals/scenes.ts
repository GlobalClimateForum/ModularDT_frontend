import { ref } from 'vue';
import type { Scene } from "@/services/scene_service"
import { getScenes, getScene } from "@/services/scene_service";

// globale reactive variables
export const scenes = ref<Scene[]>([]);
export const selectedSceneInSceneManager = ref<Scene | null>(null);
export const selectedSceneInSceneShowEditor = ref<Scene | null>(null);

// Fetch scenes from the backend and update the reactive variable 
export function fetchScenes() {
    return getScenes().then(response => {
        scenes.value = response.data.scenes
    }).catch(error => {
        console.error("Error fetching scenes:", error);
    });
}

// async fetch
export async function asyncFetchScenes() {
    try {
        const response = await getScenes()
        scenes.value = response.data.scenes
    } catch (error) {
        console.error("Error asynchronous fetching scenes:", error);
    }
}


export function getSceneById(id: number): Scene | undefined {
    return scenes.value.find(scene => scene.id === id);
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

export function removeSlideFromScenesById(id: number) {
    for (let scene of scenes.value) {
        const slideIndex = scene.slides.findIndex(slide => slide.id === id);
        if (slideIndex !== -1) {
            scene.slides.splice(slideIndex, 1);
        }
    }
}