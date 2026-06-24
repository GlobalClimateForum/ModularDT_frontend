import {api} from "./api";

export interface Scene {
    id?: number; 
    name: string;
    slides: (number | null)[];
}

export const getScenes = () => api.get("/scene/");
export const saveScene = (scene: Omit<Scene, "id">) => api.post("/scene/", scene);
