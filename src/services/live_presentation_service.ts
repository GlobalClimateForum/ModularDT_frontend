import { api } from "./api";
import { useCurrentPresentation, useLivePresentationState } from '@/globals/live_presentation';
import { presentations } from '@/globals/presentations';

const livePresentationState = useLivePresentationState()
const currentPresentation = useCurrentPresentation()

//export const getLivePresentation = () => api.get("/livepresentation/");
export const updateLivePresentation = (livepresentation) => api.patch("/livepresentation/", livepresentation);

export const stopPresentation = async () => {
    livePresentationState.value.active = false;
    livePresentationState.value.presentation = -1;
    livePresentationState.value.current_scene = -1;
    currentPresentation.value = null

    try {
        await updateLivePresentation({
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
    currentPresentation.value = presentations.value.find((pres) => pres.id == presentationid) ?? null;

    try {
        await updateLivePresentation({
            'event_type': 'presentation_start'
        });
        console.log("Live Presentation started.");
    } catch (error) {
        console.error("Error starting presentation:", error);
    }
}

