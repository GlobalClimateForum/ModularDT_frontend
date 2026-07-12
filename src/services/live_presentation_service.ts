import { api } from "./api";

export interface LivePresentation {
    id?: number; // Optional, kommt vom Backend mit
    presentation: number; // Die ID der Presentation
    active: boolean;
    current_scene: number;
}

export const getLivePresentation = () => api.get("/live/");
export const updateLivePresentation = (live: Partial<LivePresentation>) => api.patch("/live/", live);

export const stopPresentation = async () => {
    try {
        const response = await updateLivePresentation({
            active: false,
            current_scene: 0
        });
        console.log("Live Presentation reset.");
    } catch (error) {
        console.error("Error resetting presentation:", error);
    }
}