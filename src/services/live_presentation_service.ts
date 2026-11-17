import { api } from "./api";

export const updateLivePresentation = (livepresentation_message) => api.patch("/livepresentation/", livepresentation_message);

export function sendStartLivePresentation() {
    try {
        updateLivePresentation({
            'event_type': 'presentation_start'
        });
        console.log("Live Presentation started.");
    } catch (error) {
        console.error("Error starting presentation:", error);
    }
}

export function sendStopLivePresentation() {
    try {
        updateLivePresentation({
            'event_type': 'presentation_stop'
        });
        console.log("Live Presentation stoped.");
    } catch (error) {
        console.error("Error stopping presentation:", error);
    }
}

