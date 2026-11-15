import { ref } from 'vue';
import type { Scene } from "@/services/scene_service"
import { getScenes, getScene } from "@/services/scene_service";

// globale reactive variable
export const scenes = ref<Scene[]>([]);

export function fetchScenes() {
    getScenes().then(response => {
        scenes.value = response.data.scenes;
    }).catch(error => {
        console.error("Error fetching scenes:", error);
    });
}

// fetch scene by id
export function updateSceneByID(id: number) {
    getScene(id).then(response => {
        const sceneData = response.data;
        let sceneIndexFound = scenes.value.findIndex(scene => scene.id === id);

        if (sceneIndexFound >= 0) {
            // Update existing scene
            scenes.value[sceneIndexFound] = {
                ...scenes.value[sceneIndexFound],
                ...sceneData,
                // Ensure slides have position property
                slides: sceneData.slides?.map(slide => ({
                    ...slide,
                    position: sceneData.slide_positions?.find(sp => sp.id === slide.id)?.position || 0
                })) || []
            };
        } else {
            // Add new scene
            scenes.value.push({
                ...sceneData,
                // Ensure slides have position property
                slides: sceneData.slides?.map(slide => ({
                    ...slide,
                    position: sceneData.slide_positions?.find(sp => sp.id === slide.id)?.position || 0
                })) || []
            });
        }
    }).catch(error => {
        console.error("Error fetching scene ", id, ":", error);
    });
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