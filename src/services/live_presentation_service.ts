import { api } from "./api";
import { useLivePresentationState } from '@/utils/live_presentation';

const livePresentationState = useLivePresentationState()

export interface LivePresentation {
    id?: number; // Optional, kommt vom Backend mit
    presentation: number; // Die ID der Presentation
    active: boolean;
    current_scene: number;
}

export const getLivePresentation = () => api.get("/live/");
export const updateLivePresentation = (live: Partial<LivePresentation>) => api.patch("/live/", live);

export const stopPresentation = async () => {
    livePresentationState.value.active = false;
    livePresentationState.value.presentation = -1;
    livePresentationState.value.current_scene = -1;

    try {
        const response = await updateLivePresentation({
            active: false,
        });
        console.log("Live Presentation stoped.");
    } catch (error) {
        console.error("Error stopping presentation:", error);
    }
}

export const startPresentation = async (presentationid) => {
    livePresentationState.value.active = true;
    livePresentationState.value.presentation = presentationid;
    livePresentationState.value.current_scene = 1;

    try {
        const response = await updateLivePresentation({
            active: true,
            presentation: presentationid,
            current_scene: 1
        });
        console.log("Live Presentation started.");
    } catch (error) {
        console.error("Error starting presentation:", error);
    }
}

