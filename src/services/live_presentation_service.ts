import { api } from "./api";

export interface LivePresentation {
    id?: number; // Optional, kommt vom Backend mit
    presentation: number; // Die ID der Presentation
    active: boolean;
    current_scene: number;
}

export const getLivePresentation = () => api.get("/live/");
export const updateLivePresentation = (live: Partial<LivePresentation>) => api.patch("/live/", live);
