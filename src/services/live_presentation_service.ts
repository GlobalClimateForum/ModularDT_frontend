import { api } from "./api";
import { useLivePresentationState } from '@/globals/live_presentation';

const livePresentationState = useLivePresentationState()

export const getLivePresentation = () => api.get("/livepresentation/");
export const updateLivePresentation = (livepresentation) => api.patch("/livepresentation/", livepresentation);

export const stopPresentation = async () => {
    livePresentationState.value.active = false;
    livePresentationState.value.presentation = -1;
    livePresentationState.value.current_scene = -1;

    try {
        const response = await updateLivePresentation({
            'event_type': 'presentation_stop'
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
            'event_type': 'presentation_start'
        });
        console.log("Live Presentation started.");
    } catch (error) {
        console.error("Error starting presentation:", error);
    }
}

